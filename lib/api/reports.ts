import { apiAuthRequest } from "./client";
import { getAccessToken } from "./storage";
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
