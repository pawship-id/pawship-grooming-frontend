"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
  Filter,
  FilterX,
  Loader2,
  AlertCircle,
  Columns,
  ChevronLeft,
  ChevronRight,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { streamOperationsReport } from "@/lib/api/reports";
import { getStores } from "@/lib/api/stores";
import { getServiceTypes } from "@/lib/api/service-types";
import type { ApiServiceType } from "@/lib/api/service-types";
import {
  exportOperationsToExcel,
  buildOperationsSessionRows,
  OPERATIONS_COLUMN_LABELS,
  SESSION_COL_KEYS,
  type OperationsRow,
  type OperationsSessionRow,
} from "@/lib/export-operations";
import { fmtRupiah } from "@/lib/export-financial";
import type { ApiStore } from "@/lib/api/stores";
import type { AdminBooking } from "@/lib/api/bookings";

// ─── Column definitions ───────────────────────────────────────────────────────

const TABLE_COLUMNS: {
  key: keyof OperationsRow;
  group: string;
  defaultVisible: boolean;
}[] = [
  // Transaksi
  { key: "booking_code",        group: "Transaksi",       defaultVisible: true  },
  { key: "booking_date",        group: "Transaksi",       defaultVisible: true  },
  { key: "time_slot",           group: "Transaksi",       defaultVisible: true  },
  { key: "booking_type",        group: "Transaksi",       defaultVisible: true  },
  { key: "booking_status",      group: "Transaksi",       defaultVisible: true  },
  // Cabang
  { key: "store_name",          group: "Cabang",          defaultVisible: true  },
  // Customer & Pet
  { key: "customer_name",       group: "Customer & Pet",  defaultVisible: true  },
  { key: "customer_phone",      group: "Customer & Pet",  defaultVisible: false },
  { key: "pet_name",            group: "Customer & Pet",  defaultVisible: true  },
  { key: "member_type",         group: "Customer & Pet",  defaultVisible: false },
  // Layanan
  { key: "service_name",        group: "Layanan",         defaultVisible: true  },
  { key: "service_type",        group: "Layanan",         defaultVisible: false },
  { key: "addon_names",         group: "Layanan",         defaultVisible: false },
  // Groomer & Sesi (session-level — NOT merged)
  { key: "session_name",        group: "Groomer & Sesi",  defaultVisible: false },
  { key: "groomer_session",     group: "Groomer & Sesi",  defaultVisible: false },
  { key: "session_status",      group: "Groomer & Sesi",  defaultVisible: false },
  { key: "started_at",          group: "Groomer & Sesi",  defaultVisible: false },
  { key: "finished_at",         group: "Groomer & Sesi",  defaultVisible: false },
  { key: "actual_duration_mins",group: "Groomer & Sesi",  defaultVisible: false },
  { key: "pre_conditions",      group: "Groomer & Sesi",  defaultVisible: false },
  { key: "internal_note",       group: "Groomer & Sesi",  defaultVisible: false },
  // Waktu & Performa (booking-level — merged)
  { key: "estimated_duration",  group: "Waktu & Performa",defaultVisible: false },
  { key: "is_on_time",          group: "Waktu & Performa",defaultVisible: false },
  { key: "overrun_mins",        group: "Waktu & Performa",defaultVisible: false },
  // Pembayaran (booking-level — merged)
  { key: "net_total",           group: "Pembayaran",      defaultVisible: true  },
  { key: "payment_method",      group: "Pembayaran",      defaultVisible: false },
  { key: "cancellation_reason", group: "Pembayaran",      defaultVisible: false },
];

const DEFAULT_VISIBLE = new Set(
  TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);

const RUPIAH_COLS = new Set<keyof OperationsRow>(["net_total"]);

const PAGE_SIZE = 20;

// ─── Sub-report tabs ──────────────────────────────────────────────────────────

const REPORT_TABS = [
  { id: "a", label: "A — Booking & Ops Detail", live: true },
  { id: "b", label: "B — Groomer Performance", live: false },
  { id: "c", label: "C — Capacity Utilisation", live: false },
  { id: "d", label: "D — Cancellation & No-show", live: false },
];

// ─── Main component ────────────────────────────────────────────────────────────

