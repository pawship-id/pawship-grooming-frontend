import { apiAuthRequest } from "./client";

// ── Benefit ────────────────────────────────────────────────────────────────

export type BenefitType = "discount" | "quota";
export type BenefitAppliesTo = "service" | "addon" | "pickup";
export type BenefitPeriod = "weekly" | "monthly" | "unlimited";

export interface BenefitServiceRef {
  _id: string;
  name: string;
  prices?: Array<{ price_type: string; price: number }>;
  description?: string;
}

export interface Benefit {
  _id: string;
  type: BenefitType;
  applies_to: BenefitAppliesTo;
  period: BenefitPeriod;
  value?: number | null;
  label?: string | null;
  service?: BenefitServiceRef | null;
  limit?: number | null;
}

export interface BenefitPayload {
  type: BenefitType;
  applies_to: BenefitAppliesTo;
  period?: BenefitPeriod;
  value?: number;
  label?: string;
  service_id?: string;
  limit?: number | null;
}

// ── Membership Plan ────────────────────────────────────────────────────────

export interface MembershipPlan {
  _id: string;
  name: string;
  description?: string;
  duration_months: number;
  price: number;
  note?: string;
  pet_type_ids: string[];
  pet_types?: Array<{ _id: string; name: string }>;
  is_active: boolean;
  benefits: Benefit[];
  createdAt: string;
  updatedAt: string;
}

export interface MembershipsResponse {
  message: string;
  data: MembershipPlan[];
}

export interface MembershipDetailResponse {
  message: string;
  data: MembershipPlan;
}

export interface MembershipDeleteResponse {
  message: string;
  data: {
    _id: string;
    name: string;
    isDeleted: boolean;
    deletedAt: string;
  };
}

export interface MembershipPayload {
  name?: string;
  description?: string;
  duration_months?: number;
  price?: number;
  note?: string;
  pet_type_ids?: string[];
  is_active?: boolean;
  benefits?: BenefitPayload[];
  apply_retroactive?: boolean;
}

export interface GetMembershipsParams {
  pet_type_id?: string;
  is_active?: boolean;
}

export async function getMemberships(params: GetMembershipsParams = {}) {
  const query = new URLSearchParams();
  if (params.pet_type_id) query.set("pet_type_id", params.pet_type_id);
  if (params.is_active !== undefined)
    query.set("is_active", String(params.is_active));
  const qs = query.toString();
  return apiAuthRequest<MembershipsResponse>(
    `/memberships${qs ? `?${qs}` : ""}`,
  );
}

export async function getMembershipById(id: string) {
  return apiAuthRequest<MembershipDetailResponse>(`/memberships/${id}`);
}

