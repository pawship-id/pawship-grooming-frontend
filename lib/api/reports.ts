import { apiAuthRequest } from "./client";
import { getAccessToken } from "./storage";

// ─── Customer Report types ────────────────────────────────────────────────────

export interface CustomerMasterDataRow {
  customer_id: string;
  customer_code: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_category: string;
  customer_tags: string[];
  customer_address: string;
  registered_at: string | null;
  pet_id: string;
  pet_code: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  size_category: string;
  feather_type: string;
  birthday: string | null;
  weight: number | null;
  pet_tags: string[];
  internal_note: string;
  membership_tier: string;
  membership_status: string;
  membership_start: string | null;
  membership_expiry: string | null;
  last_visit_at: string | null;
  last_grooming_at: string | null;
  pet_registered_at: string | null;
  has_booked: boolean;
}

export interface CustomerRetentionRow {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_category: string;
  pet_id: string;
  pet_name: string;
  pet_type: string;
  breed: string;
  membership_tier: string;
  first_booking_date: string | null;
  last_booking_date: string | null;
  days_since_last_visit: number | null;
  total_visits: number;
  total_visits_ytd: number;
  avg_visit_interval: number | null;
  lifetime_revenue: number;
  lifetime_revenue_ytd: number;
  favourite_service: string;
  pet_status: "idle" | "new" | "active" | "at_risk" | "lapsed";
  has_booked: boolean;
}

export async function getCustomerMasterData(search?: string): Promise<{ data: CustomerMasterDataRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  const query = qs.toString();
  return apiAuthRequest(`/reports/customer/master-data${query ? `?${query}` : ""}`);
}

export async function getCustomerRetentionReport(search?: string): Promise<{ data: CustomerRetentionRow[]; total: number }> {
  const qs = new URLSearchParams();
  if (search) qs.set("search", search);
  const query = qs.toString();
  return apiAuthRequest(`/reports/customer/retention${query ? `?${query}` : ""}`);
}

// ─── Capacity Utilisation Report ──────────────────────────────────────────────

export interface CapacityReportRow {
  store_id: string;
  store_code: string;
  store_name: string;
  date: string;
  default_capacity_mins: number;
  daily_override_mins: number | null;
  effective_capacity_mins: number;
  used_minutes: number;
  utilisation_pct: number;
  remaining_minutes: number;
  total_bookings: number;
  overbooking_limit_mins: number;
  is_overbooked: boolean;
  has_capacity_override: boolean;
  capacity_notes: string | null;
}

export interface CapacityReportParams {
  date_from?: string;
  date_to?: string;
  store_id?: string;
}

export async function getCapacityReport(
  params: CapacityReportParams = {},
): Promise<{ count: number; data: CapacityReportRow[] }> {
  const qs = new URLSearchParams();
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.store_id && params.store_id !== "all")
    qs.set("store_id", params.store_id);

  return apiAuthRequest<{ count: number; data: CapacityReportRow[] }>(
    `/reports/capacity-utilisation${qs.toString() ? `?${qs}` : ""}`,
  );
}

/**
 * Opens a live SSE stream for the Capacity Utilisation report.
 * - `onSnapshot`: called once with the full initial dataset.
 * - `onUpdate`: called each time a booking mutation causes a row to change.
 * - `onError`: called on server-reported errors (not AbortError).
 * Pass an AbortSignal to close the stream.
 */
