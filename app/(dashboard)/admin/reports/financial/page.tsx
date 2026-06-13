"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Filter,
  FilterX,
  Loader2,
  AlertCircle,
  Columns,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { streamFinancialReport, connectLiveBookings } from "@/lib/api/reports";
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

// ─── Session-specific columns (not merged — one cell per session row) ─────────

const SESSION_COLS = new Set<keyof FinancialRow>([
  "session_name",
  "groomer_session",
  "session_status",
  "started_at",
  "finished_at",
  "duration_mins",
  "commission_base_groomer",
]);

const RUPIAH_COLS = new Set<keyof FinancialRow>([
  "service_base_price",
  "addon_price",
  "sub_total_service",
  "travel_fee",
  "gross_total",
  "promo_discount",
  "membership_benefit",
  "total_discount",
  "net_total",
  "commission_base_groomer",
]);

// ─── Column definitions for the data table ───────────────────────────────────

const TABLE_COLUMNS: {
  key: keyof FinancialRow;
  group: string;
  defaultVisible: boolean;
  /** Field not yet computable — data dependency missing in DB */
  missing?: boolean;
}[] = [
  // Transaction Identity
  { key: "booking_code", group: "Transaksi", defaultVisible: true },
  { key: "booking_date", group: "Transaksi", defaultVisible: true },
  { key: "start_date", group: "Transaksi", defaultVisible: true },
  { key: "end_date", group: "Transaksi", defaultVisible: true },
  { key: "time_slot", group: "Transaksi", defaultVisible: true },
  { key: "booking_type", group: "Transaksi", defaultVisible: true },
  { key: "booking_status", group: "Transaksi", defaultVisible: true },
  { key: "session_name", group: "Transaksi", defaultVisible: false },
  { key: "groomer_session", group: "Transaksi", defaultVisible: false },
  { key: "session_status", group: "Transaksi", defaultVisible: false },
  { key: "started_at", group: "Transaksi", defaultVisible: false },
  { key: "finished_at", group: "Transaksi", defaultVisible: false },
  { key: "duration_mins", group: "Transaksi", defaultVisible: false },
  { key: "payment_method", group: "Transaksi", defaultVisible: false },
  { key: "referral_code", group: "Transaksi", defaultVisible: false },
  // Store
  { key: "store_code", group: "Cabang", defaultVisible: false },
  { key: "store_name", group: "Cabang", defaultVisible: true },
  // Customer & Pet
  { key: "customer_code", group: "Customer", defaultVisible: false },
  { key: "customer_name", group: "Customer", defaultVisible: true },
  { key: "customer_phone", group: "Customer", defaultVisible: false },
  { key: "customer_category", group: "Customer", defaultVisible: false },
  { key: "pet_code", group: "Customer", defaultVisible: false },
  { key: "pet_name", group: "Customer", defaultVisible: true },
  { key: "member_type", group: "Customer", defaultVisible: false },
  // Service
  { key: "service_code", group: "Layanan", defaultVisible: false },
  { key: "service_name", group: "Layanan", defaultVisible: true },
  { key: "service_type", group: "Layanan", defaultVisible: false },
  { key: "service_duration", group: "Layanan", defaultVisible: false },
  { key: "addon_names", group: "Layanan", defaultVisible: false },
  { key: "service_base_price", group: "Layanan", defaultVisible: false },
  { key: "addon_price", group: "Layanan", defaultVisible: false },
  // Revenue
  { key: "sub_total_service", group: "Revenue", defaultVisible: false },
  { key: "travel_fee", group: "Revenue", defaultVisible: false },
  { key: "gross_total", group: "Revenue", defaultVisible: false },
  { key: "promo_codes_used", group: "Revenue", defaultVisible: false },
  { key: "promo_discount", group: "Revenue", defaultVisible: false },
  { key: "membership_benefit", group: "Revenue", defaultVisible: false },
  { key: "total_discount", group: "Revenue", defaultVisible: false },
  { key: "net_total", group: "Revenue", defaultVisible: true },
  { key: "commission_base_groomer", group: "Revenue", defaultVisible: false },
];

const DEFAULT_VISIBLE = new Set(
  TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);

const PAGE_SIZE = 20;

// ─── Multiselect filter options ───────────────────────────────────────────────

const BOOKING_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "in store", label: "In Store" },
  { value: "in home", label: "In Home" },
];

const BOOKING_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "waitlist", label: "Waitlist" },
  { value: "driver on the way", label: "Driver on the Way" },
  { value: "groomer on the way", label: "Groomer on the Way" },
  { value: "arrived", label: "Arrived" },
  { value: "in progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "returned", label: "Returned" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "cancelled", label: "Cancelled" },
];

// ─── Multiselect dropdown filter ──────────────────────────────────────────────

