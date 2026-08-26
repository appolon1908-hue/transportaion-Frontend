<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ApiError } from "../api/client";
import {
  portalApi,
  type Invoice,
  type PortalClaim,
  type PortalContext,
  type Quote,
  type Shipment,
} from "../api/portals";

const context = ref<PortalContext | null>(null);
const quotes = ref<Quote[]>([]);
const shipments = ref<Shipment[]>([]);
const invoices = ref<Invoice[]>([]);
const claims = ref<PortalClaim[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");

const claim = reactive({
  shipment_id: "",
  claim_type: "SERVICE_FAILURE" as
    | "CARGO_DAMAGE"
    | "CARGO_LOSS"
    | "SERVICE_FAILURE"
    | "OVERCHARGE"
    | "OTHER",
  title: "",
  description: "",
  claimed_amount: 0,
  currency: "USD",
});

const customerName = computed(() => {
  const customer = context.value?.customer as Record<string, unknown> | undefined;
  return String(customer?.name ?? context.value?.binding.display_label ?? "Customer account");
});

const openQuotes = computed(() =>
  quotes.value.filter((item) => ["SENT", "OFFERED"].includes(item.status)),
);

const money = (minor: number | string | undefined, currency = "USD"): string => {
  const value = Number(minor ?? 0) / 100;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
};

const describeError = (value: unknown): string => {
  if (value instanceof ApiError) return `${value.message} (${value.code})`;
  return value instanceof Error ? value.message : "The customer portal request failed.";
};

const refresh = async (): Promise<void> => {
  loading.value = true;
  error.value = "";
  try {
    const [portalContext, quotePage, shipmentPage, invoicePage, claimPage] =
      await Promise.all([
        portalApi.customer.context(),
        portalApi.customer.quotes(),
        portalApi.customer.shipments(),
        portalApi.customer.invoices(),
        portalApi.customer.claims(),
      ]);
    context.value = portalContext;
    quotes.value = quotePage.items;
    shipments.value = shipmentPage.items;
    invoices.value = invoicePage.items;
    claims.value = claimPage.items;
    if (!claim.shipment_id && shipments.value.length > 0) {
      claim.shipment_id = shipments.value[0]?.id ?? "";
    }
  } catch (value) {
    error.value = describeError(value);
  } finally {
    loading.value = false;
  }
};

const decideQuote = async (
  item: Quote,
  decision: "ACCEPT" | "DECLINE",
): Promise<void> => {
  error.value = "";
  notice.value = "";
  try {
    const updated = await portalApi.customer.decideQuote(item, decision);
    quotes.value = quotes.value.map((candidate) =>
      candidate.id === updated.id ? updated : candidate,
    );
    notice.value = `Quote ${decision === "ACCEPT" ? "accepted" : "declined"}. The backend recorded the decision with an idempotency key and version check.`;
  } catch (value) {
    error.value = describeError(value);
  }
};

const submitClaim = async (): Promise<void> => {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const created = await portalApi.customer.submitClaim({
      shipment_id: claim.shipment_id,
      claim_type: claim.claim_type,
      title: claim.title,
      description: claim.description,
      claimed_amount: claim.claimed_amount,
      currency: claim.currency,
      evidence_document_ids: [],
    });
    claims.value = [created, ...claims.value];
    claim.title = "";
    claim.description = "";
    claim.claimed_amount = 0;
    notice.value = "Claim submitted to the internal review queue. No financial action was triggered.";
  } catch (value) {
    error.value = describeError(value);
  } finally {
    saving.value = false;
  }
};

onMounted(refresh);
</script>

