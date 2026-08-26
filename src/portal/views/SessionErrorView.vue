<script setup lang="ts">
import { useRouter } from 'vue-router'

import { useSessionStore } from '../auth/session'

const session = useSessionStore()
const router = useRouter()

async function restart(): Promise<void> {
  session.clearLocalSession()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <p class="eyebrow">Session unavailable</p>
      <h1>The workspace could not be opened</h1>
      <p>
        Identity was not accepted, no active tenant membership exists, or the backend context could
        not be loaded. Access remains closed until the authoritative check succeeds.
      </p>
      <div class="alert alert-error" role="alert">
        <strong>Error code</strong>
        <code>{{ session.errorCode || 'SESSION_CONTEXT_UNAVAILABLE' }}</code>
      </div>
      <button class="button button-primary" type="button" @click="restart">Return to sign in</button>
    </section>
  </main>
</template>
