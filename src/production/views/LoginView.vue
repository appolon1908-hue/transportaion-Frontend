<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { runtimeConfig } from "../config";
import { useAuthStore } from "../auth/store";

const route = useRoute();
const auth = useAuthStore();
const submitting = ref(false);
const error = ref<string | null>(null);
const returnTo = computed(() =>
  typeof route.query.returnTo === "string" ? route.query.returnTo : "/",
);

const signIn = async (): Promise<void> => {
  submitting.value = true;
  error.value = null;
  try {
    await auth.login(returnTo.value);
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : "Sign-in failed.";
    submitting.value = false;
  }
};
</script>

<template>
  <main class="auth-page">
    <section class="auth-card" aria-labelledby="login-title">
      <div class="brand-mark" aria-hidden="true">F</div>
      <p class="eyebrow">{{ runtimeConfig.applicationName }}</p>
      <h1 id="login-title">Move freight with one source of truth.</h1>
      <p class="auth-copy">
        Secure access for brokerage operations, customers, carriers, compliance,
        finance, documents and integrations.
      </p>
      <div class="security-note">
        <strong>Protected sign-in</strong>
        <span>Authorization Code + PKCE through auth.codestra.co</span>
      </div>
      <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
      <button
        type="button"
        class="button button-primary button-full"
        :disabled="submitting"
        @click="signIn"
      >
        {{ submitting ? "Opening secure sign-in…" : "Continue to sign in" }}
      </button>
      <p class="auth-footnote">
        Access is granted from verified identity, organization membership and
        backend permissions. No browser client secret is used.
      </p>
    </section>
  </main>
</template>
