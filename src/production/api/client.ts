import { runtimeConfig } from "../config";
import type {
  ApiProblem,
  ApiResponse,
  RateLimitSnapshot,
} from "../types";
import { useAuthStore } from "../auth/store";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;
  readonly reasons: string[];
  readonly currentVersion: number | null;
  readonly correlationId: string | null;
  readonly retryAfterSeconds: number | null;

  constructor(status: number, problem: ApiProblem, retryAfterSeconds: number | null) {
    super(problem.message);
    this.name = "ApiError";
    this.status = status;
    this.code = problem.code;
    this.details = problem.details;
    this.reasons = problem.reasons ?? [];
    this.currentVersion = problem.currentVersion ?? null;
    this.correlationId = problem.correlationId ?? null;
    this.retryAfterSeconds = retryAfterSeconds;
  }

  get isConflict(): boolean {
    return this.status === 409 || this.status === 412;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export interface RequestOptions<TBody = unknown> {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: TBody;
  query?: Record<
    string,
    string | number | boolean | null | undefined | Array<string | number>
  >;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  idempotent?: boolean;
  ifMatch?: string | number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const parseIntegerHeader = (value: string | null): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const readRateLimit = (response: Response): RateLimitSnapshot => ({
  limit:
    parseIntegerHeader(response.headers.get("X-RateLimit-Limit-Minute")) ??
    parseIntegerHeader(response.headers.get("RateLimit-Limit")),
  remaining:
    parseIntegerHeader(response.headers.get("X-RateLimit-Remaining-Minute")) ??
    parseIntegerHeader(response.headers.get("RateLimit-Remaining")),
  resetAt:
    parseIntegerHeader(response.headers.get("X-RateLimit-Reset")) ??
    parseIntegerHeader(response.headers.get("RateLimit-Reset")),
  retryAfterSeconds: parseIntegerHeader(response.headers.get("Retry-After")),
});

const buildUrl = (
  path: string,
  query?: RequestOptions["query"],
): string => {
  const base = runtimeConfig.apiBaseUrl.startsWith("http")
    ? `${runtimeConfig.apiBaseUrl}/`
    : `${window.location.origin}${runtimeConfig.apiBaseUrl}/`;
  const url = new URL(path.replace(/^\//, ""), base);
  Object.entries(query ?? {}).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") return;
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];
    values.forEach((value) => url.searchParams.append(key, String(value)));
  });
  return url.toString();
};

const parseBody = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text || null;
};

const normalizeProblem = (
  status: number,
  value: unknown,
  correlationId: string | null,
): ApiProblem => {
  const body =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const detail =
    body.detail && typeof body.detail === "object"
      ? (body.detail as Record<string, unknown>)
      : body;
  const message =
    typeof detail.message === "string"
      ? detail.message
      : typeof body.detail === "string"
        ? body.detail
        : `Request failed with HTTP ${status}.`;
  return {
    code:
      typeof detail.code === "string"
        ? detail.code
        : `HTTP_${status}`,
    message,
    details: detail.details ?? detail,
    reasons: Array.isArray(detail.reasons)
      ? detail.reasons.filter(
          (reason): reason is string => typeof reason === "string",
        )
      : [],
    currentVersion:
      typeof detail.current_version === "number"
        ? detail.current_version
        : typeof detail.currentVersion === "number"
          ? detail.currentVersion
          : undefined,
    correlationId:
      typeof detail.correlation_id === "string"
        ? detail.correlation_id
        : correlationId,
  };
};

export const apiRequest = async <TResponse, TBody = unknown>(
  path: string,
  options: RequestOptions<TBody> = {},
): Promise<ApiResponse<TResponse>> => {
  const auth = useAuthStore();
  const method = options.method ?? "GET";
  const correlationId = crypto.randomUUID();
  const isMutation = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  const idempotencyKey =
    options.idempotencyKey ??
    (isMutation && options.idempotent !== false ? crypto.randomUUID() : undefined);

  const execute = async (retriedAfterUnauthorized: boolean): Promise<ApiResponse<TResponse>> => {
    const token = await auth.accessToken();
    const headers = new Headers({
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "X-Correlation-Id": correlationId,
      ...options.headers,
    });
    if (auth.selectedOrganizationId) {
      headers.set(
        runtimeConfig.organizationSelectionHeader,
        auth.selectedOrganizationId,
      );
    }
    if (idempotencyKey) {
      headers.set("Idempotency-Key", idempotencyKey);
    }
    if (options.ifMatch !== undefined) {
      headers.set("If-Match", String(options.ifMatch));
    }

    let requestBody: BodyInit | undefined;
    if (options.body instanceof FormData) {
      requestBody = options.body;
    } else if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      requestBody = JSON.stringify(options.body);
    }

    const controller = new AbortController();
    const externalAbort = (): void => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", externalAbort, { once: true });
    const timeout = window.setTimeout(
      () => controller.abort(new DOMException("Request timed out", "TimeoutError")),
      options.timeoutMs ?? runtimeConfig.requestTimeoutMs,
    );

    try {
      const response = await fetch(buildUrl(path, options.query), {
        method,
        headers,
        body: requestBody,
        signal: controller.signal,
        credentials: "omit",
        cache: "no-store",
      });
      const responseCorrelationId =
        response.headers.get("X-Correlation-Id") ?? correlationId;
      const rateLimit = readRateLimit(response);

      if (response.status === 401 && !retriedAfterUnauthorized) {
        await auth.refresh();
        return execute(true);
      }

      const parsed = await parseBody(response);
      if (!response.ok) {
        throw new ApiError(
          response.status,
          normalizeProblem(response.status, parsed, responseCorrelationId),
          rateLimit.retryAfterSeconds,
        );
      }
      return {
        data: parsed as TResponse,
        etag: response.headers.get("ETag"),
        correlationId: responseCorrelationId,
        rateLimit,
      };
    } finally {
      window.clearTimeout(timeout);
      options.signal?.removeEventListener("abort", externalAbort);
    }
  };

  return execute(false);
};

export const api = Object.freeze({
  get: <TResponse>(
    path: string,
    options?: Omit<RequestOptions<never>, "method" | "body">,
  ) => apiRequest<TResponse>(path, { ...options, method: "GET" }),

  post: <TResponse, TBody>(
    path: string,
    body: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ) => apiRequest<TResponse, TBody>(path, { ...options, method: "POST", body }),

  put: <TResponse, TBody>(
    path: string,
    body: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ) => apiRequest<TResponse, TBody>(path, { ...options, method: "PUT", body }),

  patch: <TResponse, TBody>(
    path: string,
    body: TBody,
    options?: Omit<RequestOptions<TBody>, "method" | "body">,
  ) => apiRequest<TResponse, TBody>(path, { ...options, method: "PATCH", body }),

  delete: <TResponse>(
    path: string,
    options?: Omit<RequestOptions<never>, "method" | "body">,
  ) => apiRequest<TResponse>(path, { ...options, method: "DELETE" }),
});
