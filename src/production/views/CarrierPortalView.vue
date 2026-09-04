<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ApiError } from "../api/client";
import {
  portalApi,
  type CarrierEvidence,
  type Load,
  type PortalContext,
  type Settlement,
  type Tender,
} from "../api/portals";

const context = ref<PortalContext | null>(null);
const tenders = ref<Tender[]>([]);
const loads = ref<Load[]>([]);
const evidence = ref<CarrierEvidence[]>([]);
const settlements = ref<Settlement[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");

const tracking = reactive({
  load_id: "",
  source_event_id: "",
  event_type: "IN_TRANSIT" as
    | "EN_ROUTE_TO_PICKUP"
    | "ARRIVED_PICKUP"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "DELAYED"
    | "ARRIVED_DELIVERY"
    | "DELIVERED",
  occurred_at: new Date().toISOString().slice(0, 16),
  latitude: "",
  longitude: "",
  note: "",
});

const evidenceForm = reactive({
  evidence_type: "AUTO_LIABILITY" as
    | "AUTHORITY"
    | "AUTO_LIABILITY"
    | "CARGO"
    | "GENERAL_LIABILITY"
    | "WORKERS_COMP"
    | "SAFETY",
  identifier: "",
  document_ids: "",
  note: "",
});

const carrierName = computed(() => {
  const carrier = context.value?.carrier as Record<string, unknown> | undefined;
  return String(carrier?.legal_name ?? context.value?.binding.display_label ?? "Carrier account");
});

const openTenders = computed(() =>
  tenders.value.filter((item) => ["SENT", "PENDING"].includes(item.status)),
);

const money = (value: string | number | undefined, currency = "USD"): string =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format(
    Number(value ?? 0),
  );

const describeError = (value: unknown): string => {
  if (value instanceof ApiError) return `${value.message} (${value.code})`;
  return value instanceof Error ? value.message : "The carrier portal request failed.";
};

const refresh = async (): Promise<void> => {
  loading.value = true;
  error.value = "";
  try {
    const [portalContext, tenderPage, loadPage, evidencePage, settlementPage] =
      await Promise.all([
        portalApi.carrier.context(),
        portalApi.carrier.tenders(),
        portalApi.carrier.loads(),
        portalApi.carrier.evidence(),
        portalApi.carrier.settlements(),
      ]);
    context.value = portalContext;
    tenders.value = tenderPage.items;
    loads.value = loadPage.items;
    evidence.value = evidencePage.items;
    settlements.value = settlementPage.items;
    if (!tracking.load_id && loads.value.length > 0) {
      tracking.load_id = loads.value[0]?.id ?? "";
    }
  } catch (value) {
    error.value = describeError(value);
  } finally {
    loading.value = false;
  }
};

const respondTender = async (
  item: Tender,
  decision: "ACCEPT" | "REJECT",
): Promise<void> => {
  error.value = "";
  notice.value = "";
  try {
    await portalApi.carrier.respondTender(item, decision);
    notice.value = `Tender ${decision === "ACCEPT" ? "accepted" : "rejected"} with a version-checked command.`;
    await refresh();
  } catch (value) {
    error.value = describeError(value);
  }
};

const submitTracking = async (): Promise<void> => {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const latitude = tracking.latitude === "" ? null : Number(tracking.latitude);
    const longitude = tracking.longitude === "" ? null : Number(tracking.longitude);
    await portalApi.carrier.submitTracking(tracking.load_id, {
      source_event_id: tracking.source_event_id,
      event_type: tracking.event_type,
      occurred_at: new Date(tracking.occurred_at).toISOString(),
      latitude,
      longitude,
      payload: tracking.note ? { note: tracking.note } : {},
    });
    tracking.source_event_id = "";
    tracking.note = "";
    tracking.occurred_at = new Date().toISOString().slice(0, 16);
    notice.value = "Tracking event accepted. Reusing the source event ID with different data will be rejected as a collision.";
  } catch (value) {
    error.value = describeError(value);
  } finally {
    saving.value = false;
  }
};