/** Radio-style "buletan": outlined circle, filled with a dot when selected. */
function CircleIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        selected ? "border-primary" : "border-primary/40"
      }`}
    >
      {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
  );
}

function MultiSelectFilter({
  options,
  selected,
  onChange,
  allLabel,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel: string;
}) {
  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value],
    );
  };

  const triggerLabel =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} dipilih`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
        >
          <span
            className={selected.length === 0 ? "text-muted-foreground" : ""}
          >
            {triggerLabel}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-[320px] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto"
      >
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onChange([]);
          }}
          className="gap-2 text-xs font-semibold"
        >
          <CircleIndicator selected={selected.length === 0} />
          {allLabel}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {options.map((o) => (
          <DropdownMenuItem
            key={o.value}
            onSelect={(e) => {
              e.preventDefault();
              toggle(o.value);
            }}
            className="gap-2 text-xs"
          >
            <CircleIndicator selected={selected.includes(o.value)} />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function FinancialReportPage() {
  // ── Filter state ────────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Empty array = "Semua" (no filter); multiselect supported.
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [bookingTypes, setBookingTypes] = useState<string[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<string[]>([]);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [allBookings, setAllBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── SSE stream abort ref ────────────────────────────────────────────────────
  const streamAbortRef = useRef<AbortController | null>(null);
  const liveAbortRef = useRef<AbortController | null>(null);

  // Keep a stable ref to active filter values so the live handler can read them
  // without needing to be re-subscribed every time filters change.
  const filtersRef = useRef({ dateFrom, dateTo, storeIds, bookingTypes, bookingStatuses });
  filtersRef.current = { dateFrom, dateTo, storeIds, bookingTypes, bookingStatuses };

  // ── Column visibility ───────────────────────────────────────────────────────
  const [visibleCols, setVisibleCols] =
    useState<Set<keyof FinancialRow>>(DEFAULT_VISIBLE);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Row hover — highlight all rows belonging to the same booking ────────────
  const [hoveredBookingId, setHoveredBookingId] = useState<string | null>(null);

  // ── Store code map (store._id → store.code) ─────────────────────────────────
  const storeCodeMap = useMemo<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    for (const s of stores) map[s._id] = s.code;
    return map;
  }, [stores]);

  // ── Store options for the multiselect filter ────────────────────────────────
  const storeOptions = useMemo(
    () => stores.map((s) => ({ value: s._id, label: s.name })),
    [stores],
  );

  // ── Fetch stores for filter dropdown ────────────────────────────────────────
  useEffect(() => {
    getStores({ page: 1, limit: 100 })
      .then((res) => setStores(res.stores ?? []))
      .catch(() => {});
  }, []);

  // ── Cancel streams on unmount ───────────────────────────────────────────────
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      liveAbortRef.current?.abort();
    };
  }, []);

  // ── Persistent live SSE — receives individual booking events in real-time ────
  useEffect(() => {
    liveAbortRef.current?.abort();
    const controller = new AbortController();
    liveAbortRef.current = controller;

    connectLiveBookings((booking) => {
      const f = filtersRef.current;

      // Apply the same filters the batch stream uses
      if (f.storeIds.length > 0 && !f.storeIds.includes(booking.store_id)) return;
      if (f.bookingStatuses.length > 0 && !f.bookingStatuses.includes(booking.booking_status)) return;
      if (f.bookingTypes.length > 0 && !f.bookingTypes.includes(booking.type)) return;
      if (f.dateFrom) {
        const bookingDate = booking.date ? booking.date.slice(0, 10) : "";
        if (bookingDate < f.dateFrom) return;
      }
      if (f.dateTo) {
        const bookingDate = booking.date ? booking.date.slice(0, 10) : "";
        if (bookingDate > f.dateTo) return;
      }

      setAllBookings((prev) => {
        const idx = prev.findIndex((b) => b._id === booking._id);
        if (idx !== -1) {
          // Replace existing booking (update)
          const next = [...prev];
          next[idx] = booking;
          return next;
        }
        // Prepend new booking (create)
        return [booking, ...prev];
      });
    }, controller.signal);

    return () => controller.abort();
  }, []);

  // ── Auto-stream on mount + filter change (debounced 400 ms) ─────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      // Cancel any in-flight stream before starting a new one
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;

      setAllBookings([]);
      setPage(1);
      setLoading(true);
      setError(null);

      streamFinancialReport(
        {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          store_id: storeIds.length > 0 ? storeIds.join(",") : undefined,
          booking_status: bookingStatuses.length > 0 ? bookingStatuses.join(",") : undefined,
          booking_type: bookingTypes.length > 0 ? bookingTypes.join(",") : undefined,
        },
        (chunk) => setAllBookings((prev) => [...prev, ...chunk]),
        () => setLoading(false),
        (msg) => {
          setError(msg);
          setLoading(false);
        },
        controller.signal,
      ).catch((err: unknown) => {
        // AbortError is expected when filters change — suppress it
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        setLoading(false);
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, storeIds, bookingTypes, bookingStatuses]);

  // booking_type is server-side filtered — allBookings is already filtered
  const filteredBookings = allBookings;

  // ── Rows for current page (one row per session) ─────────────────────────────
  const totalPages = Math.max(
    1,
    Math.ceil(filteredBookings.length / PAGE_SIZE),
  );
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

  // ── Visible columns list (ordered) ─────────────────────────────────────────
  const visibleColDefs = TABLE_COLUMNS.filter((c) => visibleCols.has(c.key));

  // ── Export ──────────────────────────────────────────────────────────────────
  function handleExport() {
    if (filteredBookings.length === 0) {
      setError(
        loading
          ? "Data masih dimuat, coba lagi setelah selesai."
          : "Tidak ada data yang sesuai filter untuk diexport.",
      );
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
        if (next.size === 1) return prev;
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

  const isFiltered =
    dateFrom !== "" ||
    dateTo !== "" ||
    storeIds.length > 0 ||
    bookingTypes.length > 0 ||
    bookingStatuses.length > 0;

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setStoreIds([]);
    setBookingTypes([]);
    setBookingStatuses([]);
  }

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
          Report #1 · Daily / Monthly · Used by: Owner, Finance · Sheet:
          Financial
        </p>
      </div>

      <div className="space-y-4">
          {/* Filter panel */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4" />
                Filter Data
              </CardTitle>
              {isFiltered && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30"
                  onClick={resetFilters}
                >
                  <FilterX className="h-3.5 w-3.5" />
                  Reset Filter
                </Button>
              )}
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tanggal Dari
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tanggal Sampai
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Cabang
                </label>
                <MultiSelectFilter
                  options={storeOptions}
                  selected={storeIds}
                  onChange={setStoreIds}
                  allLabel="Semua Cabang"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tipe Booking
                </label>
                <MultiSelectFilter
                  options={BOOKING_TYPE_OPTIONS}
                  selected={bookingTypes}
                  onChange={setBookingTypes}
                  allLabel="Semua Tipe"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Booking
                </label>
                <MultiSelectFilter
                  options={BOOKING_STATUS_OPTIONS}
                  selected={bookingStatuses}
                  onChange={setBookingStatuses}
                  allLabel="Semua Status"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleExport}
              disabled={loading && filteredBookings.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data (.xlsx)
            </Button>

            {/* Live data count */}
            <span className="text-sm text-muted-foreground">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat
                  {filteredBookings.length > 0 && (
                    <span className="font-semibold text-foreground">
                      {" "}
                      ({filteredBookings.length.toLocaleString("id-ID")}{" "}
                      data...)
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  <span className="font-semibold text-foreground">
                    {filteredBookings.length.toLocaleString("id-ID")}
                  </span>{" "}
                  data ditemukan
                </span>
              )}
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Data table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Data Report Financial
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pilih kolom yang ingin ditampilkan. Export selalu mengambil
                  semua {Object.keys(FINANCIAL_COLUMN_LABELS).length} kolom.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Reset to default — only shown when selection differs from default */}
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
                      <Badge
                        variant="secondary"
                        className="ml-1 text-xs px-1.5 py-0"
                      >
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
              <div className="overflow-x-auto">
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
                    {loading && annotatedPageRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={visibleColDefs.length + 1}
                          className="py-10 text-center"
                        >
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memuat data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : annotatedPageRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={visibleColDefs.length + 1}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          {isFiltered
                            ? "Tidak ada data yang sesuai filter."
                            : "Belum ada data."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      annotatedPageRows.map(({ row, bookingNum }) => {
                        const isFirst = row._sessionIndex === 0;
                        const span = row._sessionCount;
                        return (
                          <TableRow
                            key={`${row.booking_id}-${row._sessionIndex}`}
                            onMouseEnter={() => setHoveredBookingId(row.booking_id)}
                            onMouseLeave={() => setHoveredBookingId(null)}
                            style={
                              hoveredBookingId === row.booking_id
                                ? { backgroundColor: "hsl(var(--muted) / 0.5)" }
                                : undefined
                            }
                            className={[
                              "hover:bg-transparent",
                              isFirst && bookingNum > (page - 1) * PAGE_SIZE + 1
                                ? "border-t-2 border-muted"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
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
                              if (!isSessionCol && !isFirst) return null;
                              const val = row[c.key];
                              return (
                                <TableCell
                                  key={c.key}
                                  rowSpan={isSessionCol ? 1 : span}
                                  className={`whitespace-nowrap text-xs${!isSessionCol ? " align-top" : ""}`}
                                >
                                  {val === "-" ||
                                  val === undefined ||
                                  val === null ? (
                                    <span className="text-muted-foreground/40">
                                      —
                                    </span>
                                  ) : RUPIAH_COLS.has(c.key) &&
                                    typeof val === "number" ? (
                                    fmtRupiah(val)
                                  ) : (
                                    String(val)
                                  )}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Streaming indicator at bottom of table */}
              {loading && annotatedPageRows.length > 0 && (
                <div className="flex items-center justify-center gap-2 border-t border-border py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat lebih banyak data...
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    Halaman{" "}
                    <span className="font-semibold text-foreground">
                      {page}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-foreground">
                      {totalPages}
                    </span>
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
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
        </div>
    </div>
  );
}
