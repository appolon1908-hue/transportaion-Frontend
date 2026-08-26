<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../auth/store";

const router = useRouter();
const auth = useAuthStore();
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const returnTo = await auth.completeCallback(window.location.href);
    await router.replace(returnTo);
  } catch (reason) {
    error.value =
      reason instanceof Error ? reason.message : "Secure sign-in could not be completed.";
  }
});
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-live="polite">
      <div v-if="!error" class="loading-block">
        <span class="spinner" aria-hidden="true" />
        <p class="eyebrow">Validating identity</p>
        <h1>Completing secure sign-in…</h1>
        <p>Checking state, nonce, token audience and local organization access.</p>
      </div>
      <template v-else>
        <p class="eyebrow">Sign-in stopped</p>
        <h1>We could not verify this request.</h1>
        <p class="alert alert-error" role="alert">{{ error }}</p>
        <RouterLink class="button button-primary button-full" to="/login">
          Start a new sign-in
        </RouterLink>
      </template>
    </section>
  </main>
</template>
