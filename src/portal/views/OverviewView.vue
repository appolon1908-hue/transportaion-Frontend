<script setup lang="ts">
import { computed } from 'vue'

import { useSessionStore } from '../auth/session'
import { navigationItems } from '../navigation'

const session = useSessionStore()
const availableLinks = computed(() =>
  navigationItems.filter((item) => {
    if (item.to === '/' || item.to === '/profile') return false
    if (item.permission && !session.hasPermission(item.permission)) return false
    if (item.anyPermission?.length && !session.hasAnyPermission(item.anyPermission)) return false
    if (item.capability && !session.hasCapability(item.capability)) return false
    return true
  }),
)
</script>

<template>
  <section class="page-stack">
    <header class="page-header">
      <div>
        <p class="eyebrow">Tenant workspace</p>
        <h1>{{ session.context?.organizationName || session.context?.tenantName }}</h1>
        <p>Backend-authoritative identity, roles, permissions and capabilities for this session.</p>
      </div>
      <RouterLink class="button button-secondary" to="/profile">View access profile</RouterLink>
    </header>

    <div class="metric-grid">
      <article class="metric-card">
        <span>Active tenant</span>
        <strong>{{ session.context?.tenantName }}</strong>
        <small>{{ session.context?.tenantId }}</small>
      </article>
      <article class="metric-card">
        <span>Roles</span>
        <strong>{{ session.context?.roles.length || 0 }}</strong>
        <small>{{ session.context?.roles.join(', ') || 'No assigned roles' }}</small>
      </article>
      <article class="metric-card">
        <span>Permissions</span>
        <strong>{{ session.context?.permissions.length || 0 }}</strong>
        <small>Used to control portal actions</small>
      </article>
      <article class="metric-card">
        <span>Capabilities</span>
        <strong>{{ session.context?.capabilities.length || 0 }}</strong>
        <small>Live effects remain backend gated</small>
      </article>
    </div>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">Available workspaces</p>
          <h2>Continue your work</h2>
        </div>
      </div>
      <div v-if="availableLinks.length" class="workspace-grid">
        <RouterLink v-for="item in availableLinks" :key="item.to" :to="item.to" class="workspace-card">
          <strong>{{ item.label }}</strong>
          <span>{{ item.description }}</span>
          <small>{{ item.group }}</small>
        </RouterLink>
      </div>
      <div v-else class="empty-state compact">
        <h3>No additional workspace is enabled</h3>
        <p>Feature navigation appears only when the tenant context includes its authorization.</p>
      </div>
    </section>
  </section>
</template>
