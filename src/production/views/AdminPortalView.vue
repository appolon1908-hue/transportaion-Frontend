<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ApiError } from "../api/client";
import {
  portalApi,
  type CarrierEvidence,
  type PortalBinding,
  type PortalClaim,
} from "../api/portals";
import { runtimeConfig } from "../config";

const bindings = ref<PortalBinding[]>([]);
const claims = ref<PortalClaim[]>([]);
const evidence = ref<CarrierEvidence[]>([]);
const loading = ref(true);
const saving = ref(false);
const error = ref("");
const notice = ref("");

const form = reactive({
  principal_issuer: runtimeConfig.oidcIssuer,
  principal_subject: "",
  portal_kind: "CUSTOMER" as "CUSTOMER" | "CARRIER",
  resource_id: "",
  display_label: "",
  status: "ACTIVE" as "ACTIVE" | "SUSPENDED",
});

const describeError = (value: unknown): string => {
  if (value instanceof ApiError) return `${value.message} (${value.code})`;
  if (value instanceof Error) return value.message;
  return "The request could not be completed.";
};

const refresh = async (): Promise<void> => {
  loading.value = true;
  error.value = "";
  try {
    const [bindingPage, claimPage, evidencePage] = await Promise.all([
      portalApi.admin.bindings(),
      portalApi.admin.claims(),
      portalApi.admin.evidence(),
    ]);
    bindings.value = bindingPage.items;
    claims.value = claimPage.items;
    evidence.value = evidencePage.items;
  } catch (value) {
    error.value = describeError(value);
  } finally {
    loading.value = false;
  }
};

const createBinding = async (): Promise<void> => {
  saving.value = true;
  error.value = "";
  notice.value = "";
  try {
    const created = await portalApi.admin.createBinding({
      ...form,
      metadata: {},
    });
    bindings.value = [created, ...bindings.value];
    form.principal_subject = "";
    form.resource_id = "";
    form.display_label = "";
    notice.value = "Portal identity binding created. External access still depends on its rollout capability.";
  } catch (value) {
    error.value = describeError(value);
  } finally {
    saving.value = false;
  }
};

const reviewClaim = async (
  item: PortalClaim,
  status: "UNDER_REVIEW" | "NEEDS_INFORMATION" | "ACCEPTED" | "DENIED",
): Promise<void> => {
  error.value = "";
  try {
    const updated = await portalApi.admin.reviewClaim(item.id, {
      expected_version: item.version,
      status,
      customer_visible_note:
        status === "NEEDS_INFORMATION"
          ? "Additional evidence is required before review can continue."
          : undefined,
      internal_note: `Updated from the administration portal to ${status}.`,
    });
    claims.value = claims.value.map((candidate) =>
      candidate.id === updated.id ? updated : candidate,
    );
  } catch (value) {
    error.value = describeError(value);
  }
};

const reviewEvidence = async (
  item: CarrierEvidence,
  status: "UNDER_REVIEW" | "REJECTED",
): Promise<void> => {
  error.value = "";
  try {
    const updated = await portalApi.admin.reviewEvidence(item.id, {
      expected_version: item.version,
      status,
      reviewer_note:
        status === "REJECTED"
          ? "Evidence was rejected. Upload a current authoritative record."
          : "Evidence review started.",
    });
    evidence.value = evidence.value.map((candidate) =>
      candidate.id === updated.id ? updated : candidate,
    );
  } catch (value) {
    error.value = describeError(value);
  }
};

onMounted(refresh);
</script>

