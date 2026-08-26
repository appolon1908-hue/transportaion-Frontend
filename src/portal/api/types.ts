export interface PrincipalSummary {
  id?: string
  subject: string
  email?: string
  displayName: string
}

export interface TenantMembership {
  tenantId: string
  tenantName: string
  organizationId?: string
  organizationName?: string
  status: string
  roles: string[]
  permissions: string[]
  capabilities: string[]
}

export interface AuthMe {
  principal: PrincipalSummary
  memberships: TenantMembership[]
}

export interface AuthContext {
  principal: PrincipalSummary
  tenantId: string
  tenantName: string
  organizationId?: string
  organizationName?: string
  roles: string[]
  permissions: string[]
  capabilities: string[]
}

export interface FieldError {
  field?: string
  code?: string
  message: string
}

export interface ApiErrorPayload {
  code?: string
  message?: string
  correlation_id?: string
  correlationId?: string
  fields?: unknown
  field_errors?: unknown
  current_version?: number
  currentVersion?: number
  blockers?: unknown
  warnings?: unknown
  [key: string]: unknown
}

export interface Page<T> {
  items: T[]
  total?: number
  nextCursor?: string | null
}

function stringValue(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean))]
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalizePrincipal(value: unknown, fallback: Record<string, unknown> = {}): PrincipalSummary {
  const item = record(value)
  const subject = stringValue(item.subject, item.sub, fallback.subject, fallback.sub)
  if (!subject) throw new Error('AUTH_PRINCIPAL_SUBJECT_MISSING')
  const email = stringValue(item.email, fallback.email)
  const displayName =
    stringValue(
      item.display_name,
      item.displayName,
      item.name,
      fallback.display_name,
      fallback.displayName,
      fallback.name,
      email,
      subject,
    ) ?? subject
  return {
    ...(stringValue(item.id, fallback.id) ? { id: stringValue(item.id, fallback.id) } : {}),
    subject,
    ...(email ? { email } : {}),
    displayName,
  }
}

function normalizeMembership(value: unknown): TenantMembership | null {
  const item = record(value)
  const tenant = record(item.tenant)
  const organization = record(item.organization)
  const tenantId = stringValue(item.tenant_id, item.tenantId, tenant.id)
  if (!tenantId) return null
  const tenantName = stringValue(item.tenant_name, item.tenantName, tenant.name, tenantId) ?? tenantId
  const organizationId = stringValue(item.organization_id, item.organizationId, organization.id)
  const organizationName = stringValue(
    item.organization_name,
    item.organizationName,
    organization.name,
  )
  return {
    tenantId,
    tenantName,
    ...(organizationId ? { organizationId } : {}),
    ...(organizationName ? { organizationName } : {}),
    status: (stringValue(item.status, item.membership_status) ?? 'ACTIVE').toUpperCase(),
    roles: stringList(item.roles),
    permissions: stringList(item.permissions),
    capabilities: stringList(item.capabilities),
  }
}

export function normalizeAuthMe(value: unknown): AuthMe {
  const root = record(value)
  const principal = normalizePrincipal(root.user ?? root.principal ?? root, root)
  const membershipSource =
    (Array.isArray(root.memberships) && root.memberships) ||
    (Array.isArray(root.tenant_memberships) && root.tenant_memberships) ||
    (Array.isArray(root.tenants) && root.tenants) ||
    []
  const memberships = membershipSource
    .map(normalizeMembership)
    .filter((item): item is TenantMembership => item !== null)
  return { principal, memberships }
}

export function normalizeAuthContext(value: unknown, membership: TenantMembership): AuthContext {
  const root = record(value)
  const principal = normalizePrincipal(root.user ?? root.principal ?? root, root)
  return {
    principal,
    tenantId: stringValue(root.tenant_id, root.tenantId, membership.tenantId) ?? membership.tenantId,
    tenantName:
      stringValue(root.tenant_name, root.tenantName, membership.tenantName) ?? membership.tenantName,
    ...(stringValue(root.organization_id, root.organizationId, membership.organizationId)
      ? {
          organizationId: stringValue(
            root.organization_id,
            root.organizationId,
            membership.organizationId,
          ),
        }
      : {}),
    ...(stringValue(root.organization_name, root.organizationName, membership.organizationName)
      ? {
          organizationName: stringValue(
            root.organization_name,
            root.organizationName,
            membership.organizationName,
          ),
        }
      : {}),
    roles: stringList(root.roles).length ? stringList(root.roles) : membership.roles,
    permissions: stringList(root.permissions).length
      ? stringList(root.permissions)
      : membership.permissions,
    capabilities: stringList(root.capabilities).length
      ? stringList(root.capabilities)
      : membership.capabilities,
  }
}
