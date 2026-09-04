import { defineStore } from "pinia";
import { runtimeConfig } from "../config";
import type {
  CurrentUser,
  OidcTokens,
  OrganizationMembership,
  PortalKind,
  SessionContext,
} from "../types";
import {
  beginAuthorization,
  buildLogoutUrl,
  completeAuthorization,
  refreshTokens,
} from "./oidc";

const ORGANIZATION_STORAGE_KEY = "freight:selected-organization";
let refreshPromise: Promise<string> | null = null;

const asStrings = (value: unknown): string[] =>
  Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string"))]
    : [];

const firstString = (...values: unknown[]): string =>
  (values.find((value) => typeof value === "string" && value.trim()) as string | undefined) ??
  "";

const normalizeMembership = (value: Record<string, unknown>): OrganizationMembership => ({
  organizationId: firstString(
    value.organization_id,
    value.organizationId,
    value.tenant_id,
    value.tenantId,
    value.id,
  ),
  organizationName: firstString(
    value.organization_name,
    value.organizationName,
    value.tenant_name,
    value.tenantName,
    value.name,
  ),
  roles: asStrings(value.roles),
  permissions: asStrings(value.permissions),
  capabilities: asStrings(value.capabilities),
  status: firstString(value.status, "ACTIVE").toUpperCase(),
});

const derivePortals = (
  roles: string[],
  permissions: string[],
  capabilities: string[],
): PortalKind[] => {
  const normalizedRoles = roles.map((value) => value.toUpperCase());
  const portals = new Set<PortalKind>();
  if (
    normalizedRoles.some((role) => role.includes("ADMIN")) ||
    permissions.some((permission) => permission.startsWith("admin."))
  ) {
    portals.add("ADMIN");
  }
  if (
    normalizedRoles.some((role) =>
      ["BROKER", "DISPATCH", "OPERATIONS", "AGENT"].some((word) =>
        role.includes(word),
      ),
    ) ||
    permissions.includes("operations.read")
  ) {
    portals.add("OPERATIONS");
  }
  if (
    normalizedRoles.some((role) => role.includes("CUSTOMER")) ||
    capabilities.includes("customer_portal.external_access")
  ) {
    portals.add("CUSTOMER");
  }
  if (
    normalizedRoles.some((role) => role.includes("CARRIER")) ||
    capabilities.includes("carrier_portal.external_access")
  ) {
    portals.add("CARRIER");
  }
  return [...portals];
};

const normalizeContext = (
  value: Record<string, unknown>,
  selectedOrganizationId: string | null,
): SessionContext => {
  const rawUser = (value.user && typeof value.user === "object"
    ? value.user
    : value) as Record<string, unknown>;
  const rawMemberships = (
    Array.isArray(value.memberships)
      ? value.memberships
      : Array.isArray(value.organizations)
        ? value.organizations
        : []
  ) as Record<string, unknown>[];
  const memberships = rawMemberships
    .map(normalizeMembership)
    .filter((item) => item.organizationId && item.status !== "DISABLED");
  const selected = memberships.find(
    (item) => item.organizationId === selectedOrganizationId,
  );
  const roles = asStrings(value.roles).length
    ? asStrings(value.roles)
    : selected?.roles ?? [];
  const permissions = asStrings(value.permissions).length
    ? asStrings(value.permissions)
    : selected?.permissions ?? [];
  const capabilities = asStrings(value.capabilities).length
    ? asStrings(value.capabilities)
    : selected?.capabilities ?? [];
  const user: CurrentUser = {
    id: firstString(rawUser.id, rawUser.user_id, rawUser.userId, rawUser.sub),
    subject: firstString(rawUser.subject, rawUser.sub),
    email: firstString(rawUser.email),
    displayName: firstString(
      rawUser.display_name,
      rawUser.displayName,
      rawUser.name,
      rawUser.email,
      "Signed-in user",
    ),
  };
  return {
    user,
    memberships,
    selectedOrganizationId: selected?.organizationId ?? null,
    permissions,
    capabilities,
    roles,
    portals: derivePortals(roles, permissions, capabilities),
  };
};

