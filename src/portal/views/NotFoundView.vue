<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <main class="auth-page">
    <section class="auth-card">
      <p class="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The requested portal route does not exist or is no longer available.</p>
      <button class="button button-primary" type="button" @click="router.push('/')">
        Return to overview
      </button>
    </section>
  </main>
</template>