const submitEvidence = async (): Promise<void> => {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const documentIds = evidenceForm.document_ids
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const created = await portalApi.carrier.submitEvidence({
      evidence_type: evidenceForm.evidence_type,
      identifier:
        evidenceForm.evidence_type === "SAFETY"
          ? undefined
          : evidenceForm.identifier,
      evidence_document_ids: documentIds,
      metadata: evidenceForm.note ? { carrier_note: evidenceForm.note } : {},
    });
    evidence.value = [created, ...evidence.value];
    evidenceForm.identifier = "";
    evidenceForm.document_ids = "";
    evidenceForm.note = "";
    notice.value = "Evidence submitted for internal compliance review. It does not become authoritative until accepted by an authorized reviewer.";
  } catch (value) {
    error.value = describeError(value);
  } finally {
    saving.value = false;
  }
};

onMounted(refresh);
</script>

<template>
  <section class="page" aria-labelledby="carrier-title">
    <div class="page-heading-row">
      <div>
        <p class="eyebrow">Carrier portal</p>
        <h1 id="carrier-title">{{ carrierName }}</h1>
        <p class="page-intro">
          Respond to tenders, work assigned loads, submit deduplicated tracking and
          provide compliance evidence for authorized review.
        </p>
      </div>
      <button class="secondary-button" type="button" :disabled="loading" @click="refresh">
        {{ loading ? "Refreshing…" : "Refresh" }}
      </button>
    </div>

    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>

    <div class="metric-grid carrier-metrics">
      <article class="metric-card"><span>Open tenders</span><strong>{{ openTenders.length }}</strong><small>Awaiting response</small></article>
      <article class="metric-card"><span>Assigned loads</span><strong>{{ loads.length }}</strong><small>Carrier-scoped</small></article>
      <article class="metric-card"><span>Evidence items</span><strong>{{ evidence.length }}</strong><small>Review status visible</small></article>
      <article class="metric-card"><span>Settlements</span><strong>{{ settlements.length }}</strong><small>No live payout action</small></article>
    </div>

    <div class="workspace-grid">
      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Tenders</p><h2>Response queue</h2></div></div>
        <div class="card-list">
          <article v-for="item in tenders" :key="item.id" class="record-card">
            <div><strong>{{ money(item.rate, item.currency) }}</strong><p>Load {{ item.load_id }} · {{ item.status }}</p></div>
            <span class="status-pill">v{{ item.version }}</span>
            <div v-if="['SENT', 'PENDING'].includes(item.status)" class="action-row">
              <button type="button" class="positive-action" @click="respondTender(item, 'ACCEPT')">Accept tender</button>
              <button type="button" class="danger-action" @click="respondTender(item, 'REJECT')">Reject</button>
            </div>
          </article>
          <p v-if="!loading && tenders.length === 0" class="empty-state">No tenders found.</p>
        </div>
      </article>

      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Assigned freight</p><h2>Loads</h2></div></div>
        <div class="table-wrap"><table><thead><tr><th>Load</th><th>Equipment</th><th>Status</th></tr></thead><tbody><tr v-for="item in loads" :key="item.id"><td>{{ item.load_number || item.id }}</td><td>{{ item.equipment_type }}</td><td><span class="status-pill">{{ item.status }}</span></td></tr><tr v-if="!loading && loads.length === 0"><td colspan="3">No assigned loads.</td></tr></tbody></table></div>
      </article>
    </div>

    <div class="workspace-grid">
      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Visibility</p><h2>Submit tracking</h2></div></div>
        <form class="form-grid" @submit.prevent="submitTracking">
          <label class="wide-field">Load<select v-model="tracking.load_id" required><option value="" disabled>Select a load</option><option v-for="item in loads" :key="item.id" :value="item.id">{{ item.load_number || item.id }}</option></select></label>
          <label>Event<select v-model="tracking.event_type"><option value="EN_ROUTE_TO_PICKUP">En route to pickup</option><option value="ARRIVED_PICKUP">Arrived pickup</option><option value="PICKED_UP">Picked up</option><option value="IN_TRANSIT">In transit</option><option value="DELAYED">Delayed</option><option value="ARRIVED_DELIVERY">Arrived delivery</option><option value="DELIVERED">Delivered</option></select></label>
          <label>Occurred at<input v-model="tracking.occurred_at" required type="datetime-local" /></label>
          <label>Latitude<input v-model.trim="tracking.latitude" inputmode="decimal" /></label>
          <label>Longitude<input v-model.trim="tracking.longitude" inputmode="decimal" /></label>
          <label class="wide-field">Unique source event ID<input v-model.trim="tracking.source_event_id" required minlength="4" maxlength="220" autocomplete="off" /></label>
          <label class="wide-field">Carrier note<textarea v-model.trim="tracking.note" rows="3" maxlength="2000" /></label>
          <button class="primary-button" type="submit" :disabled="saving || loads.length === 0">{{ saving ? "Submitting…" : "Submit tracking" }}</button>
        </form>
      </article>

      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Compliance intake</p><h2>Submit evidence</h2></div></div>
        <form class="form-grid" @submit.prevent="submitEvidence">
          <label>Evidence type<select v-model="evidenceForm.evidence_type"><option value="AUTHORITY">Authority</option><option value="AUTO_LIABILITY">Auto liability</option><option value="CARGO">Cargo</option><option value="GENERAL_LIABILITY">General liability</option><option value="WORKERS_COMP">Workers compensation</option><option value="SAFETY">Safety</option></select></label>
          <label>Policy or authority identifier<input v-model.trim="evidenceForm.identifier" :required="evidenceForm.evidence_type !== 'SAFETY'" autocomplete="off" /></label>
          <label class="wide-field">Evidence document UUIDs, comma-separated<input v-model.trim="evidenceForm.document_ids" required autocomplete="off" /></label>
          <label class="wide-field">Carrier note<textarea v-model.trim="evidenceForm.note" rows="3" maxlength="4000" /></label>
          <button class="primary-button" type="submit" :disabled="saving">{{ saving ? "Submitting…" : "Submit evidence" }}</button>
        </form>
      </article>
    </div>

    <div class="workspace-grid">
      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Evidence history</p><h2>Compliance submissions</h2></div></div>
        <div class="table-wrap"><table><thead><tr><th>Type</th><th>Status</th><th>Documents</th><th>Reviewer note</th></tr></thead><tbody><tr v-for="item in evidence" :key="item.id"><td>{{ item.evidence_type }}</td><td><span class="status-pill">{{ item.status }}</span></td><td>{{ item.evidence_document_ids.length }}</td><td>{{ item.reviewer_note || "—" }}</td></tr><tr v-if="!loading && evidence.length === 0"><td colspan="4">No evidence submitted.</td></tr></tbody></table></div>
      </article>

      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Finance visibility</p><h2>Settlements</h2></div></div>
        <div class="card-list"><article v-for="item in settlements" :key="item.id" class="record-card settlement-card"><div><strong>{{ Number(item.total_minor).toLocaleString() }} {{ item.currency }}</strong><p>{{ item.status }} · load {{ item.load_id || "—" }}</p></div></article><p v-if="!loading && settlements.length === 0" class="empty-state">No settlements found.</p></div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.carrier-metrics{margin-top:1.5rem}.workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.25rem;margin-top:1.25rem}.work-panel{background:#fff;border:1px solid #dfe5ea;border-radius:1.25rem;padding:1.25rem;box-shadow:0 14px 42px rgba(15,23,42,.05)}.compact{margin-bottom:1rem}.card-list{display:grid;gap:.75rem}.record-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.75rem;align-items:center;border:1px solid #e2e8f0;border-radius:1rem;padding:1rem}.record-card p{margin:.25rem 0 0;color:#64748b}.settlement-card{grid-template-columns:1fr}.action-row{grid-column:1/-1;display:flex;gap:.5rem}.action-row button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:.5rem .8rem;font-weight:800}.positive-action{color:#067647}.danger-action{color:#b42318}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem}.form-grid label{display:grid;gap:.4rem;font-size:.82rem;font-weight:750}.form-grid input,.form-grid select,.form-grid textarea{border:1px solid #cbd5e1;border-radius:.75rem;padding:.7rem;background:#fff;font:inherit}.wide-field{grid-column:1/-1}.primary-button,.secondary-button{border-radius:999px;padding:.7rem 1rem;font-weight:800}.primary-button{border:0;background:#111827;color:#fff}.secondary-button{border:1px solid #cbd5e1;background:#fff}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:.86rem}th,td{text-align:left;padding:.75rem;border-bottom:1px solid #e2e8f0}.alert{border-radius:.85rem;padding:.8rem 1rem;margin:1rem 0}.alert-error{background:#fff1f0;color:#8a1c13}.alert-success{background:#ecfdf3;color:#067647}.empty-state{color:#64748b}@media(max-width:900px){.workspace-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.wide-field{grid-column:auto}}
</style>
