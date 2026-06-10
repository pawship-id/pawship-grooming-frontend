"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { streamOperationsReport } from "@/lib/api/reports";
import { getStores } from "@/lib/api/stores";
import { getServiceTypes } from "@/lib/api/service-types";
import { streamCapacityReport } from "@/lib/api/reports";
import type { CapacityReportRow } from "@/lib/api/reports";
import * as XLSX from "xlsx";
import type { ApiServiceType } from "@/lib/api/service-types";
import {
  exportOperationsToExcel,
  buildOperationsSessionRows,
  OPERATIONS_COLUMN_LABELS,
  SESSION_COL_KEYS,
  type OperationsRow,
  type OperationsSessionRow,
} from "@/lib/export-operations";
import {
  fmtRupiah,
  sortedSessions,
  onTimeInfo,
  diffMinutes,
} from "@/lib/export-financial";
import type { ApiStore } from "@/lib/api/stores";
import type { AdminBooking } from "@/lib/api/bookings";

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

const SESSION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "not started", label: "Not Started" },
  { value: "in progress", label: "In Progress" },
  { value: "finished", label: "Finished" },
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

// ─── Groomer Performance types & aggregation ──────────────────────────────────

interface GroomerPerformanceRow {
  groomer_id: string;
  groomer_name: string;
  store_placement: string;
  period_start: string;
  period_end: string;
  total_sessions: number;
  solo_sessions: number;
  shared_sessions: number;
  orders_completed: number;
  on_time_sessions: number;
  on_time_rate_pct: number;
  avg_duration_mins: number;
  avg_overrun_mins: number;
  gross_revenue_attributed: number;
}

