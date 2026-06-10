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
  DropdownMenuItem,
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
  ChevronDown,
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

// ─── Multiselect dropdown filter ──────────────────────────────────────────────

const MEMBERSHIP_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "Aktif" },
  { value: "menunggu", label: "Menunggu" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Dibatalkan" },
];

const DETAIL_URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "expired", label: "Sudah Expired" },
  { value: "7days", label: "Expired ≤ 7 hari" },
  { value: "30days", label: "Expired ≤ 30 hari" },
];

const EARLY_RENEWAL_OPTIONS: { value: string; label: string }[] = [
  { value: "yes", label: "Ya (early renewal)" },
  { value: "no", label: "Tidak" },
];

const EXPIRY_URGENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "critical", label: "Kritis (≤7 hari)" },
  { value: "warning", label: "Peringatan (8–14 hari)" },
  { value: "upcoming", label: "Akan Datang (15–30 hari)" },
];

/** Whether a detail row matches a single "Urgensi Expiry" filter value. */
function matchesDetailUrgency(daysUntilExpiry: number | null, value: string): boolean {
  if (daysUntilExpiry === null) return false;
  if (value === "expired") return daysUntilExpiry < 0;
  if (value === "7days") return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
  if (value === "30days") return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
  return true;
}

/** Build {value,label} options from a plain string list. */
function toOptions(values: string[]): { value: string; label: string }[] {
  return values.map((v) => ({ value: v, label: v }));
}

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

// ─── Filter types ─────────────────────────────────────────────────────────────

interface MembershipFilters {
  search: string;
  // Empty array = "Semua" (no filter); multiselect supported.
  planTier: string[];
  planName: string[];
  status: string[];
  expiryFrom: string;
  expiryTo: string;
  /** Expiry tab: filter by expiry_urgency values (critical|warning|upcoming). */
  expiryUrgency: string[];
  /** Revenue tab: membership-log grouping granularity (single mode). */
  periodGrouping: "month" | "week";
}

const EMPTY_FILTERS: MembershipFilters = {
  search: "",
  planTier: [],
  planName: [],
  status: [],
  expiryFrom: "",
  expiryTo: "",
  expiryUrgency: [],
  periodGrouping: "month",
};

