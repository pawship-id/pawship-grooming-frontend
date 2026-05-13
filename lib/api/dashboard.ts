import { apiAuthRequest } from "./client";

export interface DashboardRangeParams {
  store_id?: string;
  from?: string;
  to?: string;
}

function buildQuery(params?: DashboardRangeParams) {
  const qs = new URLSearchParams();
  if (params?.store_id && params.store_id !== "all")
    qs.set("store_id", params.store_id);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export interface MembershipEndingItem {
  pet_id: string;
  pet_name: string;
  customer_name: string;
  tier: string;
  expiry_date: string;
  days_remaining: number;
  urgency: "critical" | "upcoming";
}

export interface IdlePetItem {
  pet_id: string;
  pet_name: string;
  breed: string | null;
  customer_name: string;
  last_visit_at: string;
  days_since: number;
}

export interface NeedFollowUpItem {
  booking_id: string;
  pet_id: string;
  pet_name: string;
  customer_name: string;
  visit_tag: "1st" | "2nd";
  service_name: string;
  groomer_name: string | null;
  completed_at: string;
}

export interface NeedsActionResponse {
  message: string;
  membershipEnding: { items: MembershipEndingItem[]; total: number };
  idlePets: { items: IdlePetItem[]; total: number };
  needFollowUp: { items: NeedFollowUpItem[]; total: number };
}

export async function getNeedsAction() {
  return apiAuthRequest<NeedsActionResponse>("/admin/dashboard/needs-action");
}

// ── Revenue ───────────────────────────────────────────────────────────────────

export interface RevenueKpiDelta {
  gross_revenue_pct: number | null;
  net_revenue_pct: number | null;
  total_orders_pct: number | null;
  avg_order_value_pct: number | null;
}

export interface RevenueKpis {
  gross_revenue: number;
  net_revenue: number;
  total_discount: number;
  discount_leakage_pct: number;
  total_orders: number;
  avg_order_value: number;
  delta: RevenueKpiDelta;
}

export interface RevenueByServiceTypeItem {
  service_type: string;
  net_revenue: number;
  pct_of_total: number;
  order_count: number;
}

export type LayananCategory =
  | "grooming"
  | "hotel"
  | "daycare"
  | "spa"
  | "addon"
  | "pickup"
  | "other";

export interface RevenueByLayananCategoryItem {
  category: LayananCategory;
  label: string;
  net_revenue: number;
  pct_of_total: number;
}

export interface DiscountBreakdown {
  membership_benefit_total: number;
  promotion_discount_total: number;
  admin_discount_total: number;
  total_attributed: number;
  leakage_pct: number;
}

export interface MembershipRevenue {
  membership_revenue: number;
  new_memberships_count: number;
  avg_membership_value: number;
}

export interface RevenueTrendPoint {
  date: string;
  gross: number;
  net: number;
}

export interface RevenueResponse {
  message: string;
  range: { from: string; to: string };
  kpis: RevenueKpis;
  by_service_type_grooming: RevenueByServiceTypeItem[];
  by_layanan_category: RevenueByLayananCategoryItem[];
  discount_breakdown: DiscountBreakdown;
  membership: MembershipRevenue;
  trend7d: RevenueTrendPoint[];
}

export async function getRevenueMetrics(params?: DashboardRangeParams) {
  return apiAuthRequest<RevenueResponse>(
    `/admin/dashboard/revenue${buildQuery(params)}`,
  );
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export interface BookingsKpiDelta {
  total_bookings_pct: number | null;
  new_pets_served_pct: number | null;
}

export interface BookingsKpis {
  total_bookings: number;
  new_pets_served: number;
  returning_pets: number;
  repeat_booking_rate_pct: number;
  cancellation_rate_pct: number;
  completed: number;
  cancelled: number;
  no_shows: number;
  delta: BookingsKpiDelta;
}

export interface BookingStatusBreakdown {
  status: string;
  count: number;
}

export interface BookingServiceBreakdown {
  service_type: string;
  count: number;
}

export interface PeakHourBucket {
  hour: number;
  count: number;
}

export interface BookingsByDayBucket {
  day_index: number;
  label: string;
  count: number;
}

export interface BookingsMetricsResponse {
  message: string;
  range: { from: string; to: string };
  kpis: BookingsKpis;
  by_status: BookingStatusBreakdown[];
  by_service_type: BookingServiceBreakdown[];
  peak_hour: PeakHourBucket[];
  by_day: BookingsByDayBucket[];
}

export async function getBookingsMetrics(params?: DashboardRangeParams) {
  return apiAuthRequest<BookingsMetricsResponse>(
    `/admin/dashboard/bookings${buildQuery(params)}`,
  );
}

// ── Capacity ──────────────────────────────────────────────────────────────────

export interface CapacityStoreItem {
  store_id: string;
  store_name: string;
  used_minutes: number;
  total_capacity_minutes: number;
  slots_remaining_minutes: number;
  utilisation_pct: number;
  is_closed: boolean;
}

export interface CapacityTrendPoint {
  date: string;
  utilisation_pct: number;
}

export interface CapacityResponse {
  message: string;
  today: string;
  stores: CapacityStoreItem[];
  trend7d: CapacityTrendPoint[];
}

export async function getCapacityMetrics(params?: { store_id?: string }) {
  const qs =
    params?.store_id && params.store_id !== "all"
      ? `?store_id=${encodeURIComponent(params.store_id)}`
      : "";
  return apiAuthRequest<CapacityResponse>(`/admin/dashboard/capacity${qs}`);
}

// ── Groomer performance ───────────────────────────────────────────────────────

export interface GroomerPerformanceItem {
  groomer_id: string;
  groomer_name: string;
  orders_completed: number;
  in_progress: number;
  avg_session_duration_min: number;
  avg_overrun_mins: number;
  workload_pct: number;
  on_time_rate_pct: number | null;
  revenue_attributed: number;
}

export interface GroomerPerformanceResponse {
  message: string;
  today: string;
  groomers: GroomerPerformanceItem[];
  team_on_time_rate_pct: number | null;
  team_avg_session_duration_min: number;
  team_revenue_attributed: number;
}

export async function getGroomerPerformance(params?: { store_id?: string }) {
  const qs =
    params?.store_id && params.store_id !== "all"
      ? `?store_id=${encodeURIComponent(params.store_id)}`
      : "";
  return apiAuthRequest<GroomerPerformanceResponse>(
    `/admin/dashboard/groomers${qs}`,
  );
}

// ── Activity feed ─────────────────────────────────────────────────────────────

export type ActivityEventType =
  | "booking_completed"
  | "booking_new"
  | "booking_cancelled"
  | "membership_purchased"
  | "membership_expired"
  | "customer_registered";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  timestamp: string;
  title: string;
  subtitle: string;
  store_id?: string | null;
  amount?: number | null;
  is_early_renewal?: boolean;
}

export interface ActivityFeedResponse {
  message: string;
  events: ActivityEvent[];
}

export async function getActivityFeed(params?: {
  store_id?: string;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params?.store_id && params.store_id !== "all")
    qs.set("store_id", params.store_id);
  if (params?.limit) qs.set("limit", String(params.limit));
  const s = qs.toString();
  return apiAuthRequest<ActivityFeedResponse>(
    `/admin/dashboard/activity${s ? `?${s}` : ""}`,
  );
}

// ── Membership health ─────────────────────────────────────────────────────────

export interface MembershipTierItem {
  tier: string;
  count: number;
  pct: number;
}

export interface MembershipHealthResponse {
  message: string;
  range: { from: string; to: string };
  active_memberships: number;
  new_memberships: number;
  membership_revenue: number;
  avg_membership_value: number;
  renewal_rate_pct: number | null;
  expiring_7_days: number;
  expiring_30_days: number;
  penetration_rate_pct: number;
  tier_breakdown: MembershipTierItem[];
}

export async function getMembershipHealth(params?: {
  from?: string;
  to?: string;
}) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const s = qs.toString();
  return apiAuthRequest<MembershipHealthResponse>(
    `/admin/dashboard/membership-health${s ? `?${s}` : ""}`,
  );
}

// ── Customer & pet growth ─────────────────────────────────────────────────────

export type PetStatusKey = "idle" | "new" | "active" | "at_risk" | "lapsed";

export interface PetStatusSnapshot {
  idle: number;
  new: number;
  active: number;
  at_risk: number;
  lapsed: number;
  total: number;
}

export interface GrowthResponse {
  message: string;
  range: { from: string; to: string };
  new_customers: number;
  new_pets_registered: number;
  pets_from_existing_owners: number;
  first_booking_conversion_pct: number;
  net_pet_growth: number;
  delta: {
    new_customers_pct: number | null;
    new_pets_registered_pct: number | null;
  };
  pet_status: PetStatusSnapshot;
}

export async function getGrowth(params?: { from?: string; to?: string }) {
  const qs = new URLSearchParams();
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  const s = qs.toString();
  return apiAuthRequest<GrowthResponse>(
    `/admin/dashboard/growth${s ? `?${s}` : ""}`,
  );
}