<template>
  <section class="page" aria-labelledby="customer-title">
    <div class="page-heading-row">
      <div>
        <p class="eyebrow">Customer portal</p>
        <h1 id="customer-title">{{ customerName }}</h1>
        <p class="page-intro">
          Review quotes, follow active transportation, check invoices and submit
          claims through your verified customer account.
        </p>
      </div>
      <button class="secondary-button" type="button" :disabled="loading" @click="refresh">
        {{ loading ? "Refreshing…" : "Refresh" }}
      </button>
    </div>

    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>

    <div class="metric-grid customer-metrics">
      <article class="metric-card"><span>Open quotes</span><strong>{{ openQuotes.length }}</strong><small>Awaiting your decision</small></article>
      <article class="metric-card"><span>Shipments</span><strong>{{ shipments.length }}</strong><small>Visible to this account</small></article>
      <article class="metric-card"><span>Invoices</span><strong>{{ invoices.length }}</strong><small>Customer-scoped records</small></article>
      <article class="metric-card"><span>Claims</span><strong>{{ claims.length }}</strong><small>Review status tracked</small></article>
    </div>

    <div class="workspace-grid">
      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Commercial</p><h2>Quotes</h2></div></div>
        <div class="card-list">
          <article v-for="item in quotes" :key="item.id" class="record-card">
            <div>
              <strong>{{ money(item.sell_total_minor, item.currency) }}</strong>
              <p>Status {{ item.status }} <span v-if="item.expires_at">· expires {{ new Date(item.expires_at).toLocaleString() }}</span></p>
            </div>
            <span class="status-pill">v{{ item.version }}</span>
            <div v-if="['SENT', 'OFFERED'].includes(item.status)" class="action-row">
              <button type="button" class="positive-action" @click="decideQuote(item, 'ACCEPT')">Accept</button>
              <button type="button" @click="decideQuote(item, 'DECLINE')">Decline</button>
            </div>
          </article>
          <p v-if="!loading && quotes.length === 0" class="empty-state">No quotes are available.</p>
        </div>
      </article>

      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Visibility</p><h2>Shipments</h2></div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Reference</th><th>Mode</th><th>Status</th></tr></thead>
            <tbody>
              <tr v-for="item in shipments" :key="item.id">
                <td>{{ item.customer_reference || item.id }}</td><td>{{ item.mode }}</td><td><span class="status-pill">{{ item.status }}</span></td>
              </tr>
              <tr v-if="!loading && shipments.length === 0"><td colspan="3">No shipments found.</td></tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>

    <div class="workspace-grid">
      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Billing</p><h2>Invoices</h2></div></div>
        <div class="card-list">
          <article v-for="item in invoices" :key="item.id" class="record-card horizontal-card">
            <div><strong>{{ money(item.total_minor, item.currency) }}</strong><p>{{ item.status }}</p></div>
            <small>{{ item.shipment_id || "Account invoice" }}</small>
          </article>
          <p v-if="!loading && invoices.length === 0" class="empty-state">No invoices found.</p>
        </div>
      </article>

      <article class="work-panel">
        <div class="section-heading compact"><div><p class="eyebrow">Service</p><h2>Submit a claim</h2></div></div>
        <form class="form-grid" @submit.prevent="submitClaim">
          <label>Shipment<select v-model="claim.shipment_id" required><option value="" disabled>Select a shipment</option><option v-for="item in shipments" :key="item.id" :value="item.id">{{ item.customer_reference || item.id }}</option></select></label>
          <label>Claim type<select v-model="claim.claim_type"><option value="SERVICE_FAILURE">Service failure</option><option value="CARGO_DAMAGE">Cargo damage</option><option value="CARGO_LOSS">Cargo loss</option><option value="OVERCHARGE">Overcharge</option><option value="OTHER">Other</option></select></label>
          <label>Amount<input v-model.number="claim.claimed_amount" min="0" step="0.01" type="number" /></label>
          <label>Currency<input v-model.trim="claim.currency" required minlength="3" maxlength="3" /></label>
          <label class="wide-field">Title<input v-model.trim="claim.title" required minlength="3" maxlength="220" /></label>
          <label class="wide-field">Description<textarea v-model.trim="claim.description" required minlength="20" maxlength="8000" rows="4" /></label>
          <button class="primary-button" type="submit" :disabled="saving || shipments.length === 0">{{ saving ? "Submitting…" : "Submit claim" }}</button>
        </form>
      </article>
    </div>

    <article class="work-panel claims-panel">
      <div class="section-heading compact"><div><p class="eyebrow">Claim history</p><h2>Submitted claims</h2></div></div>
      <div class="table-wrap"><table><thead><tr><th>Title</th><th>Type</th><th>Amount</th><th>Status</th><th>Customer note</th></tr></thead><tbody><tr v-for="item in claims" :key="item.id"><td>{{ item.title }}</td><td>{{ item.claim_type }}</td><td>{{ item.currency }} {{ item.claimed_amount }}</td><td><span class="status-pill">{{ item.status }}</span></td><td>{{ item.customer_visible_note || "—" }}</td></tr><tr v-if="!loading && claims.length === 0"><td colspan="5">No claims submitted.</td></tr></tbody></table></div>
    </article>
  </section>
</template>

<style scoped>
.customer-metrics{margin-top:1.5rem}.workspace-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.25rem;margin-top:1.25rem}.work-panel{background:#fff;border:1px solid #dfe5ea;border-radius:1.25rem;padding:1.25rem;box-shadow:0 14px 42px rgba(15,23,42,.05)}.compact{margin-bottom:1rem}.card-list{display:grid;gap:.75rem}.record-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.75rem;align-items:center;border:1px solid #e2e8f0;border-radius:1rem;padding:1rem}.record-card p{margin:.25rem 0 0;color:#64748b}.horizontal-card{grid-template-columns:1fr auto}.action-row{grid-column:1/-1;display:flex;gap:.5rem}.action-row button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:.5rem .8rem;font-weight:800}.positive-action{color:#067647}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem}.form-grid label{display:grid;gap:.4rem;font-size:.82rem;font-weight:750}.form-grid input,.form-grid select,.form-grid textarea{border:1px solid #cbd5e1;border-radius:.75rem;padding:.7rem;background:#fff;font:inherit}.wide-field{grid-column:1/-1}.primary-button,.secondary-button{border-radius:999px;padding:.7rem 1rem;font-weight:800}.primary-button{border:0;background:#111827;color:#fff}.secondary-button{border:1px solid #cbd5e1;background:#fff}.claims-panel{margin-top:1.25rem}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:.86rem}th,td{text-align:left;padding:.75rem;border-bottom:1px solid #e2e8f0}.alert{border-radius:.85rem;padding:.8rem 1rem;margin:1rem 0}.alert-error{background:#fff1f0;color:#8a1c13}.alert-success{background:#ecfdf3;color:#067647}.empty-state{color:#64748b}@media(max-width:900px){.workspace-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.wide-field{grid-column:auto}}
</style>
