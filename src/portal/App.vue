<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import { useSessionStore } from './auth/session'
import PortalShell from './layout/PortalShell.vue'

const route = useRoute()
const session = useSessionStore()
const showShell = computed(() => route.meta.shell !== false && session.authenticated)
</script>

<template>
  <a class="skip-link" href="#main-content">Skip to main content</a>
  <PortalShell v-if="showShell">
    <RouterView />
  </PortalShell>
  <RouterView v-else />
  <div class="sr-only" aria-live="polite" aria-atomic="true" />
</template>
