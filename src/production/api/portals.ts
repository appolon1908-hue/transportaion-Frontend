import { api } from "./client";

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

export interface VersionedRecord {
  id: string;
  version: number;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface PortalContext extends Record<string, unknown> {
  portal: "CUSTOMER" | "CARRIER";
  binding: {
    id: string;
    display_label: string;
    status: string;
    version: number;
  };
}

export interface PortalBinding extends VersionedRecord {
  principal_issuer: string;
  principal_subject: string;
  portal_kind: "CUSTOMER" | "CARRIER";
  resource_id: string;
  display_label: string;
  status: "ACTIVE" | "SUSPENDED" | "REVOKED";
  metadata_json: Record<string, unknown>;
}

export interface PortalClaim extends VersionedRecord {
  customer_id: string;
  shipment_id: string;
  claim_type: string;
  title: string;
  description: string;
  claimed_amount: string | number;
  currency: string;
  status: string;
  customer_visible_note?: string | null;
}

export interface CarrierEvidence extends VersionedRecord {
  carrier_id: string;
  evidence_type: string;
  evidence_document_ids: string[];
  status: string;
  reviewer_note?: string | null;
  authoritative_record_id?: string | null;
}

export interface OperationalException extends VersionedRecord {
  code: string;
  status: string;
  resource_type: string;
  resource_id?: string | null;
  assigned_to?: string | null;
  detail?: string | null;
}

export interface ControlTower {
  generated_at: string;
  metrics: Record<string, number>;
  status_counts: Record<string, Record<string, number>>;
  live_effects_enabled: boolean;
}

export interface Quote extends VersionedRecord {
  customer_id: string;
  status: string;
  currency: string;
  sell_total_minor: number;
  expires_at?: string | null;
}

export interface Shipment extends VersionedRecord {
  customer_id: string;
  customer_reference: string;
  mode: string;
  status: string;
}

export interface Invoice extends VersionedRecord {
  customer_id: string;
  shipment_id?: string | null;
  status: string;
  total_minor: number;
  currency: string;
}

export interface Tender extends VersionedRecord {
  load_id: string;
  carrier_id: string;
  status: string;
  rate: string | number;
  currency: string;
  expires_at?: string | null;
  load?: Record<string, unknown> | null;
}

export interface Load extends VersionedRecord {
  load_number: string;
  equipment_type: string;
  status: string;
  carrier_id?: string | null;
  currency: string;
}

export interface Settlement extends VersionedRecord {
  carrier_id: string;
  load_id?: string | null;
  status: string;
  total_minor: number;
  currency: string;
}

export interface CreateBindingInput {
  principal_issuer: string;
  principal_subject: string;
  portal_kind: "CUSTOMER" | "CARRIER";
  resource_id: string;
  display_label: string;
  status: "ACTIVE" | "SUSPENDED";
  metadata: Record<string, unknown>;
}

export interface ClaimReviewInput {
  expected_version: number;
  status:
    | "UNDER_REVIEW"
    | "NEEDS_INFORMATION"
    | "ACCEPTED"
    | "DENIED"
    | "WITHDRAWN";
  customer_visible_note?: string | null;
  internal_note?: string | null;
}

export interface EvidenceReviewInput {
  expected_version: number;
  status: "UNDER_REVIEW" | "ACCEPTED" | "REJECTED" | "SUPERSEDED";
  reviewer_note?: string | null;
  authoritative_record_id?: string | null;
}

export interface ClaimSubmissionInput {
  shipment_id: string;
  claim_type:
    | "CARGO_DAMAGE"
    | "CARGO_LOSS"
    | "SERVICE_FAILURE"
    | "OVERCHARGE"
    | "OTHER";
  title: string;
  description: string;
  claimed_amount: number;
  currency: string;
  evidence_document_ids: string[];
}

export interface CarrierTrackingInput {
  source_event_id: string;
  event_type:
    | "EN_ROUTE_TO_PICKUP"
    | "ARRIVED_PICKUP"
    | "PICKED_UP"
    | "IN_TRANSIT"
    | "DELAYED"
    | "ARRIVED_DELIVERY"
    | "DELIVERED";
  occurred_at: string;
  latitude?: number | null;
  longitude?: number | null;
  payload: Record<string, unknown>;
}

export interface CarrierEvidenceInput {
  evidence_type:
    | "AUTHORITY"
    | "AUTO_LIABILITY"
    | "CARGO"
    | "GENERAL_LIABILITY"
    | "WORKERS_COMP"
    | "SAFETY";
  identifier?: string | null;
  evidence_document_ids: string[];
  metadata: Record<string, unknown>;
}

export const portalApi = Object.freeze({
  admin: {
    bindings: async (): Promise<Page<PortalBinding>> =>
      (await api.get<Page<PortalBinding>>("/admin/portal-bindings")).data,
    createBinding: async (input: CreateBindingInput): Promise<PortalBinding> =>
      (
        await api.post<PortalBinding, CreateBindingInput>(
          "/admin/portal-bindings",
          input,
        )
      ).data,
    claims: async (): Promise<Page<PortalClaim>> =>
      (
        await api.get<Page<PortalClaim>>("/admin/portal-reviews/claims", {
          query: { limit: 100 },
        })
      ).data,
    reviewClaim: async (
      id: string,
      input: ClaimReviewInput,
    ): Promise<PortalClaim> =>
      (
        await api.patch<PortalClaim, ClaimReviewInput>(
          `/admin/portal-reviews/claims/${id}`,
          input,
          { ifMatch: input.expected_version },
        )
      ).data,
    evidence: async (): Promise<Page<CarrierEvidence>> =>
      (
        await api.get<Page<CarrierEvidence>>(
          "/admin/portal-reviews/carrier-evidence",
          { query: { limit: 100 } },
        )
      ).data,
    reviewEvidence: async (
      id: string,
      input: EvidenceReviewInput,
    ): Promise<CarrierEvidence> =>
      (
        await api.patch<CarrierEvidence, EvidenceReviewInput>(
          `/admin/portal-reviews/carrier-evidence/${id}`,
          input,
          { ifMatch: input.expected_version },
        )
      ).data,
  },
  operations: {
    controlTower: async (): Promise<ControlTower> =>
      (await api.get<ControlTower>("/operations/control-tower")).data,
    queue: async (): Promise<Page<OperationalException>> =>
      (
        await api.get<Page<OperationalException>>("/operations/work-queue", {
          query: { limit: 100 },
        })
      ).data,
    updateException: async (
      id: string,
      input: {
        expected_version: number;
        status: "OPEN" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED" | "DISMISSED";
        assigned_to?: string | null;
        detail?: string | null;
      },
    ): Promise<OperationalException> =>
      (
        await api.patch<OperationalException, typeof input>(
          `/operations/exceptions/${id}`,
          input,
          { ifMatch: input.expected_version },
        )
      ).data,
  },
  customer: {
    context: async (): Promise<PortalContext> =>
      (await api.get<PortalContext>("/portals/customer/context")).data,
    quotes: async (): Promise<Page<Quote>> =>
      (await api.get<Page<Quote>>("/portals/customer/quotes")).data,
    decideQuote: async (
      quote: Quote,
      decision: "ACCEPT" | "DECLINE",
      customerNote?: string,
    ): Promise<Quote> =>
      (
        await api.post<
          Quote,
          { expected_version: number; decision: string; customer_note?: string }
        >(`/portals/customer/quotes/${quote.id}/decision`, {
          expected_version: quote.version,
          decision,
          customer_note: customerNote,
        }, { ifMatch: quote.version })
      ).data,
    shipments: async (): Promise<Page<Shipment>> =>
      (await api.get<Page<Shipment>>("/portals/customer/shipments")).data,
    invoices: async (): Promise<Page<Invoice>> =>
      (await api.get<Page<Invoice>>("/portals/customer/invoices")).data,
    claims: async (): Promise<Page<PortalClaim>> =>
      (await api.get<Page<PortalClaim>>("/portals/customer/claims")).data,
    submitClaim: async (input: ClaimSubmissionInput): Promise<PortalClaim> =>
      (
        await api.post<PortalClaim, ClaimSubmissionInput>(
          "/portals/customer/claims",
          input,
        )
      ).data,
  },
  carrier: {
    context: async (): Promise<PortalContext> =>
      (await api.get<PortalContext>("/portals/carrier/context")).data,
    tenders: async (): Promise<Page<Tender>> =>
      (await api.get<Page<Tender>>("/portals/carrier/tenders")).data,
    respondTender: async (
      tender: Tender,
      decision: "ACCEPT" | "REJECT",
      note?: string,
    ): Promise<Record<string, unknown>> =>
      (
        await api.post<
          Record<string, unknown>,
          { expected_version: number; decision: string; note?: string }
        >(`/portals/carrier/tenders/${tender.id}/response`, {
          expected_version: tender.version,
          decision,
          note,
        }, { ifMatch: tender.version })
      ).data,
    loads: async (): Promise<Page<Load>> =>
      (await api.get<Page<Load>>("/portals/carrier/loads")).data,
    submitTracking: async (
      loadId: string,
      input: CarrierTrackingInput,
    ): Promise<Record<string, unknown>> =>
      (
        await api.post<Record<string, unknown>, CarrierTrackingInput>(
          `/portals/carrier/loads/${loadId}/tracking`,
          input,
          { idempotencyKey: input.source_event_id },
        )
      ).data,
    evidence: async (): Promise<Page<CarrierEvidence>> =>
      (await api.get<Page<CarrierEvidence>>("/portals/carrier/evidence")).data,
    submitEvidence: async (
      input: CarrierEvidenceInput,
    ): Promise<CarrierEvidence> =>
      (
        await api.post<CarrierEvidence, CarrierEvidenceInput>(
          "/portals/carrier/evidence",
          input,
        )
      ).data,
    settlements: async (): Promise<Page<Settlement>> =>
      (await api.get<Page<Settlement>>("/portals/carrier/settlements")).data,
  },
});
