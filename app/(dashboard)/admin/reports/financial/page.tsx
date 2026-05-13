"use client";

import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileSpreadsheet,
  Filter,
  Loader2,
  AlertCircle,
  Columns,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { getFinancialReport } from "@/lib/api/reports";
import { getStores } from "@/lib/api/stores";
import {
  exportFinancialToExcel,
  buildSessionRows,
  fmtRupiah,
  FINANCIAL_COLUMN_LABELS,
  type FinancialRow,
  type SessionFinancialRow,
} from "@/lib/export-financial";
import type { ApiStore } from "@/lib/api/stores";
import type { AdminBooking } from "@/lib/api/bookings";

// ─── Types ────────────────────────────────────────────────────────────────────

type ColType = "Raw" | "Computed" | "Snapshot" | "Joined";

interface SpecColumn {
  name: string;
  table: string;
  source: string;
  type: ColType;
  description: string;
}

// ─── Session-specific columns (not merged — one cell per session row) ─────────

const SESSION_COLS = new Set<keyof FinancialRow>([
  "session_name",
  "session_status",
  "started_at",
  "finished_at",
  "duration_mins",
]);

const RUPIAH_COLS = new Set<keyof FinancialRow>([
  "service_base_price",
  "sub_total_service",
  "travel_fee",
  "gross_total",
  "promo_discount",
  "membership_benefit",
  "total_discount",
  "net_total",
  "commission_base_g1",
  "commission_base_g2",
]);

// ─── Column definitions for the data table ───────────────────────────────────
// key matches FinancialRow keys; defaultVisible = shown by default

const TABLE_COLUMNS: {
  key: keyof FinancialRow;
  group: string;
  defaultVisible: boolean;
  /** Field not yet computable — data dependency missing in DB */
  missing?: boolean;
}[] = [
  // Transaction Identity
  { key: "booking_id",      group: "Transaksi",   defaultVisible: false },
  { key: "booking_code",    group: "Transaksi",   defaultVisible: true },
  { key: "booking_date",    group: "Transaksi",   defaultVisible: true },
  { key: "time_slot",       group: "Transaksi",   defaultVisible: true },
  { key: "booking_type",    group: "Transaksi",   defaultVisible: true },
  { key: "booking_status",  group: "Transaksi",   defaultVisible: true },
  { key: "session_name",    group: "Transaksi",   defaultVisible: false },
  { key: "session_status",  group: "Transaksi",   defaultVisible: false },
  { key: "started_at",      group: "Transaksi",   defaultVisible: false },
  { key: "finished_at",     group: "Transaksi",   defaultVisible: false },
  { key: "duration_mins",   group: "Transaksi",   defaultVisible: false },
  { key: "payment_method",  group: "Transaksi",   defaultVisible: false },
  { key: "referral_code",   group: "Transaksi",   defaultVisible: false },
  // Store
  { key: "store_id",        group: "Cabang",      defaultVisible: false },
  { key: "store_code",      group: "Cabang",      defaultVisible: false },
  { key: "store_name",      group: "Cabang",      defaultVisible: true },
  // Customer & Pet
  { key: "customer_id",     group: "Customer",    defaultVisible: false },
  { key: "customer_code",   group: "Customer",    defaultVisible: false },
  { key: "customer_name",   group: "Customer",    defaultVisible: true },
  { key: "customer_phone",  group: "Customer",    defaultVisible: false },
  { key: "pet_name",        group: "Customer",    defaultVisible: true },
  { key: "member_type",     group: "Customer",    defaultVisible: false },
  // Service
  { key: "service_id",      group: "Layanan",     defaultVisible: false },
  { key: "service_code",    group: "Layanan",     defaultVisible: false },
  { key: "service_name",    group: "Layanan",     defaultVisible: true },
  { key: "service_type",    group: "Layanan",     defaultVisible: false },
  { key: "service_base_price", group: "Layanan",  defaultVisible: false },
  { key: "service_duration",group: "Layanan",     defaultVisible: false },
  { key: "addon_names",     group: "Layanan",     defaultVisible: false },
  // Groomer
  { key: "groomer_1_name",  group: "Groomer",     defaultVisible: false },
  { key: "groomer_1_task",  group: "Groomer",     defaultVisible: false },
  { key: "groomer_2_name",  group: "Groomer",     defaultVisible: false },
  { key: "groomer_2_task",  group: "Groomer",     defaultVisible: false },
  // On-time
  { key: "is_on_time",      group: "On-time",     defaultVisible: false },
  { key: "overrun_mins",    group: "On-time",     defaultVisible: false },
  // Revenue
  { key: "sub_total_service", group: "Revenue",   defaultVisible: false },
  { key: "travel_fee",      group: "Revenue",     defaultVisible: false },
  { key: "gross_total",     group: "Revenue",     defaultVisible: false },
  { key: "promo_codes_used",group: "Revenue",     defaultVisible: false },
  { key: "promo_discount",  group: "Revenue",     defaultVisible: false },
  { key: "membership_benefit", group: "Revenue",  defaultVisible: false },
  { key: "total_discount",  group: "Revenue",     defaultVisible: false },
  { key: "net_total",       group: "Revenue",     defaultVisible: true },
  { key: "commission_base_g1", group: "Revenue",  defaultVisible: false, missing: true },
  { key: "commission_base_g2", group: "Revenue",  defaultVisible: false, missing: true },
];

