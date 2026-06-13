import * as XLSX from "xlsx";
import { AdminBooking } from "./api/bookings";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtDate(v: string | null | undefined): string {
  if (!v) return "-";
  try {
    const d = new Date(v);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return "-";
  }
}

export function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "-";
  try {
    const d = new Date(v);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "-";
  }
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fmtDuration(mins: number | string): string {
  if (typeof mins !== "number") return "-";
  const days = Math.floor(mins / 1440);
  const hours = Math.floor((mins % 1440) / 60);
  const minutes = mins % 60;

  if (days > 0) {
    const parts = [`${days} hari`];
    if (hours > 0) parts.push(`${hours} jam`);
    if (minutes > 0) parts.push(`${minutes} menit`);
    return parts.join(", ");
  }
  if (hours > 0) {
    const parts = [`${hours} jam`];
    if (minutes > 0) parts.push(`${minutes} menit`);
    return parts.join(", ");
  }
  return `${minutes} menit`;
}

export function fmtRupiah(v: number | string): string {
  if (typeof v !== "number") return String(v);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

export function diffMinutes(
  start: string | null | undefined,
  end: string | null | undefined,
): number | string {
  if (!start || !end) return "-";
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(0, Math.round(ms / 60000));
  } catch {
    return "-";
  }
}

// ─── Sorted sessions ──────────────────────────────────────────────────────────

export function sortedSessions(booking: AdminBooking) {
  return [...(booking.sessions ?? [])].sort((a, b) => a.order - b.order);
}

function groomerName(
  sess: AdminBooking["sessions"][number] | undefined,
): string {
  if (!sess) return "-";
  // Backend toJSON renames the populated groomer_id → groomer_detail.
  if (sess.groomer_detail?.username) return sess.groomer_detail.username;
  const g = sess.groomer_id;
  if (g && typeof g === "object") return g.username ?? "-";
  return "-";
}

// ─── Revenue helpers ──────────────────────────────────────────────────────────

export function membershipBenefitTotal(booking: AdminBooking): number {
  return (booking.applied_benefits ?? []).reduce(
    (sum, b) => sum + b.amount_deducted,
    0,
  );
}

export function promoCodes(booking: AdminBooking): string {
  const codes = (booking.applied_promotions ?? []).map((p) => p.code);
  return codes.length > 0 ? codes.join(", ") : "-";
}

export function promoDiscountTotal(booking: AdminBooking): number {
  return (booking.applied_promotions ?? []).reduce(
    (sum, p) => sum + p.amount_deducted,
    0,
  );
}

// ─── On-time (from Formula & Status spec) ─────────────────────────────────────
// On time: finished_at <= started_at + Services.duration
// Overrun: MAX(0, finished_at - estimated_end)

export function onTimeInfo(booking: AdminBooking): {
  is_on_time: string;
  overrun_mins: number | string;
} {
  const sess = sortedSessions(booking);
  const first = sess[0];
  const last = sess[sess.length - 1];

  if (!first?.started_at || !last?.finished_at) {
    return { is_on_time: "-", overrun_mins: "-" };
  }

  const estDurationMins = booking.service_snapshot?.duration ?? 0;
  const startMs = new Date(first.started_at).getTime();
  const finishMs = new Date(last.finished_at).getTime();
  const estimatedEndMs = startMs + estDurationMins * 60 * 1000;
  const overrunMins = Math.max(
    0,
    Math.round((finishMs - estimatedEndMs) / 60000),
  );

  return {
    is_on_time: overrunMins === 0 ? "Ya" : "Tidak",
    overrun_mins: overrunMins,
  };
}

// ─── Commission base ──────────────────────────────────────────────────────────
// Per-session commission base:
//   (Sub Total Layanan + travel fee [only when booking type is "in home"])
//   ÷ jumlah session
// The same value is shown on every session row of the booking.

export function commissionBase(booking: AdminBooking): number {
  const subTotal = booking.sub_total_service ?? 0;
  const travelFee =
    booking.type === "in home" ? (booking.travel_fee ?? 0) : 0;
  const sessionCount = Math.max(1, (booking.sessions ?? []).length);
  return (subTotal + travelFee) / sessionCount;
}

// ─── Row builder — single source of truth used by both table & export ─────────

