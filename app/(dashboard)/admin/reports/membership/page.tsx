"use client";

import { useState, useEffect, useMemo, useRef, Suspense } from "react";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Filter,
  FilterX,
  Search,
  Loader2,
  AlertCircle,
  Columns,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  getMembershipDetailReport,
  getMembershipExpiryReport,
  getMembershipRevenueReport,
  getBenefitUtilisationReport,
  type MembershipDetailRow,
  type MembershipExpiryRow,
  type MembershipRevenueRow,
  type BenefitUtilisationRow,
  type BenefitSnapshotItem,
} from "@/lib/api/reports";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  if (parts.length === 1) return text;
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200 px-0 text-yellow-900 dark:bg-yellow-400/30 dark:text-yellow-200"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function fmtDate(v: string | null | undefined): string {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtRupiah(v: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(v);
}

const PAGE_SIZE = 25;

// ─── Status config ────────────────────────────────────────────────────────────

const MEMBERSHIP_STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  active: {
    label: "Aktif",
    className:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
  },
  expired: {
    label: "Expired",
    className:
      "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  },
  menunggu: {
    label: "Menunggu",
    className:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  },
  cancelled: {
    label: "Dibatalkan",
    className:
      "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  },
  pending: {
    label: "Pending",
    className:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800",
  },
};

// ─── Filter types ─────────────────────────────────────────────────────────────

interface MembershipFilters {
  search: string;
  planTier: string;
  planName: string;
  status: string;
  expiryFrom: string;
  expiryTo: string;
  /** Revenue tab: membership-log grouping granularity. */
  periodGrouping: "month" | "week";
}

const EMPTY_FILTERS: MembershipFilters = {
  search: "",
  planTier: "",
  planName: "",
  status: "",
  expiryFrom: "",
  expiryTo: "",
  periodGrouping: "month",
};

function isFilterActive(f: MembershipFilters): boolean {
  return (
    f.search !== "" ||
    f.planTier !== "" ||
    f.planName !== "" ||
    f.status !== "" ||
    f.expiryFrom !== "" ||
    f.expiryTo !== ""
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages: (number | "…")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("…");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    )
      pages.push(i);
    if (page < totalPages - 2) pages.push("…");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-muted-foreground">
        Halaman {page} / {totalPages} · {total} baris
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((item, idx) =>
          item === "…" ? (
            <span
              key={`e-${idx}`}
              className="px-1 text-xs text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={page === item ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(item as number)}
              className="h-7 w-7 p-0 text-xs"
            >
              {item}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Tab A — Membership Detail ────────────────────────────────────────────────

type DetailKey = keyof MembershipDetailRow;

const DETAIL_COLS: {
  key: DetailKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "pet_code", label: "Kode Pet", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "pet_type", label: "Jenis Hewan", defaultVisible: true },
  { key: "breed", label: "Ras", defaultVisible: true },
  { key: "customer_code", label: "Kode Customer", defaultVisible: true },
  { key: "customer_name", label: "Nama Customer", defaultVisible: true },
  { key: "customer_phone", label: "No. HP", defaultVisible: true },
  { key: "membership_code", label: "Kode Membership", defaultVisible: true },
  { key: "membership_name", label: "Plan Membership", defaultVisible: true },
  { key: "membership_price", label: "Harga Plan", defaultVisible: false },
  { key: "duration_days", label: "Durasi (hari)", defaultVisible: false },
  { key: "start_date", label: "Tgl Mulai", defaultVisible: false },
  { key: "end_date", label: "Tgl Expired", defaultVisible: false },
  { key: "days_until_expiry", label: "Sisa Hari", defaultVisible: true },
  { key: "membership_status", label: "Status", defaultVisible: true },
  { key: "is_early_renewal", label: "Early Renewal", defaultVisible: false },
  { key: "renewal_count", label: "Jumlah Renewal", defaultVisible: false },
  { key: "previous_plan", label: "Plan Sebelumnya", defaultVisible: false },
  // Per-benefit rows (each benefit in benefits_snapshot gets its own row)
  { key: "benefit_1_type", label: "Tipe Benefit", defaultVisible: false },
  { key: "benefit_1_applies_to", label: "Berlaku Untuk", defaultVisible: false },
  { key: "benefit_1_name", label: "Nama Benefit", defaultVisible: false },
  { key: "benefit_1_value", label: "Nilai Benefit", defaultVisible: false },
  { key: "benefit_1_limit", label: "Limit Benefit", defaultVisible: false },
  { key: "benefit_1_current_period_used", label: "Terpakai Periode Ini", defaultVisible: false },
  { key: "benefit_1_remaining", label: "Tersisa Periode Ini", defaultVisible: false },
  { key: "benefit_1_used", label: "Total Terpakai", defaultVisible: false },
  // Benefit utilisation summary (merged across benefit rows, appears to the right of benefit cols)
  { key: "total_benefit_used_amount", label: "Total Nilai Digunakan", defaultVisible: false },
  { key: "total_sessions_using_benefit", label: "Sesi Pakai Benefit", defaultVisible: false },
  { key: "benefit_roi", label: "ROI Benefit (%)", defaultVisible: false },
];

const DETAIL_DEFAULT_VISIBLE = new Set(
  DETAIL_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

const BENEFIT_COL_KEYS = new Set<DetailKey>([
  "benefit_1_type",
  "benefit_1_applies_to",
  "benefit_1_name",
  "benefit_1_value",
  "benefit_1_limit",
  "benefit_1_current_period_used",
  "benefit_1_used",
  "benefit_1_remaining",
]);

const SUMMARY_COL_KEYS = new Set<DetailKey>([
  "total_benefit_used_amount",
  "total_sessions_using_benefit",
  "benefit_roi",
]);

// Pet-level columns — same value for all memberships of the same pet, merged per (pet_id, membership_plan_id) group
const PET_COL_KEYS = new Set<DetailKey>([
  "pet_code", "pet_name", "pet_type", "breed",
  "customer_code", "customer_name", "customer_phone",
]);

function getBenefits(row: MembershipDetailRow): BenefitSnapshotItem[] {
  if (row.benefits_snapshot && row.benefits_snapshot.length > 0) {
    return row.benefits_snapshot;
  }
  return [{
    name: row.benefit_1_name,
    type: row.benefit_1_type,
    applies_to: row.benefit_1_applies_to,
    value: row.benefit_1_value,
    period: null,
    limit: row.benefit_1_limit,
    used: row.benefit_1_used,
    current_period_used: row.benefit_1_current_period_used,
    remaining: row.benefit_1_remaining,
  }];
}

function renderBenefitCell(benefit: BenefitSnapshotItem, key: DetailKey): React.ReactNode {
  if (key === "benefit_1_name") {
    if (!benefit.name) return <span className="text-muted-foreground/40">—</span>;
    return <span>{benefit.name}</span>;
  }
  if (key === "benefit_1_type") {
    if (!benefit.type) return <span className="text-muted-foreground/40">—</span>;
    const label = benefit.type === "discount" ? "Diskon" : benefit.type === "quota" ? "Kuota" : benefit.type === "free_service" ? "Gratis" : String(benefit.type);
    return <span className="capitalize">{label}</span>;
  }
  if (key === "benefit_1_applies_to") {
    if (!benefit.applies_to) return <span className="text-muted-foreground/40">—</span>;
    const map: Record<string, string> = { service: "Layanan", addon: "Add-on", order: "Order", pickup: "Pickup" };
    return <span>{map[String(benefit.applies_to)] ?? String(benefit.applies_to)}</span>;
  }
  if (key === "benefit_1_value") {
    if (benefit.value === null || benefit.value === undefined) return <span className="text-muted-foreground/40">—</span>;
    return <span>{benefit.value}%</span>;
  }
  if (key === "benefit_1_limit") {
    if (benefit.limit === null || benefit.limit === undefined) return <span className="text-muted-foreground/60 text-xs">Unlimited</span>;
    if (benefit.limit === -1) return <span className="text-muted-foreground/60 text-xs">Unlimited</span>;
    const periodLabel = benefit.period === "monthly" ? "/bulan" : benefit.period === "weekly" ? "/minggu" : "";
    return <span>{benefit.limit}x{periodLabel}</span>;
  }
  if (key === "benefit_1_current_period_used") {
    if (benefit.current_period_used === null || benefit.current_period_used === undefined) return <span className="text-muted-foreground/40">—</span>;
    return <span>{String(benefit.current_period_used)}</span>;
  }
  if (key === "benefit_1_used") {
    if (benefit.used === null || benefit.used === undefined) return <span className="text-muted-foreground/40">—</span>;
    return <span>{String(benefit.used)}</span>;
  }
  if (key === "benefit_1_remaining") {
    if (benefit.remaining === null || benefit.remaining === undefined) return <span className="text-muted-foreground/60 text-xs">Unlimited</span>;
    return <span>{benefit.remaining === -1 ? "Unlimited" : String(benefit.remaining)}</span>;
  }
  return <span className="text-muted-foreground/40">—</span>;
}

interface DetailFilters {
  search: string;
  status: string;
  planName: string;
  urgency: string;
  startFrom: string;
  startTo: string;
  endFrom: string;
  endTo: string;
  earlyRenewal: string;
}

const EMPTY_DETAIL_FILTERS: DetailFilters = {
  search: "",
  status: "",
  planName: "",
  urgency: "all",
  startFrom: "",
  startTo: "",
  endFrom: "",
  endTo: "",
  earlyRenewal: "all",
};

function isDetailFilterActive(f: DetailFilters): boolean {
  return (
    f.search !== "" ||
    f.status !== "" ||
    f.planName !== "" ||
    f.urgency !== "all" ||
    f.startFrom !== "" ||
    f.startTo !== "" ||
    f.endFrom !== "" ||
    f.endTo !== "" ||
    f.earlyRenewal !== "all"
  );
}

function MembershipDetailTab({
  rawData,
  loading,
  error,
  tabs,
  activeTab,
  onTabChange,
}: {
  rawData: MembershipDetailRow[];
  loading: boolean;
  error: string | null;
  tabs: { id: string; label: string; live: boolean }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] =
    useState<Set<DetailKey>>(DETAIL_DEFAULT_VISIBLE);
  const [filters, setFilters] = useState<DetailFilters>(EMPTY_DETAIL_FILTERS);

  function setF<K extends keyof DetailFilters>(key: K, val: DetailFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }
  function resetFilters() {
    setFilters(EMPTY_DETAIL_FILTERS);
  }

  const isFiltered = isDetailFilterActive(filters);

  // ── Grouped row hover — key = pet_id::membership_plan_id (visual group) ──────
  const [hoveredGroupKey, setHoveredGroupKey] = useState<string | null>(null);
  const leaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleGroupEnter(key: string) {
    if (leaveTimerRef.current) clearTimeout(leaveTimerRef.current);
    setHoveredGroupKey(key);
  }
  function handleGroupLeave() {
    leaveTimerRef.current = setTimeout(() => setHoveredGroupKey(null), 0);
  }

  // ── Plan name options derived from raw data ──────────────────────────────
  const planOptions = useMemo(
    () => [...new Set(rawData.map((r) => r.membership_name).filter(Boolean))].sort(),
    [rawData],
  );

  // ── Client-side filtering ────────────────────────────────────────────────
  const data = useMemo(() => {
    let d = rawData;
    const { search, status, planName, urgency, startFrom, startTo, endFrom, endTo, earlyRenewal } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.pet_name.toLowerCase().includes(s) ||
          r.customer_name.toLowerCase().includes(s) ||
          r.customer_phone.includes(s) ||
          r.pet_membership_id.toLowerCase().includes(s),
      );
    }
    if (status) d = d.filter((r) => r.membership_status === status);
    if (planName) d = d.filter((r) => r.membership_name === planName);
    if (startFrom) d = d.filter((r) => r.start_date && r.start_date.slice(0, 10) >= startFrom);
    if (startTo) d = d.filter((r) => r.start_date && r.start_date.slice(0, 10) <= startTo);
    if (endFrom) d = d.filter((r) => r.end_date && r.end_date.slice(0, 10) >= endFrom);
    if (endTo) d = d.filter((r) => r.end_date && r.end_date.slice(0, 10) <= endTo);
    if (earlyRenewal === "yes") d = d.filter((r) => r.is_early_renewal);
    if (earlyRenewal === "no") d = d.filter((r) => !r.is_early_renewal);

    if (urgency === "expired")
      d = d.filter((r) => r.days_until_expiry !== null && r.days_until_expiry < 0);
    else if (urgency === "7days")
      d = d.filter((r) => r.days_until_expiry !== null && r.days_until_expiry >= 0 && r.days_until_expiry <= 7);
    else if (urgency === "30days")
      d = d.filter((r) => r.days_until_expiry !== null && r.days_until_expiry >= 0 && r.days_until_expiry <= 30);

    // One row per unique membership per pet (keyed by pet_id + membership_plan_id):
    // a pet may show several rows as long as the plan differs, never the same plan twice.
    // Priority: aktif → menunggu → expired → dibatalkan; tie-break: latest end_date
    // (or, when both are menunggu, the soonest start_date).
    const statusPriority = (r: MembershipDetailRow) =>
      r.membership_status === "active"
        ? 0
        : r.membership_status === "menunggu"
          ? 1
          : r.membership_status === "expired"
            ? 2
            : 3; // cancelled / dibatalkan
    const dedupMap = new Map<string, MembershipDetailRow>();
    for (const row of d) {
      const key = `${row.pet_id}::${row.membership_plan_id}`;
      const existing = dedupMap.get(key);
      if (!existing) { dedupMap.set(key, row); continue; }
      const rowPrio = statusPriority(row);
      const exPrio = statusPriority(existing);
      if (rowPrio < exPrio) {
        dedupMap.set(key, row); // higher priority status wins
      } else if (rowPrio === exPrio) {
        if (row.membership_status === "menunggu") {
          // both menunggu → prefer the one starting soonest (closest start_date)
          const start = row.start_date ? new Date(row.start_date).getTime() : Infinity;
          const exStart = existing.start_date ? new Date(existing.start_date).getTime() : Infinity;
          if (start < exStart) dedupMap.set(key, row);
        } else {
          const end = row.end_date ? new Date(row.end_date).getTime() : 0;
          const exEnd = existing.end_date ? new Date(existing.end_date).getTime() : 0;
          if (end > exEnd) dedupMap.set(key, row); // same priority → latest end_date
        }
      }
    }
    d = [...dedupMap.values()];

    return d;
  }, [rawData, filters]);

  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );
  const visibleColDefs = DETAIL_COLS.filter((c) => visibleCols.has(c.key));
  // Pet-level cols — rowspan per (pet_id, membership_plan_id) group
  const petColDefs = visibleColDefs.filter((c) => PET_COL_KEYS.has(c.key));
  // Membership-level cols — rowspan per membership
  const membershipColDefs = visibleColDefs.filter((c) => !PET_COL_KEYS.has(c.key) && !BENEFIT_COL_KEYS.has(c.key) && !SUMMARY_COL_KEYS.has(c.key));
  // Cols rendered per benefit row (one row per benefit)
  const benefitColDefs = visibleColDefs.filter((c) => BENEFIT_COL_KEYS.has(c.key));
  // Cols rendered with rowSpan after benefit cols (right side summary)
  const summaryColDefs = visibleColDefs.filter((c) => SUMMARY_COL_KEYS.has(c.key));

  const expandedRows = useMemo(() => {
    if (petColDefs.length === 0 && benefitColDefs.length === 0) return null;

    // Group by (pet_id, membership_plan_id) — one block per unique plan; a pet with
    // multiple distinct plans gets one block (and one pet-info rowspan) per plan.
    const groupMap = new Map<string, MembershipDetailRow[]>();
    for (const row of pageRows) {
      const gKey = `${row.pet_id}::${row.membership_plan_id}`;
      if (!groupMap.has(gKey)) groupMap.set(gKey, []);
      groupMap.get(gKey)!.push(row);
    }
    const groups = [...groupMap.values()];

    let absoluteMembershipIdx = (page - 1) * PAGE_SIZE;
    return groups.flatMap((groupRows, groupIdx) => {
      const effectiveBenefitCounts = groupRows.map((row) =>
        benefitColDefs.length > 0 ? getBenefits(row).length : 1,
      );
      const groupTotalRows = effectiveBenefitCounts.reduce((s, n) => s + n, 0);

      return groupRows.flatMap((row, membershipIdxInGroup) => {
        const benefits = benefitColDefs.length > 0
          ? getBenefits(row)
          : [null as unknown as BenefitSnapshotItem];
        const benefitCount = benefits.length;
        const rowNumber = absoluteMembershipIdx + 1;
        absoluteMembershipIdx++;

        return benefits.map((benefit, bIdx) => ({
          row,
          benefit,
          benefitIdx: bIdx,
          benefitCount,
          membershipIdxInGroup,
          isFirstInGroup: bIdx === 0 && membershipIdxInGroup === 0,
          groupTotalRows,
          groupIdx,
          isFirstGroup: groupIdx === 0,
          rowNumber,
        }));
      });
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageRows, page, petColDefs.length, benefitColDefs.length]);

  // ── Summary chips ────────────────────────────────────────────────────────
  const activeCount = useMemo(
    () => rawData.filter((r) => r.membership_status === "active").length,
    [rawData],
  );
  const expiredCount = useMemo(
    () => rawData.filter((r) => r.membership_status === "expired").length,
    [rawData],
  );
  const earlyRenewalCount = useMemo(
    () => rawData.filter((r) => r.is_early_renewal).length,
    [rawData],
  );
  const firstTimerCount = useMemo(
    () => rawData.filter((r) => r.renewal_count === 0).length,
    [rawData],
  );

  const allSelected = visibleCols.size === DETAIL_COLS.length;
  const isNonDefault =
    visibleCols.size !== DETAIL_DEFAULT_VISIBLE.size ||
    [...DETAIL_DEFAULT_VISIBLE].some((k) => !visibleCols.has(k));

  function toggleCol(key: DetailKey) {
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

  function selectAllOrDefault() {
    if (allSelected) {
      setVisibleCols(DETAIL_DEFAULT_VISIBLE);
    } else {
      setVisibleCols(new Set(DETAIL_COLS.map((c) => c.key)));
    }
  }

  function renderCell(row: MembershipDetailRow, key: DetailKey): React.ReactNode {
    const val = row[key];

    if (key === "membership_status") {
      const cfg = MEMBERSHIP_STATUS_CONFIG[String(val)] ?? MEMBERSHIP_STATUS_CONFIG.expired;
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    }

    if (key === "membership_price") {
      return <span className="font-semibold">{fmtRupiah((val ?? 0) as number)}</span>;
    }

    if (key === "is_early_renewal") {
      return row.is_early_renewal ? (
        <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800">
          Ya
        </Badge>
      ) : (
        <span className="text-muted-foreground/40">—</span>
      );
    }

    if (key === "days_until_expiry") {
      if (val === null || val === undefined)
        return <span className="text-muted-foreground/40">—</span>;
      const days = val as number;
      if (days < 0)
        return <span className="font-semibold text-red-600 dark:text-red-400">Expired ({Math.abs(days)} hari lalu)</span>;
      if (days <= 7)
        return <span className="font-semibold text-red-600 dark:text-red-400">{days} hari</span>;
      if (days <= 30)
        return <span className="font-semibold text-orange-600 dark:text-orange-400">{days} hari</span>;
      return <span>{days} hari</span>;
    }

    if (key === "previous_plan") {
      if (!val) return <span className="text-muted-foreground/40">—</span>;
      return <span>{String(val)}</span>;
    }

    if (key === "start_date" || key === "end_date") return fmtDate(val as string | null);

    if (key === "benefit_1_type") {
      if (!val) return <span className="text-muted-foreground/40">—</span>;
      const label = val === "discount" ? "Diskon" : val === "quota" ? "Kuota" : String(val);
      return <span className="capitalize">{label}</span>;
    }

    if (key === "benefit_1_applies_to") {
      if (!val) return <span className="text-muted-foreground/40">—</span>;
      const map: Record<string, string> = { service: "Layanan", addon: "Add-on", pickup: "Pickup" };
      return <span>{map[String(val)] ?? String(val)}</span>;
    }

    if (key === "benefit_1_value") {
      if (val === null || val === undefined) return <span className="text-muted-foreground/40">—</span>;
      return <span>{val as number}%</span>;
    }

    if (key === "benefit_1_limit" || key === "benefit_1_used" || key === "benefit_1_remaining") {
      if (val === null || val === undefined) return <span className="text-muted-foreground/40">—</span>;
      return <span>{String(val)}</span>;
    }

    if (key === "total_benefit_used_amount") {
      return <span className="font-semibold">{fmtRupiah((val ?? 0) as number)}</span>;
    }

    if (key === "benefit_roi") {
      const pct = (val ?? 0) as number;
      const cls = pct >= 100 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : pct >= 50 ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground";
      return <span className={cls}>{pct}%</span>;
    }

    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;

    return highlightText(String(val), filters.search);
  }

  function handleExport() {
    const headers = DETAIL_COLS.map((c) => c.label);
    const rows = data.flatMap((r) => {
      const benefits = getBenefits(r);
      return benefits.map((benefit) =>
        DETAIL_COLS.map((c) => {
          if (BENEFIT_COL_KEYS.has(c.key)) {
            if (c.key === "benefit_1_name") return benefit.name ?? "";
            if (c.key === "benefit_1_type") {
              if (!benefit.type) return "";
              return benefit.type === "discount" ? "Diskon" : benefit.type === "quota" ? "Kuota" : benefit.type === "free_service" ? "Gratis" : String(benefit.type);
            }
            if (c.key === "benefit_1_applies_to") {
              const map: Record<string, string> = { service: "Layanan", addon: "Add-on", order: "Order", pickup: "Pickup" };
              return benefit.applies_to ? (map[String(benefit.applies_to)] ?? String(benefit.applies_to)) : "";
            }
            if (c.key === "benefit_1_value") return benefit.value !== null && benefit.value !== undefined ? `${benefit.value}%` : "";
            if (c.key === "benefit_1_limit") {
              if (benefit.limit === null || benefit.limit === -1) return "Unlimited";
              const p = benefit.period === "monthly" ? "/bulan" : benefit.period === "weekly" ? "/minggu" : "";
              return `${benefit.limit}x${p}`;
            }
            if (c.key === "benefit_1_current_period_used") return benefit.current_period_used ?? 0;
            if (c.key === "benefit_1_used") return benefit.used ?? 0;
            if (c.key === "benefit_1_remaining") return (benefit.remaining === null || benefit.remaining === -1) ? "Unlimited" : String(benefit.remaining);
            return "";
          }
          const v = r[c.key];
          if (c.key === "membership_status")
            return MEMBERSHIP_STATUS_CONFIG[String(v)]?.label ?? String(v);
          if (c.key === "membership_price" || c.key === "total_benefit_used_amount") return v as number;
          if (c.key === "is_early_renewal") return r.is_early_renewal ? "Ya" : "Tidak";
          if (c.key === "start_date" || c.key === "end_date") return fmtDate(v as string | null);
          if (c.key === "benefit_roi") return v !== null && v !== undefined ? `${v}%` : "";
          if (v === null || v === undefined) return "";
          return v;
        }),
      );
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Membership Detail");
    XLSX.writeFile(wb, "membership-detail-report.xlsx");
  }

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            Filter
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
        <CardContent className="space-y-3">
          {/* Row 1 — Search + urgency */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nama pet, owner, no. HP, ID membership..."
                  value={filters.search}
                  onChange={(e) => setF("search", e.target.value)}
                  className="pl-9 pr-8"
                />
                {filters.search && (
                  <button
                    onClick={() => setF("search", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select
                value={filters.status || "__all__"}
                onValueChange={(v) => setF("status", v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Status</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="menunggu">Menunggu</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan Membership</label>
              <Select
                value={filters.planName || "__all__"}
                onValueChange={(v) => setF("planName", v === "__all__" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Semua Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Plan</SelectItem>
                  {planOptions.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 2 — Date ranges + urgency + early renewal */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tgl Mulai Dari</label>
              <Input type="date" value={filters.startFrom} onChange={(e) => setF("startFrom", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tgl Mulai Sampai</label>
              <Input type="date" value={filters.startTo} onChange={(e) => setF("startTo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tgl Expired Dari</label>
              <Input type="date" value={filters.endFrom} onChange={(e) => setF("endFrom", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tgl Expired Sampai</label>
              <Input type="date" value={filters.endTo} onChange={(e) => setF("endTo", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Urgency */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Urgensi Expiry</label>
              <Select
                value={filters.urgency}
                onValueChange={(v) => setF("urgency", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="expired">Sudah Expired</SelectItem>
                  <SelectItem value="7days">Expired ≤ 7 hari</SelectItem>
                  <SelectItem value="30days">Expired ≤ 30 hari</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Early Renewal */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Early Renewal</label>
              <Select
                value={filters.earlyRenewal}
                onValueChange={(v) => setF("earlyRenewal", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="yes">Ya (early renewal)</SelectItem>
                  <SelectItem value="no">Tidak</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab buttons */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { if (tab.live) onTabChange(tab.id); }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : tab.live
                  ? "bg-muted text-muted-foreground hover:bg-muted/80"
                  : "cursor-not-allowed bg-muted/50 text-muted-foreground/50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary chips */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
            Aktif <span className="font-bold">{activeCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
            Expired <span className="font-bold">{expiredCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400">
            Early Renewal <span className="font-bold">{earlyRenewalCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
            Member Baru <span className="font-bold">{firstTimerCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Total <span className="font-bold">{rawData.length}</span>
          </span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="mr-2 h-4 w-4" />
          Export (.xlsx)
        </Button>
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">
                {[...new Set(data.map((r) => r.customer_id))].length.toLocaleString("id-ID")}
              </span>{" "}
              owner ·{" "}
              <span className="font-semibold text-foreground">
                {[...new Set(data.map((r) => r.pet_id))].length.toLocaleString("id-ID")}
              </span>{" "}
              pet
            </span>
          )}
        </span>
      </div>

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
            <CardTitle className="text-sm font-semibold">
              Membership Detail Report
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kolom{" "}
              <span className="font-medium text-foreground">Sisa Hari</span> dan{" "}
              <span className="font-medium text-foreground">Status</span>{" "}
              dihitung dari tanggal hari ini.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isNonDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCols(DETAIL_DEFAULT_VISIBLE)}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ke Default
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="h-4 w-4" />
                  Kolom
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {visibleCols.size}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[400px] w-56 overflow-y-auto">
                <DropdownMenuCheckboxItem
                  checked={allSelected}
                  onCheckedChange={selectAllOrDefault}
                  className="text-xs font-medium"
                >
                  Pilih Semua
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {DETAIL_COLS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pb-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                  {visibleColDefs.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-xs">
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={visibleColDefs.length + 1} className="py-10">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={visibleColDefs.length + 1} className="py-10">
                      <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      {isFiltered ? "Tidak ada data yang sesuai filter." : "Belum ada data."}
                    </TableCell>
                  </TableRow>
                ) : expandedRows !== null ? (
                  expandedRows.map(({ row, benefit, benefitIdx, benefitCount, isFirstInGroup, groupTotalRows, isFirstGroup, rowNumber }) => {
                    const groupKey = `${row.pet_id}::${row.membership_plan_id}`;
                    const isGroupHovered = hoveredGroupKey === groupKey;
                    const borderClass =
                      isFirstInGroup && !isFirstGroup ? "border-t-2 border-border"
                      : !isFirstInGroup && benefitIdx === 0 ? "border-t border-border/50"
                      : benefitIdx > 0 ? "border-t border-dashed border-border/40"
                      : "";
                    return (
                      <TableRow
                        key={`${row.pet_membership_id}-${benefitIdx}`}
                        style={{
                          backgroundColor: isGroupHovered
                            ? "hsl(var(--muted) / 0.5)"
                            : "transparent",
                        }}
                        className={borderClass}
                        onMouseEnter={() => handleGroupEnter(groupKey)}
                        onMouseLeave={handleGroupLeave}
                      >
                        {isFirstInGroup && (
                          <TableCell rowSpan={groupTotalRows} className="text-center text-xs text-muted-foreground align-top">
                            {rowNumber}
                          </TableCell>
                        )}
                        {isFirstInGroup && petColDefs.map((c) => (
                          <TableCell key={c.key} rowSpan={groupTotalRows} className="whitespace-nowrap text-xs align-top">
                            {renderCell(row, c.key)}
                          </TableCell>
                        ))}
                        {benefitIdx === 0 && membershipColDefs.map((c) => (
                          <TableCell key={c.key} rowSpan={benefitCount} className="whitespace-nowrap text-xs align-top">
                            {renderCell(row, c.key)}
                          </TableCell>
                        ))}
                        {benefitColDefs.map((c) => (
                          <TableCell key={c.key} className="whitespace-nowrap text-xs">
                            {renderBenefitCell(benefit, c.key)}
                          </TableCell>
                        ))}
                        {benefitIdx === 0 && summaryColDefs.map((c) => (
                          <TableCell key={c.key} rowSpan={benefitCount} className="whitespace-nowrap text-xs align-top">
                            {renderCell(row, c.key)}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                ) : (
                  pageRows.map((row, idx) => (
                    <TableRow key={row.pet_membership_id}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      {visibleColDefs.map((c) => (
                        <TableCell key={c.key} className="whitespace-nowrap text-xs">
                          {renderCell(row, c.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={data.length}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab B — Membership Expiry ────────────────────────────────────────────────

type ExpiryKey = keyof MembershipExpiryRow;

const EXPIRY_COLS: {
  key: ExpiryKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "pet_code", label: "Kode Pet", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "pet_type", label: "Jenis Hewan", defaultVisible: false },
  { key: "customer_code", label: "Kode Customer", defaultVisible: true },
  { key: "owner_name", label: "Nama Customer", defaultVisible: true },
  { key: "owner_phone", label: "No. HP (WhatsApp)", defaultVisible: true },
  { key: "member_code", label: "Kode Member", defaultVisible: true },
  { key: "plan_name", label: "Nama Membership", defaultVisible: true },
  { key: "start_date", label: "Tgl Mulai", defaultVisible: false },
  { key: "expiry_date", label: "Tgl Expired", defaultVisible: true },
  { key: "days_until_expiry", label: "Sisa Hari", defaultVisible: true },
  { key: "expiry_urgency", label: "Urgensi", defaultVisible: true },
  { key: "renewal_count", label: "Jumlah Renewal", defaultVisible: true },
  { key: "last_visit_at", label: "Kunjungan Terakhir", defaultVisible: true },
  { key: "days_since_last_visit", label: "Hari Sejak Kunjungan", defaultVisible: true },
  { key: "double_risk_flag", label: "Double Risk", defaultVisible: true },
  { key: "total_benefit_used", label: "Total Benefit Digunakan", defaultVisible: true },
  { key: "status", label: "Status", defaultVisible: true },
];

const EXPIRY_DEFAULT_VISIBLE = new Set(
  EXPIRY_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

function MembershipExpiryTab({
  data,
  loading,
  error,
  isFiltered,
  search,
}: {
  data: MembershipExpiryRow[];
  loading: boolean;
  error: string | null;
  isFiltered: boolean;
  search: string;
}) {
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] =
    useState<Set<ExpiryKey>>(EXPIRY_DEFAULT_VISIBLE);

  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );
  const visibleColDefs = EXPIRY_COLS.filter((c) => visibleCols.has(c.key));

  // Buckets follow the Urgensi CASE: ≤7 critical | 8–14 warning | 15–30 upcoming
  const criticalCount = useMemo(
    () => data.filter((r) => r.expiry_urgency === "critical").length,
    [data],
  );
  const warningCount = useMemo(
    () => data.filter((r) => r.expiry_urgency === "warning").length,
    [data],
  );
  const upcomingCount = useMemo(
    () => data.filter((r) => r.expiry_urgency === "upcoming").length,
    [data],
  );

  const allSelected = visibleCols.size === EXPIRY_COLS.length;
  const isNonDefault =
    visibleCols.size !== EXPIRY_DEFAULT_VISIBLE.size ||
    [...EXPIRY_DEFAULT_VISIBLE].some((k) => !visibleCols.has(k));

  function toggleCol(key: ExpiryKey) {
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

  function selectAllOrDefault() {
    if (allSelected) {
      setVisibleCols(EXPIRY_DEFAULT_VISIBLE);
    } else {
      setVisibleCols(new Set(EXPIRY_COLS.map((c) => c.key)));
    }
  }

  function renderCell(
    row: MembershipExpiryRow,
    key: ExpiryKey,
  ): React.ReactNode {
    const val = row[key];

    if (key === "status") {
      const cfg =
        MEMBERSHIP_STATUS_CONFIG[String(val)] ??
        MEMBERSHIP_STATUS_CONFIG.expired;
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    }

    if (key === "days_until_expiry") {
      if (val === null || val === undefined)
        return <span className="text-muted-foreground/40">—</span>;
      const days = val as number;
      if (days < 0)
        return <span className="font-semibold text-red-600 dark:text-red-400">Expired</span>;
      if (days <= 7)
        return <span className="font-semibold text-red-600 dark:text-red-400">{days} hari</span>;
      if (days <= 30)
        return <span className="font-semibold text-orange-600 dark:text-orange-400">{days} hari</span>;
      return <span>{days} hari</span>;
    }

    if (key === "expiry_urgency") {
      if (!val) return <span className="text-muted-foreground/40">—</span>;
      const cfg: Record<string, { label: string; className: string }> = {
        critical: { label: "Kritis", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400" },
        warning:  { label: "Peringatan", className: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-400" },
        upcoming: { label: "Akan Datang", className: "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400" },
      };
      const c = cfg[String(val)];
      if (!c) return <span className="text-muted-foreground/40">—</span>;
      return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
    }

    if (key === "double_risk_flag") {
      return val ? (
        <Badge variant="outline" className="border-red-300 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-950/60 dark:text-red-300">
          Double Risk
        </Badge>
      ) : (
        <span className="text-muted-foreground/40">—</span>
      );
    }

    if (key === "total_benefit_used") {
      return <span className="font-semibold">{fmtRupiah((val ?? 0) as number)}</span>;
    }

    if (key === "days_since_last_visit") {
      if (val === null || val === undefined)
        return <span className="text-muted-foreground/40">—</span>;
      const d = val as number;
      if (d > 30) return <span className="font-semibold text-orange-600 dark:text-orange-400">{d} hari</span>;
      return <span>{d} hari</span>;
    }

    if (key === "start_date" || key === "expiry_date" || key === "last_visit_at")
      return fmtDate(val as string | null);

    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;

    return highlightText(String(val), search);
  }

  function handleExport() {
    const URGENCY_LABEL: Record<string, string> = { critical: "Kritis", warning: "Peringatan", upcoming: "Akan Datang" };
    const headers = EXPIRY_COLS.map((c) => c.label);
    const rows = data.map((r) =>
      EXPIRY_COLS.map((c) => {
        const v = r[c.key];
        if (c.key === "status")
          return MEMBERSHIP_STATUS_CONFIG[String(v)]?.label ?? String(v);
        if (c.key === "start_date" || c.key === "expiry_date" || c.key === "last_visit_at")
          return fmtDate(v as string | null);
        if (c.key === "expiry_urgency") return v ? (URGENCY_LABEL[String(v)] ?? String(v)) : "";
        if (c.key === "double_risk_flag") return v ? "Ya" : "Tidak";
        if (c.key === "days_since_last_visit") return v !== null && v !== undefined ? `${v} hari` : "";
        if (c.key === "days_until_expiry") {
          if (v === null || v === undefined) return "";
          return (v as number) < 0 ? "Expired" : `${v} hari`;
        }
        if (v === null || v === undefined) return "";
        return v;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Membership Expiry");
    XLSX.writeFile(wb, "membership-expiry-report.xlsx");
  }

  return (
    <div className="space-y-4">
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
            Kritis (≤7 hari)
            <span className="font-bold">{criticalCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-400">
            Peringatan (8–14 hari)
            <span className="font-bold">{warningCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-200 bg-yellow-50 px-3 py-1 text-xs font-medium text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-400">
            Akan Datang (15–30 hari)
            <span className="font-bold">{upcomingCount}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Total
            <span className="font-bold">{data.length}</span>
          </span>
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleExport}
          disabled={loading || data.length === 0}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <Download className="mr-2 h-4 w-4" />
          Export (.xlsx)
        </Button>
        <span className="text-sm text-muted-foreground">
          {loading ? (
            <span className="flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat...
            </span>
          ) : (
            <span>
              <span className="font-semibold text-foreground">
                {[...new Set(data.map((r) => r.owner_phone).filter(Boolean))].length.toLocaleString("id-ID")}
              </span>{" "}
              owner ·{" "}
              <span className="font-semibold text-foreground">
                {[...new Set(data.map((r) => r.pet_id))].length.toLocaleString("id-ID")}
              </span>{" "}
              pet
            </span>
          )}
        </span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <div>
            <CardTitle className="text-sm font-semibold">
              Membership Expiry Report
            </CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Kolom{" "}
              <span className="font-medium text-foreground">Sisa Hari</span> dan{" "}
              <span className="font-medium text-foreground">Status</span>{" "}
              dihitung dari tanggal hari ini.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isNonDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCols(EXPIRY_DEFAULT_VISIBLE)}
                className="gap-1.5 text-xs text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset ke Default
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="h-4 w-4" />
                  Kolom
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                    {visibleCols.size}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[400px] w-56 overflow-y-auto">
                <DropdownMenuCheckboxItem
                  checked={allSelected}
                  onCheckedChange={selectAllOrDefault}
                  className="text-xs font-medium"
                >
                  Pilih Semua
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {EXPIRY_COLS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pb-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                  {visibleColDefs.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-xs">
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
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
                  pageRows.map((row, idx) => (
                    <TableRow key={row.membership_id}>
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      {visibleColDefs.map((c) => (
                        <TableCell
                          key={c.key}
                          className="whitespace-nowrap text-xs"
                        >
                          {renderCell(row, c.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={data.length}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab C — Membership Revenue & Renewal ─────────────────────────────────────

type RevenueKey = keyof MembershipRevenueRow;

const REVENUE_COLS: {
  key: RevenueKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "period", label: "Periode", defaultVisible: true },
  { key: "total_active", label: "Total Aktif", defaultVisible: true },
  { key: "new_members", label: "Member Baru", defaultVisible: true },
  { key: "renewed_members", label: "Perpanjang", defaultVisible: true },
  { key: "expired_members", label: "Expired", defaultVisible: true },
  { key: "gross_revenue", label: "Gross Revenue", defaultVisible: true },
  { key: "benefit_usage_count", label: "Benefit Terpakai", defaultVisible: true },
  { key: "by_plan_breakdown", label: "Breakdown per Plan", defaultVisible: true },
];

const REVENUE_DEFAULT_VISIBLE = new Set(
  REVENUE_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

function MembershipRevenueTab({
  data,
  loading,
  error,
  isFiltered,
}: {
  data: MembershipRevenueRow[];
  loading: boolean;
  error: string | null;
  isFiltered: boolean;
}) {
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<RevenueKey>>(
    REVENUE_DEFAULT_VISIBLE,
  );

  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );
  const visibleColDefs = REVENUE_COLS.filter((c) => visibleCols.has(c.key));

  const totalRevenue = useMemo(
    () => data.reduce((s, r) => s + r.gross_revenue, 0),
    [data],
  );
  const totalNewMembers = useMemo(
    () => data.reduce((s, r) => s + r.new_members, 0),
    [data],
  );
  const totalRenewed = useMemo(
    () => data.reduce((s, r) => s + r.renewed_members, 0),
    [data],
  );

  const allSelected = visibleCols.size === REVENUE_COLS.length;
  const isNonDefault =
    visibleCols.size !== REVENUE_DEFAULT_VISIBLE.size ||
    [...REVENUE_DEFAULT_VISIBLE].some((k) => !visibleCols.has(k));

  function toggleCol(key: RevenueKey) {
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

  function selectAllOrDefault() {
    if (allSelected) {
      setVisibleCols(REVENUE_DEFAULT_VISIBLE);
    } else {
      setVisibleCols(new Set(REVENUE_COLS.map((c) => c.key)));
    }
  }

  function renderCell(
    row: MembershipRevenueRow,
    key: RevenueKey,
  ): React.ReactNode {
    const val = row[key];

    if (key === "period") return row.period_label || row.period;
    if (key === "by_plan_breakdown")
      return (
        row.by_plan_breakdown
          .map((b) => `${b.plan_name}: ${b.count}`)
          .join(", ") || "—"
      );

    if (key === "gross_revenue") {
      return (
        <span className="font-semibold">{fmtRupiah((val ?? 0) as number)}</span>
      );
    }

    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;

    return String(val);
  }

  function handleExport() {
    const headers = REVENUE_COLS.map((c) => c.label);
    const rows = data.map((r) =>
      REVENUE_COLS.map((c) => {
        if (c.key === "period") return r.period_label;
        if (c.key === "by_plan_breakdown")
          return r.by_plan_breakdown
            .map((b) => `${b.plan_name}: ${b.count}`)
            .join("; ");
        const v = r[c.key];
        if (v === null || v === undefined) return "";
        return v;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Membership Revenue");
    XLSX.writeFile(wb, "membership-revenue-report.xlsx");
  }

  return (
    <div className="space-y-4">
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
            Total Revenue
            <span className="font-bold">{fmtRupiah(totalRevenue)}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
            Member Baru
            <span className="font-bold">{totalNewMembers}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400">
            Perpanjang
            <span className="font-bold">{totalRenewed}</span>
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-3 pt-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">
              Membership Revenue & Renewal
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Periode dihitung dari tanggal membership di-purchase atau
              di-renew, bukan dari tanggal mulai membership.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="h-3.5 w-3.5" />
                  Kolom
                  {isNonDefault && (
                    <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0 text-[10px] text-primary-foreground">
                      {visibleCols.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center justify-between text-xs">
                  Tampilkan Kolom
                  <button
                    onClick={selectAllOrDefault}
                    className="text-[10px] font-normal text-muted-foreground underline"
                  >
                    {allSelected ? "Default" : "Semua"}
                  </button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {REVENUE_COLS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
                {isNonDefault && (
                  <>
                    <DropdownMenuSeparator />
                    <button
                      onClick={() => setVisibleCols(REVENUE_DEFAULT_VISIBLE)}
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset ke default
                    </button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExport}
              disabled={loading || data.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pb-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                  {visibleColDefs.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-xs">
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
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
                  pageRows.flatMap((row, idx) => {
                    const showBreakdown = visibleColDefs.some(
                      (c) => c.key === "by_plan_breakdown",
                    );
                    const breakdown =
                      row.by_plan_breakdown &&
                      row.by_plan_breakdown.length > 0
                        ? row.by_plan_breakdown
                        : [null];
                    const subRows = showBreakdown ? breakdown : [null];
                    const span = subRows.length;
                    return subRows.map((bp, sub) => (
                      <TableRow key={`${row.period}-${sub}`}>
                        {sub === 0 && (
                          <TableCell
                            rowSpan={span}
                            className="text-center align-top text-xs text-muted-foreground"
                          >
                            {(page - 1) * PAGE_SIZE + idx + 1}
                          </TableCell>
                        )}
                        {visibleColDefs.map((c) => {
                          if (c.key === "by_plan_breakdown") {
                            return (
                              <TableCell
                                key={c.key}
                                className="whitespace-nowrap text-xs"
                              >
                                {bp ? (
                                  <span>
                                    <span className="font-medium">
                                      {bp.plan_name}
                                    </span>
                                    : {bp.count}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground/40">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            );
                          }
                          if (sub !== 0) return null;
                          return (
                            <TableCell
                              key={c.key}
                              rowSpan={span}
                              className="whitespace-nowrap align-top text-xs"
                            >
                              {renderCell(row, c.key)}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ));
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={data.length}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab D — Benefit Utilisation ──────────────────────────────────────────────

type BenefitKey = keyof BenefitUtilisationRow;

const BENEFIT_COLS: {
  key: BenefitKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "member_code", label: "Kode Member", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "owner_name", label: "Nama Owner", defaultVisible: true },
  { key: "plan_name", label: "Plan Membership", defaultVisible: true },
  { key: "benefit_name", label: "Nama Benefit", defaultVisible: true },
  { key: "benefit_type", label: "Tipe Benefit", defaultVisible: true },
  { key: "benefit_applies_to", label: "Berlaku Untuk", defaultVisible: false },
  { key: "used_count", label: "Terpakai", defaultVisible: true },
  { key: "allowed_count", label: "Maks", defaultVisible: true },
  { key: "remaining", label: "Sisa", defaultVisible: true },
  { key: "utilisation_pct", label: "% Utilisasi", defaultVisible: true },
  { key: "last_used_at", label: "Terakhir Dipakai", defaultVisible: true },
  { key: "booking_reference", label: "Ref. Booking", defaultVisible: false },
];

const BENEFIT_DEFAULT_VISIBLE = new Set(
  BENEFIT_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

const BENEFIT_TYPE_CONFIG: Record<string, { label: string; className: string }> =
  {
    discount: {
      label: "Diskon",
      className:
        "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
    },
    quota: {
      label: "Kuota",
      className:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    },
  };

function BenefitUtilisationTab({
  data,
  loading,
  error,
  isFiltered,
  search,
}: {
  data: BenefitUtilisationRow[];
  loading: boolean;
  error: string | null;
  isFiltered: boolean;
  search: string;
}) {
  const [page, setPage] = useState(1);
  const [visibleCols, setVisibleCols] = useState<Set<BenefitKey>>(
    BENEFIT_DEFAULT_VISIBLE,
  );

  useEffect(() => {
    setPage(1);
  }, [data]);

  const totalPages = Math.max(1, Math.ceil(data.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => data.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [data, page],
  );
  const visibleColDefs = BENEFIT_COLS.filter((c) => visibleCols.has(c.key));

  const discountBenefits = useMemo(
    () => data.filter((r) => r.benefit_type === "discount").length,
    [data],
  );
  const quotaBenefits = useMemo(
    () => data.filter((r) => r.benefit_type === "quota").length,
    [data],
  );
  const avgUtilisation = useMemo(() => {
    const rows = data.filter((r) => r.utilisation_pct !== null);
    if (rows.length === 0) return 0;
    return Math.round(
      rows.reduce((s, r) => s + (r.utilisation_pct ?? 0), 0) / rows.length,
    );
  }, [data]);

  const allSelected = visibleCols.size === BENEFIT_COLS.length;
  const isNonDefault =
    visibleCols.size !== BENEFIT_DEFAULT_VISIBLE.size ||
    [...BENEFIT_DEFAULT_VISIBLE].some((k) => !visibleCols.has(k));

  function toggleCol(key: BenefitKey) {
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

  function selectAllOrDefault() {
    if (allSelected) {
      setVisibleCols(BENEFIT_DEFAULT_VISIBLE);
    } else {
      setVisibleCols(new Set(BENEFIT_COLS.map((c) => c.key)));
    }
  }

  function renderCell(
    row: BenefitUtilisationRow,
    key: BenefitKey,
  ): React.ReactNode {
    const val = row[key];

    if (key === "benefit_type") {
      const cfg =
        BENEFIT_TYPE_CONFIG[String(val)] ?? BENEFIT_TYPE_CONFIG.quota;
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    }

    if (key === "utilisation_pct") {
      if (val === null || val === undefined)
        return <span className="text-muted-foreground/40">—</span>;
      const pct = val as number;
      const colorClass =
        pct >= 90
          ? "font-semibold text-emerald-600 dark:text-emerald-400"
          : pct >= 50
            ? "text-blue-600 dark:text-blue-400"
            : "text-muted-foreground";
      return <span className={colorClass}>{pct}%</span>;
    }

    if (key === "last_used_at") return fmtDate(val as string | null);

    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;

    return highlightText(String(val), search);
  }

  function handleExport() {
    const headers = BENEFIT_COLS.map((c) => c.label);
    const rows = data.map((r) =>
      BENEFIT_COLS.map((c) => {
        const v = r[c.key];
        if (c.key === "benefit_type")
          return BENEFIT_TYPE_CONFIG[String(v)]?.label ?? String(v);
        if (c.key === "last_used_at") return fmtDate(v as string | null);
        if (v === null || v === undefined) return "";
        return v;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Benefit Utilisation");
    XLSX.writeFile(wb, "benefit-utilisation-report.xlsx");
  }

  return (
    <div className="space-y-4">
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400">
            Benefit Diskon
            <span className="font-bold">{discountBenefits}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
            Benefit Kuota
            <span className="font-bold">{quotaBenefits}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Rata-rata Utilisasi
            <span className="font-bold">{avgUtilisation}%</span>
          </span>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <CardTitle className="text-sm font-semibold">
            Benefit Utilisation Report
          </CardTitle>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Columns className="h-3.5 w-3.5" />
                  Kolom
                  {isNonDefault && (
                    <span className="ml-0.5 rounded-full bg-primary px-1.5 py-0 text-[10px] text-primary-foreground">
                      {visibleCols.size}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center justify-between text-xs">
                  Tampilkan Kolom
                  <button
                    onClick={selectAllOrDefault}
                    className="text-[10px] font-normal text-muted-foreground underline"
                  >
                    {allSelected ? "Default" : "Semua"}
                  </button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {BENEFIT_COLS.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.key}
                    checked={visibleCols.has(c.key)}
                    onCheckedChange={() => toggleCol(c.key)}
                    className="text-xs"
                  >
                    {c.label}
                  </DropdownMenuCheckboxItem>
                ))}
                {isNonDefault && (
                  <>
                    <DropdownMenuSeparator />
                    <button
                      onClick={() => setVisibleCols(BENEFIT_DEFAULT_VISIBLE)}
                      className="flex w-full items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset ke default
                    </button>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleExport}
              disabled={loading || data.length === 0}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 p-0 pb-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center text-xs">#</TableHead>
                  {visibleColDefs.map((c) => (
                    <TableHead key={c.key} className="whitespace-nowrap text-xs">
                      {c.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Memuat data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleColDefs.length + 1}
                      className="py-10"
                    >
                      <div className="flex items-center justify-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : pageRows.length === 0 ? (
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
                  pageRows.map((row, idx) => (
                    <TableRow
                      key={`${row.membership_id}-${row.benefit_name}-${idx}`}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </TableCell>
                      {visibleColDefs.map((c) => (
                        <TableCell
                          key={c.key}
                          className="whitespace-nowrap text-xs"
                        >
                          {renderCell(row, c.key)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="px-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={data.length}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tabs config ──────────────────────────────────────────────────────────────

const MEMBERSHIP_REPORT_TABS = [
  { id: "detail", label: "A — Membership Detail", live: true },
  { id: "expiry", label: "B — Membership Expiry", live: true },
  { id: "revenue", label: "C — Revenue & Renewal", live: true },
  { id: "benefit-utilisation", label: "D — Benefit Utilisation", live: true },
];

const VALID_TABS = [
  "detail",
  "expiry",
  "revenue",
  "benefit-utilisation",
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

function MembershipReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (() => {
    const t = searchParams.get("tab");
    return VALID_TABS.includes(t as (typeof VALID_TABS)[number])
      ? (t as string)
      : "detail";
  })();

  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (!searchParams.get("tab")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "detail");
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, []);

  function changeTab(tabId: string) {
    setActiveTab(tabId);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // ── Raw data ────────────────────────────────────────────────────────────────
  const [detailRaw, setDetailRaw] = useState<MembershipDetailRow[]>([]);
  const [expiryRaw, setExpiryRaw] = useState<MembershipExpiryRow[]>([]);
  const [revenueRaw, setRevenueRaw] = useState<MembershipRevenueRow[]>([]);
  const [benefitRaw, setBenefitRaw] = useState<BenefitUtilisationRow[]>([]);

  const [detailLoading, setDetailLoading] = useState(false);
  const [expiryLoading, setExpiryLoading] = useState(false);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [benefitLoading, setBenefitLoading] = useState(false);

  const [detailError, setDetailError] = useState<string | null>(null);
  const [expiryError, setExpiryError] = useState<string | null>(null);
  const [revenueError, setRevenueError] = useState<string | null>(null);
  const [benefitError, setBenefitError] = useState<string | null>(null);

  // ── Filters ──────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<MembershipFilters>(EMPTY_FILTERS);

  function setFilter<K extends keyof MembershipFilters>(
    key: K,
    val: MembershipFilters[K],
  ) {
    setFilters((prev) => ({ ...prev, [key]: val }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
  }

  const filtered = isFilterActive(filters);

  // ── Fetch on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    setDetailLoading(true);
    setDetailError(null);
    getMembershipDetailReport()
      .then((res) => setDetailRaw(res.data ?? []))
      .catch((e: unknown) =>
        setDetailError(e instanceof Error ? e.message : "Gagal memuat data"),
      )
      .finally(() => setDetailLoading(false));

    setExpiryLoading(true);
    setExpiryError(null);
    getMembershipExpiryReport()
      .then((res) => setExpiryRaw(res.data ?? []))
      .catch((e: unknown) =>
        setExpiryError(e instanceof Error ? e.message : "Gagal memuat data"),
      )
      .finally(() => setExpiryLoading(false));

    setBenefitLoading(true);
    setBenefitError(null);
    getBenefitUtilisationReport()
      .then((res) => setBenefitRaw(res.data ?? []))
      .catch((e: unknown) =>
        setBenefitError(e instanceof Error ? e.message : "Gagal memuat data"),
      )
      .finally(() => setBenefitLoading(false));
  }, []);

  // ── Revenue: re-fetch when the period grouping (month/week) changes ──────────
  useEffect(() => {
    setRevenueLoading(true);
    setRevenueError(null);
    getMembershipRevenueReport(filters.periodGrouping)
      .then((res) => setRevenueRaw(res.data ?? []))
      .catch((e: unknown) =>
        setRevenueError(e instanceof Error ? e.message : "Gagal memuat data"),
      )
      .finally(() => setRevenueLoading(false));
  }, [filters.periodGrouping]);

  // ── Dropdown options ─────────────────────────────────────────────────────────
  const planTierOptions = useMemo(
    () =>
      [...new Set(expiryRaw.map((r) => r.plan_tier).filter(Boolean))].sort(),
    [expiryRaw],
  );

  const planNameOptions = useMemo(
    () =>
      [...new Set(expiryRaw.map((r) => r.plan_name).filter(Boolean))].sort(),
    [expiryRaw],
  );

  const filteredExpiry = useMemo(() => {
    let d = expiryRaw;
    const { search, planTier, planName, status, expiryFrom, expiryTo } =
      filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.owner_name.toLowerCase().includes(s) ||
          r.owner_phone.includes(s) ||
          r.pet_name.toLowerCase().includes(s) ||
          r.member_code.toLowerCase().includes(s),
      );
    }
    if (planTier) d = d.filter((r) => r.plan_tier === planTier);
    if (planName) d = d.filter((r) => r.plan_name === planName);
    if (status) d = d.filter((r) => r.status === status);
    if (expiryFrom)
      d = d.filter(
        (r) => r.expiry_date && r.expiry_date.slice(0, 10) >= expiryFrom,
      );
    if (expiryTo)
      d = d.filter(
        (r) => r.expiry_date && r.expiry_date.slice(0, 10) <= expiryTo,
      );
    return [...d].sort(
      (a, b) => (a.days_until_expiry ?? 0) - (b.days_until_expiry ?? 0),
    );
  }, [expiryRaw, filters]);

  // One row per period — plan-level filters no longer apply here.
  const filteredRevenue = revenueRaw;

  const filteredBenefit = useMemo(() => {
    let d = benefitRaw;
    const { search, planTier, planName } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.owner_name.toLowerCase().includes(s) ||
          r.pet_name.toLowerCase().includes(s) ||
          r.benefit_name.toLowerCase().includes(s) ||
          r.member_code.toLowerCase().includes(s),
      );
    }
    if (planTier) d = d.filter((r) => r.plan_tier === planTier);
    if (planName) d = d.filter((r) => r.plan_name === planName);
    return d;
  }, [benefitRaw, filters]);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Membership Report
          </h1>
          <Badge
            variant="outline"
            className="bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800"
          >
            👑 Membership
          </Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reports #11–14 · Used by: Owner, Finance, Admin, CS · Sheet:
          Membership
        </p>
      </div>

      {/* Filter panel — hidden on Tab A (it has its own inline filters) */}
      {activeTab !== "detail" && <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Filter className="h-4 w-4" />
            Filter Data
          </CardTitle>
          {filtered && (
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
        <CardContent className="space-y-4">
          {/* Row 1 — Search + expiry date */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="space-y-1.5 lg:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                Cari
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Nama owner, no. HP, nama pet, kode member..."
                  value={filters.search}
                  onChange={(e) => setFilter("search", e.target.value)}
                  className="pl-9 pr-8"
                />
                {filters.search && (
                  <button
                    onClick={() => setFilter("search", "")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Expiry From */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Expired Dari
              </label>
              <Input
                type="date"
                value={filters.expiryFrom}
                onChange={(e) => setFilter("expiryFrom", e.target.value)}
              />
            </div>
            {/* Expiry To */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Expired Sampai
              </label>
              <Input
                type="date"
                value={filters.expiryTo}
                onChange={(e) => setFilter("expiryTo", e.target.value)}
              />
            </div>
          </div>

          {/* Row 2 — Dropdowns */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Plan Tier / Plan Name — not applicable on the revenue tab
                (revenue is grouped by period only, all plans merged) */}
            {activeTab !== "revenue" && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Tier Membership
                  </label>
                  <Select
                    value={filters.planTier || "__all__"}
                    onValueChange={(v) =>
                      setFilter("planTier", v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Tier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Semua Tier</SelectItem>
                      {planTierOptions.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Plan Membership
                  </label>
                  <Select
                    value={filters.planName || "__all__"}
                    onValueChange={(v) =>
                      setFilter("planName", v === "__all__" ? "" : v)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Semua Plan</SelectItem>
                      {planNameOptions.map((v) => (
                        <SelectItem key={v} value={v}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Status (detail & expiry tabs only) */}
            {(activeTab === "detail" || activeTab === "expiry") && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Membership
                </label>
                <Select
                  value={filters.status || "__all__"}
                  onValueChange={(v) =>
                    setFilter("status", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Status</SelectItem>
                    {Object.entries(MEMBERSHIP_STATUS_CONFIG).map(
                      ([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          {cfg.label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Period grouping (revenue tab only) */}
            {activeTab === "revenue" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Periode
                </label>
                <Select
                  value={filters.periodGrouping}
                  onValueChange={(v) =>
                    setFilter("periodGrouping", v as "month" | "week")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Bulanan</SelectItem>
                    <SelectItem value="week">Mingguan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>}

      {/* Tabs — hidden for Tab A (rendered inside its own component, below the filter) */}
      {activeTab !== "detail" && (
        <div className="flex flex-wrap gap-2">
          {MEMBERSHIP_REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.live) {
                  changeTab(tab.id);
                  resetFilters();
                }
              }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : tab.live
                    ? "bg-muted text-muted-foreground hover:bg-muted/80"
                    : "cursor-not-allowed bg-muted/50 text-muted-foreground/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "detail" && (
        <MembershipDetailTab
          rawData={detailRaw}
          loading={detailLoading}
          error={detailError}
          tabs={MEMBERSHIP_REPORT_TABS}
          activeTab={activeTab}
          onTabChange={(id) => { changeTab(id); }}
        />
      )}
      {activeTab === "expiry" && (
        <MembershipExpiryTab
          data={filteredExpiry}
          loading={expiryLoading}
          error={expiryError}
          isFiltered={filtered}
          search={filters.search}
        />
      )}
      {activeTab === "revenue" && (
        <MembershipRevenueTab
          data={filteredRevenue}
          loading={revenueLoading}
          error={revenueError}
          isFiltered={filtered}
        />
      )}
      {activeTab === "benefit-utilisation" && (
        <BenefitUtilisationTab
          data={filteredBenefit}
          loading={benefitLoading}
          error={benefitError}
          isFiltered={filtered}
          search={filters.search}
        />
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <MembershipReportPage />
    </Suspense>
  );
}
