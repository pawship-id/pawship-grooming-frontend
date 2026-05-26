import { apiAuthRequest } from "./client";
import {
  uploadFileToCloudinary,
  type CloudinarySignature,
} from "../cloudinary-upload";

// ── Shared ref shapes ────────────────────────────────────────────────────────

export interface BookingOptionRef {
  _id: string;
  name: string;
}

// ── Pet Snapshot ─────────────────────────────────────────────────────────────

export interface CustomerSnapshot {
  customer_name: string;
  customer_phone: string;
  customer_category?: { _id: string; name: string } | null;
}

export interface PetSnapshot {
  _id: string;
  name: string;
  description?: string;
  internal_note?: string;
  member_type?: string | null;
  pet_type: BookingOptionRef;
  size: BookingOptionRef;
  hair: BookingOptionRef;
  breed: BookingOptionRef;
  tags?: string[];
}

// ── Service Snapshot ─────────────────────────────────────────────────────────

export interface ServiceSnapshotAddon {
  _id: string;
  code: string;
  name: string;
  price: number;
  duration: number;
}

export interface ServiceSnapshot {
  _id: string;
  code: string;
  name: string;
  description: string;
  service_type: { _id: string; title: string };
  price: number;
  duration: number;
  addons: ServiceSnapshotAddon[];
}

// ── Status Logs ──────────────────────────────────────────────────────────────

