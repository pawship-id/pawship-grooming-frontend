import * as XLSX from "xlsx";
import { AdminBooking } from "./api/bookings";
import {
  fmtDate,
  fmtDateTime,
  fmtDuration,
  diffMinutes,
  sortedSessions,
  onTimeInfo,
  pad,
} from "./export-financial";

// ─── Groomer name helper ──────────────────────────────────────────────────────

function groomerName(
  sess: AdminBooking["sessions"][number] | undefined,
): string {
  if (!sess) return "-";
  if (sess.groomer_detail?.username) return sess.groomer_detail.username;
  const g = sess.groomer_id;
  if (g && typeof g === "object") return g.username ?? "-";
  return "-";
}

// ─── Base row builder (booking-level fields) ──────────────────────────────────

export function buildOperationsRow(b: AdminBooking) {
  const sess = sortedSessions(b);
  const first = sess[0];

  const { is_on_time, overrun_mins } = onTimeInfo(b);

  const addonNames =
    (b.service_snapshot?.addons ?? []).map((a) => a.name).join(", ") || "-";

  return {
    // ── Booking-level (merged when booking has multiple sessions) ──────
    booking_code: b.code ?? b._id,
    booking_date: fmtDate(b.date),
    time_slot: b.time_range ?? "-",
    booking_type: b.type ?? "-",
    booking_status: b.booking_status ?? "-",
    store_name: b.store?.name ?? "-",
    customer_name:
      b.customer_snapshot?.customer_name ?? b.customer?.username ?? "-",
    customer_phone:
      b.customer_snapshot?.customer_phone ?? b.customer?.phone_number ?? "-",
    pet_name: b.pet_snapshot?.name ?? "-",
    member_type: b.pet_snapshot?.member_type ?? "-",
    service_name: b.service_snapshot?.name ?? "-",
    service_type: b.service_snapshot?.service_type?.title ?? "-",
    addon_names: addonNames,
    estimated_duration: b.service_snapshot?.duration ?? "-",
    is_on_time,
    overrun_mins,
    net_total: b.final_total_price ?? 0,
    // Indicates whether the booking consumed a membership benefit
    // (any applied benefit — discount or quota) vs a one-time purchase.
    membership_usage:
      (b.applied_benefits ?? []).length > 0 ? "Membership" : "One Time Purchase",
    payment_method: b.payment_method ?? "-",
    cancellation_reason: b.cancellation_reason ?? "-",

    // ── Session-level (overridden per session in buildOperationsSessionRows)
    groomer_session: groomerName(first),
    session_name: first?.type ?? "-",
    session_status: first?.status ?? "-",
    started_at: fmtDateTime(first?.started_at),
    finished_at: fmtDateTime(first?.finished_at),
    actual_duration_mins: (() => {
      const d = diffMinutes(first?.started_at, first?.finished_at);
      return typeof d === "number" ? fmtDuration(d) : "-";
    })(),
    pre_conditions: (first?.notes ?? "-") || "-",
    internal_note: (first?.internal_note ?? "-") || "-",
  };
}

export type OperationsRow = ReturnType<typeof buildOperationsRow>;

// ─── Session-level keys (not merged across session rows) ──────────────────────

export const SESSION_COL_KEYS = new Set<keyof OperationsRow>([
  "groomer_session",
  "session_name",
  "session_status",
  "started_at",
  "finished_at",
  "actual_duration_mins",
  "pre_conditions",
  "internal_note",
]);

// ─── Per-session row (one row per session — used by table & export) ───────────

export type OperationsSessionRow = OperationsRow & {
  _sessionIndex: number;
  _sessionCount: number;
};

export function buildOperationsSessionRows(
  b: AdminBooking,
): OperationsSessionRow[] {
  const sessions = sortedSessions(b);
  const base = buildOperationsRow(b);

  if (sessions.length === 0) {
    return [{ ...base, _sessionIndex: 0, _sessionCount: 1 }];
  }

  return sessions.map((sess, i) => ({
    ...base,
    groomer_session: groomerName(sess),
    session_name: sess.type ?? "-",
    session_status: sess.status ?? "-",
    started_at: fmtDateTime(sess.started_at),
    finished_at: fmtDateTime(sess.finished_at),
    actual_duration_mins: (() => {
      const d = diffMinutes(sess.started_at, sess.finished_at);
      return typeof d === "number" ? fmtDuration(d) : "-";
    })(),
    pre_conditions: (sess.notes ?? "-") || "-",
    internal_note: (sess.internal_note ?? "-") || "-",
    _sessionIndex: i,
    _sessionCount: sessions.length,
  }));
}