const DEFAULT_VISIBLE = new Set(
  TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);

const PAGE_SIZE = 20;

// ─── Column spec data (for the Spec tab) ─────────────────────────────────────

const typeConfig: Record<ColType, { label: string; className: string }> = {
  Raw: {
    label: "Raw",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  Computed: {
    label: "Computed",
    className:
      "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-700",
  },
  Snapshot: {
    label: "Snapshot",
    className:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  },
  Joined: {
    label: "Joined",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
};

const specSections: { heading: string; columns: SpecColumn[] }[] = [
  {
    heading: "Transaction Identity",
    columns: [
      { name: "booking_code",   table: "Booking", source: "code",                          type: "Raw",      description: "Kode booking (bukan MongoDB _id)." },
      { name: "booking_date",   table: "Booking", source: "date",                          type: "Raw",      description: "Tanggal sesi. Sumbu filter utama." },
      { name: "time_slot",      table: "Booking", source: "time_range",                    type: "Raw",      description: "Slot waktu terjadwal." },
      { name: "booking_type",   table: "Booking", source: "type",                          type: "Raw",      description: "in_store atau in_home." },
      { name: "booking_status", table: "Booking", source: "booking_confirmed",             type: "Raw",      description: "approved / not_confirmed / cancelled." },
      { name: "session_status", table: "Booking", source: "sessions[].status",             type: "Raw",      description: "not_started / in_progress / finished." },
      { name: "started_at",     table: "Booking", source: "sessions[0].started_at",        type: "Raw",      description: "Waktu mulai aktual — dari sesi pertama." },
      { name: "finished_at",    table: "Booking", source: "sessions[last].finished_at",    type: "Raw",      description: "Waktu selesai aktual — dari sesi terakhir." },
      { name: "duration_mins",  table: "Booking", source: "finished_at − started_at",      type: "Computed", description: "Durasi aktual dalam menit." },
      { name: "payment_method", table: "Booking", source: "payment_method",                type: "Raw",      description: "Cash / transfer / e-wallet." },
      { name: "referral_code",  table: "Booking", source: "referal_code",                  type: "Raw",      description: "Kode referral yang digunakan." },
    ],
  },
  {
    heading: "Store / Cabang",
    columns: [
      { name: "store_code",  table: "Store",   source: "code",  type: "Joined",   description: "Kode cabang (bukan MongoDB store_id)." },
      { name: "store_name",  table: "Store",   source: "name",  type: "Joined",   description: "Nama cabang." },
    ],
  },
  {
    heading: "Customer & Pet",
    columns: [
      { name: "customer_code",  table: "Users",   source: "username",                      type: "Raw",      description: "Kode/username customer (bukan MongoDB customer_id)." },
      { name: "customer_name",  table: "Users",   source: "username",                      type: "Raw",      description: "Nama customer." },
      { name: "customer_phone", table: "Users",   source: "phone_number",                  type: "Raw",      description: "Nomor HP customer." },
      { name: "pet_name",       table: "Booking", source: "pet_snapshot.name",             type: "Snapshot", description: "Nama pet saat booking." },
      { name: "member_type",    table: "Booking", source: "pet_snapshot.member_type.name", type: "Snapshot", description: "Tier membership saat booking — bukan nilai current." },
    ],
  },
  {
    heading: "Service & Layanan",
    columns: [
      { name: "service_code",       table: "Services", source: "code",                type: "Joined",   description: "Kode layanan (bukan MongoDB service_id)." },
      { name: "service_name",       table: "Services", source: "name",                type: "Joined",   description: "Nama layanan." },
      { name: "service_type",       table: "Services", source: "service_type.title",  type: "Joined",   description: "Kategori layanan." },
      { name: "service_base_price", table: "Services", source: "price",               type: "Joined",   description: "Harga list sebelum diskon." },
      { name: "service_duration",   table: "Services", source: "duration",            type: "Joined",   description: "Estimasi durasi (menit)." },
      { name: "addon_names",        table: "Services", source: "addons[].name",       type: "Joined",   description: "Add-on dipisah koma." },
    ],
  },
  {
    heading: "Groomer / Salesman",
    columns: [
      { name: "groomer_1_name", table: "Users",   source: "sessions[0].groomer_detail.username", type: "Joined", description: "Groomer pertama." },
      { name: "groomer_1_task", table: "Booking", source: "sessions[0].type",                    type: "Raw",    description: "Tugas groomer 1." },
      { name: "groomer_2_name", table: "Users",   source: "sessions[1].groomer_detail.username", type: "Joined", description: "Groomer kedua (null jika solo)." },
      { name: "groomer_2_task", table: "Booking", source: "sessions[1].type",                    type: "Raw",    description: "Tugas groomer 2." },
    ],
  },
  {
    heading: "On-time (Formula & Status)",
    columns: [
      { name: "is_on_time",    table: "—", source: "finished_at ≤ started_at + service.duration", type: "Computed", description: "Ya/Tidak — sesuai Formula On-time Rate." },
      { name: "overrun_mins",  table: "—", source: "MAX(0, finished_at − estimated_end)",          type: "Computed", description: "Menit terlambat dari estimasi." },
    ],
  },
  {
    heading: "Revenue & Pricing",
    columns: [
      { name: "sub_total_service",  table: "Booking",      source: "sub_total_service",                       type: "Raw",      description: "Layanan + add-on sebelum travel fee." },
      { name: "travel_fee",         table: "Booking",      source: "travel_fee",                              type: "Raw",      description: "Biaya transport in-home; 0 untuk in-store." },
      { name: "gross_total",        table: "—",            source: "sub_total_service + travel_fee",          type: "Computed", description: "Harga penuh sebelum diskon." },
      { name: "promo_codes_used",   table: "PromoClaims",  source: "applied_promotions[].code",               type: "Joined",   description: "Kode promo yang digunakan." },
      { name: "promo_discount",     table: "PromoClaims",  source: "SUM(applied_promotions.amount_deducted)", type: "Computed", description: "Total diskon promo." },
      { name: "membership_benefit", table: "BenefitUsage", source: "SUM(applied_benefits.amount_deducted)",   type: "Computed", description: "Total benefit membership terpakai." },
      { name: "total_discount",     table: "—",            source: "promo_discount + membership_benefit",     type: "Computed", description: "Semua diskon gabungan." },
      { name: "net_total",          table: "Booking",      source: "final_total_price",                       type: "Raw",      description: "Jumlah akhir yang dibayar." },
      { name: "commission_base_g1", table: "—",            source: "gross_total · solo=100%, shared=50%",     type: "Computed", description: "Gross attribution Groomer 1." },
      { name: "commission_base_g2", table: "—",            source: "gross_total × 50% (jika shared)",         type: "Computed", description: "Gross attribution Groomer 2." },
    ],
  },
];

// ─── Main component ────────────────────────────────────────────────────────────

export default function FinancialReportPage() {
  const [activeTab, setActiveTab] = useState<"export" | "spec">("export");

  // ── Filter state ────────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [storeId, setStoreId] = useState("all");
  const [bookingType, setBookingType] = useState("all");
  const [bookingStatus, setBookingStatus] = useState("all");

  // ── Data state ──────────────────────────────────────────────────────────────
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [allBookings, setAllBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // ── Column visibility ───────────────────────────────────────────────────────
  const [visibleCols, setVisibleCols] = useState<Set<keyof FinancialRow>>(DEFAULT_VISIBLE);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Store code map (store._id → store.code) ─────────────────────────────────
  const storeCodeMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of stores) map[s._id] = s.code;
    return map;
  }, [stores]);

  // ── Fetch stores for filter dropdown ────────────────────────────────────────
  useEffect(() => {
    getStores({ page: 1, limit: 100 })
      .then((res) => setStores(res.stores ?? []))
      .catch(() => {});
  }, []);

  // booking_type is now a server-side filter — allBookings is already filtered
  const filteredBookings = allBookings;

  // ── Rows for current page (one row per session) ─────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const pageRows = useMemo<SessionFinancialRow[]>(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredBookings
      .slice(start, start + PAGE_SIZE)
      .flatMap((b) => buildSessionRows(b, storeCodeMap));
  }, [filteredBookings, page, storeCodeMap]);

  // Annotate each session row with its booking sequence number for the # column
  const annotatedPageRows = useMemo(() => {
    let num = (page - 1) * PAGE_SIZE;
    return pageRows.map((row) => {
      if (row._sessionIndex === 0) num++;
      return { row, bookingNum: num };
    });
  }, [pageRows, page]);

  // Reset to page 1 when loaded data changes
  useEffect(() => {
    setPage(1);
  }, [allBookings]);

  // ── Visible columns list (ordered) ─────────────────────────────────────────
  const visibleColDefs = TABLE_COLUMNS.filter((c) => visibleCols.has(c.key));

  // ── Load data ───────────────────────────────────────────────────────────────
  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const bookings = await getFinancialReport({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        store_id: storeId !== "all" ? storeId : undefined,
        booking_status: bookingStatus !== "all" ? bookingStatus : undefined,
        booking_type: bookingType !== "all" ? bookingType : undefined,
      });
      setAllBookings(bookings);
      setHasLoaded(true);
      setPage(1);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal mengambil data");
    } finally {
      setLoading(false);
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  async function handleExport() {
    if (!hasLoaded) {
      await loadData();
    }
    if (filteredBookings.length === 0) {
      setError("Tidak ada data yang sesuai filter untuk diexport.");
      return;
    }
    try {
      exportFinancialToExcel(filteredBookings, storeCodeMap);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal export data");
    }
  }

  // ── Column toggle ───────────────────────────────────────────────────────────
  function toggleCol(key: keyof FinancialRow) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size === 1) return prev; // keep at least 1 column
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // ─── Groups for column selector dropdown ────────────────────────────────────
  const groups = useMemo(() => {
    const g: Record<string, (typeof TABLE_COLUMNS)[number][]> = {};
    for (const c of TABLE_COLUMNS) {
      (g[c.group] ??= []).push(c);
    }
    return g;
  }, []);

  const isAllSelected = visibleCols.size === TABLE_COLUMNS.length;
  const isDefaultSelection = useMemo(() => {
    if (visibleCols.size !== DEFAULT_VISIBLE.size) return false;
    for (const k of DEFAULT_VISIBLE) {
      if (!visibleCols.has(k)) return false;
    }
    return true;
  }, [visibleCols]);

  function selectAllCols() {
    setVisibleCols(new Set(TABLE_COLUMNS.map((c) => c.key)));
  }

  function resetToDefault() {
    setVisibleCols(new Set(DEFAULT_VISIBLE));
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Unified Financial Report
          </h1>
          <Badge
            variant="outline"
            className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
          >
            Financial
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Report #1 · Daily / Monthly · Used by: Owner, Finance · Sheet: Financial
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "export"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Export Data
        </button>
        <button
          onClick={() => setActiveTab("spec")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "spec"
              ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Column Spec
        </button>
      </div>

      {/* ── EXPORT TAB ──────────────────────────────────────────────────────── */}
      {activeTab === "export" && (
        <div className="space-y-4">

          {/* Filter panel */}
          <Card>
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4" />
                Filter Data
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tanggal Dari</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tanggal Sampai</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Cabang</label>
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cabang</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Tipe Booking</label>
                <Select value={bookingType} onValueChange={setBookingType}>
                  <SelectTrigger><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="in_store">In Store</SelectItem>
                    <SelectItem value="in_home">In Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status Booking</label>
                <Select value={bookingStatus} onValueChange={setBookingStatus}>
                  <SelectTrigger><SelectValue placeholder="Semua Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="not_confirmed">Not Confirmed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={loadData} disabled={loading} variant="outline">
              {loading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <RefreshCw className="mr-2 h-4 w-4" />}
              {hasLoaded ? "Refresh Data" : "Load Data"}
            </Button>

            <Button
              onClick={handleExport}
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {loading
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Download className="mr-2 h-4 w-4" />}
              Export Semua Kolom (.xlsx)
            </Button>

            {hasLoaded && !loading && (
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {filteredBookings.length.toLocaleString("id-ID")}
                </span>{" "}
                data ditemukan
              </span>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Data table (shown after load) */}
          {hasLoaded && (
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Data Report Financial
                  </CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Pilih kolom yang ingin ditampilkan. Export selalu mengambil semua{" "}
                    {Object.keys(FINANCIAL_COLUMN_LABELS).length} kolom.
                  </p>
                </div>

                {/* Reset to default — only shown when selection differs from default */}
                <div className="flex items-center gap-2">
                  {!isDefaultSelection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground"
                      onClick={resetToDefault}
                    >
                      Reset ke Default
                    </Button>
                  )}

                {/* Column visibility toggle */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Columns className="h-4 w-4" />
                      Kolom
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                        {visibleCols.size}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="max-h-[420px] w-56 overflow-y-auto"
                  >
                    <DropdownMenuCheckboxItem
                      checked={isAllSelected}
                      onCheckedChange={() =>
                        isAllSelected
                          ? setVisibleCols(new Set(DEFAULT_VISIBLE))
                          : selectAllCols()
                      }
                      className="text-xs font-semibold"
                    >
                      Pilih Semua
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {Object.entries(groups).map(([group, cols], gi) => (
                      <div key={group}>
                        {gi > 0 && <DropdownMenuSeparator />}
                        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                          {group}
                        </DropdownMenuLabel>
                        {cols.map((c) => (
                          <DropdownMenuCheckboxItem
                            key={c.key}
                            checked={visibleCols.has(c.key)}
                            onCheckedChange={() => toggleCol(c.key)}
                            className="text-xs"
                          >
                            {FINANCIAL_COLUMN_LABELS[c.key]}
                            {c.missing && (
                              <span className="ml-1 text-amber-500">(?)</span>
                            )}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </div>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {annotatedPageRows.length === 0 ? (
                  <p className="px-6 py-10 text-center text-sm text-muted-foreground">
                    Tidak ada data yang sesuai filter.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center text-xs text-muted-foreground">
                          #
                        </TableHead>
                        {visibleColDefs.map((c) => (
                          <TableHead
                            key={c.key}
                            className="whitespace-nowrap text-xs"
                          >
                            {FINANCIAL_COLUMN_LABELS[c.key]}
                            {c.missing && (
                              <span className="ml-1 text-amber-500">(?)</span>
                            )}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {annotatedPageRows.map(({ row, bookingNum }) => {
                        const isFirst = row._sessionIndex === 0;
                        const span = row._sessionCount;
                        return (
                          <TableRow
                            key={`${row.booking_id}-${row._sessionIndex}`}
                            className={isFirst && bookingNum > (page - 1) * PAGE_SIZE + 1 ? "border-t-2 border-muted" : ""}
                          >
                            {/* # column — rowspanned per booking */}
                            {isFirst && (
                              <TableCell
                                rowSpan={span}
                                className="text-center text-xs text-muted-foreground align-top"
                              >
                                {bookingNum}
                              </TableCell>
                            )}
                            {visibleColDefs.map((c) => {
                              const isSessionCol = SESSION_COLS.has(c.key);
                              // booking-level cells: only render on first session row
                              if (!isSessionCol && !isFirst) return null;
                              const val = row[c.key];
                              return (
                                <TableCell
                                  key={c.key}
                                  rowSpan={isSessionCol ? 1 : span}
                                  className={`whitespace-nowrap text-xs${!isSessionCol ? " align-top" : ""}`}
                                >
                                  {val === "-" || val === undefined || val === null
                                    ? <span className="text-muted-foreground/40">—</span>
                                    : RUPIAH_COLS.has(c.key) && typeof val === "number"
                                      ? fmtRupiah(val)
                                      : String(val)}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <span className="text-xs text-muted-foreground">
                      Halaman{" "}
                      <span className="font-semibold text-foreground">{page}</span>{" "}
                      dari{" "}
                      <span className="font-semibold text-foreground">{totalPages}</span>
                      {" · "}
                      {filteredBookings.length.toLocaleString("id-ID")} total data
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>

                      {/* Page number buttons — show max 5 around current */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                          (p) =>
                            p === 1 ||
                            p === totalPages ||
                            (p >= page - 2 && p <= page + 2),
                        )
                        .reduce<(number | "…")[]>((acc, p, idx, arr) => {
                          if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                            acc.push("…");
                          acc.push(p);
                          return acc;
                        }, [])
                        .map((item, idx) =>
                          item === "…" ? (
                            <span
                              key={`ellipsis-${idx}`}
                              className="px-1 text-xs text-muted-foreground"
                            >
                              …
                            </span>
                          ) : (
                            <Button
                              key={item}
                              variant={page === item ? "default" : "outline"}
                              size="sm"
                              onClick={() => setPage(item as number)}
                              className="h-7 w-7 p-0 text-xs"
                            >
                              {item}
                            </Button>
                          ),
                        )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="h-7 w-7 p-0"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── COLUMN SPEC TAB ─────────────────────────────────────────────────── */}
      {activeTab === "spec" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Type Tags
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pb-4">
              {(Object.keys(typeConfig) as ColType[]).map((t) => (
                <Badge key={t} variant="outline" className={`text-xs ${typeConfig[t].className}`}>
                  {t === "Raw"      && "[Raw] = direct DB field"}
                  {t === "Computed" && "[Computed] = calculated at query time"}
                  {t === "Snapshot" && "[Snapshot] = stored at booking time"}
                  {t === "Joined"   && "[Joined] = from another table"}
                </Badge>
              ))}
            </CardContent>
          </Card>

          {specSections.map((section) => (
            <Card key={section.heading}>
              <CardHeader className="pb-0 pt-4">
                <CardTitle className="text-sm font-semibold text-foreground">
                  {section.heading}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">Column Name</TableHead>
                      <TableHead className="hidden sm:table-cell w-32">DB Table</TableHead>
                      <TableHead className="hidden md:table-cell">DB Field / Source</TableHead>
                      <TableHead className="w-24">Type</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {section.columns.map((col) => {
                      const tc = typeConfig[col.type];
                      return (
                        <TableRow key={col.name}>
                          <TableCell className="font-mono text-xs font-semibold text-foreground">
                            {col.name}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs italic text-muted-foreground">
                            {col.table}
                          </TableCell>
                          <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                            {col.source}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${tc.className}`}>
                              {tc.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {col.description}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
