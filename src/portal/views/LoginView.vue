<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

import { useSessionStore } from '../auth/session'
import { getRuntimeConfig } from '../config'

const session = useSessionStore()
const route = useRoute()
const config = getRuntimeConfig()
const submitting = ref(false)
const errorMessage = ref('')

function safeReturnTo(): string {
  const value = typeof route.query.returnTo === 'string' ? route.query.returnTo : '/'
  return value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

async function signIn(): Promise<void> {
  submitting.value = true
  errorMessage.value = ''
  try {
    await session.signIn(safeReturnTo())
  } catch (error) {
    submitting.value = false
    errorMessage.value = error instanceof Error ? error.message : 'SIGN_IN_FAILED'
  }
}
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="sign-in-title">
      <div class="brand-mark brand-mark-large" aria-hidden="true">FP</div>
      <p class="eyebrow">Secure freight workspace</p>
      <h1 id="sign-in-title">Sign in to {{ config.appName }}</h1>
      <p class="auth-intro">
        Continue through the organization identity service. This browser never receives a client
        secret and does not store bearer tokens in local storage.
      </p>

      <div v-if="errorMessage" class="alert alert-error" role="alert">
        <strong>Sign in could not start.</strong>
        <span>{{ errorMessage }}</span>
      </div>

      <button class="button button-primary button-wide" type="button" :disabled="submitting" @click="signIn">
        {{ submitting ? 'Opening identity service…' : 'Continue to sign in' }}
      </button>

      <ul class="security-notes" aria-label="Sign-in security">
        <li>Authorization Code with PKCE S256</li>
        <li>Tenant membership verified by the backend</li>
        <li>Material writes use idempotency and version checks</li>
      </ul>
    </section>
  </main>
</template>