export async function streamCapacityReport(
  params: CapacityReportParams,
  onSnapshot: (rows: CapacityReportRow[]) => void,
  onUpdate: (row: CapacityReportRow) => void,
  onError: (message: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const qs = new URLSearchParams();
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.store_id && params.store_id !== "all")
    qs.set("store_id", params.store_id);

  const token = getAccessToken();
  const url = `/api/reports/capacity-utilisation/stream${qs.toString() ? `?${qs}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = `Request gagal (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (json.message)
        message = Array.isArray(json.message)
          ? json.message.join(", ")
          : json.message;
    } catch { /* ignore */ }
    onError(message);
    return;
  }

  if (!response.body) {
    onError("Response body tidak tersedia");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n|\r/g, "\n");

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = "message";
        let data = "";
        for (const line of part.split("\n")) {
          if (line.startsWith("event:")) eventType = line.slice(6).trim();
          else if (line.startsWith("data:")) data = line.slice(5).trim();
        }
        if (!data) continue;

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (eventType === "snapshot" && Array.isArray(parsed.rows)) {
            onSnapshot(parsed.rows as CapacityReportRow[]);
          } else if (eventType === "update" && parsed.row) {
            onUpdate(parsed.row as CapacityReportRow);
          } else if (eventType === "error") {
            onError((parsed.message as string) ?? "Terjadi kesalahan");
          }
        } catch { /* malformed JSON — skip */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
import type { AdminBooking } from "./bookings";

export interface FinancialReportParams {
  date_from?: string;
  date_to?: string;
  store_id?: string;
  booking_status?: string;
  /** 'in store' | 'in home' — server-side filter */
  booking_type?: string;
  limit?: number;
}

interface FinancialReportResponse {
  message: string;
  bookings: AdminBooking[];
  total: number;
}

export async function getFinancialReport(
  params: FinancialReportParams = {},
): Promise<AdminBooking[]> {
  const qs = new URLSearchParams();
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.store_id && params.store_id !== "all")
    qs.set("store_id", params.store_id);
  if (params.booking_status && params.booking_status !== "all")
    qs.set("booking_status", params.booking_status);
  if (params.booking_type && params.booking_type !== "all")
    qs.set("booking_type", params.booking_type);
  qs.set("limit", String(params.limit ?? 10000));

  const data = await apiAuthRequest<FinancialReportResponse>(
    `/reports/financial?${qs}`,
  );
  return data.bookings ?? [];
}

// ─── SSE streaming ────────────────────────────────────────────────────────────

function buildSseUrl(params: FinancialReportParams): string {
  const qs = new URLSearchParams();
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.store_id && params.store_id !== "all")
    qs.set("store_id", params.store_id);
  if (params.booking_status && params.booking_status !== "all")
    qs.set("booking_status", params.booking_status);
  if (params.booking_type && params.booking_type !== "all")
    qs.set("booking_type", params.booking_type);
  qs.set("limit", String(params.limit ?? 10000));
  return `/api/reports/financial/stream?${qs}`;
}

/**
 * Streams the financial report via SSE.
 * `onChunk` is called progressively with each batch of bookings.
 * `onDone` is called with the final total when the stream closes normally.
 * `onError` is called on server-reported errors (not on AbortError).
 * Pass an AbortSignal to cancel the stream early.
 */
export async function streamFinancialReport(
  params: FinancialReportParams,
  onChunk: (bookings: AdminBooking[]) => void,
  onDone: (total: number) => void,
  onError: (message: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const token = getAccessToken();

  const response = await fetch(buildSseUrl(params), {
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = `Request gagal (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (json.message)
        message = Array.isArray(json.message)
          ? json.message.join(", ")
          : json.message;
    } catch {
      /* ignore */
    }
    onError(message);
    return;
  }

  if (!response.body) {
    onError("Response body tidak tersedia");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      // Normalize CRLF so event boundaries are consistent
      buffer = buffer.replace(/\r\n|\r/g, "\n");

      // SSE events are separated by a blank line (\n\n)
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = "message";
        let data = "";
        for (const line of part.split("\n")) {
          if (line.startsWith("event:")) eventType = line.slice(6).trim();
          else if (line.startsWith("data:")) data = line.slice(5).trim();
        }
        if (!data) continue;

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (eventType === "chunk" && Array.isArray(parsed.bookings)) {
            onChunk(parsed.bookings as AdminBooking[]);
          } else if (eventType === "done") {
            onDone((parsed.total as number) ?? 0);
          } else if (eventType === "error") {
            onError((parsed.message as string) ?? "Terjadi kesalahan");
          }
        } catch {
          /* malformed JSON — skip */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Operations report (Booking & Ops Detail) — SSE streaming ────────────────

export interface OperationsReportParams {
  date_from?: string;
  date_to?: string;
  store_id?: string;
  booking_status?: string;
  /** 'in store' | 'in home' */
  booking_type?: string;
  /** 'not_started' | 'in_progress' | 'finished' */
  session_status?: string;
  /** e.g. 'Grooming' | 'Hotel' | 'Add-on' */
  service_type?: string;
  limit?: number;
}

function buildOperationsSseUrl(params: OperationsReportParams): string {
  const qs = new URLSearchParams();
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.store_id) qs.set("store_id", params.store_id);
  if (params.booking_status) qs.set("booking_status", params.booking_status);
  if (params.booking_type) qs.set("booking_type", params.booking_type);
  if (params.session_status) qs.set("session_status", params.session_status);
  if (params.service_type) qs.set("service_type", params.service_type);
  qs.set("limit", String(params.limit ?? 10000));
  return `/api/reports/operations/stream?${qs}`;
}

