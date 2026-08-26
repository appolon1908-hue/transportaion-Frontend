export type PortalKind = "ADMIN" | "OPERATIONS" | "CUSTOMER" | "CARRIER";

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  roles: string[];
  permissions: string[];
  capabilities: string[];
  status: string;
}

export interface CurrentUser {
  id: string;
  subject: string;
  email: string;
  displayName: string;
}

export interface SessionContext {
  user: CurrentUser;
  memberships: OrganizationMembership[];
  selectedOrganizationId: string | null;
  permissions: string[];
  capabilities: string[];
  roles: string[];
  portals: PortalKind[];
}

export interface OidcTokens {
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  tokenType: string;
  expiresAt: number;
  scope: string;
}

export interface RateLimitSnapshot {
  limit: number | null;
  remaining: number | null;
  resetAt: number | null;
  retryAfterSeconds: number | null;
}

export interface ApiResponse<T> {
  data: T;
  etag: string | null;
  correlationId: string | null;
  rateLimit: RateLimitSnapshot;
}

export interface ApiProblem {
  code: string;
  message: string;
  details?: unknown;
  reasons?: string[];
  currentVersion?: number;
  correlationId?: string | null;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  nextCursor: string | null;
}
