"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarClock,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  PawPrint,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  getPetMemberships,
  type MembershipStatus,
  type PetMembership,
  type PetMembershipsStatusCounts,
} from "@/lib/api/memberships";

type FilterTab = "all" | MembershipStatus;
type DatePreset = "" | "7d" | "30d" | "month" | "custom";

const STATUS_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "active", label: "Aktif" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<MembershipStatus, string> = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  expired: "bg-slate-200 text-slate-700 border-slate-300",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<MembershipStatus, string> = {
  active: "Aktif",
  pending: "Pending",
  expired: "Expired",
  cancelled: "Cancelled",
};

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "7d", label: "7 hari" },
  { value: "month", label: "Bulan ini" },
  { value: "30d", label: "30 hari" },
  { value: "custom", label: "Custom" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const EMPTY_COUNTS: PetMembershipsStatusCounts = {
  active: 0,
  pending: 0,
  expired: 0,
  cancelled: 0,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatPrice(n: number | undefined) {
  if (!n && n !== 0) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(from: Date, to: Date) {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q || !text) return <span>{text}</span>;
  const lowerQ = q.toLowerCase();
  const parts = text.split(new RegExp(`(${escapeRegex(q)})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === lowerQ ? (
          <mark
            key={i}
            className="rounded-sm bg-yellow-200 text-inherit dark:bg-yellow-500/30"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

function presetRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
): { from: Date | null; to: Date | null } {
  const today = startOfDay(new Date());
  if (preset === "7d") {
    const to = new Date(today);
    to.setDate(to.getDate() + 7);
    return { from: today, to: endOfDay(to) };
  }
  if (preset === "30d") {
    const to = new Date(today);
    to.setDate(to.getDate() + 30);
    return { from: today, to: endOfDay(to) };
  }
  if (preset === "month") {
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { from: today, to: endOfDay(to) };
  }
  if (preset === "custom") {
    return {
      from: customFrom ? startOfDay(new Date(customFrom + "T00:00:00")) : null,
      to: customTo ? endOfDay(new Date(customTo + "T00:00:00")) : null,
    };
  }
  return { from: null, to: null };
}

export default function AllPetMembershipsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = (searchParams.get("status") as FilterTab) || "all";
  const initialPreset: DatePreset =
    searchParams.get("expiring") === "this-month" ? "month" : "";

  const [items, setItems] = useState<PetMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [statusCounts, setStatusCounts] =
    useState<PetMembershipsStatusCounts>(EMPTY_COUNTS);

  const [tab, setTab] = useState<FilterTab>(
    STATUS_TABS.some((t) => t.value === initialTab) ? initialTab : "all",
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>(initialPreset);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [calFromOpen, setCalFromOpen] = useState(false);
  const [calToOpen, setCalToOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search input → debouncedSearch (used for the API call).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page ke 1 setiap kali filter berubah.
  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch, datePreset, dateFrom, dateTo, pageSize]);

  // Track latest request to ignore stale responses.
  const fetchSeq = useRef(0);

  useEffect(() => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);

    const { from, to } = presetRange(datePreset, dateFrom, dateTo);

    getPetMemberships({
      page,
      limit: pageSize,
      status: tab === "all" ? undefined : tab,
      q: debouncedSearch || undefined,
      date_from: from ? toYMD(from) : undefined,
      date_to: to ? toYMD(to) : undefined,
    })
      .then((res) => {
        if (seq !== fetchSeq.current) return;
        setItems(res.data);
        setTotal(res.pagination?.total ?? res.data.length);
        setStatusCounts(res.statusCounts ?? EMPTY_COUNTS);
      })
      .catch((err: unknown) => {
        if (seq !== fetchSeq.current) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data");
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (seq !== fetchSeq.current) return;
        setLoading(false);
      });
  }, [page, pageSize, tab, debouncedSearch, datePreset, dateFrom, dateTo]);

  const counts: Record<FilterTab, number> = useMemo(
    () => ({
      all:
        statusCounts.active +
        statusCounts.pending +
        statusCounts.expired +
        statusCounts.cancelled,
      active: statusCounts.active,
      pending: statusCounts.pending,
      expired: statusCounts.expired,
      cancelled: statusCounts.cancelled,
    }),
    [statusCounts],
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);

  const today = startOfDay(new Date());
  const hasAnyFilter =
    tab !== "all" || search.length > 0 || datePreset !== "";

  function rowHref(m: PetMembership) {
    const ownerId = m.pet?.owner?._id;
    const petId = m.pet?._id;
    if (!ownerId || !petId) return null;
    return `/admin/users/${ownerId}/pets/${petId}/memberships`;
  }

  function handleDatePreset(p: DatePreset) {
    setDatePreset((prev) => (prev === p ? "" : p));
    if (p !== "custom") {
      setDateFrom("");
      setDateTo("");
    }
  }

  function resetAllFilters() {
    setTab("all");
    setSearch("");
    setDatePreset("");
    setDateFrom("");
    setDateTo("");
  }

  const dateRangeLabel = (() => {
    const { from, to } = presetRange(datePreset, dateFrom, dateTo);
    if (!from && !to) return null;
    if (from && to)
      return `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`;
    if (from) return `Setelah ${format(from, "dd MMM yyyy")}`;
    if (to) return `Sebelum ${format(to, "dd MMM yyyy")}`;
    return null;
  })();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-purple-600" />
          Membership Pet
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Daftar membership semua pet — aktif, pending, expired, atau
          cancelled. Klik baris untuk mengelola membership per pet.
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Filter & Pencarian</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:flex-none sm:basis-[280px]">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari pet, owner, atau tier..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-9 text-sm"
              />
              {search ? (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Reset pencarian"
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <span className="hidden h-6 w-px bg-border sm:inline-block" />

            <div className="flex flex-wrap items-center gap-1.5">
              <CalendarClock
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-label="Filter tanggal berakhir"
              />
              {DATE_PRESETS.map((p) => (
                <Button
                  key={p.value}
                  size="sm"
                  variant={datePreset === p.value ? "default" : "outline"}
                  className="h-8 text-xs"
                  onClick={() => handleDatePreset(p.value)}
                  type="button"
                >
                  {p.label}
                </Button>
              ))}
              {datePreset && datePreset !== "custom" ? (
                <Badge variant="secondary" className="text-[10px]">
                  {dateRangeLabel}
                </Badge>
              ) : null}
            </div>

            {hasAnyFilter ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-8 gap-1.5"
                onClick={resetAllFilters}
              >
                <Filter className="h-3.5 w-3.5" />
                Reset filter
              </Button>
            ) : null}
          </div>

          {datePreset === "custom" ? (
              <div className="flex flex-wrap items-center gap-2">
                <Popover open={calFromOpen} onOpenChange={setCalFromOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 w-[180px] justify-start text-xs gap-1.5",
                        !dateFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="h-3 w-3" />
                      {dateFrom
                        ? format(new Date(dateFrom), "dd MMM yyyy")
                        : "Dari tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom ? new Date(dateFrom) : undefined}
                      onSelect={(d) => {
                        if (d) setDateFrom(toYMD(d));
                        setCalFromOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-xs text-muted-foreground">s/d</span>

                <Popover open={calToOpen} onOpenChange={setCalToOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 w-[180px] justify-start text-xs gap-1.5",
                        !dateTo && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="h-3 w-3" />
                      {dateTo
                        ? format(new Date(dateTo), "dd MMM yyyy")
                        : "Sampai tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo ? new Date(dateTo) : undefined}
                      onSelect={(d) => {
                        if (d) setDateTo(toYMD(d));
                        setCalToOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

              {(dateFrom || dateTo) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                  }}
                  aria-label="Reset tanggal"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
            <TabsList className="flex-wrap justify-start">
              {STATUS_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                  {t.label}
                  <Badge variant="secondary" className="ml-1 px-1.5 text-[10px]">
                    {counts[t.value]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="pt-6">
          {error ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div className="rounded-md border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Pet</TableHead>
                  <TableHead className="text-xs">Owner</TableHead>
                  <TableHead className="text-xs">Tier</TableHead>
                  <TableHead className="text-xs">Periode</TableHead>
                  <TableHead className="text-xs text-right">
                    Sisa hari
                  </TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Harga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-sm text-muted-foreground py-10"
                    >
                      {total === 0
                        ? "Tidak ada membership yang cocok dengan filter ini."
                        : "Halaman ini kosong — coba pindah ke halaman sebelumnya."}
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((m) => {
                    const end = new Date(m.end_date);
                    const days = daysBetween(today, end);
                    const href = rowHref(m);
                    return (
                      <TableRow
                        key={m._id}
                        className={cn(
                          href && "cursor-pointer hover:bg-muted/60",
                        )}
                        onClick={() => {
                          if (href) router.push(href);
                        }}
                      >
                        <TableCell className="text-xs font-medium">
                          <div className="flex items-center gap-1.5">
                            <PawPrint className="h-3.5 w-3.5 text-muted-foreground" />
                            {m.pet?.name ? (
                              <Highlight text={m.pet.name} query={debouncedSearch} />
                            ) : (
                              "-"
                            )}
                            {m.pet?.pet_type?.name ? (
                              <span className="text-muted-foreground font-normal">
                                · {m.pet.pet_type.name}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">
                          {m.pet?.owner ? (
                            <Link
                              href={`/admin/users/${m.pet.owner._id}/pets`}
                              className="flex items-center gap-1.5 hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                              <Highlight
                                text={m.pet.owner.username}
                                query={debouncedSearch}
                              />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                            {m.membership?.name ? (
                              <Highlight
                                text={m.membership.name}
                                query={debouncedSearch}
                              />
                            ) : (
                              "-"
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {formatDate(m.start_date)} →{" "}
                          {formatDate(m.end_date)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-xs text-right whitespace-nowrap",
                            m.status === "active" &&
                              days <= 7 &&
                              "text-red-600 font-medium",
                            m.status === "active" &&
                              days > 7 &&
                              days <= 30 &&
                              "text-amber-600 font-medium",
                          )}
                        >
                          {m.status === "active"
                            ? days > 0
                              ? `${days} hari`
                              : "Berakhir hari ini"
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-medium",
                              STATUS_BADGE[m.status as MembershipStatus] ?? "",
                            )}
                          >
                            {STATUS_LABEL[m.status as MembershipStatus] ??
                              m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-right whitespace-nowrap">
                          {formatPrice(m.purchase_price)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {!loading ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  {total === 0 ? 0 : (safePage - 1) * pageSize + 1}–
                  {Math.min(safePage * pageSize, total)} dari {total} hasil
                </span>
                <span className="text-border">·</span>
                <span>Per halaman</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => setPageSize(Number(v))}
                >
                  <SelectTrigger className="h-7 w-[64px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  Hal. {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
