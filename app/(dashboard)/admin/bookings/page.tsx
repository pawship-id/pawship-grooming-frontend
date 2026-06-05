"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Truck,
  MapPin,
  RotateCcw,
  X,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Combobox } from "@/components/ui/combobox";
import {
  getAdminBookings,
  getAllAdminBookingsForExport,
} from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";
import { exportBookingsToExcel } from "@/lib/export-booking";
import { getStores } from "@/lib/api/stores";
import type { ApiStore } from "@/lib/api/stores";
import { getAdminServices } from "@/lib/api/services";
import type { AdminService } from "@/lib/api/services";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  waitlist: "bg-yellow-100 text-yellow-800",
  "driver on the way": "bg-blue-100 text-blue-800",
  "groomer on the way": "bg-blue-100 text-blue-800",
  arrived: "bg-primary/10 text-primary",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
  returned: "bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300",
  rescheduled: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-700/60 rounded-sm px-0.5 not-italic font-[inherit]"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

type DatePreset = "today" | "week" | "month" | "custom" | "";

function getPresetRange(
  preset: DatePreset,
): { from: string; to: string } | null {
  const now = new Date();
  if (preset === "today") {
    const d = toYMD(now);
    return { from: d, to: d };
  }
  if (preset === "week") {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return { from: toYMD(mon), to: toYMD(sun) };
  }
  if (preset === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toYMD(first), to: toYMD(last) };
  }
  return null;
}

const LIMIT = 20;

const FILTERS_STORAGE_KEY = "admin:bookings:filters";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "requested", label: "Requested" },
  { value: "waitlist", label: "Waitlist" },
  { value: "confirmed", label: "Confirmed" },
  { value: "driver on the way", label: "Driver on the Way" },
  { value: "groomer on the way", label: "Groomer on the Way" },
  { value: "arrived", label: "Arrived" },
  { value: "in progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "returned", label: "Returned" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "cancelled", label: "Cancelled" },
];

type PersistedFilters = {
  search: string;
  statusFilter: string[];
  createdByFilter: string;
  storeFilter: string;
  serviceFilter: string;
  datePreset: DatePreset;
  dateFrom: string;
  dateTo: string;
  currentPage: number;
};

const defaultFilters: PersistedFilters = {
  search: "",
  statusFilter: [],
  createdByFilter: "all",
  storeFilter: "all",
  serviceFilter: "all",
  datePreset: "",
  dateFrom: "",
  dateTo: "",
  currentPage: 1,
};

function loadPersistedFilters(): PersistedFilters {
  if (typeof window === "undefined") return defaultFilters;
  try {
    const raw = window.sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return defaultFilters;
    const parsed = JSON.parse(raw) as Partial<PersistedFilters>;
    // Backwards-compat: older sessions stored statusFilter as string ("all" or single value)
    const rawStatus = (parsed as { statusFilter?: unknown }).statusFilter;
    const statusFilter: string[] = Array.isArray(rawStatus)
      ? (rawStatus as string[])
      : typeof rawStatus === "string" && rawStatus && rawStatus !== "all"
        ? [rawStatus]
        : [];
    return { ...defaultFilters, ...parsed, statusFilter };
  } catch {
    return defaultFilters;
  }
}