export interface StatusLog {
  status: string;
  timestamp: string;
  note: string;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export interface CustomerReview {
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export interface SessionMedia {
  _id?: string;
  url?: string;
  secure_url?: string;
  public_id?: string;
  type: "before" | "after" | "other";
  // Canonical caption field. Optional — old media may not have it; in that
  // case the backend mirrors the legacy `note` value into `notes` on read.
  notes?: string | null;
  /** @deprecated kept so older payloads still render — use `notes`. */
  note?: string | null;
  session_id?: string;
  created_by?: {
    user_id?: string;
    name_snapshot?: string;
  };
  uploaded_at?: string;
}

export interface BookingSession {
  _id?: string;
  type: string;
  groomer_id?: string | { _id: string; username?: string };
  /** Populated groomer object — backend toJSON renames groomer_id → groomer_detail when populated */
  groomer_detail?: { _id: string; username?: string; email?: string; phone_number?: string };
  status: string;
  started_at: string | null;
  finished_at: string | null;
  notes: string | null;
  internal_note: string | null;
  order: number;
  media: SessionMedia[];
  ideal_duration?: number | null;
  review_customer?: CustomerReview | null;
}

export interface SessionInput {
  type: string;
  groomer_id?: string;
  order?: number;
}

export interface GroomingSession {
  status: string;
  arrived_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  notes: string;
  internal_note: string;
  media: string[];
}

// ── Populated relations ──────────────────────────────────────────────────────

export interface BookingCustomer {
  _id: string;
  code?: string;
  username: string;
  email: string;
  phone_number: string;
}

export interface BookingStore {
  _id: string;
  code?: string;
  name: string;
}

// ── Applied benefit (saved on booking) ─────────────────────────────────────

export interface AdminAppliedBenefit {
  benefit: {
    _id: string;
    label: string | null;
    service: { name: string } | null;
  };
  applies_to: string;
  benefit_type: string; // 'discount' | 'quota'
  benefit_period: string; // 'weekly' | 'monthly' | 'unlimited'
  benefit_value: number | null;
  base_price: number;
  amount_deducted: number;
  description: string | null;
  pet_membership_id: string | null;
  service_id: string | null;
  applied_at: string;
}

// ── Applied promotion (saved on booking) ─────────────────────────────────────

export interface AdminAppliedPromotion {
  promotion_id: string;
  code: string;
  name: string;
  applies_to: string;
  discount_type: string;
  value: number;
  base_price: number;
  amount_deducted: number;
  service_id: string | null;
  applied_at: string;
}

// ── Main booking shape ───────────────────────────────────────────────────────

export interface AdminBooking {
  _id: string;
  code?: string;
  customer_id: string;
  pet_id: string;
  store_id: string;
  service_type?: string;
  customer_snapshot?: CustomerSnapshot;
  pet_snapshot: PetSnapshot;
  service_snapshot: ServiceSnapshot;
  date: string;
  end_date?: string | null;
  time_range: string;
  type: string;
  booking_status: string;
  status_logs: StatusLog[];
  service_addon_ids: string[];
  pickup_fee: number;
  delivery_fee: number;
  travel_fee: number;
  sub_total_service: number;
  original_total_price: number;
  total_discount: number;
  final_total_price: number;
  pick_up: boolean;
  delivery: boolean;
  applied_benefits: AdminAppliedBenefit[];
  selected_benefit_ids: string[];
  applied_promotions: AdminAppliedPromotion[];
  selected_promotion_ids: string[];
  discount_ids: string[];
  sessions: BookingSession[];
  media?: SessionMedia[];
  grooming_session?: GroomingSession;
  referal_code?: string;
  note?: string;
  brought_items_note?: string | null;
  cancellation_reason?: string | null;
  payment_method?: string;
  created_by_role?: "customer" | "admin" | null;
  manual_discount_type?: string | null; // kept for legacy display
  manual_discount_amount?: number; // kept for legacy display
  edited_service_price?: number | null;
  edited_service_discount?: number | null;
  edited_travel_fee?: number | null;
  edited_travel_fee_discount?: number | null;
  edited_addon_prices?: {
    addon_id: string;
    price: number;
    discount?: number;
  }[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  // Populated by backend (present in both list and detail responses)
  customer?: BookingCustomer;
  store?: BookingStore;
  pet?: { _id: string; code?: string };
  // Enriched by backend: memberships active on the booking date
  active_memberships?: { name: string }[];
}

// ── Response shapes ──────────────────────────────────────────────────────────

export interface BookingsResponse {
  message: string;
  bookings: AdminBooking[];
  total: number;
  page: number;
  limit: number;
}

export interface BookingDetailResponse {
  message: string;
  booking: AdminBooking;
}

// ── Booking preview ──────────────────────────────────────────────────────────

export interface BookingPreviewBenefit {
  _id: string;
  applies_to: string;
  service_id?: string;
  label?: string;
  service?: any;
  type: string; // "discount" | "quota"
  period: string; // "weekly" | "monthly" | "unlimited"
  value?: number;
  limit: number | null;
  used: number;
  remaining: number | null;
  can_apply: boolean;
  period_reset_date: string | null;
  next_reset_date: string | null;
  amount_discount?: number;
  description: string;
}

// ── Booking preview promotion ────────────────────────────────────────────────

export interface BookingPreviewPromotion {
  _id: string;
  code: string;
  name: string;
  description: string | null;
  applies_to: string;
  service_id: string | null;
  service_name: string | null;
  discount_type: string;
  value: number;
  is_stackable: boolean;
  is_available_to_membership: boolean;
  amount_discount: number;
  limit_type?: string;
  max_usage?: number | null;
  usage_period?: string;
  can_use?: boolean;
  usage_count?: number;
  limit_message?: string | null;
}

export interface BookingPreviewResult {
  pet_id: string;
  pet_name: string;
  service_id: string;
  service_name: string;
  is_hotel?: boolean;
  hotel_nights?: number;
  start_date?: string;
  end_date?: string;
  pricing: {
    original_service_price: number;
    base_service_price?: number;
    hotel_nights?: number;
    addon_prices: { _id: string; name: string; price: number }[];
    subtotal_before_benefits: number;
    has_active_membership: boolean;
    available_benefits: BookingPreviewBenefit[];
    available_promotions: BookingPreviewPromotion[];
    estimated_total_discount: number;
    estimated_final_price: number;
  };
  pricing_breakdown: {
    service: {
      name: string;
      price: number;
      base_price?: number;
      nights?: number;
    };
    addons: { _id: string; name: string; price: number }[];
    travel_fee?: number;
    subtotal: number;
    grand_total: number;
    discount: number;
    final: number;
  };
}

// ── Apply benefit preview ────────────────────────────────────────────────────

export interface ApplyBenefitBreakdownItem {
  benefit: {
    _id: string;
    label: string | null;
    service: { name: string } | null;
  };
  applies_to: string;
  benefit_type: string;
  benefit_period: string;
  benefit_value: number | null;
  base_price: number;
  amount_deducted: number;
  description: string | null;
  service_id: string | null;
  applied_at: string;
}

export interface ApplyBenefitPreviewResult {
  applied_benefits: {
    benefit_id: string;
    benefit_type: string;
    benefit_period: string;
    benefit_value: number | null;
    amount_deducted: number;
    applied_at: string;
  }[];
  total_discount: number;
  final_price: number;
  breakdown: ApplyBenefitBreakdownItem[];
}

// ── Request payloads ─────────────────────────────────────────────────────────

export interface CreateBookingPayload {
  service_type_id: string;
  customer_id: string;
  pet_id: string;
  store_id: string;
  service_id: string;
  date: string;
  end_date?: string;
  time_range: string;
  type: "in home" | "in store";
  service_addon_ids?: string[];
  pick_up?: boolean;
  delivery?: boolean;
  discount_ids?: string[];
  selected_benefit_ids?: string[];
  selected_promotion_ids?: string[];
  referal_code?: string;
  note?: string;
  brought_items_note?: string;
  payment_method?: string;
  code?: string;
}

export type UpdateBookingPayload = Partial<
  Omit<CreateBookingPayload, "customer_id">
> & {
  booking_status?: string;
};

export interface UpdateBookingPricingPayload {
  service_id?: string;
  service_price?: number;
  service_discount?: number;
  travel_fee?: number;
  travel_fee_discount?: number;
  addon_prices?: { addon_id: string; price?: number; discount?: number }[];
  selected_benefit_ids?: string[];
  selected_promotion_ids?: string[];
  service_addon_ids?: string[];
  pick_up?: boolean;
  delivery?: boolean;
}

export interface UpdateSessionPayload {
  notes?: string;
  internal_note?: string;
  groomer_id?: string;
  started_at?: string;
  finished_at?: string;
}

export interface FinishSessionPayload {
  notes?: string;
}

export interface UpdateBookingStatusPayload {
  status: string;
  date?: string;
  time_range?: string;
  note?: string;
  cancellation_reason?: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export interface GetAdminBookingsParams {
  page?: number;
  limit?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  created_by_role?: string;
  customer_id?: string;
  pet_id?: string;
  store_id?: string;
  service_id?: string;
  service_type?: string;
  groomer_id?: string;
  search?: string;
}

export async function getAdminBookings(params?: GetAdminBookingsParams) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.status) qs.set("status", params.status);
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.created_by_role)
    qs.set("created_by_role", params.created_by_role);
  if (params?.customer_id) qs.set("customer_id", params.customer_id);
  if (params?.pet_id) qs.set("pet_id", params.pet_id);
  if (params?.store_id) qs.set("store_id", params.store_id);
  if (params?.service_id) qs.set("service_id", params.service_id);
  if (params?.service_type) qs.set("service_type", params.service_type);
  if (params?.groomer_id) qs.set("groomer_id", params.groomer_id);
  if (params?.search) qs.set("search", params.search);
  const query = qs.toString();
  return apiAuthRequest<BookingsResponse>(
    query ? `/bookings?${query}` : "/bookings",
  );
}

/**
 * Get all bookings for export (without pagination limit)
 * Respects the same filters as getAdminBookings
 */
export async function getAllAdminBookingsForExport(
  params?: Omit<GetAdminBookingsParams, "page" | "limit">,
) {
  const qs = new URLSearchParams();
  qs.set("limit", "10000"); // Large limit to get all bookings
  if (params?.status) qs.set("status", params.status);
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.created_by_role)
    qs.set("created_by_role", params.created_by_role);
  if (params?.customer_id) qs.set("customer_id", params.customer_id);
  if (params?.store_id) qs.set("store_id", params.store_id);
  const query = qs.toString();
  const response = await apiAuthRequest<BookingsResponse>(`/bookings?${query}`);
  return response.bookings;
}