const endpoint = (path: string): string => {
  const base = runtimeConfig.apiBaseUrl.startsWith("http")
    ? `${runtimeConfig.apiBaseUrl}/`
    : `${window.location.origin}${runtimeConfig.apiBaseUrl}/`;
  return new URL(path.replace(/^\//, ""), base).toString();
};

export const useAuthStore = defineStore("production-auth", {
  state: () => ({
    tokens: null as OidcTokens | null,
    context: null as SessionContext | null,
    selectedOrganizationId:
      typeof window === "undefined"
        ? null
        : sessionStorage.getItem(ORGANIZATION_STORAGE_KEY),
    initialized: false,
    busy: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state): boolean => Boolean(state.tokens?.accessToken),
    user: (state): CurrentUser | null => state.context?.user ?? null,
    memberships: (state): OrganizationMembership[] =>
      state.context?.memberships ?? [],
    permissions: (state): string[] => state.context?.permissions ?? [],
    capabilities: (state): string[] => state.context?.capabilities ?? [],
    portals: (state): PortalKind[] => state.context?.portals ?? [],
    organizationName: (state): string =>
      state.context?.memberships.find(
        (item) => item.organizationId === state.selectedOrganizationId,
      )?.organizationName ?? "Select organization",
  },

  actions: {
    async initialize(): Promise<void> {
      if (this.initialized) return;
      this.initialized = true;
      if (this.tokens) {
        await this.fetchContext();
      }
    },

    async login(returnTo = window.location.pathname): Promise<never> {
      this.error = null;
      return beginAuthorization(returnTo);
    },

    async completeCallback(
      callbackUrl: string,
    ): Promise<string> {
      this.busy = true;
      this.error = null;
      try {
        const { tokens, returnTo } = await completeAuthorization(callbackUrl);
        this.tokens = tokens;
        await this.fetchContext();
        return returnTo;
      } catch (error) {
        this.clearSession();
        this.error =
          error instanceof Error ? error.message : "Identity callback failed.";
        throw error;
      } finally {
        this.busy = false;
      }
    },

    async accessToken(minValiditySeconds = 30): Promise<string> {
      if (!this.tokens) {
        throw new Error("Authentication is required.");
      }
      if (this.tokens.expiresAt - Date.now() > minValiditySeconds * 1000) {
        return this.tokens.accessToken;
      }
      return this.refresh();
    },

    async refresh(): Promise<string> {
      if (!this.tokens) {
        throw new Error("Authentication is required.");
      }
      if (!refreshPromise) {
        const current = this.tokens;
        refreshPromise = refreshTokens(current)
          .then((tokens) => {
            this.tokens = tokens;
            return tokens.accessToken;
          })
          .catch((error) => {
            this.clearSession();
            throw error;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      return refreshPromise;
    },

    async fetchContext(): Promise<void> {
      if (!this.tokens) {
        this.context = null;
        return;
      }
      const token = await this.accessToken();
      const headers = new Headers({
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "X-Correlation-Id": crypto.randomUUID(),
      });
      if (this.selectedOrganizationId) {
        headers.set(
          runtimeConfig.organizationSelectionHeader,
          this.selectedOrganizationId,
        );
      }
      const response = await fetch(endpoint(runtimeConfig.authContextPath), {
        headers,
        cache: "no-store",
        credentials: "omit",
      });
      if (!response.ok) {
        throw new Error(`Session context failed with HTTP ${response.status}.`);
      }
      const raw = (await response.json()) as Record<string, unknown>;
      const normalized = normalizeContext(raw, this.selectedOrganizationId);
      this.context = normalized;

      const membershipIds = new Set(
        normalized.memberships.map((item) => item.organizationId),
      );
      if (
        this.selectedOrganizationId &&
        !membershipIds.has(this.selectedOrganizationId)
      ) {
        this.selectedOrganizationId = null;
        sessionStorage.removeItem(ORGANIZATION_STORAGE_KEY);
        this.context = normalizeContext(raw, null);
      } else if (
        !this.selectedOrganizationId &&
        normalized.memberships.length === 1
      ) {
        await this.selectOrganization(normalized.memberships[0].organizationId);
      }
    },

    async selectOrganization(organizationId: string): Promise<void> {
      if (
        !this.context?.memberships.some(
          (membership) => membership.organizationId === organizationId,
        )
      ) {
        throw new Error("Organization selection is not a current membership.");
      }
      this.selectedOrganizationId = organizationId;
      sessionStorage.setItem(ORGANIZATION_STORAGE_KEY, organizationId);
      await this.fetchContext();
    },

    hasPermission(permission: string): boolean {
      return this.permissions.includes(permission);
    },

    hasEveryPermission(permissions: string[]): boolean {
      return permissions.every((permission) => this.hasPermission(permission));
    },

    hasCapability(capability: string): boolean {
      return this.capabilities.includes(capability);
    },

    hasPortal(portal: PortalKind): boolean {
      return this.portals.includes(portal);
    },

    clearSession(): void {
      this.tokens = null;
      this.context = null;
      this.selectedOrganizationId = null;
      sessionStorage.removeItem(ORGANIZATION_STORAGE_KEY);
    },

    async logout(): Promise<never> {
      const idToken = this.tokens?.idToken ?? null;
      this.clearSession();
      const logoutUrl = await buildLogoutUrl(idToken);
      window.location.assign(logoutUrl);
      return new Promise<never>(() => undefined);
    },
  },
});
