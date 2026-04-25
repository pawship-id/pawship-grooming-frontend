"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CalendarIcon,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  TrendingUp,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminBookings } from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

type TxDatePreset = "today" | "week" | "month" | "custom" | "";

function getPresetRange(
  preset: TxDatePreset,
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

const LIMIT = 10;

const statusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  waitlist: "bg-yellow-100 text-yellow-800",
  "driver on the way": "bg-blue-100 text-blue-800",
  "groomer on the way": "bg-blue-100 text-blue-800",
  arrived: "bg-primary/10 text-primary",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
  returned: "bg-slate-100 text-slate-700",
  rescheduled: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function BookingTransactionSection() {
  const router = useRouter();

  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<TxDatePreset>("today");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [calFromOpen, setCalFromOpen] = useState(false);
  const [calToOpen, setCalToOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchBookings = useCallback(
    (p: number) => {
      setLoading(true);
      const range = getPresetRange(preset);
      const from = preset === "custom" ? dateFrom : (range?.from ?? "");
      const to = preset === "custom" ? dateTo : (range?.to ?? "");
      getAdminBookings({
        page: p,
        limit: LIMIT,
        date_from: from || undefined,
        date_to: to || undefined,
      })
        .then((res) => {
          setBookings(res.bookings);
          setTotal(res.total ?? 0);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [preset, dateFrom, dateTo],
  );

  useEffect(() => {
    setPage(1);
  }, [preset, dateFrom, dateTo]);

  useEffect(() => {
    fetchBookings(page);
  }, [fetchBookings, page]);

  const revenue = bookings.reduce(
    (sum, b) => sum + (b.final_total_price ?? 0),
    0,
  );
  const pendingCount = bookings.filter(
    (b) => b.booking_status === "requested",
  ).length;
  const confirmedCount = bookings.filter(
    (b) => b.booking_status !== "requested",
  ).length;

  function handlePreset(p: TxDatePreset) {
    setPreset((prev) => (prev === p ? "" : p));
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-lg font-bold">
          Transaksi Booking
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Preset buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { value: "today", label: "Hari Ini" },
              { value: "week", label: "Minggu Ini" },
              { value: "month", label: "Bulan Ini" },
              { value: "custom", label: "Custom" },
            ] as { value: TxDatePreset; label: string }[]
          ).map((btn) => (
            <Button
              key={btn.value}
              size="sm"
              variant={preset === btn.value ? "default" : "outline"}
              onClick={() => handlePreset(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {/* Custom date range */}
        {preset === "custom" && (
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
                title="Reset tanggal"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <CalendarDays className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Booking</p>
              {loading ? (
                <Skeleton className="h-6 w-12 mt-0.5" />
              ) : (
                <p className="font-display text-xl font-bold text-foreground">
                  {total}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
              <Clock className="h-4 w-4 text-accent-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Menunggu Konfirmasi
              </p>
              {loading ? (
                <Skeleton className="h-6 w-12 mt-0.5" />
              ) : (
                <p className="font-display text-xl font-bold text-foreground">
                  {pendingCount}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                Booking Terkonfirmasi
              </p>
              {loading ? (
                <Skeleton className="h-6 w-12 mt-0.5" />
              ) : (
                <p className="font-display text-xl font-bold text-foreground">
                  {confirmedCount}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border/50 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/20">
              <TrendingUp className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Pendapatan</p>
              {loading ? (
                <Skeleton className="h-6 w-28 mt-0.5" />
              ) : (
                <p className="font-display text-xl font-bold text-foreground">
                  {formatPrice(revenue)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Bookings table */}
        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Tanggal</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Hewan</TableHead>
                <TableHead className="text-xs">Layanan</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-right text-xs">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : bookings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    Tidak ada booking pada periode ini
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((b) => (
                  <TableRow
                    key={b._id}
                    className="cursor-pointer hover:bg-muted/60"
                    onClick={() => router.push(`/admin/bookings/${b._id}`)}
                  >
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDate(b.date)}
                    </TableCell>
                    <TableCell className="text-xs">
                      {b.customer?.username ?? "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {b.pet_snapshot.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      {b.service_snapshot.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          statusColors[b.booking_status] ??
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {b.booking_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium whitespace-nowrap">
                      {formatPrice(b.final_total_price)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-xs text-muted-foreground">
              Halaman {page} dari {totalPages} ({total} booking)
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
