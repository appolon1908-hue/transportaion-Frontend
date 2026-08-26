<script setup lang="ts">
import { useSessionStore } from '../auth/session'

const session = useSessionStore()
</script>

<template>
  <section class="page-stack">
    <header class="page-header">
      <div>
        <p class="eyebrow">Identity context</p>
        <h1>{{ session.principal?.displayName }}</h1>
        <p>{{ session.principal?.email || session.principal?.subject }}</p>
      </div>
    </header>

    <div class="detail-grid">
      <section class="panel">
        <div class="panel-heading"><h2>Principal</h2></div>
        <dl class="definition-list">
          <div><dt>Subject</dt><dd><code>{{ session.principal?.subject }}</code></dd></div>
          <div><dt>Tenant</dt><dd>{{ session.context?.tenantName }}</dd></div>
          <div><dt>Tenant ID</dt><dd><code>{{ session.context?.tenantId }}</code></dd></div>
          <div v-if="session.context?.organizationName">
            <dt>Organization</dt><dd>{{ session.context.organizationName }}</dd>
          </div>
        </dl>
      </section>

      <section class="panel">
        <div class="panel-heading"><h2>Roles</h2></div>
        <div class="tag-list">
          <span v-for="role in session.context?.roles" :key="role" class="tag">{{ role }}</span>
          <span v-if="!session.context?.roles.length" class="muted">No roles returned.</span>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Permissions</h2>
          <p>Portal actions are hidden when these exact backend permissions are absent.</p>
        </div>
      </div>
      <div class="tag-list code-tags">
        <code v-for="permission in session.context?.permissions" :key="permission" class="tag">
          {{ permission }}
        </code>
        <span v-if="!session.context?.permissions.length" class="muted">No permissions returned.</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Capabilities</h2>
          <p>Capabilities indicate tenant eligibility; the backend rechecks them when effects occur.</p>
        </div>
      </div>
      <div class="tag-list code-tags">
        <code v-for="capability in session.context?.capabilities" :key="capability" class="tag">
          {{ capability }}
        </code>
        <span v-if="!session.context?.capabilities.length" class="muted">No capabilities enabled.</span>
      </div>
    </section>
  </section>
</template>