export async function getAdminBookingById(id: string) {
  return apiAuthRequest<BookingDetailResponse>(`/bookings/${id}`);
}

export async function getBookingPreview(payload: {
  pet_id: string;
  service_id: string;
  addon_ids?: string[];
  date: string;
  end_date?: string;
  time_range?: string;
  service_location_type?: string;
  pick_up?: boolean;
  delivery?: boolean;
  store_id?: string;
  customer_id?: string;
  exclude_booking_id?: string;
}) {
  return apiAuthRequest<{ message: string } & BookingPreviewResult>(
    "/bookings/preview",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function applyBenefitPreview(payload: {
  pet_id: string;
  selected_benefit_ids: string[];
  store_id?: string;
  service_id?: string;
  add_on_ids?: string[];
  original_total_price?: number;
  booking_date?: string;
  pick_up?: boolean;
  delivery?: boolean;
  exclude_booking_id?: string;
}) {
  return apiAuthRequest<{ message: string } & ApplyBenefitPreviewResult>(
    "/bookings/public/apply-benefit",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

// ── Apply promotion preview ──────────────────────────────────────────────────

export interface ApplyPromotionPreviewResult {
  applied_promotions: {
    promotion_id: string;
    code: string;
    name: string;
    applies_to: string;
    discount_type: string;
    value: number;
    amount_deducted: number;
    applied_at: string;
  }[];
  total_discount: number;
  breakdown: {
    promotion_id: string;
    code: string;
    name: string;
    applies_to: string;
    discount_type: string;
    value: number;
    base_price: number;
    amount_deducted: number;
    service_id: string | null;
    applied_at: string;
  }[];
}

export async function applyPromotionPreview(payload: {
  selected_promotion_ids: string[];
  service_id: string;
  addon_ids?: string[];
  original_service_price?: number;
  travel_fee?: number;
  grand_total?: number;
  pick_up?: boolean;
  delivery?: boolean;
  has_active_membership?: boolean;
  addon_prices?: { _id: string; name: string; price: number }[];
  customer_id?: string;
  pet_id?: string;
  booking_date?: string;
  exclude_booking_id?: string;
}) {
  return apiAuthRequest<{ message: string } & ApplyPromotionPreviewResult>(
    "/bookings/public/apply-promotion",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createAdminBooking(payload: CreateBookingPayload) {
  return apiAuthRequest<{ message: string; _id?: string }>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAdminBooking(
  id: string,
  payload: UpdateBookingPayload,
) {
  return apiAuthRequest<{ message: string }>(`/bookings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateBookingPricing(
  id: string,
  payload: UpdateBookingPricingPayload,
) {
  return apiAuthRequest<{ message: string }>(`/bookings/${id}/pricing`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function updateBookingNote(id: string, note?: string) {
  return apiAuthRequest<{ message: string }>(`/bookings/${id}/note`, {
    method: "PATCH",
    body: JSON.stringify({ note }),
  });
}

export async function updateBookingBroughtItemsNote(
  id: string,
  brought_items_note?: string,
) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${id}/brought-items`,
    {
      method: "PATCH",
      body: JSON.stringify({ brought_items_note }),
    },
  );
}

// Fetches membership benefits directly for a pet, bypassing service price lookups.
// Used as a fallback when getBookingPreview fails (e.g. service is soft-deleted).
export async function getPetBenefitsSummary(petId: string) {
  return apiAuthRequest<{
    message: string;
    data: Array<{
      membership: {
        _id: string;
        membership_plan_id: string | null;
        membership_name: string | null;
        start_date: string;
        end_date: string;
      };
      benefits: Array<{
        _id: string;
        pet_membership_id: string;
        applies_to: string;
        service_id: string | null;
        label: string | null;
        service: any | null;
        type: string;
        period: string;
        limit: number | null;
        value: number | null;
        used: number;
        remaining: number | null;
        can_apply: boolean;
        period_reset_date: string | null;
        next_reset_date: string | null;
      }>;
    }>;
  }>(`/pet-memberships/${petId}/benefits-summary`);
}

export async function updateBookingStatus(
  id: string,
  payload: UpdateBookingStatusPayload,
) {
  return apiAuthRequest<{ message: string }>(`/bookings/update-status/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteAdminBooking(id: string) {
  return apiAuthRequest<{ message: string }>(`/bookings/${id}`, {
    method: "DELETE",
  });
}

export async function createBookingSession(
  bookingId: string,
  payload: SessionInput,
) {
  return apiAuthRequest<{ message: string }>(`/bookings/${bookingId}/session`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBookingSession(
  bookingId: string,
  sessionId: string,
  payload: UpdateSessionPayload,
) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/session/${sessionId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function startBookingSession(
  bookingId: string,
  sessionId: string,
) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/session/${sessionId}/start`,
    {
      method: "PATCH",
    },
  );
}

export async function finishBookingSession(
  bookingId: string,
  sessionId: string,
  payload: FinishSessionPayload,
) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/session/${sessionId}/finish`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deleteBookingSession(
  bookingId: string,
  sessionId: string,
) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/session/${sessionId}`,
    {
      method: "DELETE",
    },
  );
}

// Booking-level media upload — signed direct upload to Cloudinary.
// Flow: backend issues a signature (auth + folder lock) → browser uploads
// the file directly to Cloudinary → backend records the metadata.
export async function uploadBookingMedia(
  bookingId: string,
  file: File,
  type: "before" | "after" | "other",
  notes?: string,
) {
  const signature = await apiAuthRequest<CloudinarySignature>(
    `/bookings/${bookingId}/media/sign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    },
  );

  const { secure_url, public_id } = await uploadFileToCloudinary(file, signature);

  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/media/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, public_id, secure_url, notes }),
    },
  );
}

export async function deleteBookingMedia(bookingId: string, publicId: string) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/media?public_id=${encodeURIComponent(publicId)}`,
    { method: "DELETE" },
  );
}

// Upload "other" media from a specific session — stored in booking.media[].
// Only admin or the groomer assigned to the session can call this. Uses the
// same signed direct upload flow as uploadBookingMedia.
export async function uploadSessionOtherMedia(
  bookingId: string,
  sessionId: string,
  file: File,
  notes?: string,
) {
  const signature = await apiAuthRequest<CloudinarySignature>(
    `/bookings/${bookingId}/session/${sessionId}/media/other/sign`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    },
  );

  const { secure_url, public_id } = await uploadFileToCloudinary(file, signature);

  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/session/${sessionId}/media/other/confirm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id, secure_url, notes }),
    },
  );
}

