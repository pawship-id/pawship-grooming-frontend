"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getAdminBookings, type AdminBooking } from "@/lib/api/bookings";
import {
  getPublicStores,
  getPublicServices,
  getPublicBookingPreview,
} from "@/lib/api/stores";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  RefreshCw,
  Scissors,
  Store,
  XCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

// ── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  requested: {
    label: "Requested",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  waitlist: {
    label: "Waitlist",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <Clock className="h-3 w-3" />,
  },
  "driver on the way": {
    label: "Driver on the way",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Scissors className="h-3 w-3" />,
  },
  "groomer on the way": {
    label: "Groomer on the way",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Scissors className="h-3 w-3" />,
  },
  arrived: {
    label: "Arrived",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  "in progress": {
    label: "In Progress",
    className: "bg-primary/10 text-primary border-primary/20",
    icon: <Scissors className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    className: "bg-secondary/60 text-secondary-foreground border-border/40",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rescheduled: {
    label: "Rescheduled",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Clock className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const statusOptions = [
  { value: "all", label: "All Status" },
  { value: "requested", label: "Requested" },
  { value: "confirmed", label: "Confirmed" },
  { value: "waitlist", label: "Waitlist" },
  { value: "driver on the way", label: "Driver on the way" },
  { value: "groomer on the way", label: "Groomer on the way" },
  { value: "arrived", label: "Arrived" },
  { value: "in progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "rescheduled", label: "Rescheduled" },
  { value: "cancelled", label: "Cancelled" },
];

// ── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking }: { booking: AdminBooking }) {
  const normalizedLocationType =
    booking.type === "home_service" ? "in home" : "in store";

  const router = useRouter();
  const { toast } = useToast();
  const [reordering, setReordering] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);
  const [reorderDate, setReorderDate] = useState("");
  const [reorderSession, setReorderSession] = useState("");
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const [pendingParams, setPendingParams] = useState<URLSearchParams | null>(null);

  async function handleReorder(e: React.MouseEvent) {
    e.stopPropagation();
    setReordering(true);
    try {
      const { stores: allStores } = await getPublicStores();
      const activeStores = allStores.filter((s) => s.is_active);
      const store = activeStores.find((s) => s._id === booking.store_id);

      if (!store) {
        toast({
          variant: "destructive",
          title: "Store tidak tersedia",
          description:
            "Store dari booking ini sudah tidak aktif atau sudah tidak beroperasi. Kamu bisa memilih store lain di halaman booking.",
        });
        setReordering(false);
        return;
      }

      const serviceTypeId = booking.service_snapshot.service_type._id;
      const hasServiceType = store.serviceTypes.some(
        (t) => t._id === serviceTypeId,
      );
      if (!hasServiceType) {
        toast({
          variant: "destructive",
          title: "Tipe layanan tidak tersedia",
          description:
            "Tipe layanan dari booking ini sudah tidak tersedia di store tersebut.",
        });
        setReordering(false);
        return;
      }

      const { services } = await getPublicServices(
        booking.store_id,
        serviceTypeId,
      );
      const activeServiceIds = services
        .filter((s) => s.is_active)
        .map((s) => s._id);
      const serviceId = booking.service_snapshot._id;

      if (!activeServiceIds.includes(serviceId)) {
        toast({
          variant: "destructive",
          title: "Layanan tidak tersedia",
          description: `Layanan "${booking.service_snapshot.name}" sudah tidak aktif atau sudah dihentikan. Silakan pilih layanan lain di halaman booking.`,
        });
        setReordering(false);
        return;
      }

      const params = new URLSearchParams({
        storeId: booking.store_id,
        serviceTypeId,
        serviceId,
        locationType: normalizedLocationType,
        petId: booking.pet_id,
        reOrder: "1",
      });
      if (booking.service_addon_ids?.length) {
        params.set("addonIds", booking.service_addon_ids.join(","));
      }
      if (booking.pick_up) {
        params.set("pickUp", "1");
      }
      if (booking.delivery) {
        params.set("delivery", "1");
      }

      setPendingParams(params);
      setAvailableSessions(store.sessions ?? []);
      setReorderDate("");
      setReorderSession("");
      setReorderModalOpen(true);
      setReordering(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Gagal memproses re-order",
        description: "Terjadi kesalahan. Silakan coba lagi.",
      });
      setReordering(false);
    }
  }

  async function handleContinueReorder() {
    if (!reorderDate || !reorderSession) {
      toast({
        variant: "destructive",
        title: "Data belum lengkap",
        description: "Silakan pilih tanggal dan sesi terlebih dahulu.",
      });
      return;
    }
    if (!pendingParams) return;
    if (!availableSessions.includes(reorderSession)) {
      toast({
        variant: "destructive",
        title: "Sesi tidak tersedia",
        description: "Sesi yang dipilih tidak tersedia di store ini.",
      });
      return;
    }

    setReordering(true);
    try {
      // Validate latest slot availability before navigating.
      await getPublicBookingPreview({
        pet_id: booking.pet_id,
        service_id: booking.service_snapshot._id,
        addon_ids:
          booking.service_addon_ids && booking.service_addon_ids.length > 0
            ? booking.service_addon_ids
            : undefined,
        date: reorderDate,
        time_range: reorderSession,
        service_location_type: normalizedLocationType,
        pick_up: booking.pick_up || undefined,
        delivery: booking.delivery || undefined,
        store_id: booking.store_id,
        customer_id: booking.customer_id,
      });
      const params = new URLSearchParams(pendingParams);
      params.set("date", reorderDate);
      params.set("timeRange", reorderSession);
      router.push(`/booking?${params.toString()}`);
      setReorderModalOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Sesi tidak tersedia",
        description:
          err instanceof Error
            ? err.message
            : "Sesi yang dipilih penuh atau tidak tersedia. Silakan pilih sesi lain.",
      });
    } finally {
      setReordering(false);
    }
  }

  const cfg = statusConfig[booking.booking_status] ?? {
    label: booking.booking_status,
    className: "bg-muted text-muted-foreground border-border",
    icon: null,
  };

  // Get groomer name from sessions
  const groomerName =
    booking.sessions?.[0]?.groomer_detail?.username || "Groomer";

  // Session notes from groomer
  const sessionNotes =
    booking.sessions?.filter((s) => s.notes && s.notes.trim()) ?? [];

  return (
    <>
      <Card
        className="cursor-pointer overflow-hidden border-border/50 transition-shadow hover:shadow-md"
        onClick={() => router.push(`/customer/order/${booking._id}`)}
      >
        {/* Header bar */}
        <div
          className={`flex items-center justify-between gap-3 border-b px-5 py-3 ${
            booking.booking_status === "in progress"
              ? "border-primary/10 bg-primary/5"
              : "border-border/40 bg-muted/30"
          }`}
        >
          <span className="font-mono text-xs text-muted-foreground">
            #{booking._id.slice(-8).toUpperCase()}
          </span>
          <Badge
            variant="outline"
            className={`gap-1 text-[11px] font-medium ${cfg.className}`}
          >
            {cfg.icon}
            {cfg.label}
          </Badge>
        </div>

      <CardContent className="flex flex-col gap-4 p-5">
        {/* Pet + Service + Type */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              {booking.pet_snapshot.name}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {booking.service_snapshot.name}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 gap-1 text-[11px] ${
              booking.type === "home_service"
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
            }`}
          >
            {booking.type === "home_service" ? (
              <>
                <Home className="h-3 w-3" /> Home Visit
              </>
            ) : (
              <>
                <Store className="h-3 w-3" /> In-Store
              </>
            )}
          </Badge>
        </div>

        {/* Add-ons */}
        {booking.service_snapshot.addons &&
          booking.service_snapshot.addons.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {booking.service_snapshot.addons.map((addon) => (
                <span
                  key={addon._id}
                  className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground"
                >
                  + {addon.name}
                </span>
              ))}
            </div>
          )}

        <Separator className="my-0" />

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span>{formatDate(booking.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span>{booking.time_range}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Scissors className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span>{groomerName}</span>
          </div>
          {booking.travel_fee > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span>Travel fee {formatPrice(booking.travel_fee)}</span>
            </div>
          )}
        </div>

        {/* Groomer session notes */}
        <>
          <Separator className="my-0" />
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
              Catatan dari groomer
            </div>
            {sessionNotes.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {sessionNotes.map((s, i) => (
                  <li key={s._id ?? i} className="text-xs text-amber-800">
                    •{" "}
                    {sessionNotes.length > 1
                      ? `Sesi ${i + 1}${s.type ? ` (${s.type})` : ""}: `
                      : ""}
                    {s.notes}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-amber-700/70">
                Tidak ada catatan dari groomer
              </p>
            )}
          </div>
        </>

        {/* Pet internal note */}
        {booking.pet_snapshot.internal_note && (
          <p className="rounded-lg bg-muted/40 px-3.5 py-2.5 text-xs italic text-muted-foreground">
            "{booking.pet_snapshot.internal_note}"
          </p>
        )}

        <Separator className="my-0" />

        {/* Total + Re-Order */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total pembayaran</p>
            <p className="font-display text-base font-bold text-primary">
              {formatPrice(booking.final_total_price)}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
            onClick={handleReorder}
            disabled={reordering}
          >
            {reordering ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Re-Order
          </Button>
        </div>
      </CardContent>
      </Card>

      <Dialog open={reorderModalOpen} onOpenChange={setReorderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pilih Jadwal Re-Order</DialogTitle>
            <DialogDescription>
              Pilih tanggal dan sesi baru. Data booking lain akan otomatis mengikuti booking sebelumnya.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-1">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Tanggal</label>
              <Input
                type="date"
                value={reorderDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setReorderDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium">Sesi</label>
              <Select value={reorderSession} onValueChange={setReorderSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih sesi" />
                </SelectTrigger>
                <SelectContent>
                  {availableSessions.map((session) => (
                    <SelectItem key={session} value={session}>
                      {session}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setReorderModalOpen(false)}
              disabled={reordering}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleContinueReorder}
              disabled={reordering}
            >
              {reordering ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                "Lanjutkan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
        <Scissors className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ── Loading state ────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="overflow-hidden">
          <div className="border-b px-5 py-3">
            <Skeleton className="h-4 w-24" />
          </div>
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerOrderPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchBookings() {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);
        const params: any = {
          customer_id: user.id,
          limit: 100, // Get more bookings for customer view
        };
        if (statusFilter !== "all") {
          params.status = statusFilter;
        }
        const response = await getAdminBookings(params);
        setBookings(response.bookings);
      } catch (err) {
        console.error("Failed to fetch bookings:", err);
        setError("Gagal memuat data booking. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, [user?.id, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Order
        </h1>
        <p className="text-sm text-muted-foreground">
          Pantau status dan lihat riwayat semua booking kamu.
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label
            htmlFor="status-filter"
            className="text-sm font-medium text-muted-foreground"
          >
            Filter Status:
          </label>
          <div className="flex items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                id="status-filter"
                className="w-full sm:w-[240px] md:w-[240px]"
              >
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {statusFilter !== "all" && (
              <span className="text-xs text-muted-foreground">
                {bookings.length} booking ditemukan
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={() => router.push("/booking")}
          className="w-full sm:w-auto"
        >
          Book Now
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : bookings.length === 0 ? (
        <EmptyState
          message={
            statusFilter === "all"
              ? "Belum ada booking."
              : `Tidak ada booking dengan status "${statusOptions.find((o) => o.value === statusFilter)?.label}".`
          }
        />
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <BookingCard key={booking._id} booking={booking} />
          ))}
        </div>
      )}
      <Toaster />
    </div>
  );
}
