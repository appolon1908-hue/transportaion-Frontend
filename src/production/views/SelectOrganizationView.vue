<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../auth/store";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();
const selected = ref(auth.selectedOrganizationId ?? "");
const submitting = ref(false);
const error = ref<string | null>(null);
const activeMemberships = computed(() =>
  auth.memberships.filter((membership) => membership.status === "ACTIVE"),
);

const continueToPortal = async (): Promise<void> => {
  if (!selected.value) return;
  submitting.value = true;
  error.value = null;
  try {
    await auth.selectOrganization(selected.value);
    const returnTo =
      typeof route.query.returnTo === "string" &&
      route.query.returnTo.startsWith("/") &&
      !route.query.returnTo.startsWith("//")
        ? route.query.returnTo
        : "/";
    await router.replace(returnTo);
  } catch (reason) {
    error.value =
      reason instanceof Error ? reason.message : "Organization selection failed.";
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="page page-narrow" aria-labelledby="organization-title">
    <p class="eyebrow">Organization context</p>
    <h1 id="organization-title">Choose the company you are working in.</h1>
    <p class="page-intro">
      This selection is only a request for context. The backend verifies your
      active membership and permissions on every call.
    </p>

    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
    <div v-if="activeMemberships.length" class="selection-grid">
      <label
        v-for="membership in activeMemberships"
        :key="membership.organizationId"
        class="selection-card"
        :class="{ selected: selected === membership.organizationId }"
      >
        <input
          v-model="selected"
          type="radio"
          name="organization"
          :value="membership.organizationId"
        />
        <span>
          <strong>{{ membership.organizationName }}</strong>
          <small>{{ membership.roles.join(" · ") || "Member" }}</small>
        </span>
      </label>
    </div>
    <p v-else class="empty-state">
      Your identity is valid, but no active freight organization membership was
      returned. Contact an organization administrator.
    </p>

    <button
      type="button"
      class="button button-primary"
      :disabled="!selected || submitting"
      @click="continueToPortal"
    >
      {{ submitting ? "Verifying membership…" : "Continue" }}
    </button>
  </section>
</template>
