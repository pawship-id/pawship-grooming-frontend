"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  RotateCcw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getAdminBookings } from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";
import { getStores } from "@/lib/api/stores";
import type { ApiStore } from "@/lib/api/stores";
import { getServiceTypes } from "@/lib/api/service-types";
import type { ApiServiceType } from "@/lib/api/service-types";
import { getUsers } from "@/lib/api/users";
import type { ApiUser } from "@/lib/api/users";
import { Scheduler, type SchedulerView } from "./_components/scheduler";
import { addDays, startOfWeek, toYMD, weekDays } from "./_components/utils";

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

// Pull up to 500 bookings for the visible window. Date filtering happens on
// the backend so this only covers what's actually shown.
const CALENDAR_FETCH_LIMIT = 500;

// Shared compact styling for every dropdown trigger in the filter panel so
// the controls line up and stay condensed alongside the mini calendar.
const filterTriggerClass = "h-8 px-2 text-xs";

export default function BookingCalendarPage() {
  const { toast } = useToast();

  // ── View state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<SchedulerView>("day");
  const [anchorDate, setAnchorDate] = useState<Date>(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  });

  // ── Filters ────────────────────────────────────────────────────────────────
  const [storeFilter, setStoreFilter] = useState("all");
  const [groomerFilter, setGroomerFilter] = useState("all");
  const [serviceTypeFilter, setServiceTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);

  // ── Reference data ─────────────────────────────────────────────────────────
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [groomers, setGroomers] = useState<ApiUser[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ApiServiceType[]>([]);

  // ── Bookings ───────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // The date range we ask the backend for — drives both the scheduler view and
  // refetches when the user moves between days/weeks.
  const range = useMemo(() => {
    if (view === "day") {
      const d = toYMD(anchorDate);
      return { from: d, to: d };
    }
    const days = weekDays(anchorDate);
    return { from: toYMD(days[0]), to: toYMD(days[days.length - 1]) };
  }, [view, anchorDate]);

  // Load reference data once on mount. Groomers are filtered to active users
  // with the groomer role so the dropdown stays manageable.
  useEffect(() => {
    getStores({ page: 1, limit: 100 })
      .then((res) => setStores(res.stores ?? []))
      .catch(() => {});
    getUsers({ page: 1, limit: 200, role: "groomer" })
      .then((res) => setGroomers(res.users ?? []))
      .catch(() => {});
    getServiceTypes({ limit: 100, is_active: "true" })
      .then((res) => setServiceTypes(res.serviceTypes ?? []))
      .catch(() => {});
  }, []);

  const fetchBookings = useCallback(() => {
    setLoading(true);
    getAdminBookings({
      page: 1,
      limit: CALENDAR_FETCH_LIMIT,
      date_from: range.from,
      date_to: range.to,
      store_id: storeFilter === "all" ? undefined : storeFilter,
      groomer_id: groomerFilter === "all" ? undefined : groomerFilter,
      service_type:
        serviceTypeFilter === "all" ? undefined : serviceTypeFilter,
      status: statusFilter.length > 0 ? statusFilter.join(",") : undefined,
    })
      .then((res) => setBookings(res.bookings ?? []))
      .catch((err) => {
        toast({
          title: "Gagal memuat booking",
          description:
            err instanceof Error ? err.message : "Terjadi kesalahan.",
          variant: "destructive",
        });
        setBookings([]);
      })
      .finally(() => setLoading(false));
  }, [
    range.from,
    range.to,
    storeFilter,
    groomerFilter,
    serviceTypeFilter,
    statusFilter,
    toast,
  ]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const navigate = (direction: -1 | 0 | 1) => {
    if (direction === 0) {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      setAnchorDate(t);
      return;
    }
    const step = view === "day" ? 1 : 7;
    setAnchorDate((prev) => addDays(prev, direction * step));
  };

  const rangeLabel = useMemo(() => {
    if (view === "day") {
      return anchorDate.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const days = weekDays(anchorDate);
    const start = days[0];
    const end = days[days.length - 1];
    const sameMonth =
      start.getMonth() === end.getMonth() &&
      start.getFullYear() === end.getFullYear();
    if (sameMonth) {
      return `${start.getDate()} – ${end.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`;
    }
    return `${start.toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`;
  }, [view, anchorDate]);

  const hasActiveFilters =
    storeFilter !== "all" ||
    groomerFilter !== "all" ||
    serviceTypeFilter !== "all" ||
    statusFilter.length > 0;

  const resetFilters = () => {
    setStoreFilter("all");
    setGroomerFilter("all");
    setServiceTypeFilter("all");
    setStatusFilter([]);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Booking Calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            Lihat seluruh booking dalam tampilan scheduler harian / mingguan
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(0)}>
            Hari Ini
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(1)}
            aria-label="Berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as SchedulerView)}
          >
            <TabsList>
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_1fr]">
        {/* Sidebar: mini calendar + filters */}
        <div className="flex flex-col gap-3">
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center gap-3 p-3">
              <div className="flex w-full items-center gap-1.5 text-xs font-semibold text-foreground">
                <CalendarDays className="h-3.5 w-3.5 text-primary" />
                Kalender
              </div>
              <Calendar
                mode="single"
                selected={anchorDate}
                onSelect={(d) => d && setAnchorDate(d)}
                weekStartsOn={1}
                showOutsideDays
                className="p-0"
                classNames={{
                  months: "space-y-2",
                  month: "space-y-2",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-xs font-medium",
                  nav_button: "h-6 w-6",
                  // On mobile (sidebar is full-width) the cells stretch via
                  // flex-1 so the calendar uses the available width. On lg
                  // (sidebar is ~230px) the table shrinks to content and
                  // centers so the grid stays compact next to the scheduler.
                  table: "w-full border-collapse lg:w-auto lg:mx-auto",
                  head_row: "flex w-full lg:w-auto",
                  row: "flex w-full lg:w-auto mt-1",
                  head_cell:
                    "text-muted-foreground rounded-md flex-1 lg:flex-none lg:w-7 text-center font-normal text-[10px]",
                  cell: "relative h-9 flex-1 p-0 text-center text-xs lg:h-7 lg:w-7 lg:flex-none [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-xs font-normal hover:bg-accent hover:text-accent-foreground aria-selected:opacity-100 mx-auto lg:h-7 lg:w-7",
                }}
              />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex flex-col gap-2 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-foreground">
                  Filter
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-1.5 text-[10px]"
                    onClick={resetFilters}
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Reset
                  </Button>
                )}
              </div>

              <FilterBlock label="Cabang">
                <Combobox
                  options={[
                    { value: "all", label: "Semua Cabang" },
                    ...stores.map((s) => ({ value: s._id, label: s.name })),
                  ]}
                  value={storeFilter}
                  onValueChange={(v) => setStoreFilter(v || "all")}
                  placeholder="Semua Cabang"
                  searchPlaceholder="Cari cabang..."
                  className={filterTriggerClass}
                />
              </FilterBlock>

              <FilterBlock label="Groomer">
                <Combobox
                  options={[
                    { value: "all", label: "Semua Groomer" },
                    ...groomers.map((g) => ({
                      value: g._id,
                      label: g.username,
                    })),
                  ]}
                  value={groomerFilter}
                  onValueChange={(v) => setGroomerFilter(v || "all")}
                  placeholder="Semua Groomer"
                  searchPlaceholder="Cari groomer..."
                  className={filterTriggerClass}
                />
              </FilterBlock>

              <FilterBlock label="Tipe Layanan">
                <Combobox
                  options={[
                    { value: "all", label: "Semua Tipe" },
                    ...serviceTypes.map((s) => ({
                      value: s._id,
                      label: s.title,
                    })),
                  ]}
                  value={serviceTypeFilter}
                  onValueChange={(v) => setServiceTypeFilter(v || "all")}
                  placeholder="Semua Tipe"
                  searchPlaceholder="Cari tipe..."
                  className={filterTriggerClass}
                />
              </FilterBlock>

              <FilterBlock label="Status">
                <Popover open={statusOpen} onOpenChange={setStatusOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={statusOpen}
                      className={`w-full justify-between font-normal ${filterTriggerClass}`}
                    >
                      <span
                        className={
                          statusFilter.length === 0
                            ? "text-muted-foreground"
                            : ""
                        }
                      >
                        {statusFilter.length === 0
                          ? "Semua Status"
                          : statusFilter.length === 1
                            ? (STATUS_OPTIONS.find(
                                (o) => o.value === statusFilter[0],
                              )?.label ?? statusFilter[0])
                            : `${statusFilter.length} status dipilih`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
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
                        className="h-8 text-xs"
                      />
                      <CommandList>
                        <CommandEmpty className="py-3 text-xs">
                          Status tidak ditemukan.
                        </CommandEmpty>
                        <CommandGroup>
                          {STATUS_OPTIONS.map((option) => {
                            const checked = statusFilter.includes(
                              option.value,
                            );
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
                                className="gap-2 py-1.5 text-xs"
                              >
                                <Checkbox
                                  checked={checked}
                                  className="pointer-events-none h-3.5 w-3.5"
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
                            className="h-7 w-full text-[11px]"
                            onClick={() => setStatusFilter([])}
                          >
                            Bersihkan pilihan
                          </Button>
                        </div>
                      )}
                    </Command>
                  </PopoverContent>
                </Popover>
              </FilterBlock>

              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1 border-t border-border/40 pt-2">
                  {storeFilter !== "all" && (
                    <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                      {stores.find((s) => s._id === storeFilter)?.name ??
                        storeFilter}
                      <button
                        type="button"
                        onClick={() => setStoreFilter("all")}
                        aria-label="Hapus filter cabang"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {groomerFilter !== "all" && (
                    <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                      {groomers.find((g) => g._id === groomerFilter)
                        ?.username ?? groomerFilter}
                      <button
                        type="button"
                        onClick={() => setGroomerFilter("all")}
                        aria-label="Hapus filter groomer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {serviceTypeFilter !== "all" && (
                    <Badge variant="secondary" className="h-5 gap-1 px-1.5 text-[10px]">
                      {serviceTypes.find((s) => s._id === serviceTypeFilter)
                        ?.title ?? serviceTypeFilter}
                      <button
                        type="button"
                        onClick={() => setServiceTypeFilter("all")}
                        aria-label="Hapus filter tipe"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                  {statusFilter.map((s) => (
                    <Badge
                      key={s}
                      variant="secondary"
                      className="h-5 gap-1 px-1.5 text-[10px] capitalize"
                    >
                      {STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s}
                      <button
                        type="button"
                        onClick={() =>
                          setStatusFilter((prev) =>
                            prev.filter((v) => v !== s),
                          )
                        }
                        aria-label={`Hapus status ${s}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Scheduler */}
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold capitalize text-foreground">
              {rangeLabel}
            </h2>
            <span className="text-xs text-muted-foreground">
              {loading ? "Memuat..." : `${bookings.length} booking`}
            </span>
          </div>

          {loading ? (
            <Skeleton className="h-[60vh] w-full rounded-lg" />
          ) : (
            <Scheduler view={view} anchorDate={anchorDate} bookings={bookings} />
          )}
        </div>
      </div>
    </div>
  );
}

function FilterBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
