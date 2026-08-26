import { computed, onScopeDispose, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'

import { apiClient } from '../api/client'
import {
  normalizeAuthContext,
  normalizeAuthMe,
  type AuthContext,
  type AuthMe,
  type TenantMembership,
} from '../api/types'
import {
  beginAuthorization,
  clearAuthorizationTransaction,
  completeAuthorization,
  endSessionUrl,
  refreshAuthorization,
  type OidcTokens,
} from './oidc'

export type SessionStatus =
  | 'booting'
  | 'anonymous'
  | 'authenticating'
  | 'selecting-tenant'
  | 'authenticated'
  | 'error'

const SELECTED_TENANT_KEY = 'freight.selected-tenant.v1'
const REFRESH_SKEW_MS = 60_000

function activeMemberships(value: AuthMe | null): TenantMembership[] {
  return (value?.memberships ?? []).filter((membership) => membership.status === 'ACTIVE')
}

export const useSessionStore = defineStore('portal-session', () => {
  const status = ref<SessionStatus>('booting')
  const tokens = shallowRef<OidcTokens | null>(null)
  const identity = shallowRef<AuthMe | null>(null)
  const context = shallowRef<AuthContext | null>(null)
  const activeTenantId = ref<string | null>(null)
  const errorCode = ref<string | null>(null)
  const initialized = ref(false)
  let refreshTimer: number | null = null
  let refreshPromise: Promise<boolean> | null = null

  const authenticated = computed(
    () => status.value === 'authenticated' && Boolean(tokens.value?.accessToken && context.value),
  )
  const memberships = computed(() => activeMemberships(identity.value))
  const principal = computed(() => context.value?.principal ?? identity.value?.principal ?? null)
  const permissions = computed(() => new Set(context.value?.permissions ?? []))
  const capabilities = computed(() => new Set(context.value?.capabilities ?? []))
  const roles = computed(() => new Set(context.value?.roles ?? []))

  function clearRefreshTimer(): void {
    if (refreshTimer !== null) window.clearTimeout(refreshTimer)
    refreshTimer = null
  }

  function scheduleRefresh(): void {
    clearRefreshTimer()
    const current = tokens.value
    if (!current?.refreshToken) return
    const delay = Math.max(current.expiresAt - Date.now() - REFRESH_SKEW_MS, 5_000)
    refreshTimer = window.setTimeout(() => {
      void refreshTokens()
    }, delay)
  }

  function setTokens(value: OidcTokens): void {
    // Tokens intentionally exist only in JavaScript memory. They are never
    // written to localStorage, sessionStorage, IndexedDB, URLs or logs.
    tokens.value = value
    scheduleRefresh()
  }

  function clearLocalSession(): void {
    clearRefreshTimer()
    tokens.value = null
    identity.value = null
    context.value = null
    activeTenantId.value = null
    errorCode.value = null
    sessionStorage.removeItem(SELECTED_TENANT_KEY)
    clearAuthorizationTransaction()
  }

  async function loadIdentity(): Promise<AuthMe> {
    const raw = await apiClient.request<unknown>('/api/v1/auth/me', {
      includeTenant: false,
      retrySafeReads: true,
    })
    const normalized = normalizeAuthMe(raw)
    identity.value = normalized
    return normalized
  }

  async function selectTenant(tenantId: string): Promise<void> {
    const membership = memberships.value.find((item) => item.tenantId === tenantId)
    if (!membership) throw new Error('TENANT_MEMBERSHIP_NOT_ACTIVE')
    const previous = activeTenantId.value
    status.value = 'selecting-tenant'
    activeTenantId.value = membership.tenantId
    try {
      const raw = await apiClient.request<unknown>('/api/v1/auth/context', {
        includeTenant: true,
        retrySafeReads: true,
      })
      const normalized = normalizeAuthContext(raw, membership)
      if (normalized.tenantId !== membership.tenantId) throw new Error('AUTH_CONTEXT_TENANT_MISMATCH')
      context.value = normalized
      sessionStorage.setItem(SELECTED_TENANT_KEY, membership.tenantId)
      status.value = 'authenticated'
    } catch (error) {
      activeTenantId.value = previous
      context.value = null
      status.value = 'selecting-tenant'
      throw error
    }
  }

  async function establishTenant(): Promise<void> {
    const available = memberships.value
    if (available.length === 0) {
      status.value = 'error'
      errorCode.value = 'NO_ACTIVE_TENANT_MEMBERSHIP'
      return
    }
    const remembered = sessionStorage.getItem(SELECTED_TENANT_KEY)
    const selected = available.find((item) => item.tenantId === remembered) ?? available[0]
    if (selected && available.length === 1) {
      await selectTenant(selected.tenantId)
      return
    }
    if (remembered && selected?.tenantId === remembered) {
      await selectTenant(selected.tenantId)
      return
    }
    status.value = 'selecting-tenant'
  }

  async function initialize(): Promise<void> {
    if (initialized.value) return
    initialized.value = true
    if (!tokens.value) {
      status.value = 'anonymous'
      return
    }
    try {
      await loadIdentity()
      await establishTenant()
    } catch (error) {
      clearLocalSession()
      status.value = 'error'
      errorCode.value = error instanceof Error ? error.message : 'SESSION_INITIALIZATION_FAILED'
    }
  }

  async function signIn(returnTo = window.location.pathname + window.location.search): Promise<never> {
    status.value = 'authenticating'
    errorCode.value = null
    return beginAuthorization(returnTo)
  }

  async function handleAuthorizationCallback(): Promise<string> {
    status.value = 'authenticating'
    errorCode.value = null
    try {
      const result = await completeAuthorization()
      setTokens(result.tokens)
      await loadIdentity()
      await establishTenant()
      return result.returnTo
    } catch (error) {
      clearLocalSession()
      status.value = 'error'
      errorCode.value = error instanceof Error ? error.message : 'OIDC_CALLBACK_FAILED'
      throw error
    }
  }

  async function refreshTokens(): Promise<boolean> {
    if (refreshPromise) return refreshPromise
    const current = tokens.value
    if (!current?.refreshToken) return false
    if (current.refreshExpiresAt && current.refreshExpiresAt <= Date.now() + 5_000) return false

    refreshPromise = (async () => {
      try {
        const refreshed = await refreshAuthorization(current.refreshToken as string)
        setTokens(refreshed)
        return true
      } catch {
        clearLocalSession()
        status.value = 'anonymous'
        return false
      } finally {
        refreshPromise = null
      }
    })()
    return refreshPromise
  }

  async function signOut(): Promise<never> {
    const idToken = tokens.value?.idToken
    const target = await endSessionUrl(idToken)
    clearLocalSession()
    status.value = 'anonymous'
    window.location.assign(target)
    return await new Promise<never>(() => undefined)
  }

  function hasPermission(permission: string): boolean {
    return permissions.value.has(permission)
  }

  function hasAnyPermission(required: string[]): boolean {
    return required.some((permission) => permissions.value.has(permission))
  }

  function hasCapability(capability: string): boolean {
    return capabilities.value.has(capability)
  }

  function hasRole(role: string): boolean {
    return roles.value.has(role)
  }

  apiClient.configure({
    getAccessToken: () => tokens.value?.accessToken ?? null,
    getTenantId: () => activeTenantId.value,
    onUnauthorized: refreshTokens,
  })

  onScopeDispose(clearRefreshTimer)

  return {
    status,
    identity,
    context,
    activeTenantId,
    errorCode,
    initialized,
    authenticated,
    memberships,
    principal,
    permissions,
    capabilities,
    roles,
    initialize,
    signIn,
    signOut,
    handleAuthorizationCallback,
    refreshTokens,
    selectTenant,
    hasPermission,
    hasAnyPermission,
    hasCapability,
    hasRole,
    clearLocalSession,
  }
})
