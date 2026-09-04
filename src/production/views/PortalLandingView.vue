<script setup lang="ts">
import { computed } from "vue";
import type { PortalKind } from "../types";

const props = defineProps<{ portal: PortalKind }>();

const content = computed(() => {
  const values = {
    ADMIN: {
      eyebrow: "Platform administration",
      title: "Govern the freight platform.",
      description:
        "Manage identity, permissions, capabilities, integrations, compliance policies, audit and release evidence.",
      modules: ["Identity & access", "Capabilities", "Integrations", "Compliance", "Audit & provenance", "Operations health"],
    },
    OPERATIONS: {
      eyebrow: "Transportation operations",
      title: "Plan, tender, dispatch and recover.",
      description:
        "Run the brokerage lifecycle from customer quote through delivery, billing, settlement and exception resolution.",
      modules: ["Customers & quotes", "Shipments", "Loads & legs", "Carrier search", "Tenders", "Dispatch", "Visibility", "Exceptions"],
    },
    CUSTOMER: {
      eyebrow: "Customer portal",
      title: "Track freight and act with confidence.",
      description:
        "View approved shipments, milestones, documents, invoices, claims and service requests for your organization.",
      modules: ["Quotes", "Shipments", "Tracking", "Documents", "Invoices", "Claims", "Support"],
    },
    CARRIER: {
      eyebrow: "Carrier portal",
      title: "Respond, haul and get paid.",
      description:
        "Review tenders, manage assigned loads, provide compliance evidence, upload delivery documents and follow settlements.",
      modules: ["Tenders", "Assigned loads", "Stops", "Tracking", "Compliance", "Documents", "Settlements"],
    },
  } satisfies Record<PortalKind, {
    eyebrow: string;
    title: string;
    description: string;
    modules: string[];
  }>;
  return values[props.portal];
});
</script>

<template>
  <section class="page" :aria-labelledby="`${portal.toLowerCase()}-title`">
    <p class="eyebrow">{{ content.eyebrow }}</p>
    <h1 :id="`${portal.toLowerCase()}-title`">{{ content.title }}</h1>
    <p class="page-intro">{{ content.description }}</p>

    <div class="module-grid">
      <article v-for="module in content.modules" :key="module" class="module-card">
        <span class="module-dot" aria-hidden="true" />
        <strong>{{ module }}</strong>
        <small>Workflow route prepared in the domain feature stack.</small>
      </article>
    </div>

    <aside class="info-panel">
      <strong>Shell access verified.</strong>
      <p>
        Detailed domain workflows are intentionally isolated in the next stacked
        branch so identity and API-client review can complete independently.
      </p>
    </aside>
  </section>
</template>