export default function OperationsReportPage() {
  const [activeTab, setActiveTab] = useState("a");

  // ── Filter state ────────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [storeId, setStoreId] = useState("all");
  const [bookingType, setBookingType] = useState("all");
  const [bookingStatus, setBookingStatus] = useState("all");
  const [sessionStatus, setSessionStatus] = useState("all");
  const [serviceType, setServiceType] = useState("all");

  // ── Data state ──────────────────────────────────────────────────────────────
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ApiServiceType[]>([]);
  const [allBookings, setAllBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── SSE stream abort ref ────────────────────────────────────────────────────
  const streamAbortRef = useRef<AbortController | null>(null);

  // ── Column visibility ───────────────────────────────────────────────────────
  const [visibleCols, setVisibleCols] =
    useState<Set<keyof OperationsRow>>(DEFAULT_VISIBLE);

  // ── Pagination ──────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Row hover — highlight all session rows of the same booking together ──────
  const [hoveredBooking, setHoveredBooking] = useState<string | null>(null);

  // ── Fetch stores ────────────────────────────────────────────────────────────
  useEffect(() => {
    getStores({ page: 1, limit: 100 })
      .then((res) => setStores(res.stores ?? []))
      .catch(() => {});
    getServiceTypes({ limit: 100 })
      .then((res) => setServiceTypes(res.serviceTypes ?? []))
      .catch(() => {});
  }, []);

  // ── Cancel stream on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
    };
  }, []);

  // ── Auto-stream on mount + filter change (debounced 400 ms) ─────────────────
  useEffect(() => {
    if (activeTab !== "a") return;

    const timer = setTimeout(() => {
      streamAbortRef.current?.abort();
      const controller = new AbortController();
      streamAbortRef.current = controller;

      setAllBookings([]);
      setPage(1);
      setLoading(true);
      setError(null);

      streamOperationsReport(
        {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          store_id: storeId !== "all" ? storeId : undefined,
          booking_status: bookingStatus !== "all" ? bookingStatus : undefined,
          booking_type: bookingType !== "all" ? bookingType : undefined,
          session_status: sessionStatus !== "all" ? sessionStatus : undefined,
          service_type: serviceType !== "all" ? serviceType : undefined,
        },
        (chunk) => setAllBookings((prev) => [...prev, ...chunk]),
        () => setLoading(false),
        (msg) => {
          setError(msg);
          setLoading(false);
        },
        controller.signal,
      ).catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        setLoading(false);
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [dateFrom, dateTo, storeId, bookingType, bookingStatus, sessionStatus, serviceType, activeTab]);

  // ── Build session rows for current page ─────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(allBookings.length / PAGE_SIZE));

  const pageSessionRows = useMemo<OperationsSessionRow[]>(() => {
    const start = (page - 1) * PAGE_SIZE;
    return allBookings
      .slice(start, start + PAGE_SIZE)
      .flatMap((b) => buildOperationsSessionRows(b));
  }, [allBookings, page]);

  // Annotate each session row with its booking sequence number for the # column
  const annotatedPageRows = useMemo(() => {
    let num = (page - 1) * PAGE_SIZE;
    return pageSessionRows.map((row) => {
      if (row._sessionIndex === 0) num++;
      return { row, bookingNum: num };
    });
  }, [pageSessionRows, page]);

  // ── Visible columns (ordered) ────────────────────────────────────────────────
  const visibleColDefs = TABLE_COLUMNS.filter((c) => visibleCols.has(c.key));

  // ── Groups for column selector dropdown ─────────────────────────────────────
  const groups = useMemo(() => {
    const g: Record<string, (typeof TABLE_COLUMNS)[number][]> = {};
    for (const c of TABLE_COLUMNS) {
      (g[c.group] ??= []).push(c);
    }
    return g;
  }, []);

  // ── Export ──────────────────────────────────────────────────────────────────
  function handleExport() {
    if (allBookings.length === 0) {
      setError(
        loading
          ? "Data masih dimuat, coba lagi setelah selesai."
          : "Tidak ada data yang sesuai filter untuk diexport.",
      );
      return;
    }
    try {
      exportOperationsToExcel(allBookings);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal export data");
    }
  }

  // ── Column toggle ───────────────────────────────────────────────────────────
  function toggleCol(key: keyof OperationsRow) {
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
    storeId !== "all" ||
    bookingType !== "all" ||
    bookingStatus !== "all" ||
    sessionStatus !== "all" ||
    serviceType !== "all";

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setStoreId("all");
    setBookingType("all");
    setBookingStatus("all");
    setSessionStatus("all");
    setServiceType("all");
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Page header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Operations Reports
          </h1>
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/30"
          >
            Operations
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports #2–5 · Used by: Admin, Manager, Owner · Sheet: Operations
        </p>
      </div>

      {/* Sub-report tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => t.live && setActiveTab(t.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground"
                : t.live
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "cursor-not-allowed bg-muted/50 text-muted-foreground/50"
            }`}
          >
            {!t.live && <Lock className="h-3 w-3" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Report A: Booking & Ops Detail ─────────────────────────────────── */}
      {activeTab === "a" && (
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
                <Select value={storeId} onValueChange={setStoreId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cabang</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tipe Booking
                </label>
                <Select value={bookingType} onValueChange={setBookingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    <SelectItem value="in store">In Store</SelectItem>
                    <SelectItem value="in home">In Home</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Booking
                </label>
                <Select value={bookingStatus} onValueChange={setBookingStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="requested">Requested</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="waitlist">Waitlist</SelectItem>
                    <SelectItem value="driver on the way">Driver on the Way</SelectItem>
                    <SelectItem value="groomer on the way">Groomer on the Way</SelectItem>
                    <SelectItem value="arrived">Arrived</SelectItem>
                    <SelectItem value="in progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="returned">Returned</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Sesi
                </label>
                <Select value={sessionStatus} onValueChange={setSessionStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status Sesi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status Sesi</SelectItem>
                    <SelectItem value="not started">Not Started</SelectItem>
                    <SelectItem value="in progress">In Progress</SelectItem>
                    <SelectItem value="finished">Finished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Kategori Layanan
                </label>
                <Select value={serviceType} onValueChange={setServiceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {serviceTypes.map((st) => (
                      <SelectItem key={st._id} value={st.title}>
                        {st.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleExport}
              disabled={loading && allBookings.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data (.xlsx)
            </Button>

            <span className="text-sm text-muted-foreground">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat
                  {allBookings.length > 0 && (
                    <span className="font-semibold text-foreground">
                      {" "}
                      ({allBookings.length.toLocaleString("id-ID")}{" "}
                      data...)
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  <span className="font-semibold text-foreground">
                    {allBookings.length.toLocaleString("id-ID")}
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
                  Report A — Booking &amp; Ops Detail
                </CardTitle>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Satu baris per sesi. Kolom booking di-merge. Export mengambil semua{" "}
                  {Object.keys(OPERATIONS_COLUMN_LABELS).length} kolom.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isDefaultSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setVisibleCols(new Set(DEFAULT_VISIBLE))}
                  >
                    Reset ke Default
                  </Button>
                )}

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
                          : setVisibleCols(
                              new Set(TABLE_COLUMNS.map((c) => c.key)),
                            )
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
                            {OPERATIONS_COLUMN_LABELS[c.key]}
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
                          {OPERATIONS_COLUMN_LABELS[c.key]}
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
                          Tidak ada data yang sesuai filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      annotatedPageRows.map(({ row, bookingNum }) => {
                        const isFirst = row._sessionIndex === 0;
                        const span = row._sessionCount;
                        return (
                          <TableRow
                            key={`${row.booking_code}-${row._sessionIndex}`}
                            onMouseEnter={() => setHoveredBooking(row.booking_code)}
                            onMouseLeave={() => setHoveredBooking(null)}
                            className={cn(
                              "hover:bg-transparent",
                              isFirst && bookingNum > (page - 1) * PAGE_SIZE + 1 && "border-t-2 border-muted",
                            )}
                          >
                            {/* # — rowspan per booking */}
                            {isFirst && (
                              <TableCell
                                rowSpan={span}
                                className={cn(
                                  "text-center text-xs text-muted-foreground align-top transition-colors",
                                  hoveredBooking === row.booking_code && "bg-muted/50",
                                )}
                              >
                                {bookingNum}
                              </TableCell>
                            )}

                            {visibleColDefs.map((c) => {
                              const isSessionCol = SESSION_COL_KEYS.has(c.key);
                              // For booking-level cols, only render on first session row
                              if (!isSessionCol && !isFirst) return null;

                              const val = row[c.key];
                              return (
                                <TableCell
                                  key={c.key}
                                  rowSpan={isSessionCol ? 1 : span}
                                  className={cn(
                                    "whitespace-nowrap text-xs transition-colors",
                                    !isSessionCol && "align-top",
                                    // Apply bg on every <td> directly — same paint layer for all cells
                                    hoveredBooking === row.booking_code && "bg-muted/50",
                                  )}
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
                                  ) : c.key === "is_on_time" ? (
                                    <Badge
                                      variant="outline"
                                      className={
                                        val === "Ya"
                                          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                                          : val === "Tidak"
                                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                                            : ""
                                      }
                                    >
                                      {String(val)}
                                    </Badge>
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

              {/* Streaming indicator */}
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
                    {allBookings.length.toLocaleString("id-ID")} total booking
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
      )}

      {/* ── Other tabs — coming soon ──────────────────────────────────────────── */}
      {activeTab !== "a" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Lock className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              Report ini belum tersedia.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Sedang dalam pengembangan.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
