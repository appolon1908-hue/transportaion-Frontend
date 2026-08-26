<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useSessionStore } from '../auth/session'

const session = useSessionStore()
const router = useRouter()
const errorMessage = ref('')

onMounted(async () => {
  try {
    const returnTo = await session.handleAuthorizationCallback()
    if (session.status === 'selecting-tenant') {
      await router.replace({ name: 'select-organization', query: { returnTo } })
    } else {
      await router.replace(returnTo)
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'OIDC_CALLBACK_FAILED'
  }
})

async function retry(): Promise<void> {
  session.clearLocalSession()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-live="polite">
      <template v-if="!errorMessage">
        <div class="progress-ring" aria-hidden="true" />
        <p class="eyebrow">Identity verification</p>
        <h1>Completing sign in</h1>
        <p>Validating the callback, loading tenant memberships, and preparing your workspace.</p>
      </template>
      <template v-else>
        <div class="alert alert-error" role="alert">
          <strong>Sign in was not completed.</strong>
          <span>{{ errorMessage }}</span>
        </div>
        <button class="button button-primary" type="button" @click="retry">Return to sign in</button>
      </template>
    </section>
  </main>
</template>