function isFilterActive(f: MembershipFilters): boolean {
  return (
    f.search !== "" ||
    f.planTier.length > 0 ||
    f.planName.length > 0 ||
    f.status.length > 0 ||
    f.expiryFrom !== "" ||
    f.expiryTo !== "" ||
    f.expiryUrgency.length > 0
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
  { key: "order_number", label: "Nomor Pesanan", defaultVisible: true },
  { key: "pet_code", label: "Kode Pet", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "pet_type", label: "Jenis Hewan", defaultVisible: true },
  { key: "breed", label: "Ras", defaultVisible: true },
  { key: "customer_code", label: "Kode Customer", defaultVisible: true },
  { key: "customer_name", label: "Nama Customer", defaultVisible: true },
  { key: "customer_phone", label: "No. HP", defaultVisible: true },
  { key: "is_early_renewal", label: "Early Renewal", defaultVisible: false },
  { key: "renewal_count", label: "Jumlah Renewal", defaultVisible: false },
  { key: "membership_code", label: "Kode Membership", defaultVisible: true },
  { key: "membership_name", label: "Plan Membership", defaultVisible: true },
  { key: "membership_price", label: "Harga Plan", defaultVisible: false },
  { key: "actual_price", label: "Harga Aktual", defaultVisible: false },
  { key: "duration_days", label: "Durasi (hari)", defaultVisible: false },
  { key: "start_date", label: "Tgl Mulai", defaultVisible: false },
  { key: "end_date", label: "Tgl Expired", defaultVisible: false },
  { key: "days_until_expiry", label: "Sisa Hari", defaultVisible: true },
  { key: "created_at", label: "Tanggal Beli Membership", defaultVisible: true },
  { key: "cancelled_at", label: "Tanggal Dibatalkan", defaultVisible: true },
  { key: "membership_status", label: "Status", defaultVisible: true },
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

// Leading columns — membership-level, rendered first (before pet columns)
const LEADING_COL_KEYS = new Set<DetailKey>(["order_number"]);

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
  // Empty array = "Semua" (no filter); multiselect supported.
  status: string[];
  planName: string[];
  urgency: string[];
  startFrom: string;
  startTo: string;
  endFrom: string;
  endTo: string;
  createdFrom: string;
  createdTo: string;
  earlyRenewal: string[];
}

const EMPTY_DETAIL_FILTERS: DetailFilters = {
  search: "",
  status: [],
  planName: [],
  urgency: [],
  startFrom: "",
  startTo: "",
  endFrom: "",
  endTo: "",
  createdFrom: "",
  createdTo: "",
  earlyRenewal: [],
};

function isDetailFilterActive(f: DetailFilters): boolean {
  return (
    f.search !== "" ||
    f.status.length > 0 ||
    f.planName.length > 0 ||
    f.urgency.length > 0 ||
    f.startFrom !== "" ||
    f.startTo !== "" ||
    f.endFrom !== "" ||
    f.endTo !== "" ||
    f.createdFrom !== "" ||
    f.createdTo !== "" ||
    f.earlyRenewal.length > 0
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
    const { search, status, planName, urgency, startFrom, startTo, endFrom, endTo, createdFrom, createdTo, earlyRenewal } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.pet_name.toLowerCase().includes(s) ||
          r.customer_name.toLowerCase().includes(s) ||
          r.customer_phone.includes(s) ||
          r.pet_membership_id.toLowerCase().includes(s) ||
          (r.order_number ?? "").toLowerCase().includes(s),
      );
    }
    if (status.length) d = d.filter((r) => status.includes(r.membership_status));
    if (planName.length) d = d.filter((r) => planName.includes(r.membership_name));
    if (startFrom) d = d.filter((r) => r.start_date && r.start_date.slice(0, 10) >= startFrom);
    if (startTo) d = d.filter((r) => r.start_date && r.start_date.slice(0, 10) <= startTo);
    if (endFrom) d = d.filter((r) => r.end_date && r.end_date.slice(0, 10) >= endFrom);
    if (endTo) d = d.filter((r) => r.end_date && r.end_date.slice(0, 10) <= endTo);
    if (createdFrom) d = d.filter((r) => r.created_at && r.created_at.slice(0, 10) >= createdFrom);
    if (createdTo) d = d.filter((r) => r.created_at && r.created_at.slice(0, 10) <= createdTo);
    if (earlyRenewal.length)
      d = d.filter((r) => earlyRenewal.includes(r.is_early_renewal ? "yes" : "no"));

    if (urgency.length)
      d = d.filter((r) =>
        urgency.some((u) => matchesDetailUrgency(r.days_until_expiry, u)),
      );

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
  // Leading cols — membership-level, rendered before pet cols
  const leadingColDefs = visibleColDefs.filter((c) => LEADING_COL_KEYS.has(c.key));
  // Pet-level cols — rowspan per (pet_id, membership_plan_id) group
  const petColDefs = visibleColDefs.filter((c) => PET_COL_KEYS.has(c.key));
  // Membership-level cols — rowspan per membership
  const membershipColDefs = visibleColDefs.filter((c) => !LEADING_COL_KEYS.has(c.key) && !PET_COL_KEYS.has(c.key) && !BENEFIT_COL_KEYS.has(c.key) && !SUMMARY_COL_KEYS.has(c.key));
  // Cols rendered per benefit row (one row per benefit)
  const benefitColDefs = visibleColDefs.filter((c) => BENEFIT_COL_KEYS.has(c.key));
  // Cols rendered with rowSpan after benefit cols (right side summary)
  const summaryColDefs = visibleColDefs.filter((c) => SUMMARY_COL_KEYS.has(c.key));
  // Physical column order actually rendered in the table body — used for the header
  // so header labels stay aligned with body cells regardless of DETAIL_COLS order.
  const orderedColDefs = [
    ...leadingColDefs,
    ...petColDefs,
    ...membershipColDefs,
    ...benefitColDefs,
    ...summaryColDefs,
  ];

  const expandedRows = useMemo(() => {
    if (petColDefs.length === 0 && benefitColDefs.length === 0) return null;

    // 1 group per pet_membership — tidak ada penggabungan antar PM. Rowspan
    // hanya dipakai untuk multi-benefit dalam PM yang sama.
    const groups = pageRows.map((row) => [row]);

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

    if (key === "membership_price" || key === "actual_price") {
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

    if (key === "start_date" || key === "end_date" || key === "created_at" || key === "cancelled_at") return fmtDate(val as string | null);

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
          if (c.key === "membership_price" || c.key === "actual_price" || c.key === "total_benefit_used_amount") return v as number;
          if (c.key === "is_early_renewal") return r.is_early_renewal ? "Ya" : "Tidak";
          // Tanggal di-export sebagai Date object (+ cellDates: true di
          // aoa_to_sheet) supaya Google Sheets baca sebagai tipe date asli
          // — bisa dipakai langsung di DATEVALUE/EOMONTH/dst.
          if (c.key === "start_date" || c.key === "end_date" || c.key === "created_at" || c.key === "cancelled_at")
            return v ? new Date(v as string) : "";
          if (c.key === "benefit_roi") return v !== null && v !== undefined ? `${v}%` : "";
          if (v === null || v === undefined) return "";
          return v;
        }),
      );
    });

    // Merge cells vertically to mirror the on-screen rowspan: each membership row
    // expands into `benefitCount` Excel rows (one per benefit); every non-benefit
    // column is merged across those rows, just like the merged table cells.
    const merges: XLSX.Range[] = [];
    let excelRow = 1; // row 0 is the header
    for (const r of data) {
      const benefitCount = getBenefits(r).length;
      if (benefitCount > 1) {
        DETAIL_COLS.forEach((c, ci) => {
          if (!BENEFIT_COL_KEYS.has(c.key)) {
            merges.push({
              s: { r: excelRow, c: ci },
              e: { r: excelRow + benefitCount - 1, c: ci },
            });
          }
        });
      }
      excelRow += benefitCount;
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows], { cellDates: true });
    // Format tanggal default yyyy-mm-dd untuk seluruh date-cell — kompatibel
    // dengan Google Sheets dan tidak ambigu (tidak dd/mm vs mm/dd).
    const dateCols = new Set(["start_date", "end_date", "created_at", "cancelled_at"]);
    DETAIL_COLS.forEach((c, ci) => {
      if (!dateCols.has(c.key)) return;
      for (let r = 1; r <= rows.length; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: ci });
        const cell = ws[addr];
        if (cell && cell.t === "d") cell.z = "yyyy-mm-dd";
      }
    });
    if (merges.length > 0) ws["!merges"] = merges;
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
              <MultiSelectFilter
                options={MEMBERSHIP_STATUS_OPTIONS}
                selected={filters.status}
                onChange={(next) => setF("status", next)}
                allLabel="Semua Status"
              />
            </div>

            {/* Plan */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan Membership</label>
              <MultiSelectFilter
                options={toOptions(planOptions)}
                selected={filters.planName}
                onChange={(next) => setF("planName", next)}
                allLabel="Semua Plan"
              />
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

          {/* Row 3 — Tanggal beli (purchase date) range + urgency + early renewal */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tgl Beli Dari</label>
              <Input type="date" value={filters.createdFrom} onChange={(e) => setF("createdFrom", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tgl Beli Sampai</label>
              <Input type="date" value={filters.createdTo} onChange={(e) => setF("createdTo", e.target.value)} />
            </div>

            {/* Urgency */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Urgensi Expiry</label>
              <MultiSelectFilter
                options={DETAIL_URGENCY_OPTIONS}
                selected={filters.urgency}
                onChange={(next) => setF("urgency", next)}
                allLabel="Semua"
              />
            </div>

            {/* Early Renewal */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Early Renewal</label>
              <MultiSelectFilter
                options={EARLY_RENEWAL_OPTIONS}
                selected={filters.earlyRenewal}
                onChange={(next) => setF("earlyRenewal", next)}
                allLabel="Semua"
              />
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
                  {orderedColDefs.map((c) => (
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
                    const groupKey = row.pet_membership_id;
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
                        {benefitIdx === 0 && leadingColDefs.map((c) => (
                          <TableCell key={c.key} rowSpan={benefitCount} className="whitespace-nowrap text-xs align-top">
                            {renderCell(row, c.key)}
                          </TableCell>
                        ))}
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
                      {orderedColDefs.map((c) => (
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
  { key: "customer_name", label: "Nama Customer", defaultVisible: true },
  { key: "customer_phone", label: "No. HP (WhatsApp)", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "membership_name", label: "Nama Membership", defaultVisible: true },
  { key: "end_date", label: "Tgl Expired", defaultVisible: true },
  { key: "days_until_expiry", label: "Sisa Hari", defaultVisible: true },
  { key: "expiry_urgency", label: "Urgensi", defaultVisible: true },
  { key: "renewal_count", label: "Jumlah Renewal", defaultVisible: true },
  { key: "last_visit_at", label: "Kunjungan Terakhir", defaultVisible: true },
  { key: "days_since_last_visit", label: "Hari Sejak Kunjungan", defaultVisible: true },
  { key: "double_risk_flag", label: "Double Risk", defaultVisible: true },
  { key: "total_benefit_used", label: "Total Benefit Digunakan", defaultVisible: true },
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

    if (key === "end_date" || key === "last_visit_at")
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
        // Tanggal di-export sebagai Date object (+ cellDates: true di
        // aoa_to_sheet) supaya Google Sheets baca sebagai tipe date asli.
        if (c.key === "end_date" || c.key === "last_visit_at")
          return v ? new Date(v as string) : "";
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
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows], { cellDates: true });
    const dateCols = new Set(["end_date", "last_visit_at"]);
    EXPIRY_COLS.forEach((c, ci) => {
      if (!dateCols.has(c.key)) return;
      for (let r = 1; r <= rows.length; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: ci });
        const cell = ws[addr];
        if (cell && cell.t === "d") cell.z = "yyyy-mm-dd";
      }
    });
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
                {[...new Set(data.map((r) => r.customer_phone).filter(Boolean))].length.toLocaleString("id-ID")}
              </span>{" "}
              owner ·{" "}
              <span className="font-semibold text-foreground">
                {data.length.toLocaleString("id-ID")}
              </span>{" "}
              membership
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
              Menampilkan membership yang akan expired dalam 30 hari ke depan.
              Kolom <span className="font-medium text-foreground">Sisa Hari</span>{" "}
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
                    <TableRow
                      key={`${row.customer_phone}-${row.pet_name}-${row.membership_name}-${row.end_date ?? idx}`}
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

// ─── Tab C — Membership Revenue & Renewal ─────────────────────────────────────

type RevenueKey = keyof MembershipRevenueRow;

const REVENUE_COLS: {
  key: RevenueKey;
  label: string;
  defaultVisible: boolean;
}[] = [
  { key: "period", label: "Periode", defaultVisible: true },
  { key: "new_memberships", label: "Member Baru", defaultVisible: true },
  { key: "renewed_memberships", label: "Perpanjang", defaultVisible: true },
  { key: "early_renewals", label: "Early Renewal", defaultVisible: true },
  { key: "late_renewals", label: "Late Renewal", defaultVisible: true },
  { key: "lapsed_memberships", label: "Lapsed", defaultVisible: true },
  { key: "renewal_rate_pct", label: "Renewal Rate", defaultVisible: true },
  { key: "membership_revenue", label: "Revenue", defaultVisible: true },
  { key: "avg_membership_value", label: "Avg Value", defaultVisible: true },
  { key: "by_plan_breakdown", label: "Breakdown per Plan", defaultVisible: false },
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
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);

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
    () => data.reduce((s, r) => s + r.membership_revenue, 0),
    [data],
  );
  const totalNewMembers = useMemo(
    () => data.reduce((s, r) => s + r.new_memberships, 0),
    [data],
  );
  const totalRenewed = useMemo(
    () => data.reduce((s, r) => s + r.renewed_memberships, 0),
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
          .map((b) => `${b.plan_name}: ${b.count} (${fmtRupiah(b.revenue)})`)
          .join(", ") || "—"
      );

    if (key === "membership_revenue" || key === "avg_membership_value") {
      return (
        <span className={key === "membership_revenue" ? "font-semibold" : ""}>
          {fmtRupiah((val ?? 0) as number)}
        </span>
      );
    }

    if (key === "renewal_rate_pct") {
      const pct = (val ?? 0) as number;
      const denom = row.renewed_memberships + row.lapsed_memberships;
      if (denom === 0)
        return <span className="text-muted-foreground/40">—</span>;
      return (
        <span
          className={
            row.renewal_rate_flag
              ? "font-semibold text-rose-600 dark:text-rose-400"
              : "font-medium"
          }
        >
          {pct.toFixed(2)}%
        </span>
      );
    }

    if (val === null || val === undefined || val === "")
      return <span className="text-muted-foreground/40">—</span>;

    return String(val);
  }

  function handleExport() {
    const headers = REVENUE_COLS.map((c) => c.label);
    // Mirror tampilan tabel: 1 periode → N row (N = jumlah item di
    // by_plan_breakdown). Kolom selain "Breakdown per Plan" di-merge
    // vertikal sepanjang N row, sehingga di Sheet hasilnya juga terlihat
    // seperti 1 periode dengan beberapa baris breakdown.
    const rows = data.flatMap((r) => {
      const breakdown =
        r.by_plan_breakdown && r.by_plan_breakdown.length > 0
          ? r.by_plan_breakdown
          : [null as null];
      return breakdown.map((bp, sub) =>
        REVENUE_COLS.map((c) => {
          if (c.key === "by_plan_breakdown") {
            if (!bp) return "";
            return `${bp.plan_name}: ${bp.count} (${bp.revenue})`;
          }
          // Kolom non-breakdown hanya diisi di sub-row pertama; sisanya
          // dikosongkan supaya rapi di Sheet (sel kosong di bawah merged
          // area sudah cukup; Excel/Sheets render merged area dari sel
          // kiri-atas).
          if (sub > 0) return "";
          if (c.key === "period") return r.period_label;
          if (c.key === "renewal_rate_pct") {
            const denom = r.renewed_memberships + r.lapsed_memberships;
            return denom === 0 ? "" : r.renewal_rate_pct;
          }
          const v = r[c.key];
          if (v === null || v === undefined) return "";
          if (typeof v === "boolean") return v ? "Yes" : "No";
          return v;
        }),
      );
    });

    // Build vertical merges: tiap periode dengan >1 breakdown men-merge
    // semua kolom non-breakdown dari sub-row 0 sampai N-1.
    const merges: XLSX.Range[] = [];
    const breakdownColIdx = REVENUE_COLS.findIndex(
      (c) => c.key === "by_plan_breakdown",
    );
    let excelRow = 1; // baris 0 = header
    for (const r of data) {
      const count =
        r.by_plan_breakdown && r.by_plan_breakdown.length > 0
          ? r.by_plan_breakdown.length
          : 1;
      if (count > 1) {
        REVENUE_COLS.forEach((_c, ci) => {
          if (ci === breakdownColIdx) return;
          merges.push({
            s: { r: excelRow, c: ci },
            e: { r: excelRow + count - 1, c: ci },
          });
        });
      }
      excelRow += count;
    }

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    if (merges.length > 0) ws["!merges"] = merges;
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
                {data.length.toLocaleString("id-ID")}
              </span>{" "}
              periode
            </span>
          )}
        </span>
      </div>

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
            {isNonDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCols(REVENUE_DEFAULT_VISIBLE)}
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
                      <TableRow
                        key={`${row.period}-${sub}`}
                        onMouseEnter={() => setHoveredPeriod(row.period)}
                        onMouseLeave={() =>
                          setHoveredPeriod((p) =>
                            p === row.period ? null : p,
                          )
                        }
                        className={
                          hoveredPeriod === row.period ? "bg-muted/50" : ""
                        }
                      >
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
                                    : {bp.count} ·{" "}
                                    <span className="text-muted-foreground">
                                      {fmtRupiah(bp.revenue)}
                                    </span>
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
  { key: "benefit_usage_id", label: "Benefit Usage ID", defaultVisible: false },
  { key: "used_at", label: "Waktu Pakai", defaultVisible: true },
  { key: "booking_id", label: "Booking", defaultVisible: true },
  { key: "pet_membership_id", label: "No. Order Membership", defaultVisible: true },
  { key: "pet_name", label: "Nama Pet", defaultVisible: true },
  { key: "membership_name", label: "Plan Membership", defaultVisible: true },
  { key: "benefit_type", label: "Tipe Benefit", defaultVisible: true },
  { key: "target_service", label: "Service Target", defaultVisible: true },
  { key: "amount_used", label: "Amount Terpakai", defaultVisible: true },
  { key: "benefit_index", label: "Index Benefit", defaultVisible: false },
  { key: "cumulative_used", label: "Cumulative Used", defaultVisible: true },
  { key: "membership_price", label: "Harga Membership", defaultVisible: true },
  { key: "actual_price", label: "Harga Aktual", defaultVisible: true },
  { key: "benefit_vs_price_pct", label: "% vs Harga", defaultVisible: true },
];

const BENEFIT_DEFAULT_VISIBLE = new Set(
  BENEFIT_COLS.filter((c) => c.defaultVisible).map((c) => c.key),
);

// BenefitUsage.scope — describes the level the benefit was applied at.
const BENEFIT_TYPE_CONFIG: Record<string, { label: string; className: string }> =
  {
    service: {
      label: "Service",
      className:
        "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
    },
    addon: {
      label: "Addon",
      className:
        "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800",
    },
    pickup: {
      label: "Pickup",
      className:
        "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
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

  // Summary chips: count events per scope + total Rp consumed across all
  // events in the current data set.
  const serviceEvents = useMemo(
    () => data.filter((r) => r.benefit_type === "service").length,
    [data],
  );
  const addonEvents = useMemo(
    () => data.filter((r) => r.benefit_type === "addon").length,
    [data],
  );
  const totalAmountUsed = useMemo(
    () => data.reduce((s, r) => s + (r.amount_used ?? 0), 0),
    [data],
  );

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
      const cfg = BENEFIT_TYPE_CONFIG[String(val)];
      if (!cfg)
        return (
          <span className="text-muted-foreground/40">
            {val ? String(val) : "—"}
          </span>
        );
      return (
        <Badge variant="outline" className={cfg.className}>
          {cfg.label}
        </Badge>
      );
    }

    if (key === "benefit_vs_price_pct") {
      if (val === null || val === undefined)
        return <span className="text-muted-foreground/40">—</span>;
      const pct = val as number;
      // >100% means the pet has consumed more benefit value than the
      // membership price paid — flag it red.
      const colorClass =
        pct > 100
          ? "font-semibold text-red-600 dark:text-red-400"
          : pct >= 50
            ? "text-blue-600 dark:text-blue-400"
            : "text-muted-foreground";
      return <span className={colorClass}>{pct}%</span>;
    }

    if (key === "amount_used" || key === "cumulative_used" || key === "membership_price" || key === "actual_price") {
      const n = (val as number) ?? 0;
      return <span>{fmtRupiah(n)}</span>;
    }

    if (key === "used_at") return fmtDate(val as string | null);

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
        // used_at di-export sebagai Date object (+ cellDates: true) supaya
        // Google Sheets baca sebagai tipe date asli, bukan string label.
        if (c.key === "used_at") return v ? new Date(v as string) : "";
        if (v === null || v === undefined) return "";
        return v;
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows], { cellDates: true });
    const dateCols = new Set(["used_at"]);
    BENEFIT_COLS.forEach((c, ci) => {
      if (!dateCols.has(c.key)) return;
      for (let r = 1; r <= rows.length; r++) {
        const addr = XLSX.utils.encode_cell({ r, c: ci });
        const cell = ws[addr];
        if (cell && cell.t === "d") cell.z = "yyyy-mm-dd hh:mm";
      }
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Benefit Utilisation");
    XLSX.writeFile(wb, "benefit-utilisation-report.xlsx");
  }

  return (
    <div className="space-y-4">
      {!loading && (
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-400">
            Service
            <span className="font-bold">{serviceEvents}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400">
            Addon
            <span className="font-bold">{addonEvents}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Total Terpakai
            <span className="font-bold">{fmtRupiah(totalAmountUsed)}</span>
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
                {data.length.toLocaleString("id-ID")}
              </span>{" "}
              event ·{" "}
              <span className="font-semibold text-foreground">
                {[...new Set(data.map((r) => r.pet_membership_id))].length.toLocaleString("id-ID")}
              </span>{" "}
              membership
            </span>
          )}
        </span>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between pb-3 pt-4">
          <div className="space-y-1">
            <CardTitle className="text-sm font-semibold">
              Benefit Utilisation Report
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Setiap baris adalah satu event pemakaian benefit membership. Data
              dihitung dari booking dengan{" "}
              <span className="font-medium text-foreground">semua status</span>{" "}
              <span className="font-medium text-foreground">
                kecuali booking yang dibatalkan
              </span>{" "}
              (Cancelled) — benefit dari booking cancel tidak ikut dihitung,
              termasuk pada kolom Cumulative Used &amp; % vs Harga.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isNonDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setVisibleCols(BENEFIT_DEFAULT_VISIBLE)}
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
                    <TableRow key={row.benefit_usage_id ?? idx}>
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
  // benefitRaw no longer carries plan_tier; fall back to detailRaw which still
  // exposes the tier badge per membership.
  const planTierOptions = useMemo(
    () =>
      [
        ...new Set(
          detailRaw
            .map((r) => (r as { plan_tier?: string }).plan_tier)
            .filter((v): v is string => Boolean(v)),
        ),
      ].sort(),
    [detailRaw],
  );

  const planNameOptions = useMemo(
    () =>
      [
        ...new Set(benefitRaw.map((r) => r.membership_name).filter(Boolean)),
      ].sort(),
    [benefitRaw],
  );

  // Expiry tab has its own plan-name source because the expiry payload carries
  // `membership_name` rather than `plan_name` (the benefit-utilisation field).
  const expiryPlanNameOptions = useMemo(
    () =>
      [
        ...new Set(expiryRaw.map((r) => r.membership_name).filter(Boolean)),
      ].sort(),
    [expiryRaw],
  );

  const filteredExpiry = useMemo(() => {
    let d = expiryRaw;
    const { search, expiryFrom, expiryTo, planName, expiryUrgency } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          r.customer_name.toLowerCase().includes(s) ||
          r.customer_phone.includes(s) ||
          r.pet_name.toLowerCase().includes(s),
      );
    }
    if (planName.length) d = d.filter((r) => planName.includes(r.membership_name));
    if (expiryUrgency.length)
      d = d.filter((r) => expiryUrgency.includes(r.expiry_urgency));
    if (expiryFrom)
      d = d.filter(
        (r) => r.end_date && r.end_date.slice(0, 10) >= expiryFrom,
      );
    if (expiryTo)
      d = d.filter(
        (r) => r.end_date && r.end_date.slice(0, 10) <= expiryTo,
      );
    return [...d].sort((a, b) => a.days_until_expiry - b.days_until_expiry);
  }, [expiryRaw, filters]);

  // One row per period — plan-level filters no longer apply here.
  const filteredRevenue = revenueRaw;

  const filteredBenefit = useMemo(() => {
    let d = benefitRaw;
    const { search, planName } = filters;

    if (search) {
      const s = search.toLowerCase();
      d = d.filter(
        (r) =>
          (r.pet_name ?? "").toLowerCase().includes(s) ||
          (r.membership_name ?? "").toLowerCase().includes(s) ||
          (r.target_service ?? "").toLowerCase().includes(s) ||
          (r.booking_id ?? "").toLowerCase().includes(s) ||
          (r.pet_membership_id ?? "").toLowerCase().includes(s),
      );
    }
    if (planName.length) d = d.filter((r) => planName.includes(r.membership_name));
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
          {/* Row 1 — Search + expiry date (hidden on revenue: only Periode applies) */}
          {activeTab !== "revenue" && (
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
          )}

          {/* Row 2 — Dropdowns */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Plan Tier — only relevant on the detail tab. Revenue is grouped
                by period; expiry payload doesn't carry tier; benefit
                utilisation report uses one row per BenefitUsage event and
                doesn't expose tier. */}
            {activeTab === "detail" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Tier Membership
                </label>
                <MultiSelectFilter
                  options={toOptions(planTierOptions)}
                  selected={filters.planTier}
                  onChange={(next) => setFilter("planTier", next)}
                  allLabel="Semua Tier"
                />
              </div>
            )}

            {/* Plan Membership — hidden on revenue. Expiry sources options from
                its own payload (membership_name); benefit-utilisation uses
                plan_name from benefitRaw. */}
            {activeTab !== "revenue" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Plan Membership
                </label>
                <MultiSelectFilter
                  options={toOptions(
                    activeTab === "expiry"
                      ? expiryPlanNameOptions
                      : planNameOptions,
                  )}
                  selected={filters.planName}
                  onChange={(next) => setFilter("planName", next)}
                  allLabel="Semua Plan"
                />
              </div>
            )}

            {/* Urgensi Expiry — expiry tab only */}
            {activeTab === "expiry" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Urgensi Expiry
                </label>
                <MultiSelectFilter
                  options={EXPIRY_URGENCY_OPTIONS}
                  selected={filters.expiryUrgency}
                  onChange={(next) => setFilter("expiryUrgency", next)}
                  allLabel="Semua Urgensi"
                />
              </div>
            )}

            {/* Status (detail tab only — expiry payload no longer carries status) */}
            {activeTab === "detail" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Status Membership
                </label>
                <MultiSelectFilter
                  options={Object.entries(MEMBERSHIP_STATUS_CONFIG).map(
                    ([key, cfg]) => ({ value: key, label: cfg.label }),
                  )}
                  selected={filters.status}
                  onChange={(next) => setFilter("status", next)}
                  allLabel="Semua Status"
                />
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
