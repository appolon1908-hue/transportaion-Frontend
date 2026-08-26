<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const requirement = computed(() => {
  const permission = typeof route.query.permission === 'string' ? route.query.permission : ''
  const capability = typeof route.query.capability === 'string' ? route.query.capability : ''
  return permission || capability || 'required authorization'
})
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <p class="eyebrow">Access denied</p>
      <h1>This action is not available</h1>
      <p>
        Your current tenant context does not include the required permission or capability. The
        backend will continue to enforce the same rule even if a route is opened directly.
      </p>
      <div class="requirement-code"><code>{{ requirement }}</code></div>
      <button class="button button-primary" type="button" @click="router.push('/')">
        Return to overview
      </button>
    </section>
  </main>
</template>
