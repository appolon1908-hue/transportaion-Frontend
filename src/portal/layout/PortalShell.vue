<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useSessionStore } from '../auth/session'
import { getRuntimeConfig } from '../config'
import { navigationItems, type NavigationItem } from '../navigation'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const mobileNavigationOpen = ref(false)
const switchingTenant = ref(false)
const config = getRuntimeConfig()

const visibleNavigation = computed(() =>
  navigationItems.filter((item) => {
    if (item.permission && !session.hasPermission(item.permission)) return false
    if (item.anyPermission?.length && !session.hasAnyPermission(item.anyPermission)) return false
    if (item.capability && !session.hasCapability(item.capability)) return false
    return true
  }),
)

const groupedNavigation = computed(() => {
  const groups = new Map<NavigationItem['group'], NavigationItem[]>()
  for (const item of visibleNavigation.value) {
    const group = groups.get(item.group) ?? []
    group.push(item)
    groups.set(item.group, group)
  }
  return [...groups.entries()]
})

const selectedTenant = computed(() => session.activeTenantId ?? '')
const environmentLabel = computed(() =>
  config.environment === 'production' ? '' : config.environment.toUpperCase(),
)

async function changeTenant(event: Event): Promise<void> {
  const value = (event.target as HTMLSelectElement).value
  if (!value || value === session.activeTenantId) return
  switchingTenant.value = true
  try {
    await session.selectTenant(value)
    await router.push({ name: 'overview' })
  } finally {
    switchingTenant.value = false
  }
}

async function signOut(): Promise<void> {
  await session.signOut()
}

function closeMobileNavigation(): void {
  mobileNavigationOpen.value = false
}
</script>

<template>
  <div class="portal-shell">
    <aside class="portal-sidebar" :class="{ 'is-open': mobileNavigationOpen }" aria-label="Primary">
      <div class="brand-block">
        <div class="brand-mark" aria-hidden="true">FP</div>
        <div>
          <strong>{{ config.appName }}</strong>
          <span v-if="environmentLabel" class="environment-badge">{{ environmentLabel }}</span>
        </div>
        <button
          class="icon-button mobile-only"
          type="button"
          aria-label="Close navigation"
          @click="closeMobileNavigation"
        >
          ×
        </button>
      </div>

      <nav class="sidebar-navigation">
        <section v-for="[group, items] in groupedNavigation" :key="group" class="navigation-group">
          <h2>{{ group }}</h2>
          <RouterLink
            v-for="item in items"
            :key="item.to"
            :to="item.to"
            class="navigation-link"
            :class="{ active: route.path === item.to || (item.to !== '/' && route.path.startsWith(item.to)) }"
            @click="closeMobileNavigation"
          >
            <span>{{ item.label }}</span>
            <small v-if="item.description">{{ item.description }}</small>
          </RouterLink>
        </section>
      </nav>
    </aside>

    <div v-if="mobileNavigationOpen" class="sidebar-scrim" @click="closeMobileNavigation" />

    <div class="portal-workspace">
      <header class="portal-header">
        <button
          class="icon-button mobile-only"
          type="button"
          aria-label="Open navigation"
          @click="mobileNavigationOpen = true"
        >
          ☰
        </button>

        <div class="tenant-control">
          <label for="active-tenant">Organization</label>
          <select
            id="active-tenant"
            :value="selectedTenant"
            :disabled="switchingTenant"
            @change="changeTenant"
          >
            <option
              v-for="membership in session.memberships"
              :key="membership.tenantId"
              :value="membership.tenantId"
            >
              {{ membership.organizationName || membership.tenantName }}
            </option>
          </select>
        </div>

        <div class="header-account">
          <div class="account-copy">
            <strong>{{ session.principal?.displayName }}</strong>
            <small>{{ session.principal?.email || 'Authenticated user' }}</small>
          </div>
          <button class="button button-quiet" type="button" @click="signOut">Sign out</button>
        </div>
      </header>

      <main id="main-content" class="portal-main" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>
</template>
