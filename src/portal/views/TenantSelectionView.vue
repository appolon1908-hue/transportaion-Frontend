<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useSessionStore } from '../auth/session'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const selecting = ref<string | null>(null)
const errorMessage = ref('')

function safeReturnTo(): string {
  const value = typeof route.query.returnTo === 'string' ? route.query.returnTo : '/'
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

async function choose(tenantId: string): Promise<void> {
  selecting.value = tenantId
  errorMessage.value = ''
  try {
    await session.selectTenant(tenantId)
    await router.replace(safeReturnTo())
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'TENANT_SELECTION_FAILED'
  } finally {
    selecting.value = null
  }
}

async function signOut(): Promise<void> {
  await session.signOut()
}
</script>

<template>
  <main class="auth-page auth-page-wide">
    <section class="selection-card" aria-labelledby="organization-title">
      <p class="eyebrow">Tenant boundary</p>
      <h1 id="organization-title">Choose an organization</h1>
      <p>
        Every request is checked against your active membership. Switching organizations changes
        the tenant header and reloads backend-authoritative permissions.
      </p>

      <div v-if="errorMessage" class="alert alert-error" role="alert">
        <strong>Organization could not be selected.</strong>
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="session.memberships.length" class="tenant-grid">
        <button
          v-for="membership in session.memberships"
          :key="membership.tenantId"
          class="tenant-option"
          type="button"
          :disabled="selecting !== null"
          @click="choose(membership.tenantId)"
        >
          <span class="tenant-option-title">
            {{ membership.organizationName || membership.tenantName }}
          </span>
          <span>{{ membership.roles.join(', ') || 'Member' }}</span>
          <small>{{ membership.tenantId }}</small>
          <strong>{{ selecting === membership.tenantId ? 'Loading…' : 'Open workspace' }}</strong>
        </button>
      </div>
      <div v-else class="empty-state">
        <h2>No active organization membership</h2>
        <p>Ask an administrator to add your identity to an active tenant membership.</p>
      </div>

      <button class="button button-quiet" type="button" @click="signOut">Sign out</button>
    </section>
  </main>
</template>
