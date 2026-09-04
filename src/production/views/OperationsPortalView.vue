<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ApiError } from "../api/client";
import {
  portalApi,
  type ControlTower,
  type OperationalException,
} from "../api/portals";
import { useAuthStore } from "../auth/store";

const auth = useAuthStore();
const tower = ref<ControlTower | null>(null);
const queue = ref<OperationalException[]>([]);
const loading = ref(true);
const error = ref("");

const metricEntries = computed(() => Object.entries(tower.value?.metrics ?? {}));

const label = (value: string): string =>
  value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const describeError = (value: unknown): string => {
  if (value instanceof ApiError) return `${value.message} (${value.code})`;
  return value instanceof Error ? value.message : "The operations request failed.";
};

const refresh = async (): Promise<void> => {
  loading.value = true;
  error.value = "";
  try {
    const [controlTower, workQueue] = await Promise.all([
      portalApi.operations.controlTower(),
      portalApi.operations.queue(),
    ]);
    tower.value = controlTower;
    queue.value = workQueue.items;
  } catch (value) {
    error.value = describeError(value);
  } finally {
    loading.value = false;
  }
};

const transition = async (
  item: OperationalException,
  status: "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED",
): Promise<void> => {
  error.value = "";
  try {
    const updated = await portalApi.operations.updateException(item.id, {
      expected_version: item.version,
      status,
      assigned_to:
        status === "ACKNOWLEDGED" || status === "IN_PROGRESS"
          ? auth.user?.displayName ?? auth.user?.subject ?? null
          : item.assigned_to,
      detail: item.detail,
    });
    queue.value =
      status === "RESOLVED" || status === "DISMISSED"
        ? queue.value.filter((candidate) => candidate.id !== item.id)
        : queue.value.map((candidate) =>
            candidate.id === updated.id ? updated : candidate,
          );
    await refresh();
  } catch (value) {
    error.value = describeError(value);
  }
};

onMounted(refresh);
</script>

<template>
  <section class="page" aria-labelledby="operations-title">
    <div class="page-heading-row">
      <div>
        <p class="eyebrow">Transportation operations</p>
        <h1 id="operations-title">Control tower and exception queue</h1>
        <p class="page-intro">
          Monitor shipments, tenders, tracking, portal submissions and durable
          integration delivery without enabling live external effects.
        </p>
      </div>
      <button class="secondary-button" type="button" :disabled="loading" @click="refresh">
        {{ loading ? "Refreshing…" : "Refresh" }}
      </button>
    </div>

    <p v-if="error" class="alert" role="alert">{{ error }}</p>

    <div class="metric-grid operations-metrics">
      <article v-for="[name, value] in metricEntries" :key="name" class="metric-card">
        <span>{{ label(name) }}</span>
        <strong>{{ value }}</strong>
        <small>Authoritative tenant data</small>
      </article>
    </div>

    <aside class="safety-banner" :class="{ safe: tower && !tower.live_effects_enabled }">
      <strong>{{ tower?.live_effects_enabled ? "Live external effects enabled" : "Live external effects remain disabled" }}</strong>
      <span>Odoo, n8n, tender delivery and portal rollout stay backend capability-gated.</span>
    </aside>

    <article class="work-panel">
      <div class="section-heading compact">
        <div>
          <p class="eyebrow">Work queue</p>
          <h2>{{ queue.length }} open operational exceptions</h2>
        </div>
      </div>

      <div class="queue-list">
        <article v-for="item in queue" :key="item.id" class="exception-card">
          <div class="exception-copy">
            <div class="title-row">
              <strong>{{ item.code }}</strong>
              <span class="status-pill">{{ item.status }}</span>
            </div>
            <p>{{ item.resource_type }} <span v-if="item.resource_id">· {{ item.resource_id }}</span></p>
            <p v-if="item.detail" class="detail-copy">{{ item.detail }}</p>
            <small>Assigned to {{ item.assigned_to || "unassigned" }} · version {{ item.version }}</small>
          </div>
          <div class="action-row">
            <button type="button" @click="transition(item, 'ACKNOWLEDGED')">Acknowledge</button>
            <button type="button" @click="transition(item, 'IN_PROGRESS')">Start work</button>
            <button type="button" class="positive-action" @click="transition(item, 'RESOLVED')">Resolve</button>
            <button type="button" class="muted-action" @click="transition(item, 'DISMISSED')">Dismiss</button>
          </div>
        </article>
        <p v-if="!loading && queue.length === 0" class="empty-state">
          No open operational exceptions. Continue monitoring tracking and integration delivery.
        </p>
      </div>
    </article>
  </section>
</template>

<style scoped>
.operations-metrics{margin-top:1.5rem}.secondary-button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:.7rem 1rem;font-weight:800}.alert{background:#fff1f0;color:#8a1c13;border-radius:.85rem;padding:.8rem 1rem;margin:1rem 0}.safety-banner{display:flex;justify-content:space-between;gap:1rem;align-items:center;margin:1.25rem 0;padding:1rem 1.15rem;border-radius:1rem;background:#fff7ed;color:#9a3412}.safety-banner.safe{background:#ecfdf3;color:#067647}.work-panel{background:#fff;border:1px solid #dfe5ea;border-radius:1.25rem;padding:1.25rem;box-shadow:0 14px 42px rgba(15,23,42,.05)}.compact{margin-bottom:1rem}.queue-list{display:grid;gap:.8rem}.exception-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:1rem;align-items:center;border:1px solid #e2e8f0;border-radius:1rem;padding:1rem}.title-row{display:flex;align-items:center;gap:.7rem}.exception-copy p{margin:.3rem 0;color:#475569}.detail-copy{white-space:pre-wrap}.action-row{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.5rem}.action-row button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:.5rem .75rem;font-weight:750}.positive-action{color:#067647}.muted-action{color:#64748b}.empty-state{color:#64748b;padding:1rem}@media(max-width:850px){.exception-card{grid-template-columns:1fr}.action-row{justify-content:flex-start}.safety-banner{align-items:flex-start;flex-direction:column}}
</style>