export async function createMembership(payload: MembershipPayload) {
  return apiAuthRequest<MembershipDetailResponse>("/memberships", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMembership(id: string, payload: MembershipPayload) {
  return apiAuthRequest<MembershipDetailResponse>(`/memberships/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteMembership(id: string) {
  return apiAuthRequest<MembershipDeleteResponse>(`/memberships/${id}`, {
    method: "DELETE",
  });
}

// ── Benefits Snapshot (inside Pet Membership) ─────────────────────────────

export interface BenefitSnapshot {
  _id: string;
  type: BenefitType;
  applies_to: BenefitAppliesTo;
  period: BenefitPeriod;
  value?: number | null;
  label?: string | null;
  service_id?: string | null;
  service?: BenefitServiceRef | null;
  limit?: number | null;
  used: number;
  period_reset_date: string | null;
}

// ── Pet Membership ─────────────────────────────────────────────────────────

export type MembershipStatus = "active" | "pending" | "expired" | "cancelled";

export interface PetMembership {
  _id: string;
  pet: PetRef;
  membership: MembershipRef;
  start_date: string;
  end_date: string;
  is_active: boolean;
  status: MembershipStatus;
  benefits_snapshot: BenefitSnapshot[];
  purchase_price?: number;
  purchase_note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PetRef {
  _id: string;
  name: string;
  tags: string[];
  pet_type: {
    _id: string;
    name: string;
  };
  owner: {
    _id: string;
    username: string;
  };
}

export interface MembershipRef {
  _id: string;
  name: string;
  description?: string;
  duration_months: number;
  price: number;
}

export interface PetMembershipsResponse {
  message: string;
  data: PetMembership[];
}

export interface PetMembershipDetailResponse {
  message: string;
  data: PetMembership | null;
}

export interface PetMembershipDeleteResponse {
  message: string;
  data: {
    _id: string;
    pet_id: string;
    membership_plan_id: string;
    isDeleted: boolean;
    deletedAt: string;
  };
}

export interface PurchasePetMembershipPayload {
  pet_id: string;
  membership_plan_id: string;
  start_date?: string;
  purchase_price?: number;
  purchase_note?: string;
}

export interface UpdatePetMembershipPayload {
  pet_id?: string;
  membership_plan_id?: string;
  start_date?: string;
  end_date?: string;
  note?: string;
}

export interface GetPetMembershipsParams {
  pet_id?: string;
  membership_plan_id?: string;
  is_active?: boolean;
  status?: MembershipStatus;
}

// Benefits summary types

export interface BenefitSummaryItem {
  _id: string;
  type: BenefitType;
  applies_to: BenefitAppliesTo;
  period: BenefitPeriod;
  value?: number | null;
  label?: string | null;
  service?: BenefitServiceRef | null;
  limit?: number | null;
  used: number;
  remaining: number | null;
  can_apply: boolean;
  period_reset_date: string | null;
  next_reset_date: string | null;
}

export interface BenefitsSummaryData {
  has_active_membership: boolean;
  pet_membership_id?: string;
  membership_plan_id?: string;
  start_date?: string;
  end_date?: string;
  benefits: BenefitSummaryItem[];
}

export interface BenefitsSummaryResponse {
  message: string;
  data: BenefitsSummaryData;
}

export interface BenefitHistoryItem {
  _id: string;
  benefit_id: string;
  type: BenefitType;
  applies_to?: string | null;
  applied_date: string;
  booking_id: string;
  booking_date?: string | null;
  booking_service?: string | null;
  booking_status?: string | null;
  amount_deducted: number;
}

export interface BenefitsHistoryData {
  has_active_membership: boolean;
  pet_membership_id?: string;
  benefits_history: BenefitHistoryItem[];
}

export interface BenefitsHistoryResponse {
  message: string;
  data: BenefitsHistoryData;
}

export interface PetMembershipCountsResponse {
  message: string;
  data: Record<MembershipStatus, number>;
}

export async function getPetMemberships(params: GetPetMembershipsParams = {}) {
  const query = new URLSearchParams();
  if (params.pet_id) query.set("pet_id", params.pet_id);
  if (params.membership_plan_id)
    query.set("membership_plan_id", params.membership_plan_id);
  if (params.is_active !== undefined)
    query.set("is_active", String(params.is_active));
  if (params.status) query.set("status", params.status);
  const qs = query.toString();
  return apiAuthRequest<PetMembershipsResponse>(
    `/pet-memberships${qs ? `?${qs}` : ""}`,
  );
}

export async function getPetMembershipCounts(petId: string) {
  return apiAuthRequest<PetMembershipCountsResponse>(
    `/pet-memberships/${petId}/counts`,
  );
}

export async function getPetMembershipById(id: string) {
  return apiAuthRequest<PetMembershipDetailResponse>(`/pet-memberships/${id}`);
}

export async function purchasePetMembership(
  payload: PurchasePetMembershipPayload,
) {
  return apiAuthRequest<PetMembershipDetailResponse>("/pet-memberships", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getActivePetMembership(petId: string) {
  return apiAuthRequest<PetMembershipsResponse>(
    `/pet-memberships/${petId}/active`,
  );
}

export async function getPetMembershipBenefitsSummary(petId: string) {
  return apiAuthRequest<BenefitsSummaryResponse>(
    `/pet-memberships/${petId}/benefits-summary`,
  );
}

export async function getPetMembershipBenefitsHistory(
  petId: string,
  params: { limit?: number; skip?: number } = {},
) {
  const query = new URLSearchParams();
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.skip !== undefined) query.set("skip", String(params.skip));
  const qs = query.toString();
  return apiAuthRequest<BenefitsHistoryResponse>(
    `/pet-memberships/${petId}/benefits-history${qs ? `?${qs}` : ""}`,
  );
}

export async function updatePetMembership(
  id: string,
  payload: UpdatePetMembershipPayload,
) {
  return apiAuthRequest<PetMembershipDetailResponse>(`/pet-memberships/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function renewPetMembership(id: string) {
  return apiAuthRequest<PetMembershipDetailResponse>(
    `/pet-memberships/${id}/renew`,
    {
      method: "POST",
    },
  );
}

export async function cancelPetMembership(id: string) {
  // return apiAuthRequest<PetMembershipDeleteResponse>(`/pet-memberships/${id}`, {
  //   method: "DELETE",
  // })
  return apiAuthRequest<PetMembershipDeleteResponse>(
    `/pet-memberships/${id}/cancelled`,
    {
      method: "PATCH",
    },
  );
}

// ── Membership History ─────────────────────────────────────────────────────

export type MembershipHistoryEventType =
  | "purchased"
  | "renewed"
  | "cancelled"
  | "updated";

export interface MembershipHistoryBenefitSnapshot {
  _id: string;
  applies_to: BenefitAppliesTo;
  service_id?: string | null;
  type: BenefitType;
  period?: BenefitPeriod;
  limit?: number | null;
  used: number;
  period_reset_date?: string | null;
}

export interface MembershipHistoryItem {
  _id: string;
  event_type: MembershipHistoryEventType;
  event_date: string;
  start_date: string;
  end_date: string;
  purchase_price?: number | null;
  membership: {
    _id: string;
    name: string;
    description?: string;
    duration_months: number;
    price: number;
  };
  benefits_snapshot_before: MembershipHistoryBenefitSnapshot[];
  note?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipHistoryResponse {
  message: string;
  data: MembershipHistoryItem[];
}

export async function getMembershipHistory(petId: string) {
  return apiAuthRequest<MembershipHistoryResponse>(
    `/pet-memberships/${petId}/membership-history`,
  );
}

// ── Export Pembelian Membership ────────────────────────────────────────────

export interface PetMembershipExportItem {
  pet_name: string;
  pet_type: string;
  owner_name: string;
  membership_name: string;
  buy_date: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface PetMembershipsExportResponse {
  message: string;
  data: PetMembershipExportItem[];
}

export async function getPetMembershipsExport() {
  return apiAuthRequest<PetMembershipsExportResponse>(
    "/pet-memberships/export",
  );
}
