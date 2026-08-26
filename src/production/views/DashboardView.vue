<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "../auth/store";

const auth = useAuthStore();

const portalCards = computed(() => [
  {
    portal: "ADMIN",
    title: "Administration",
    description: "Users, access, capabilities, integrations, audit and platform controls.",
    to: "/portal/admin",
    enabled: auth.hasPortal("ADMIN"),
  },
  {
    portal: "OPERATIONS",
    title: "Transportation operations",
    description: "Quotes, shipments, loads, tenders, dispatch, tracking and exceptions.",
    to: "/portal/operations",
    enabled: auth.hasPortal("OPERATIONS"),
  },
  {
    portal: "CUSTOMER",
    title: "Customer portal",
    description: "Shipment visibility, documents, invoices, claims and service requests.",
    to: "/portal/customer",
    enabled:
      auth.hasPortal("CUSTOMER") &&
      auth.hasCapability("customer_portal.external_access"),
  },
  {
    portal: "CARRIER",
    title: "Carrier portal",
    description: "Tender response, assigned loads, compliance evidence and settlement status.",
    to: "/portal/carrier",
    enabled:
      auth.hasPortal("CARRIER") &&
      auth.hasCapability("carrier_portal.external_access"),
  },
]);
</script>

<template>
  <section class="page" aria-labelledby="dashboard-title">
    <div class="page-heading-row">
      <div>
        <p class="eyebrow">Control tower</p>
        <h1 id="dashboard-title">Good to see you, {{ auth.user?.displayName }}.</h1>
        <p class="page-intro">
          Work inside {{ auth.organizationName }} with the permissions returned by
          the authoritative backend session.
        </p>
      </div>
      <span class="status-pill status-positive">Secure session active</span>
    </div>

    <div class="metric-grid">
      <article class="metric-card">
        <span>Active roles</span>
        <strong>{{ auth.context?.roles.length ?? 0 }}</strong>
        <small>Organization-scoped</small>
      </article>
      <article class="metric-card">
        <span>Granted permissions</span>
        <strong>{{ auth.permissions.length }}</strong>
        <small>Used for navigation only</small>
      </article>
      <article class="metric-card">
        <span>Enabled capabilities</span>
        <strong>{{ auth.capabilities.length }}</strong>
        <small>Live effects remain backend-gated</small>
      </article>
      <article class="metric-card">
        <span>Available workspaces</span>
        <strong>{{ portalCards.filter((card) => card.enabled).length }}</strong>
        <small>Based on access and rollout state</small>
      </article>
    </div>

    <div class="section-heading">
      <div>
        <p class="eyebrow">Your workspaces</p>
        <h2>Open a portal</h2>
      </div>
    </div>

    <div class="portal-grid">
      <article
        v-for="card in portalCards"
        :key="card.portal"
        class="portal-card"
        :class="{ disabled: !card.enabled }"
      >
        <span class="portal-code">{{ card.portal }}</span>
        <h3>{{ card.title }}</h3>
        <p>{{ card.description }}</p>
        <RouterLink v-if="card.enabled" class="text-link" :to="card.to">
          Open workspace <span aria-hidden="true">→</span>
        </RouterLink>
        <span v-else class="locked-copy">Not granted or not activated</span>
      </article>
    </div>

    <aside class="governance-banner">
      <div>
        <strong>Frontend access is not authorization.</strong>
        <p>
          Every API operation is rechecked for identity, membership, permission,
          capability, tenant isolation, idempotency and concurrency by the backend.
        </p>
      </div>
    </aside>
  </section>
</template>