export async function streamOperationsReport(
  params: OperationsReportParams,
  onChunk: (bookings: AdminBooking[]) => void,
  onDone: (total: number) => void,
  onError: (message: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const token = getAccessToken();

  const response = await fetch(buildOperationsSseUrl(params), {
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    let message = `Request gagal (${response.status})`;
    try {
      const json = JSON.parse(text);
      if (json.message)
        message = Array.isArray(json.message)
          ? json.message.join(", ")
          : json.message;
    } catch {
      /* ignore */
    }
    onError(message);
    return;
  }

  if (!response.body) {
    onError("Response body tidak tersedia");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = buffer.replace(/\r\n|\r/g, "\n");

      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        if (!part.trim()) continue;

        let eventType = "message";
        let data = "";
        for (const line of part.split("\n")) {
          if (line.startsWith("event:")) eventType = line.slice(6).trim();
          else if (line.startsWith("data:")) data = line.slice(5).trim();
        }
        if (!data) continue;

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;
          if (eventType === "chunk" && Array.isArray(parsed.bookings)) {
            onChunk(parsed.bookings as AdminBooking[]);
          } else if (eventType === "done") {
            onDone((parsed.total as number) ?? 0);
          } else if (eventType === "error") {
            onError((parsed.message as string) ?? "Terjadi kesalahan");
          }
        } catch {
          /* malformed JSON — skip */
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Live booking push ─────────────────────────────────────────────────────────

/**
 * Opens a persistent SSE connection that receives individual booking events
 * whenever a booking is created or updated on the server.
 * Returns a cleanup function; call it to close the connection.
 */
export function connectLiveBookings(
  onBookingChanged: (booking: AdminBooking) => void,
  signal: AbortSignal,
): void {
  const token = getAccessToken();

  fetch("/api/reports/financial/live", {
    headers: {
      Authorization: `Bearer ${token ?? ""}`,
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
    signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          buffer = buffer.replace(/\r\n|\r/g, "\n");

          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            if (!part.trim()) continue;

            let eventType = "message";
            let data = "";
            for (const line of part.split("\n")) {
              if (line.startsWith("event:")) eventType = line.slice(6).trim();
              else if (line.startsWith("data:")) data = line.slice(5).trim();
            }
            if (!data) continue;

            try {
              const parsed = JSON.parse(data) as Record<string, unknown>;
              if (eventType === "booking_changed" && parsed.booking) {
                onBookingChanged(parsed.booking as AdminBooking);
              }
            } catch {
              /* malformed JSON — skip */
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    })
    .catch((err: unknown) => {
      if (err instanceof Error && err.name === "AbortError") return;
      // Non-fatal — live updates simply stop working if the connection drops
      console.warn("[live-bookings] SSE connection closed:", err);
    });
}
