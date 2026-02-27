"use client"

import { bookings, products } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  ImageOff,
  MapPin,
  Scissors,
  Store,
  XCircle,
} from "lucide-react"
import type { Booking } from "@/lib/types"

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function getTotalPrice(booking: Booking) {
  const svcPrice = products.find((p) => p.id === booking.serviceId)?.price ?? 0
  const addonTotal = booking.addOnIds.reduce(
    (sum, id) => sum + (products.find((p) => p.id === id)?.price ?? 0),
    0,
  )
  return svcPrice + addonTotal + booking.travelFee
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

// ── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  confirmed: {
    label: "Terkonfirmasi",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  "not-confirmed": {
    label: "Menunggu konfirmasi",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  "in-progress": {
    label: "Sedang berlangsung",
    className: "bg-primary/10 text-primary border-primary/20",
    icon: <Scissors className="h-3 w-3" />,
  },
  completed: {
    label: "Selesai",
    className: "bg-secondary/60 text-secondary-foreground border-border/40",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <XCircle className="h-3 w-3" />,
  },
}

// ── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, showMedia = false }: { booking: Booking; showMedia?: boolean }) {
  const cfg = statusConfig[booking.status] ?? {
    label: booking.status,
    className: "bg-muted text-muted-foreground border-border",
    icon: null,
  }
  const beforeMedia = booking.media.filter((m) => m.type === "before")
  const afterMedia = booking.media.filter((m) => m.type === "after")

  return (
    <Card className="overflow-hidden border-border/50">
      {/* Header bar */}
      <div
        className={`flex items-center justify-between gap-3 border-b px-5 py-3 ${
          booking.status === "in-progress"
            ? "border-primary/10 bg-primary/5"
            : "border-border/40 bg-muted/30"
        }`}
      >
        <span className="font-mono text-xs text-muted-foreground">#{booking.id.toUpperCase()}</span>
        <Badge variant="outline" className={`gap-1 text-[11px] font-medium ${cfg.className}`}>
          {cfg.icon}
          {cfg.label}
        </Badge>
      </div>

      <CardContent className="flex flex-col gap-4 p-5">
        {/* Pet + Service + Type */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-bold text-foreground">{booking.petName}</p>
            <p className="text-sm font-medium text-muted-foreground">{booking.serviceName}</p>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 gap-1 text-[11px] ${
              booking.type === "home"
                ? "border-violet-200 bg-violet-50 text-violet-700"
                : "border-sky-200 bg-sky-50 text-sky-700"
            }`}
          >
            {booking.type === "home" ? <Home className="h-3 w-3" /> : <Store className="h-3 w-3" />}
            {booking.type === "home" ? "Home Visit" : "In-Store"}
          </Badge>
        </div>

        {/* Add-ons */}
        {booking.addOnNames.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {booking.addOnNames.map((name) => (
              <span
                key={name}
                className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground"
              >
                + {name}
              </span>
            ))}
          </div>
        )}

        <Separator className="my-0" />

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span>{formatDate(booking.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span>
              {booking.timeStart} – {booking.timeEnd}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Scissors className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span>{booking.groomerName}</span>
          </div>
          {booking.travelFee > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span>Travel fee {formatPrice(booking.travelFee)}</span>
            </div>
          )}
        </div>

        {/* Pre-condition warning */}
        {booking.preConditions.length > 0 && (
          <>
            <Separator className="my-0" />
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Catatan dari groomer
              </div>
              <ul className="flex flex-col gap-1">
                {booking.preConditions.map((pc) => (
                  <li key={pc.id} className="text-xs text-amber-800">
                    • {pc.description}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Request notes */}
        {booking.requestNotes && (
          <p className="rounded-lg bg-muted/40 px-3.5 py-2.5 text-xs italic text-muted-foreground">
            "{booking.requestNotes}"
          </p>
        )}

        {/* Total */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Total pembayaran</p>
          <p className="font-display text-base font-bold text-primary">{formatPrice(getTotalPrice(booking))}</p>
        </div>

        {/* Before / After Photos */}
        {showMedia && booking.media.length > 0 && (
          <>
            <Separator className="my-0" />
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-muted-foreground">Foto Before / After</p>
              <div className="grid grid-cols-2 gap-3">
                {(["Sebelum", "Sesudah"] as const).map((label, i) => {
                  const imgs = i === 0 ? beforeMedia : afterMedia
                  return (
                    <div key={label} className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                      {imgs.length > 0 ? (
                        <div className="overflow-hidden rounded-lg border border-border/50">
                          <img
                            src={imgs[0].url}
                            alt={`${label} grooming`}
                            className="aspect-square w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20">
                          <ImageOff className="h-5 w-5 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
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
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerOrderPage() {
  const { user } = useAuth()

  const activeBookings = bookings
    .filter(
      (b) =>
        b.status !== "completed" &&
        b.status !== "cancelled",
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.timeStart.localeCompare(b.timeStart))

  const historyBookings = bookings
    .filter(
      (b) =>
        (b.status === "completed" || b.status === "cancelled"),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.timeStart.localeCompare(a.timeStart))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Order</h1>
        <p className="text-sm text-muted-foreground">Pantau status dan lihat riwayat semua booking kamu.</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="gap-2">
            Aktif
            {activeBookings.length > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary-foreground">
                {activeBookings.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            Riwayat
            {historyBookings.length > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary-foreground">
                {historyBookings.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeBookings.length === 0 ? (
            <EmptyState message="Tidak ada booking aktif saat ini." />
          ) : (
            activeBookings.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {historyBookings.length === 0 ? (
            <EmptyState message="Belum ada riwayat booking." />
          ) : (
            historyBookings.map((b) => <BookingCard key={b.id} booking={b} showMedia />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