// Update the caption/notes of an existing booking media item.
// Admin can edit any; groomer only their own. Empty string clears it.
export async function updateBookingMediaNotes(
  bookingId: string,
  publicId: string,
  notes: string,
) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/media/notes`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId, notes }),
    },
  );
}

// Delete booking media with auth — admin can delete any, groomer only their own
export async function deleteBookingMediaAuth(
  bookingId: string,
  publicId: string,
) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/media/auth?public_id=${encodeURIComponent(publicId)}`,
    { method: "DELETE" },
  );
}

// ── Groomer API functions ────────────────────────────────────────────────────

export interface GetGroomerMyJobsParams {
  page?: number;
  limit?: number;
  session_status?: string;
  date_from?: string;
  date_to?: string;
}

export async function getGroomerMyJobs(params?: GetGroomerMyJobsParams) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.session_status) qs.set("session_status", params.session_status);
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  const query = qs.toString();
  return apiAuthRequest<BookingsResponse>(
    query ? `/bookings/groomer/my-jobs?${query}` : "/bookings/groomer/my-jobs",
  );
}

export interface GetGroomerOpenJobsParams {
  page?: number;
  limit?: number;
  // YYYY-MM-DD. When both are omitted the backend defaults to today (unless
  // `scope` overrides). Pass both equal to today's date to be explicit.
  date_from?: string;
  date_to?: string;
  // Explicit store override — ignored by the backend if the caller is a
  // groomer with a placement (branch scoping is always enforced).
  store_id?: string;
  // "all" / "urgent" → backend skips the default today filter. Use this for
  // the urgent dashboard section.
  scope?: "today" | "all" | "urgent";
}

export async function getGroomerOpenJobs(params?: GetGroomerOpenJobsParams) {
  const qs = new URLSearchParams();
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  if (params?.date_from) qs.set("date_from", params.date_from);
  if (params?.date_to) qs.set("date_to", params.date_to);
  if (params?.store_id) qs.set("store_id", params.store_id);
  if (params?.scope) qs.set("scope", params.scope);
  const query = qs.toString();
  return apiAuthRequest<BookingsResponse>(
    query
      ? `/bookings/groomer/open-jobs?${query}`
      : "/bookings/groomer/open-jobs",
  );
}

export async function claimSession(bookingId: string, sessionId: string) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/session/${sessionId}/claim`,
    { method: "PATCH" },
  );
}

export async function reviewSession(
  bookingId: string,
  sessionId: string,
  payload: { rating: number; comment?: string },
) {
  return apiAuthRequest<{ message: string }>(
    `/bookings/${bookingId}/session/${sessionId}/review`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