export default function BookingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState(() => loadPersistedFilters().search);
  const [debouncedSearch, setDebouncedSearch] = useState(
    () => loadPersistedFilters().search,
  );
  const [statusFilter, setStatusFilter] = useState<string[]>(
    () => loadPersistedFilters().statusFilter,
  );
  const [statusOpen, setStatusOpen] = useState(false);
  const [createdByFilter, setCreatedByFilter] = useState<string>(
    () => loadPersistedFilters().createdByFilter,
  );
  const [storeFilter, setStoreFilter] = useState<string>(
    () => loadPersistedFilters().storeFilter,
  );
  const [serviceFilter, setServiceFilter] = useState<string>(
    () => loadPersistedFilters().serviceFilter,
  );
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>(
    () => loadPersistedFilters().datePreset,
  );
  const [dateFrom, setDateFrom] = useState(() => loadPersistedFilters().dateFrom);
  const [dateTo, setDateTo] = useState(() => loadPersistedFilters().dateTo);
  const [currentPage, setCurrentPage] = useState(
    () => loadPersistedFilters().currentPage,
  );
  const [totalCount, setTotalCount] = useState(0);

  // Export preview modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPreviewData, setExportPreviewData] = useState<AdminBooking[]>(
    [],
  );
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Modal filter state
  const [modalSearch, setModalSearch] = useState("");
  const [modalStatusFilter, setModalStatusFilter] = useState<string[]>([]);
  const [modalStatusOpen, setModalStatusOpen] = useState(false);
  const [modalCreatedByFilter, setModalCreatedByFilter] =
    useState<string>("all");
  const [modalDateFrom, setModalDateFrom] = useState("");
  const [modalDateTo, setModalDateTo] = useState("");

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // Debounce search input — only fire API after user stops typing for 400ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBookings = useCallback(
    (page: number) => {
      setLoading(true);
      const presetRange = getPresetRange(datePreset);
      const from =
        datePreset === "custom" ? dateFrom : (presetRange?.from ?? "");
      const to = datePreset === "custom" ? dateTo : (presetRange?.to ?? "");

      getAdminBookings({
        page,
        limit: LIMIT,
        status:
          statusFilter.length > 0 ? statusFilter.join(",") : undefined,
        date_from: from || undefined,
        date_to: to || undefined,
        created_by_role:
          createdByFilter === "all" ? undefined : createdByFilter,
        store_id: storeFilter === "all" ? undefined : storeFilter,
        service_id: serviceFilter === "all" ? undefined : serviceFilter,
        search: debouncedSearch || undefined,
      })
        .then((res) => {
          setBookings(res.bookings);
          setTotalCount(res.total ?? 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [statusFilter, createdByFilter, storeFilter, serviceFilter, datePreset, dateFrom, dateTo, debouncedSearch],
  );

  // Fetch stores for filter
  useEffect(() => {
    getStores({ page: 1, limit: 100 })
      .then((res) => setStores(res.stores ?? []))
      .catch(() => {});
  }, []);

  // Fetch services for filter
  useEffect(() => {
    getAdminServices({ limit: 200 })
      .then((res) => setServices(res.services ?? []))
      .catch(() => {});
  }, []);

  // Reset to page 1 when filters or search change.
  // Skip the first render so a restored page (from sessionStorage) survives mount.
  const isFirstFilterRender = useRef(true);
  useEffect(() => {
    if (isFirstFilterRender.current) {
      isFirstFilterRender.current = false;
      return;
    }
    setCurrentPage(1);
  }, [statusFilter, createdByFilter, storeFilter, serviceFilter, datePreset, dateFrom, dateTo, debouncedSearch]);

  // Persist filters to sessionStorage so they survive navigation away & back.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload: PersistedFilters = {
      search,
      statusFilter,
      createdByFilter,
      storeFilter,
      serviceFilter,
      datePreset,
      dateFrom,
      dateTo,
      currentPage,
    };
    try {
      window.sessionStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify(payload),
      );
    } catch {
      // ignore quota / serialization errors
    }
  }, [
    search,
    statusFilter,
    createdByFilter,
    storeFilter,
    serviceFilter,
    datePreset,
    dateFrom,
    dateTo,
    currentPage,
  ]);

  useEffect(() => {
    fetchBookings(currentPage);
  }, [fetchBookings, currentPage]);

  function handlePreset(preset: DatePreset) {
    setDatePreset((prev) => (prev === preset ? "" : preset));
  }

  async function handleExport() {
    try {
      setLoadingPreview(true);
      setShowExportModal(true);

      // Fetch all bookings without any filters
      const bookingsToExport = await getAllAdminBookingsForExport({});

      if (!bookingsToExport || bookingsToExport.length === 0) {
        setShowExportModal(false);
        toast({
          title: "Tidak ada data",
          description: "Tidak ada booking untuk diexport.",
          variant: "destructive",
        });
        return;
      }

      setExportPreviewData(bookingsToExport);
    } catch (error) {
      setShowExportModal(false);
      toast({
        title: "Gagal memuat preview",
        description:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat data.",
        variant: "destructive",
      });
    } finally {
      setLoadingPreview(false);
    }
  }

  function confirmExport() {
    try {
      setExporting(true);
      const filteredData = getFilteredModalData();
      exportBookingsToExcel(filteredData);

      toast({
        title: "Export berhasil",
        description: `${filteredData.length} booking berhasil diexport ke Excel.`,
      });

      resetModalFilters();
      setShowExportModal(false);
    } catch (error) {
      toast({
        title: "Export gagal",
        description:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat export data.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  function getFilteredModalData() {
    return exportPreviewData.filter((booking) => {
      // Search filter
      if (modalSearch) {
        const q = modalSearch.toLowerCase();
        const matchesSearch =
          (booking.customer?.username ?? "").toLowerCase().includes(q) ||
          booking.pet_snapshot.name.toLowerCase().includes(q) ||
          booking.service_snapshot.name.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (
        modalStatusFilter.length > 0 &&
        !modalStatusFilter.includes(booking.booking_status)
      ) {
        return false;
      }

      // Created by filter
      if (
        modalCreatedByFilter !== "all" &&
        booking.created_by_role !== modalCreatedByFilter
      ) {
        return false;
      }

      // Date range filter
      const bookingDate = new Date(booking.date);
      if (modalDateFrom) {
        const fromDate = new Date(modalDateFrom);
        if (bookingDate < fromDate) return false;
      }
      if (modalDateTo) {
        const toDate = new Date(modalDateTo);
        if (bookingDate > toDate) return false;
      }

      return true;
    });
  }

  function resetModalFilters() {
    setModalSearch("");
    setModalStatusFilter([]);
    setModalCreatedByFilter("all");
    setModalDateFrom("");
    setModalDateTo("");
  }

  function handleCloseModal() {
    setShowExportModal(false);
    resetModalFilters();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-foreground sm:text-2xl">
            Bookings
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Manage all grooming appointments
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exporting || loading}
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            {exporting ? "Exporting..." : "Download Data Booking"}
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/admin/bookings/new">
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Link>
          </Button>
        </div>
      </div>

      <Card className="border-border/50">
        <CardHeader className="p-3 pb-3 sm:p-6 sm:pb-4">
          <div className="rounded-lg border bg-muted/30 p-2 flex flex-col gap-3 sm:p-3">
            {/* Row 1: Search + Tanggal */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              {/* Search */}
              <div className="flex flex-col gap-1 sm:w-[280px] shrink-0">
                <label className="text-xs font-medium text-muted-foreground">
                  Cari
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Nama customer atau hewan..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Tanggal Booking */}
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Tanggal Booking
                </label>
                <div className="flex gap-1">
                  {(["today", "week", "month", "custom"] as DatePreset[]).map(
                    (preset) => (
                      <Button
                        key={preset}
                        variant={datePreset === preset ? "default" : "outline"}
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => handlePreset(preset)}
                      >
                        {preset === "today"
                          ? "Hari Ini"
                          : preset === "week"
                            ? "Minggu Ini"
                            : preset === "month"
                              ? "Bulan Ini"
                              : "Custom"}
                      </Button>
                    ),
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: Dropdown Filters */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4 [&>*]:min-w-0">
              <div className="flex flex-col gap-1 min-w-0">
                <label className="text-xs font-medium text-muted-foreground">
                  Status
                </label>
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={statusOpen}
                      className="w-full min-w-0 justify-between font-normal"
                    >
                      <span
                        className={`min-w-0 truncate text-left ${
                          statusFilter.length === 0
                            ? "text-muted-foreground"
                            : ""
                        }`}
                      >
                        {statusFilter.length === 0
                          ? "Semua Status"
                          : statusFilter.length === 1
                            ? (STATUS_OPTIONS.find(
                                (o) => o.value === statusFilter[0],
                              )?.label ?? statusFilter[0])
                            : `${statusFilter.length} status dipilih`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    sideOffset={4}
                  >
                    <Command>
                      <CommandInput
                        placeholder="Cari status..."
                        className="h-9"
                      />
                      <CommandList>
                        <CommandEmpty>Status tidak ditemukan.</CommandEmpty>
                        <CommandGroup>
                          {STATUS_OPTIONS.map((option) => {
                            const checked = statusFilter.includes(option.value);
                            return (
                              <CommandItem
                                key={option.value}
                                value={option.label}
                                onSelect={() => {
                                  setStatusFilter((prev) =>
                                    prev.includes(option.value)
                                      ? prev.filter((v) => v !== option.value)
                                      : [...prev, option.value],
                                  );
                                }}
                                className="gap-2"
                              >
                                <Checkbox
                                  checked={checked}
                                  className="pointer-events-none"
                                />
                                <span>{option.label}</span>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                      {statusFilter.length > 0 && (
                        <div className="border-t p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => setStatusFilter([])}
                          >
                            Bersihkan pilihan
                          </Button>
                        </div>
                      )}
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Store
                </label>
                <Combobox
                  options={[
                    { value: "all", label: "Semua Store" },
                    ...stores.map((s) => ({ value: s._id, label: s.name })),
                  ]}
                  value={storeFilter}
                  onValueChange={(val) => setStoreFilter(val || "all")}
                  placeholder="Semua Store"
                  searchPlaceholder="Cari store..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Layanan
                </label>
                <Combobox
                  options={[
                    { value: "all", label: "Semua Layanan" },
                    ...services.map((s) => ({ value: s._id, label: s.name })),
                  ]}
                  value={serviceFilter}
                  onValueChange={(val) => setServiceFilter(val || "all")}
                  placeholder="Semua Layanan"
                  searchPlaceholder="Cari layanan..."
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Dibuat Oleh
                </label>
                <Select
                  value={createdByFilter}
                  onValueChange={setCreatedByFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Semua" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom date range */}
            {datePreset === "custom" && (
              <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Dari
                  </label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[150px] text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Sampai
                  </label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-[150px] text-sm"
                  />
                </div>
              </div>
            )}

            {/* Active filter summary + reset */}
            {(statusFilter.length > 0 ||
              createdByFilter !== "all" ||
              storeFilter !== "all" ||
              serviceFilter !== "all" ||
              datePreset !== "") && (
              <div className="flex flex-col gap-2 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1">
                  {statusFilter.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="text-xs capitalize gap-1"
                    >
                      {STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}
                      <button
                        type="button"
                        onClick={() =>
                          setStatusFilter((prev) =>
                            prev.filter((v) => v !== s),
                          )
                        }
                        className="hover:bg-background/50 rounded-sm"
                        aria-label={`Hapus filter ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  {createdByFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs capitalize">
                      {createdByFilter}
                    </Badge>
                  )}
                  {storeFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs">
                      {stores.find((s) => s._id === storeFilter)?.name ?? storeFilter}
                    </Badge>
                  )}
                  {serviceFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs">
                      {services.find((s) => s._id === serviceFilter)?.name ?? serviceFilter}
                    </Badge>
                  )}
                  {datePreset !== "" && datePreset !== "custom" && (
                    <Badge variant="secondary" className="text-xs">
                      {datePreset === "today"
                        ? "Hari Ini"
                        : datePreset === "week"
                          ? "Minggu Ini"
                          : "Bulan Ini"}
                    </Badge>
                  )}
                  {datePreset === "custom" && (dateFrom || dateTo) && (
                    <Badge variant="secondary" className="text-xs">
                      {dateFrom || "…"} → {dateTo || "…"}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive font-medium shrink-0"
                  onClick={() => {
                    setSearch("");
                    setDebouncedSearch("");
                    setStatusFilter([]);
                    setCreatedByFilter("all");
                    setStoreFilter("all");
                    setServiceFilter("all");
                    setDatePreset("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset semua
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 sm:pt-0">
          {/* Desktop / tablet: table view */}
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Hewan</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : bookings.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-8 text-center text-muted-foreground"
                    >
                      Tidak ada booking ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow
                      key={booking._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() =>
                        router.push(`/admin/bookings/${booking._id}`)
                      }
                    >
                      <TableCell className="whitespace-nowrap">
                        {booking.code ? (
                          <span className="font-mono text-xs font-medium">
                            {booking.code}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{formatDate(booking.date)}</span>
                          <span className="text-xs text-muted-foreground">{booking.time_range}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Highlight
                          text={booking.customer?.username ?? "-"}
                          query={debouncedSearch}
                        />
                      </TableCell>
                      <TableCell>
                        <Highlight
                          text={booking.pet_snapshot.name}
                          query={debouncedSearch}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span>{booking.service_snapshot.name}</span>
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="text-xs text-muted-foreground capitalize flex items-center gap-0.5">
                              <MapPin className="h-3 w-3" />
                              {booking.type}
                            </span>
                            {(booking.service_addon_ids?.length ?? 0) > 0 && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                +{booking.service_addon_ids!.length} addon
                              </Badge>
                            )}
                            {booking.pick_up && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 gap-0.5">
                                <Truck className="h-2.5 w-2.5" />
                                Pickup
                              </Badge>
                            )}
                            {booking.delivery && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 gap-0.5">
                                <Truck className="h-2.5 w-2.5" />
                                Delivery
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {booking.store?.name ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[booking.booking_status] ??
                            "bg-muted text-muted-foreground"
                          }
                        >
                          <span className="capitalize">
                            {booking.booking_status}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {booking.created_by_role === "admin" ? (
                            <Badge
                              variant="secondary"
                              className="w-fit text-xs"
                            >
                              Admin
                            </Badge>
                          ) : booking.created_by_role === "customer" ? (
                            <Badge variant="outline" className="w-fit text-xs">
                              Customer
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              -
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(booking.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {booking.final_total_price != null
                          ? formatPrice(booking.final_total_price)
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: card list view */}
          <div className="flex flex-col gap-3 md:hidden">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))
            ) : bookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada booking ditemukan
              </p>
            ) : (
              bookings.map((booking) => (
                <button
                  key={booking._id}
                  type="button"
                  onClick={() =>
                    router.push(`/admin/bookings/${booking._id}`)
                  }
                  className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      {booking.code && (
                        <span className="font-mono text-[10px] font-medium text-muted-foreground">
                          {booking.code}
                        </span>
                      )}
                      <span className="text-sm font-medium text-foreground">
                        <Highlight
                          text={booking.customer?.username ?? "-"}
                          query={debouncedSearch}
                        />
                      </span>
                      <span className="text-xs text-muted-foreground">
                        <Highlight
                          text={booking.pet_snapshot.name}
                          query={debouncedSearch}
                        />
                      </span>
                    </div>
                    <Badge
                      className={`shrink-0 text-[10px] ${
                        statusColors[booking.booking_status] ??
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      <span className="capitalize">
                        {booking.booking_status}
                      </span>
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1 border-t border-border/40 pt-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">Tanggal</span>
                      <span className="text-right text-foreground">
                        {formatDate(booking.date)}
                        <span className="ml-1 text-muted-foreground">
                          · {booking.time_range}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <span className="shrink-0 text-muted-foreground">
                        Layanan
                      </span>
                      <span className="text-right text-foreground">
                        {booking.service_snapshot.name}
                      </span>
                    </div>
                    {booking.store?.name && (
                      <div className="flex items-start justify-between gap-2 text-xs">
                        <span className="shrink-0 text-muted-foreground">
                          Store
                        </span>
                        <span className="text-right text-foreground">
                          {booking.store.name}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-muted-foreground">Harga</span>
                      <span className="font-semibold text-foreground">
                        {booking.final_total_price != null
                          ? formatPrice(booking.final_total_price)
                          : "-"}
                      </span>
                    </div>
                  </div>

                  {(booking.pick_up ||
                    booking.delivery ||
                    (booking.service_addon_ids?.length ?? 0) > 0 ||
                    booking.created_by_role) && (
                    <div className="flex flex-wrap items-center gap-1 border-t border-border/40 pt-2">
                      <span className="flex items-center gap-0.5 text-[10px] capitalize text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {booking.type}
                      </span>
                      {(booking.service_addon_ids?.length ?? 0) > 0 && (
                        <Badge
                          variant="outline"
                          className="h-4 px-1 py-0 text-[10px]"
                        >
                          +{booking.service_addon_ids!.length} addon
                        </Badge>
                      )}
                      {booking.pick_up && (
                        <Badge
                          variant="secondary"
                          className="h-4 gap-0.5 px-1 py-0 text-[10px]"
                        >
                          <Truck className="h-2.5 w-2.5" />
                          Pickup
                        </Badge>
                      )}
                      {booking.delivery && (
                        <Badge
                          variant="secondary"
                          className="h-4 gap-0.5 px-1 py-0 text-[10px]"
                        >
                          <Truck className="h-2.5 w-2.5" />
                          Delivery
                        </Badge>
                      )}
                      {booking.created_by_role === "admin" && (
                        <Badge
                          variant="secondary"
                          className="ml-auto h-4 px-1 py-0 text-[10px]"
                        >
                          Admin
                        </Badge>
                      )}
                      {booking.created_by_role === "customer" && (
                        <Badge
                          variant="outline"
                          className="ml-auto h-4 px-1 py-0 text-[10px]"
                        >
                          Customer
                        </Badge>
                      )}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <span className="text-xs text-muted-foreground sm:text-sm">
              {totalCount} booking
            </span>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-xs sm:text-sm">
                Hal. {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Preview Modal */}
      <Dialog open={showExportModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Preview Export Data Booking
            </DialogTitle>
            <DialogDescription>
              Filter dan periksa data yang akan diexport
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto space-y-4">
            {loadingPreview ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
            ) : (
              <>
                {/* Modal Filters */}
                <div className="rounded-lg border bg-accent/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Filter Data</h3>
                    {(modalSearch ||
                      modalStatusFilter.length > 0 ||
                      modalCreatedByFilter !== "all" ||
                      modalDateFrom ||
                      modalDateTo) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={resetModalFilters}
                      >
                        Reset Filter
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Search */}
                    <div className="relative md:col-span-2">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Cari customer, hewan, atau layanan..."
                        value={modalSearch}
                        onChange={(e) => setModalSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Status Filter */}
                    <div className="flex flex-col gap-1 min-w-0">
                      <label className="text-xs font-medium text-muted-foreground">
                        Status
                      </label>
                      <Popover
                        open={modalStatusOpen}
                        onOpenChange={setModalStatusOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={modalStatusOpen}
                            className="h-9 w-full min-w-0 justify-between font-normal"
                          >
                            <span
                              className={`min-w-0 truncate text-left ${
                                modalStatusFilter.length === 0
                                  ? "text-muted-foreground"
                                  : ""
                              }`}
                            >
                              {modalStatusFilter.length === 0
                                ? "Semua Status"
                                : modalStatusFilter.length === 1
                                  ? (STATUS_OPTIONS.find(
                                      (o) => o.value === modalStatusFilter[0],
                                    )?.label ?? modalStatusFilter[0])
                                  : `${modalStatusFilter.length} status dipilih`}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[var(--radix-popover-trigger-width)] p-0"
                          align="start"
                          sideOffset={4}
                        >
                          <Command>
                            <CommandInput
                              placeholder="Cari status..."
                              className="h-9"
                            />
                            <CommandList>
                              <CommandEmpty>
                                Status tidak ditemukan.
                              </CommandEmpty>
                              <CommandGroup>
                                {STATUS_OPTIONS.map((option) => {
                                  const checked = modalStatusFilter.includes(
                                    option.value,
                                  );
                                  return (
                                    <CommandItem
                                      key={option.value}
                                      value={option.label}
                                      onSelect={() => {
                                        setModalStatusFilter((prev) =>
                                          prev.includes(option.value)
                                            ? prev.filter(
                                                (v) => v !== option.value,
                                              )
                                            : [...prev, option.value],
                                        );
                                      }}
                                      className="gap-2"
                                    >
                                      <Checkbox
                                        checked={checked}
                                        className="pointer-events-none"
                                      />
                                      <span>{option.label}</span>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                            {modalStatusFilter.length > 0 && (
                              <div className="border-t p-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full h-8 text-xs"
                                  onClick={() => setModalStatusFilter([])}
                                >
                                  Bersihkan pilihan
                                </Button>
                              </div>
                            )}
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Created By Filter */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Dibuat Oleh
                      </label>
                      <Select
                        value={modalCreatedByFilter}
                        onValueChange={setModalCreatedByFilter}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Semua" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="customer">Customer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date From */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Tanggal Dari
                      </label>
                      <Input
                        type="date"
                        value={modalDateFrom}
                        onChange={(e) => setModalDateFrom(e.target.value)}
                        className="h-9"
                      />
                    </div>

                    {/* Date To */}
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Tanggal Sampai
                      </label>
                      <Input
                        type="date"
                        value={modalDateTo}
                        onChange={(e) => setModalDateTo(e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>

                {/* Data Count */}
                <div className="rounded-lg border bg-primary/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">
                        Total Data yang Akan Diexport
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {getFilteredModalData().length} dari{" "}
                        {exportPreviewData.length} booking
                      </p>
                    </div>
                    <div className="text-3xl font-bold text-primary">
                      {getFilteredModalData().length}
                    </div>
                  </div>
                </div>

                {/* Preview Table */}
                <div className="rounded-lg border">
                  <div className="bg-muted/30 p-3 border-b">
                    <h3 className="font-semibold text-sm">
                      Preview Data (maksimal 10 baris pertama)
                    </h3>
                  </div>
                  <div className="overflow-auto max-h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">
                            Kode
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Tanggal
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Waktu
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Customer
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Hewan
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Layanan
                          </TableHead>
                          <TableHead className="whitespace-nowrap">
                            Status
                          </TableHead>
                          <TableHead className="whitespace-nowrap text-right">
                            Harga
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFilteredModalData().length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={8}
                              className="text-center py-8 text-muted-foreground"
                            >
                              Tidak ada data yang sesuai dengan filter
                            </TableCell>
                          </TableRow>
                        ) : (
                          getFilteredModalData()
                            .slice(0, 10)
                            .map((booking) => (
                              <TableRow key={booking._id}>
                                <TableCell className="whitespace-nowrap">
                                  {booking.code ? (
                                    <span className="font-mono text-xs font-medium">
                                      {booking.code}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {formatDate(booking.date)}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {booking.time_range}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {booking.customer?.username ?? "-"}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {booking.pet_snapshot.name}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                  {booking.service_snapshot.name}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    className={
                                      statusColors[booking.booking_status] ??
                                      "bg-muted text-muted-foreground"
                                    }
                                  >
                                    <span className="capitalize text-xs">
                                      {booking.booking_status}
                                    </span>
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  {formatPrice(booking.final_total_price)}
                                </TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {getFilteredModalData().length > 10 && (
                    <div className="bg-muted/20 p-2 border-t text-center text-xs text-muted-foreground">
                      ... dan {getFilteredModalData().length - 10} data lainnya
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseModal}
              disabled={exporting}
            >
              Batal
            </Button>
            <Button
              onClick={confirmExport}
              disabled={
                exporting ||
                loadingPreview ||
                getFilteredModalData().length === 0
              }
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Mengexport..." : "Export ke Excel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
