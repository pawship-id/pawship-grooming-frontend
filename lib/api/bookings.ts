import { apiAuthRequest } from "./client"

// ── Shared ref shapes ────────────────────────────────────────────────────────

export interface BookingOptionRef {
  _id: string
  name: string
}

// ── Pet Snapshot ─────────────────────────────────────────────────────────────

export interface PetSnapshot {
  _id: string
  name: string
  member_type: BookingOptionRef
  pet_type: BookingOptionRef
  size: BookingOptionRef
  hair: BookingOptionRef
  breed: BookingOptionRef
}

// ── Service Snapshot ─────────────────────────────────────────────────────────

export interface ServiceSnapshotAddon {
  _id: string
  code: string
  name: string
  price: number
  duration: number
}

export interface ServiceSnapshot {
  _id: string
  code: string
  name: string
  description: string
  service_type: { _id: string; title: string }
  price: number
  duration: number
  addons: ServiceSnapshotAddon[]
}

// ── Status Logs ──────────────────────────────────────────────────────────────

export interface StatusLog {
  status: string
  timestamp: string
  note: string
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export interface BookingSession {
  _id?: string
  type: string
  groomer_id?: string
  groomer_detail?: BookingCustomer
  status: string
  started_at: string | null
  finished_at: string | null
  notes: string | null
  internal_note: string | null
  order: number
  media: string[]
}

export interface SessionInput {
  type: string
  groomer_id: string
  order?: number
}

export interface GroomingSession {
  status: string
  arrived_at: string | null
  started_at: string | null
  finished_at: string | null
  notes: string
  internal_note: string
  media: string[]
}

// ── Populated relations ──────────────────────────────────────────────────────

export interface BookingCustomer {
  _id: string
  username: string
  email: string
  phone_number: string
}

export interface BookingStore {
  _id: string
  name: string
}

// ── Main booking shape ───────────────────────────────────────────────────────

export interface AdminBooking {
  _id: string
  customer_id: string
  pet_id: string
  store_id: string
  service_id: string
  service_type?: string
  pet_snapshot: PetSnapshot
  service_snapshot: ServiceSnapshot
  date: string
  time_range: string
  type: string
  booking_status: string
  status_logs: StatusLog[]
  service_addon_ids: string[]
  travel_fee: number
  sub_total_service: number
  total_price: number
  discount_ids: string[]
  sessions: BookingSession[]
  grooming_session?: GroomingSession
  referal_code?: string
  note?: string
  payment_method?: string
  isDeleted: boolean
  createdAt: string
  updatedAt: string
  // Populated by backend (present in both list and detail responses)
  customer?: BookingCustomer
  store?: BookingStore
}

// ── Response shapes ──────────────────────────────────────────────────────────

export interface BookingsResponse {
  message: string
  bookings: AdminBooking[]
}

export interface BookingDetailResponse {
  message: string
  booking: AdminBooking
}

// ── Request payloads ─────────────────────────────────────────────────────────

export interface CreateBookingPayload {
  service_type_id: string
  customer_id: string
  pet_id: string
  store_id: string
  service_id: string
  date: string
  time_range: string
  service_addon_ids?: string[]
  travel_fee?: number
  discount_ids?: string[]
  sessions?: SessionInput[]
  referal_code?: string
  note?: string
  payment_method?: string
}

export type UpdateBookingPayload = Partial<
  Omit<CreateBookingPayload, "customer_id">
> & {
  booking_status?: string
}

export interface UpdateSessionPayload {
  notes?: string
  internal_note?: string
}

export interface FinishSessionPayload {
  notes?: string
}

export interface UpdateBookingStatusPayload {
  status: string
  date?: string
  time_range?: string
  note?: string
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getAdminBookings() {
  return apiAuthRequest<BookingsResponse>("/bookings")
}

export async function getAdminBookingById(id: string) {
  return apiAuthRequest<BookingDetailResponse>(`/bookings/${id}`)
}

export async function createAdminBooking(payload: CreateBookingPayload) {
  return apiAuthRequest<{ message: string }>("/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminBooking(id: string, payload: UpdateBookingPayload) {
  return apiAuthRequest<{ message: string }>(`/bookings/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function updateBookingStatus(id: string, payload: UpdateBookingStatusPayload) {
  return apiAuthRequest<{ message: string }>(`/bookings/update-status/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminBooking(id: string) {
  return apiAuthRequest<{ message: string }>(`/bookings/${id}`, {
    method: "DELETE",
  })
}

export async function createBookingSession(bookingId: string, payload: SessionInput) {
  return apiAuthRequest<{ message: string }>(`/bookings/${bookingId}/session`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateBookingSession(bookingId: string, sessionId: string, payload: UpdateSessionPayload) {
  return apiAuthRequest<{ message: string }>(`/bookings/${bookingId}/session/${sessionId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function startBookingSession(bookingId: string, sessionId: string) {
  return apiAuthRequest<{ message: string }>(`/bookings/${bookingId}/session/${sessionId}/start`, {
    method: "PATCH",
  })
}

export async function finishBookingSession(bookingId: string, sessionId: string, payload: FinishSessionPayload) {
  return apiAuthRequest<{ message: string }>(`/bookings/${bookingId}/session/${sessionId}/finish`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteBookingSession(bookingId: string, sessionId: string) {
  return apiAuthRequest<{ message: string }>(`/bookings/${bookingId}/session/${sessionId}`, {
    method: "DELETE",
  })
}