export function buildFinancialRow(
  b: AdminBooking,
  storeCodeMap: Record<string, string>,
) {
  const sess = sortedSessions(b);
  const first = sess[0];
  const last = sess[sess.length - 1];

  const subTotal = b.sub_total_service ?? 0;
  const travelFee = b.travel_fee ?? 0;
  const grossTotal = subTotal + travelFee;
  const promoDisc = promoDiscountTotal(b);
  const memberBenefit = membershipBenefitTotal(b);
  const totalDiscount = promoDisc + memberBenefit;

  const { is_on_time, overrun_mins } = onTimeInfo(b);

  const addonNames =
    (b.service_snapshot?.addons ?? []).map((a) => a.name).join(", ") || "-";

  return {
    // ── TRANSACTION IDENTITY ──────────────────────────────────────────
    booking_id: b._id,
    // booking_id → booking code (not MongoDB _id)
    booking_code: b.code ?? "-",
    booking_date: fmtDate(b.date),
    // start_date → the booking's start (`date`); falls back to booking date.
    // end_date → falls back to start date when absent.
    start_date: fmtDate(b.date),
    end_date: fmtDate(b.end_date ?? b.date),
    time_slot: b.time_range ?? "-",
    booking_type: b.type ?? "-",
    booking_status: b.booking_status ?? "-",
    // session-level fields — overridden per session in buildSessionRows
    session_name: first?.type ?? "-",
    session_status: first?.status ?? "-",
    started_at: fmtDateTime(first?.started_at),
    finished_at: fmtDateTime(last?.finished_at),
    duration_mins: fmtDuration(
      diffMinutes(first?.started_at, last?.finished_at),
    ),
    payment_method: b.payment_method ?? "-",
    referral_code: b.referal_code ?? "-",

    // ── STORE / CABANG ────────────────────────────────────────────────
    store_id: b.store_id,
    // store_code: from dedicated report API populate; storeCodeMap as fallback
    store_code: b.store?.code ?? storeCodeMap[b.store_id] ?? "-",
    store_name: b.store?.name ?? "-",

    // ── CUSTOMER & PET ────────────────────────────────────────────────
    customer_id: b.customer_id,
    // customer_id → customer username/code (not MongoDB _id)
    customer_code: b.customer?.code ?? "-",
    customer_name: b.customer?.username ?? "-",
    customer_phone: b.customer?.phone_number ?? "-",
    customer_category: b.customer_snapshot?.customer_category?.name ?? "-",
    // Snapshot — bukan nilai current
    pet_id: b.pet_id ?? "-",
    pet_code: b.pet?.code ?? "-",
    pet_name: b.pet_snapshot?.name ?? "-",
    member_type: b.pet_snapshot?.member_type ?? "-",

    // ── SERVICE & LAYANAN ─────────────────────────────────────────────
    service_id: b.service_snapshot?._id ?? "-",
    // service_id → service code (not MongoDB _id)
    service_code: b.service_snapshot?.code ?? "-",
    service_name: b.service_snapshot?.name ?? "-",
    service_type: b.service_snapshot?.service_type?.title ?? "-",
    service_duration: b.service_snapshot?.duration ?? 0,
    addon_names: addonNames,
    service_base_price: b.service_snapshot?.price ?? 0,
    addon_price: (b.service_snapshot?.addons ?? []).reduce(
      (sum, a) => sum + (a.price ?? 0),
      0,
    ),

    // ── GROOMER / SALESMAN ────────────────────────────────────────────
    // overridden per session in buildSessionRows
    groomer_session: groomerName(first),

    // ── ON-TIME (Formula & Status) ────────────────────────────────────
    is_on_time,
    overrun_mins,

    // ── REVENUE & PRICING ─────────────────────────────────────────────
    sub_total_service: subTotal,
    travel_fee: travelFee,
    gross_total: grossTotal,
    promo_codes_used: promoCodes(b),
    promo_discount: promoDisc,
    membership_benefit: memberBenefit,
    total_discount: totalDiscount,
    net_total: b.final_total_price ?? 0,

    // ── COMMISSION BASE (Formula & Status) — overridden per session ───
    commission_base_groomer: commissionBase(b),
  };
}

export type FinancialRow = ReturnType<typeof buildFinancialRow>;

// ─── Per-session row (one row per session for table & export) ─────────────────

export type SessionFinancialRow = FinancialRow & {
  _sessionIndex: number; // 0 = first session of this booking
  _sessionCount: number; // total sessions in this booking
};

export function buildSessionRows(
  b: AdminBooking,
  storeCodeMap: Record<string, string>,
): SessionFinancialRow[] {
  const sessions = sortedSessions(b);
  const base = buildFinancialRow(b, storeCodeMap);

  if (sessions.length === 0) {
    return [{ ...base, _sessionIndex: 0, _sessionCount: 1 }];
  }

  return sessions.map((sess, i) => ({
    ...base,
    session_name: sess.type ?? "-",
    groomer_session: groomerName(sess),
    session_status: sess.status ?? "-",
    started_at: fmtDateTime(sess.started_at),
    finished_at: fmtDateTime(sess.finished_at),
    duration_mins: fmtDuration(diffMinutes(sess.started_at, sess.finished_at)),
    commission_base_groomer: commissionBase(b),
    _sessionIndex: i,
    _sessionCount: sessions.length,
  }));
}