// ─── Column labels — order here determines Excel column order ─────────────────

export const OPERATIONS_COLUMN_LABELS: Record<keyof OperationsRow, string> = {
  booking_code: "Kode Booking",
  booking_date: "Tanggal Booking",
  time_slot: "Time Slot",
  booking_type: "Tipe (In Store/In Home)",
  booking_status: "Status Booking",
  store_name: "Nama Cabang",
  customer_name: "Nama Customer",
  customer_phone: "No. HP Customer",
  pet_name: "Nama Pet",
  member_type: "Tipe Member",
  service_name: "Layanan",
  service_type: "Kategori Layanan",
  addon_names: "Add-on",
  session_name: "Nama Sesi",
  groomer_session: "Nama Groomer",
  session_status: "Status Sesi",
  started_at: "Waktu Mulai Aktual",
  finished_at: "Waktu Selesai",
  actual_duration_mins: "Durasi Aktual",
  pre_conditions: "Kondisi Awal (Notes)",
  internal_note: "Catatan Internal",
  estimated_duration: "Est. Durasi Layanan (menit)",
  is_on_time: "Tepat Waktu?",
  overrun_mins: "Overrun (menit)",
  net_total: "Net Total (Dibayar)",
  membership_usage: "Tipe Pembayaran",
  payment_method: "Metode Pembayaran",
  cancellation_reason: "Alasan Pembatalan",
};

// ─── Column widths for Excel ──────────────────────────────────────────────────

const COL_WIDTHS: Partial<Record<keyof OperationsRow, number>> = {
  booking_code: 18,
  booking_date: 14,
  time_slot: 14,
  booking_type: 18,
  booking_status: 16,
  store_name: 20,
  customer_name: 22,
  customer_phone: 16,
  pet_name: 16,
  member_type: 16,
  service_name: 28,
  service_type: 18,
  addon_names: 30,
  groomer_session: 22,
  session_name: 18,
  session_status: 14,
  started_at: 18,
  finished_at: 18,
  actual_duration_mins: 16,
  pre_conditions: 30,
  internal_note: 30,
  estimated_duration: 22,
  is_on_time: 12,
  overrun_mins: 14,
  net_total: 18,
  membership_usage: 20,
  payment_method: 16,
  cancellation_reason: 30,
};

// ─── Excel export (with session-row expansion and cell merges) ────────────────

export function exportOperationsToExcel(bookings: AdminBooking[]): void {
  if (!bookings || bookings.length === 0) {
    throw new Error("Tidak ada data untuk diexport");
  }

  const keys = Object.keys(OPERATIONS_COLUMN_LABELS) as (keyof OperationsRow)[];
  const headerLabels = keys.map((k) => OPERATIONS_COLUMN_LABELS[k]);

  const displayRows: Record<string, unknown>[] = [];
  const merges: XLSX.Range[] = [];
  let excelRow = 1; // row 0 is the header

  for (const b of bookings) {
    const sessionRows = buildOperationsSessionRows(b);
    const sessionCount = sessionRows.length;
    const startRow = excelRow;

    for (const row of sessionRows) {
      const out: Record<string, unknown> = {};
      for (const k of keys) {
        out[OPERATIONS_COLUMN_LABELS[k]] = row[k] ?? "-";
      }
      displayRows.push(out);
    }

    if (sessionCount > 1) {
      keys.forEach((k, colIdx) => {
        if (!SESSION_COL_KEYS.has(k)) {
          merges.push({
            s: { r: startRow, c: colIdx },
            e: { r: startRow + sessionCount - 1, c: colIdx },
          });
        }
      });
    }

    excelRow += sessionCount;
  }

  const worksheet = XLSX.utils.json_to_sheet(displayRows, {
    header: headerLabels,
  });

  worksheet["!cols"] = keys.map((k) => ({ wch: COL_WIDTHS[k] ?? 16 }));
  if (merges.length > 0) worksheet["!merges"] = merges;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Booking & Ops Detail");

  const now = new Date();
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  XLSX.writeFile(workbook, `Pawship_Operations_Report_${ts}.xlsx`);
}