function buildGroomerPerformanceRows(
  bookings: AdminBooking[],
  periodStart: string,
  periodEnd: string,
): GroomerPerformanceRow[] {
  const map = new Map<
    string,
    {
      groomer_id: string;
      groomer_name: string;
      store_placement: string;
      total_sessions: number;
      solo_sessions: number;
      shared_sessions: number;
      orders_completed: number;
      on_time_sessions: number;
      duration_sum: number;
      duration_count: number;
      overrun_sum: number;
      overrun_count: number;
      gross_revenue: number;
    }
  >();

  for (const booking of bookings) {
    const sessions = sortedSessions(booking);
    const isSolo = sessions.length === 1;
    const { is_on_time, overrun_mins } = onTimeInfo(booking);
    const isOnTime = is_on_time === "Ya";
    const overrunNum = typeof overrun_mins === "number" ? overrun_mins : 0;

    for (const sess of sessions) {
      const rawId =
        sess.groomer_detail?._id ??
        (typeof sess.groomer_id === "object"
          ? sess.groomer_id?._id
          : sess.groomer_id);
      if (!rawId) continue;

      const name =
        sess.groomer_detail?.username ??
        (typeof sess.groomer_id === "object"
          ? sess.groomer_id?.username
          : undefined) ??
        rawId;

      if (!map.has(rawId)) {
        map.set(rawId, {
          groomer_id: rawId,
          groomer_name: name,
          store_placement: booking.store?.name ?? "-",
          total_sessions: 0,
          solo_sessions: 0,
          shared_sessions: 0,
          orders_completed: 0,
          on_time_sessions: 0,
          duration_sum: 0,
          duration_count: 0,
          overrun_sum: 0,
          overrun_count: 0,
          gross_revenue: 0,
        });
      }

      const entry = map.get(rawId)!;
      entry.total_sessions++;
      if (isSolo) entry.solo_sessions++;
      else entry.shared_sessions++;
      if (sess.status === "finished") {
        entry.orders_completed++;
        if (isOnTime) entry.on_time_sessions++;
        else {
          entry.overrun_sum += overrunNum;
          entry.overrun_count++;
        }
      }

      const dur = diffMinutes(sess.started_at, sess.finished_at);
      if (typeof dur === "number") {
        entry.duration_sum += dur;
        entry.duration_count++;
      }

      const gross = booking.final_total_price ?? 0;
      entry.gross_revenue += isSolo ? gross : gross * 0.5;
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.total_sessions - a.total_sessions)
    .map((g) => ({
      groomer_id: g.groomer_id,
      groomer_name: g.groomer_name,
      store_placement: g.store_placement,
      period_start: periodStart || "-",
      period_end: periodEnd || "-",
      total_sessions: g.total_sessions,
      solo_sessions: g.solo_sessions,
      shared_sessions: g.shared_sessions,
      orders_completed: g.orders_completed,
      on_time_sessions: g.on_time_sessions,
      on_time_rate_pct:
        g.total_sessions > 0
          ? Math.round((g.on_time_sessions / g.total_sessions) * 100)
          : 0,
      avg_duration_mins:
        g.duration_count > 0
          ? Math.round(g.duration_sum / g.duration_count)
          : 0,
      avg_overrun_mins:
        g.overrun_count > 0 ? Math.round(g.overrun_sum / g.overrun_count) : 0,
      gross_revenue_attributed: g.gross_revenue,
    }));
}

// ─── Capacity Utilisation types ───────────────────────────────────────────────

type CapacityRow = CapacityReportRow;

const CAP_PAGE_SIZE = 20;

function utilisationBadgeClass(pct: number, isOverbooked: boolean) {
  if (isOverbooked || pct > 90)
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400";
  if (pct >= 70)
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400";
  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";
}

function exportCapacityToExcel(rows: CapacityRow[]) {
  const headers = [
    "#",
    "Store ID",
    "Kode Cabang",
    "Cabang",
    "Tanggal",
    "Default Cap (min)",
    "Daily Override (min)",
    "Effective Cap (min)",
    "Used (min)",
    "Utilisasi %",
    "Remaining (min)",
    "Total Bookings",
    "Overbooking Limit (min)",
    "Overbooked",
  ];

  const data = rows.map((r, i) => [
    i + 1,
    r.store_id,
    r.store_code,
    r.store_name,
    r.date,
    r.default_capacity_mins,
    r.daily_override_mins ?? "",
    r.effective_capacity_mins,
    r.used_minutes,
    r.utilisation_pct,
    r.remaining_minutes,
    r.total_bookings,
    r.overbooking_limit_mins,
    r.is_overbooked ? "Ya" : "Tidak",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Capacity Utilisation");
  XLSX.writeFile(
    wb,
    `capacity-utilisation-${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

// ─── Column definitions ───────────────────────────────────────────────────────

const TABLE_COLUMNS: {
  key: keyof OperationsRow;
  group: string;
  defaultVisible: boolean;
}[] = [
  // Transaksi
  { key: "booking_code", group: "Transaksi", defaultVisible: true },
  { key: "booking_date", group: "Transaksi", defaultVisible: true },
  { key: "time_slot", group: "Transaksi", defaultVisible: true },
  { key: "booking_type", group: "Transaksi", defaultVisible: true },
  { key: "booking_status", group: "Transaksi", defaultVisible: true },
  // Cabang
  { key: "store_name", group: "Cabang", defaultVisible: true },
  // Customer & Pet
  { key: "customer_name", group: "Customer & Pet", defaultVisible: true },
  { key: "customer_phone", group: "Customer & Pet", defaultVisible: false },
  { key: "pet_name", group: "Customer & Pet", defaultVisible: true },
  { key: "member_type", group: "Customer & Pet", defaultVisible: false },
  // Layanan
  { key: "service_name", group: "Layanan", defaultVisible: true },
  { key: "service_type", group: "Layanan", defaultVisible: false },
  { key: "addon_names", group: "Layanan", defaultVisible: false },
  // Groomer & Sesi (session-level — NOT merged)
  { key: "session_name", group: "Groomer & Sesi", defaultVisible: false },
  { key: "groomer_session", group: "Groomer & Sesi", defaultVisible: false },
  { key: "session_status", group: "Groomer & Sesi", defaultVisible: false },
  { key: "started_at", group: "Groomer & Sesi", defaultVisible: false },
  { key: "finished_at", group: "Groomer & Sesi", defaultVisible: false },
  {
    key: "actual_duration_mins",
    group: "Groomer & Sesi",
    defaultVisible: false,
  },
  { key: "pre_conditions", group: "Groomer & Sesi", defaultVisible: false },
  { key: "internal_note", group: "Groomer & Sesi", defaultVisible: false },
  // Waktu & Performa (booking-level — merged)
  {
    key: "estimated_duration",
    group: "Waktu & Performa",
    defaultVisible: false,
  },
  { key: "is_on_time", group: "Waktu & Performa", defaultVisible: false },
  { key: "overrun_mins", group: "Waktu & Performa", defaultVisible: false },
  // Pembayaran (booking-level — merged)
  { key: "net_total", group: "Pembayaran", defaultVisible: true },
  { key: "membership_usage", group: "Pembayaran", defaultVisible: true },
  { key: "payment_method", group: "Pembayaran", defaultVisible: false },
  { key: "cancellation_reason", group: "Pembayaran", defaultVisible: false },
];

const DEFAULT_VISIBLE = new Set(
  TABLE_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);

const RUPIAH_COLS = new Set<keyof OperationsRow>(["net_total"]);

const PAGE_SIZE = 20;

// ─── Capacity Utilisation column definitions ──────────────────────────────────

const CAP_COLUMNS: {
  key: keyof CapacityReportRow;
  label: string;
  defaultVisible: boolean;
  align?: "right" | "center";
}[] = [
  { key: "store_code", label: "Kode Cabang", defaultVisible: true },
  { key: "store_name", label: "Cabang", defaultVisible: true },
  { key: "date", label: "Tanggal", defaultVisible: true },
  { key: "default_capacity_mins", label: "Default Cap (min)", defaultVisible: false, align: "right" },
  { key: "daily_override_mins", label: "Daily Override (min)", defaultVisible: false, align: "right" },
  { key: "effective_capacity_mins", label: "Effective Cap (min)", defaultVisible: true, align: "right" },
  { key: "used_minutes", label: "Used (min)", defaultVisible: false, align: "right" },
  { key: "utilisation_pct", label: "Utilisasi %", defaultVisible: true, align: "right" },
  { key: "remaining_minutes", label: "Remaining (min)", defaultVisible: false, align: "right" },
  { key: "total_bookings", label: "Total Bookings", defaultVisible: true, align: "right" },
  { key: "overbooking_limit_mins", label: "Overbooking Limit (min)", defaultVisible: true, align: "right" },
  { key: "is_overbooked", label: "Overbooked", defaultVisible: false, align: "center" },
];

const CAP_DEFAULT_VISIBLE = new Set(
  CAP_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
);

// ─── Sub-report tabs ──────────────────────────────────────────────────────────

const REPORT_TABS = [
  { id: "detail", label: "A — Booking & Ops Detail", live: true },
  { id: "groomer-performance", label: "B — Groomer Performance", live: true },
  { id: "capacity-utilisation", label: "C — Capacity Utilisation", live: true },
  { id: "cancellation", label: "D — Cancellation & No-show", live: false },
];

// ─── Main component ────────────────────────────────────────────────────────────

export default function OperationsReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam && REPORT_TABS.some((t) => t.id === tabParam && t.live)
      ? tabParam
      : "detail";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (tabParam && REPORT_TABS.some((t) => t.id === tabParam && t.live)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "detail");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeTab(tabId: string) {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // ── Filter state ────────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // Empty array = "Semua" (no filter); multiselect supported.
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [bookingTypes, setBookingTypes] = useState<string[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<string[]>([]);
  const [sessionStatuses, setSessionStatuses] = useState<string[]>([]);
  const [serviceTypeFilters, setServiceTypeFilters] = useState<string[]>([]);

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

  // ── Capacity Utilisation (Tab C) state ──────────────────────────────────────
  const [capData, setCapData] = useState<CapacityReportRow[]>([]);
  const [capLoading, setCapLoading] = useState(false);
  const [capLive, setCapLive] = useState(false);
  const [capError, setCapError] = useState<string | null>(null);
  const [capPage, setCapPage] = useState(1);
  const [capUtilFilter, setCapUtilFilter] = useState("all");
  const [capVisibleCols, setCapVisibleCols] = useState<Set<keyof CapacityReportRow>>(CAP_DEFAULT_VISIBLE);
  const capStreamAbortRef = useRef<AbortController | null>(null);

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

  // ── Options for the multiselect filters ─────────────────────────────────────
  const storeOptions = useMemo(
    () => stores.map((s) => ({ value: s._id, label: s.name })),
    [stores],
  );
  const serviceTypeOptions = useMemo(
    () => serviceTypes.map((st) => ({ value: st.title, label: st.title })),
    [serviceTypes],
  );

  // ── Auto-stream on mount + filter change (debounced 400 ms) ─────────────────
  useEffect(() => {
    if (activeTab !== "detail" && activeTab !== "groomer-performance") return;

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
          store_id: storeIds.length > 0 ? storeIds.join(",") : undefined,
          booking_status:
            bookingStatuses.length > 0 ? bookingStatuses.join(",") : undefined,
          booking_type:
            bookingTypes.length > 0 ? bookingTypes.join(",") : undefined,
          session_status:
            sessionStatuses.length > 0 ? sessionStatuses.join(",") : undefined,
          service_type:
            serviceTypeFilters.length > 0
              ? serviceTypeFilters.join(",")
              : undefined,
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
  }, [
    dateFrom,
    dateTo,
    storeIds,
    bookingTypes,
    bookingStatuses,
    sessionStatuses,
    serviceTypeFilters,
    activeTab,
  ]);

  // ── Cancel capacity stream on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => { capStreamAbortRef.current?.abort(); };
  }, []);

  // ── Capacity SSE stream (Tab C) — reconnects on filter change ───────────────
  useEffect(() => {
    if (activeTab !== "capacity-utilisation") {
      capStreamAbortRef.current?.abort();
      return;
    }

    const timer = setTimeout(() => {
      capStreamAbortRef.current?.abort();
      const controller = new AbortController();
      capStreamAbortRef.current = controller;

      setCapData([]);
      setCapPage(1);
      setCapLoading(true);
      setCapLive(false);
      setCapError(null);

      const params = {
        store_id: storeIds.length > 0 ? storeIds.join(",") : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      };

      const onSnapshot = (rows: import("@/lib/api/reports").CapacityReportRow[]) => {
        setCapData(rows);
        setCapLoading(false);
        setCapLive(true);
      };

      const onUpdate = (row: import("@/lib/api/reports").CapacityReportRow) => {
        setCapData((prev) => {
          const idx = prev.findIndex(
            (r) => r.store_id === row.store_id && r.date === row.date,
          );
          if (idx === -1) {
            return [...prev, row].sort((a, b) => b.date.localeCompare(a.date));
          }
          const next = [...prev];
          next[idx] = row;
          return next;
        });
      };

      const onError = (msg: string) => {
        setCapError(msg);
        setCapLoading(false);
        setCapLive(false);
      };

      // Auto-reconnect when the stream closes unexpectedly (not via abort)
      const tryStream = (): void => {
        if (controller.signal.aborted) return;
        streamCapacityReport(params, onSnapshot, onUpdate, onError, controller.signal)
          .then(() => {
            // Stream ended normally (not aborted) — reconnect after brief pause
            if (!controller.signal.aborted) {
              setCapLive(false);
              setTimeout(tryStream, 3000);
            }
          })
          .catch((err: unknown) => {
            if (err instanceof Error && err.name === "AbortError") return;
            setCapError(err instanceof Error ? err.message : "Gagal memuat data kapasitas");
            setCapLoading(false);
            setCapLive(false);
          });
      };

      tryStream();
    }, 400);

    return () => clearTimeout(timer);
  }, [activeTab, storeIds, dateFrom, dateTo]);

  // ── Build capacity rows (API returns enriched data, just filter client-side) ──
  const capacityRows = useMemo<CapacityRow[]>(() => {
    if (activeTab !== "capacity-utilisation") return [];
    return capData.filter((row) => {
      if (row.total_bookings < 1) return false;
      if (capUtilFilter === "green")
        return !row.is_overbooked && row.utilisation_pct < 70;
      if (capUtilFilter === "amber")
        return (
          !row.is_overbooked &&
          row.utilisation_pct >= 70 &&
          row.utilisation_pct <= 90
        );
      if (capUtilFilter === "red")
        return !row.is_overbooked && row.utilisation_pct > 90;
      if (capUtilFilter === "overbooked") return row.is_overbooked;
      return true;
    });
  }, [activeTab, capData, capUtilFilter]);

  const capTotalPages = Math.max(
    1,
    Math.ceil(capacityRows.length / CAP_PAGE_SIZE),
  );
  const capPageRows = useMemo(() => {
    const start = (capPage - 1) * CAP_PAGE_SIZE;
    return capacityRows.slice(start, start + CAP_PAGE_SIZE);
  }, [capacityRows, capPage]);

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

  // ── Groomer Performance rows (Report B) ─────────────────────────────────────
  const groomerRows = useMemo<GroomerPerformanceRow[]>(() => {
    if (activeTab !== "groomer-performance" || allBookings.length === 0) return [];
    return buildGroomerPerformanceRows(allBookings, dateFrom, dateTo);
  }, [allBookings, activeTab, dateFrom, dateTo]);

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

  // ── Capacity column helpers ─────────────────────────────────────────────────
  const capVisibleColDefs = CAP_COLUMNS.filter((c) => capVisibleCols.has(c.key));
  const isCapAllSelected = capVisibleCols.size === CAP_COLUMNS.length;
  const isCapDefaultSelection = useMemo(() => {
    if (capVisibleCols.size !== CAP_DEFAULT_VISIBLE.size) return false;
    for (const k of CAP_DEFAULT_VISIBLE) {
      if (!capVisibleCols.has(k)) return false;
    }
    return true;
  }, [capVisibleCols]);

  function toggleCapCol(key: keyof CapacityReportRow) {
    setCapVisibleCols((prev) => {
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
    bookingStatuses.length > 0 ||
    sessionStatuses.length > 0 ||
    serviceTypeFilters.length > 0 ||
    capUtilFilter !== "all";

  function resetFilters() {
    setDateFrom("");
    setDateTo("");
    setStoreIds([]);
    setBookingTypes([]);
    setBookingStatuses([]);
    setSessionStatuses([]);
    setServiceTypeFilters([]);
    setCapUtilFilter("all");
  }

  const reportTabs = (
    <div className="flex flex-wrap gap-2">
      {REPORT_TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => t.live && changeTab(t.id)}
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
  );

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

      {/* ── Report A: Booking & Ops Detail ─────────────────────────────────── */}
      {activeTab === "detail" && (
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Sesi
                </label>
                <MultiSelectFilter
                  options={SESSION_STATUS_OPTIONS}
                  selected={sessionStatuses}
                  onChange={setSessionStatuses}
                  allLabel="Semua Status Sesi"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Kategori Layanan
                </label>
                <MultiSelectFilter
                  options={serviceTypeOptions}
                  selected={serviceTypeFilters}
                  onChange={setServiceTypeFilters}
                  allLabel="Semua Kategori"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sub-report tabs */}
          {reportTabs}

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
                      ({allBookings.length.toLocaleString("id-ID")} data...)
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
                  Satu baris per sesi. Kolom booking di-merge. Export mengambil
                  semua {Object.keys(OPERATIONS_COLUMN_LABELS).length} kolom.
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
                            onMouseEnter={() =>
                              setHoveredBooking(row.booking_code)
                            }
                            onMouseLeave={() => setHoveredBooking(null)}
                            className={cn(
                              "hover:bg-transparent",
                              isFirst &&
                                bookingNum > (page - 1) * PAGE_SIZE + 1 &&
                                "border-t-2 border-muted",
                            )}
                          >
                            {/* # — rowspan per booking */}
                            {isFirst && (
                              <TableCell
                                rowSpan={span}
                                className={cn(
                                  "text-center text-xs text-muted-foreground align-top transition-colors",
                                  hoveredBooking === row.booking_code &&
                                    "bg-muted/50",
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
                                    hoveredBooking === row.booking_code &&
                                      "bg-muted/50",
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

      {/* ── Report B: Groomer Performance ────────────────────────────────────── */}
      {activeTab === "groomer-performance" && (
        <div className="space-y-4">
          {/* Filter panel — identical to Report A */}
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
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Sesi
                </label>
                <MultiSelectFilter
                  options={SESSION_STATUS_OPTIONS}
                  selected={sessionStatuses}
                  onChange={setSessionStatuses}
                  allLabel="Semua Status Sesi"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Kategori Layanan
                </label>
                <MultiSelectFilter
                  options={serviceTypeOptions}
                  selected={serviceTypeFilters}
                  onChange={setServiceTypeFilters}
                  allLabel="Semua Kategori"
                />
              </div>
            </CardContent>
          </Card>

          {/* Sub-report tabs */}
          {reportTabs}

          {/* Status bar */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat
                  {allBookings.length > 0 && (
                    <span className="font-semibold text-foreground">
                      {" "}
                      ({allBookings.length.toLocaleString("id-ID")} booking...)
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  <span className="font-semibold text-foreground">
                    {groomerRows.length}
                  </span>{" "}
                  groomer ditemukan dari{" "}
                  <span className="font-semibold text-foreground">
                    {allBookings.length.toLocaleString("id-ID")}
                  </span>{" "}
                  booking
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

          {/* Groomer performance table */}
          <Card>
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm font-semibold text-foreground">
                Report B — Groomer Performance
              </CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Satu baris per groomer per periode filter. Solo = 100% gross,
                Shared = 50% gross.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8 text-center text-xs text-muted-foreground">
                        #
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs">
                        Nama Groomer
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs">
                        Cabang
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs">
                        Periode Mulai
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs">
                        Periode Akhir
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        Total Sesi
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        Solo
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        Shared
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        Selesai
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        Tepat Waktu
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        On-Time %
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        Avg Durasi (min)
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        Avg Overrun (min)
                      </TableHead>
                      <TableHead className="whitespace-nowrap text-xs text-right">
                        Gross Revenue
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && groomerRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={14} className="py-10 text-center">
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memuat data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : groomerRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={14}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          Tidak ada data yang sesuai filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groomerRows.map((row, idx) => {
                        const onTimePct = row.on_time_rate_pct;
                        const onTimeBadgeClass =
                          onTimePct < 60
                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                            : onTimePct < 80
                              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400";
                        return (
                          <TableRow key={row.groomer_id}>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs font-medium">
                              {row.groomer_name}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {row.store_placement}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {row.period_start !== "-" ? (
                                row.period_start
                              ) : (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs">
                              {row.period_end !== "-" ? (
                                row.period_end
                              ) : (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right font-semibold">
                              {row.total_sessions}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right">
                              {row.solo_sessions}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right">
                              {row.shared_sessions}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right">
                              {row.orders_completed}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right">
                              {row.on_time_sessions}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right">
                              <Badge
                                variant="outline"
                                className={onTimeBadgeClass}
                              >
                                {onTimePct}%
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right">
                              {row.avg_duration_mins > 0 ? (
                                row.avg_duration_mins
                              ) : (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right">
                              {row.avg_overrun_mins > 0 ? (
                                row.avg_overrun_mins
                              ) : (
                                <span className="text-muted-foreground/40">
                                  —
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-right">
                              {fmtRupiah(row.gross_revenue_attributed)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {loading && groomerRows.length > 0 && (
                <div className="flex items-center justify-center gap-2 border-t border-border py-3 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat lebih banyak data...
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Report C: Capacity Utilisation ───────────────────────────────────── */}
      {activeTab === "capacity-utilisation" && (
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
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tanggal Dari
                </label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCapPage(1);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tanggal Sampai
                </label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCapPage(1);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Cabang
                </label>
                <MultiSelectFilter
                  options={storeOptions}
                  selected={storeIds}
                  onChange={(next) => {
                    setStoreIds(next);
                    setCapPage(1);
                  }}
                  allLabel="Semua Cabang"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Utilisasi
                </label>
                <Select
                  value={capUtilFilter}
                  onValueChange={(v) => {
                    setCapUtilFilter(v);
                    setCapPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="green">Hijau — &lt;70%</SelectItem>
                    <SelectItem value="amber">Kuning — 70–90%</SelectItem>
                    <SelectItem value="red">Merah — &gt;90%</SelectItem>
                    <SelectItem value="overbooked">Overbooked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Sub-report tabs */}
          {reportTabs}

          {/* Action bar */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                if (capacityRows.length === 0) {
                  setCapError(
                    capLoading
                      ? "Data masih dimuat, coba lagi setelah selesai."
                      : "Tidak ada data yang sesuai filter untuk diexport.",
                  );
                  return;
                }
                try {
                  exportCapacityToExcel(capacityRows);
                } catch (e: unknown) {
                  setCapError(
                    e instanceof Error ? e.message : "Gagal export data",
                  );
                }
              }}
              disabled={capLoading && capData.length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Data (.xlsx)
            </Button>

            <span className="text-sm text-muted-foreground">
              {capLoading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Memuat data kapasitas...
                </span>
              ) : (
                <span>
                  <span className="font-semibold text-foreground">
                    {capacityRows.length.toLocaleString("id-ID")}
                  </span>{" "}
                  baris ditemukan
                </span>
              )}
            </span>
          </div>

          {/* Error */}
          {capError && (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {capError}
            </div>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between pb-3 pt-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-semibold text-foreground">
                    Report C — Capacity Utilisation
                  </CardTitle>
                  {capLive && (
                    <span className="flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      </span>
                      Live
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Satu baris per cabang per tanggal. Hijau &lt;70% · Kuning 70–90%
                  · Merah &gt;90%.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Hanya tanggal yang memiliki minimal 1 booking aktif pada cabang
                  tersebut yang akan muncul di tabel ini.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isCapDefaultSelection && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setCapVisibleCols(new Set(CAP_DEFAULT_VISIBLE))}
                  >
                    Reset ke Default
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Columns className="h-4 w-4" />
                      Kolom
                      <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                        {capVisibleCols.size}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="max-h-[420px] w-56 overflow-y-auto">
                    <DropdownMenuCheckboxItem
                      checked={isCapAllSelected}
                      onCheckedChange={() =>
                        isCapAllSelected
                          ? setCapVisibleCols(new Set(CAP_DEFAULT_VISIBLE))
                          : setCapVisibleCols(new Set(CAP_COLUMNS.map((c) => c.key)))
                      }
                      className="text-xs font-semibold"
                    >
                      Pilih Semua
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {CAP_COLUMNS.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.key}
                        checked={capVisibleCols.has(c.key)}
                        onCheckedChange={() => toggleCapCol(c.key)}
                        className="text-xs"
                      >
                        {c.label}
                      </DropdownMenuCheckboxItem>
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
                      <TableHead className="w-8 text-center text-xs text-muted-foreground">
                        #
                      </TableHead>
                      {capVisibleColDefs.map((col) => (
                        <TableHead
                          key={col.key}
                          className={cn(
                            "whitespace-nowrap text-xs",
                            col.align === "right" && "text-right",
                            col.align === "center" && "text-center",
                          )}
                        >
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {capLoading && capPageRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={1 + capVisibleColDefs.length} className="py-10 text-center">
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Memuat data...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : capPageRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={1 + capVisibleColDefs.length}
                          className="py-10 text-center text-sm text-muted-foreground"
                        >
                          Tidak ada data yang sesuai filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      capPageRows.map((row, idx) => {
                        const rowNum = (capPage - 1) * CAP_PAGE_SIZE + idx + 1;
                        const badgeClass = utilisationBadgeClass(
                          row.utilisation_pct,
                          row.is_overbooked,
                        );
                        return (
                          <TableRow key={`${row.store_id}-${row.date}-${idx}`}>
                            <TableCell className="text-center text-xs text-muted-foreground">
                              {rowNum}
                            </TableCell>
                            {capVisibleCols.has("store_code") && (
                              <TableCell className="whitespace-nowrap text-xs font-mono text-muted-foreground">
                                {row.store_code}
                              </TableCell>
                            )}
                            {capVisibleCols.has("store_name") && (
                              <TableCell className="whitespace-nowrap text-xs font-medium">
                                {row.store_name}
                              </TableCell>
                            )}
                            {capVisibleCols.has("date") && (
                              <TableCell className="whitespace-nowrap text-xs">
                                {row.date}
                              </TableCell>
                            )}
                            {capVisibleCols.has("default_capacity_mins") && (
                              <TableCell className="whitespace-nowrap text-xs text-right">
                                {row.default_capacity_mins != null ? (
                                  row.default_capacity_mins
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                            )}
                            {capVisibleCols.has("daily_override_mins") && (
                              <TableCell className="whitespace-nowrap text-xs text-right">
                                {row.daily_override_mins != null ? (
                                  <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {row.daily_override_mins}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                            )}
                            {capVisibleCols.has("effective_capacity_mins") && (
                              <TableCell className="whitespace-nowrap text-xs text-right font-semibold">
                                {row.effective_capacity_mins}
                              </TableCell>
                            )}
                            {capVisibleCols.has("used_minutes") && (
                              <TableCell className="whitespace-nowrap text-xs text-right">
                                {row.used_minutes}
                              </TableCell>
                            )}
                            {capVisibleCols.has("utilisation_pct") && (
                              <TableCell className="whitespace-nowrap text-xs text-right">
                                <Badge variant="outline" className={badgeClass}>
                                  {row.utilisation_pct}%
                                </Badge>
                              </TableCell>
                            )}
                            {capVisibleCols.has("remaining_minutes") && (
                              <TableCell className="whitespace-nowrap text-xs text-right">
                                {row.remaining_minutes}
                              </TableCell>
                            )}
                            {capVisibleCols.has("total_bookings") && (
                              <TableCell className="whitespace-nowrap text-xs text-right">
                                {row.total_bookings > 0 ? (
                                  row.total_bookings
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                            )}
                            {capVisibleCols.has("overbooking_limit_mins") && (
                              <TableCell className="whitespace-nowrap text-xs text-right">
                                {row.overbooking_limit_mins > 0 ? (
                                  row.overbooking_limit_mins
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                            )}
                            {capVisibleCols.has("is_overbooked") && (
                              <TableCell className="whitespace-nowrap text-xs text-center">
                                {row.is_overbooked ? (
                                  <Badge
                                    variant="outline"
                                    className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
                                  >
                                    Ya
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {capTotalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-xs text-muted-foreground">
                    Halaman{" "}
                    <span className="font-semibold text-foreground">
                      {capPage}
                    </span>{" "}
                    dari{" "}
                    <span className="font-semibold text-foreground">
                      {capTotalPages}
                    </span>
                    {" · "}
                    {capacityRows.length.toLocaleString("id-ID")} total baris
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCapPage((p) => Math.max(1, p - 1))}
                      disabled={capPage === 1}
                      className="h-7 w-7 p-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {Array.from({ length: capTotalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === capTotalPages ||
                          (p >= capPage - 2 && p <= capPage + 2),
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
                            variant={capPage === item ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCapPage(item as number)}
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
                        setCapPage((p) => Math.min(capTotalPages, p + 1))
                      }
                      disabled={capPage === capTotalPages}
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
      {activeTab !== "detail" &&
        activeTab !== "groomer-performance" &&
        activeTab !== "capacity-utilisation" && (
        <div className="space-y-4">
          {/* Sub-report tabs */}
          {reportTabs}

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
        </div>
      )}
    </div>
  );
}