<template>
  <section class="page" aria-labelledby="admin-title">
    <div class="page-heading-row">
      <div>
        <p class="eyebrow">Administration</p>
        <h1 id="admin-title">Identity, portal access and review queues</h1>
        <p class="page-intro">
          Bind verified Keycloak identities to a customer or carrier account, then
          review external submissions without bypassing backend permissions.
        </p>
      </div>
      <button class="secondary-button" type="button" :disabled="loading" @click="refresh">
        Refresh
      </button>
    </div>

    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
    <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>

    <div class="workspace-grid">
      <article class="work-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Controlled access</p>
            <h2>Create portal binding</h2>
          </div>
        </div>
        <form class="form-grid" @submit.prevent="createBinding">
          <label>
            Portal
            <select v-model="form.portal_kind" required>
              <option value="CUSTOMER">Customer</option>
              <option value="CARRIER">Carrier</option>
            </select>
          </label>
          <label>
            Display label
            <input v-model.trim="form.display_label" required maxlength="220" />
          </label>
          <label class="wide-field">
            Principal subject
            <input v-model.trim="form.principal_subject" required maxlength="220" autocomplete="off" />
          </label>
          <label class="wide-field">
            Customer or carrier UUID
            <input v-model.trim="form.resource_id" required inputmode="text" autocomplete="off" />
          </label>
          <label class="wide-field">
            Trusted issuer
            <input v-model.trim="form.principal_issuer" required readonly />
          </label>
          <button class="primary-button" type="submit" :disabled="saving">
            {{ saving ? "Creating…" : "Create binding" }}
          </button>
        </form>
      </article>

      <article class="work-panel">
        <div class="section-heading compact">
          <div>
            <p class="eyebrow">Bindings</p>
            <h2>{{ bindings.length }} portal identities</h2>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Label</th><th>Portal</th><th>Status</th><th>Subject</th></tr>
            </thead>
            <tbody>
              <tr v-for="item in bindings" :key="item.id">
                <td>{{ item.display_label }}</td>
                <td>{{ item.portal_kind }}</td>
                <td><span class="status-pill">{{ item.status }}</span></td>
                <td class="mono-cell">{{ item.principal_subject }}</td>
              </tr>
              <tr v-if="!loading && bindings.length === 0"><td colspan="4">No bindings found.</td></tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>

    <div class="workspace-grid queue-grid">
      <article class="work-panel">
        <div class="section-heading compact">
          <div><p class="eyebrow">Customer claims</p><h2>Review queue</h2></div>
        </div>
        <div class="queue-list">
          <article v-for="item in claims" :key="item.id" class="queue-card">
            <div><strong>{{ item.title }}</strong><p>{{ item.claim_type }} · {{ item.currency }} {{ item.claimed_amount }}</p></div>
            <span class="status-pill">{{ item.status }}</span>
            <div class="action-row">
              <button type="button" @click="reviewClaim(item, 'UNDER_REVIEW')">Start review</button>
              <button type="button" @click="reviewClaim(item, 'NEEDS_INFORMATION')">Request info</button>
              <button type="button" @click="reviewClaim(item, 'ACCEPTED')">Accept</button>
              <button type="button" class="danger-action" @click="reviewClaim(item, 'DENIED')">Deny</button>
            </div>
          </article>
          <p v-if="!loading && claims.length === 0" class="empty-state">No customer claims are waiting.</p>
        </div>
      </article>

      <article class="work-panel">
        <div class="section-heading compact">
          <div><p class="eyebrow">Carrier evidence</p><h2>Compliance intake</h2></div>
        </div>
        <div class="queue-list">
          <article v-for="item in evidence" :key="item.id" class="queue-card">
            <div><strong>{{ item.evidence_type }}</strong><p>Carrier {{ item.carrier_id }}</p></div>
            <span class="status-pill">{{ item.status }}</span>
            <div class="action-row">
              <button type="button" @click="reviewEvidence(item, 'UNDER_REVIEW')">Start review</button>
              <button type="button" class="danger-action" @click="reviewEvidence(item, 'REJECTED')">Reject</button>
            </div>
          </article>
          <p v-if="!loading && evidence.length === 0" class="empty-state">No carrier evidence is waiting.</p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.workspace-grid{display:grid;grid-template-columns:minmax(18rem,.85fr) minmax(24rem,1.15fr);gap:1.25rem;margin-top:1.5rem}.queue-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.work-panel{background:var(--surface,#fff);border:1px solid var(--border,#dfe5ea);border-radius:1.25rem;padding:1.25rem;box-shadow:0 14px 42px rgba(15,23,42,.05)}.compact{margin-bottom:1rem}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.9rem}.form-grid label{display:grid;gap:.4rem;font-size:.82rem;font-weight:700}.form-grid input,.form-grid select{width:100%;border:1px solid #cbd5e1;border-radius:.75rem;padding:.72rem;background:#fff}.wide-field{grid-column:1/-1}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:.85rem}th,td{padding:.72rem;text-align:left;border-bottom:1px solid #e2e8f0;vertical-align:top}.mono-cell{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;max-width:16rem;overflow:hidden;text-overflow:ellipsis}.queue-list{display:grid;gap:.8rem}.queue-card{border:1px solid #e2e8f0;border-radius:1rem;padding:1rem;display:grid;gap:.75rem}.queue-card p{margin:.2rem 0 0;color:#64748b}.action-row{display:flex;flex-wrap:wrap;gap:.5rem}.action-row button{border:1px solid #cbd5e1;background:#fff;border-radius:999px;padding:.45rem .7rem;font-weight:700}.danger-action{color:#b42318}.alert{border-radius:.85rem;padding:.8rem 1rem;margin:1rem 0}.alert-error{background:#fff1f0;color:#8a1c13}.alert-success{background:#ecfdf3;color:#067647}.empty-state{color:#64748b}.secondary-button,.primary-button{border-radius:999px;padding:.7rem 1rem;font-weight:800}.secondary-button{border:1px solid #cbd5e1;background:#fff}.primary-button{border:0;background:#111827;color:#fff}@media(max-width:900px){.workspace-grid,.queue-grid{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr}.wide-field{grid-column:auto}}
</style>