// ─── Excel column header mapping ──────────────────────────────────────────────

export const FINANCIAL_COLUMN_LABELS: Partial<Record<keyof FinancialRow, string>> = {
  booking_code: "Kode Booking",
  booking_date: "Tanggal Booking",
  start_date: "Tanggal Mulai",
  end_date: "Tanggal Selesai",
  time_slot: "Time Slot",
  booking_type: "Tipe (In Store/In Home)",
  booking_status: "Status Booking",
  session_name: "Nama Sesi",
  groomer_session: "Groomer Sesi",
  session_status: "Status Sesi",
  started_at: "Waktu Mulai Aktual",
  finished_at: "Waktu Selesai Aktual",
  duration_mins: "Durasi Aktual",
  payment_method: "Metode Pembayaran",
  referral_code: "Kode Referral",
  store_code: "Kode Cabang",
  store_name: "Nama Cabang",
  customer_code: "Kode Customer",
  customer_name: "Nama Customer",
  customer_phone: "No. HP Customer",
  customer_category: "Kategori Customer",
  pet_code: "Kode Pet",
  pet_name: "Nama Pet",
  member_type: "Tipe Member",
  service_code: "Kode Layanan",
  service_name: "Layanan",
  service_type: "Kategori Layanan",
  service_duration: "Est. Durasi (menit)",
  addon_names: "Add-on",
  service_base_price: "Harga Layanan",
  addon_price: "Harga Add-on",
  sub_total_service: "Sub Total Layanan (Harga Layanan + Add-on)",
  travel_fee: "Biaya Perjalanan",
  gross_total: "Gross Total",
  promo_codes_used: "Kode Promo",
  promo_discount: "Diskon Promo",
  membership_benefit: "Benefit Membership",
  total_discount: "Total Diskon",
  net_total: "Net Total (Dibayar)",
  commission_base_groomer: "Komisi Base Groomer",
};

// ─── Column widths for Excel ──────────────────────────────────────────────────

const COL_WIDTHS: Partial<Record<keyof FinancialRow, number>> = {
  booking_id: 28,
  booking_code: 18,
  booking_date: 14,
  start_date: 14,
  end_date: 14,
  time_slot: 12,
  booking_type: 18,
  booking_status: 16,
  session_name: 18,
  groomer_session: 22,
  session_status: 14,
  started_at: 18,
  finished_at: 18,
  duration_mins: 18,
  payment_method: 16,
  referral_code: 14,
  store_id: 28,
  store_code: 14,
  store_name: 20,
  customer_id: 28,
  customer_code: 22,
  customer_name: 22,
  customer_phone: 16,
  customer_category: 20,
  pet_id: 28,
  pet_code: 16,
  pet_name: 16,
  member_type: 20,
  service_id: 28,
  service_code: 14,
  service_name: 28,
  service_type: 18,
  service_duration: 18,
  addon_names: 30,
  service_base_price: 16,
  addon_price: 16,
  is_on_time: 12,
  overrun_mins: 14,
  sub_total_service: 16,
  travel_fee: 16,
  gross_total: 14,
  promo_codes_used: 20,
  promo_discount: 14,
  membership_benefit: 18,
  total_discount: 14,
  net_total: 18,
  commission_base_groomer: 22,
};

// ─── Columns that are session-specific (not merged in export) ─────────────────

const SESSION_COL_KEYS = new Set<keyof FinancialRow>([
  "session_name",
  "groomer_session",
  "session_status",
  "started_at",
  "finished_at",
  "duration_mins",
  "commission_base_groomer",
]);

// ─── Main export (ALL columns — column visibility doesn't apply here) ──────────

export function exportFinancialToExcel(
  bookings: AdminBooking[],
  storeCodeMap: Record<string, string> = {},
): void {
  if (!bookings || bookings.length === 0) {
    throw new Error("Tidak ada data untuk diexport");
  }

  const keys = Object.keys(FINANCIAL_COLUMN_LABELS) as (keyof FinancialRow)[];
  const headerLabels = keys.map((k) => FINANCIAL_COLUMN_LABELS[k]!);

  const displayRows: Record<string, unknown>[] = [];
  const merges: XLSX.Range[] = [];
  let excelRow = 1; // row 0 is header

  for (const b of bookings) {
    const sessionRows = buildSessionRows(b, storeCodeMap);
    const sessionCount = sessionRows.length;
    const startRow = excelRow;

    for (const row of sessionRows) {
      const out: Record<string, unknown> = {};
      for (const k of keys) {
        out[FINANCIAL_COLUMN_LABELS[k]!] = row[k] ?? "-";
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
  XLSX.utils.book_append_sheet(workbook, worksheet, "Financial");

  const now = new Date();
  const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  XLSX.writeFile(workbook, `Pawship_Financial_Report_${ts}.xlsx`);
}
