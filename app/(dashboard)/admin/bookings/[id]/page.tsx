"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft, User, Calendar, Clock, ClipboardList, UserCheck, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { getAdminBookingById, updateBookingStatus, assignGroomerToBooking } from "@/lib/api/bookings"
import type { AdminBooking, AssignGroomerItem } from "@/lib/api/bookings"
import { getStoreById } from "@/lib/api/stores"
import { getUsers } from "@/lib/api/users"
import type { ApiUser } from "@/lib/api/users"

const statusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  arrived: "bg-primary/10 text-primary",
  "grooming in progress": "bg-primary/10 text-primary",
  "grooming finished": "bg-secondary/60 text-secondary-foreground",
  rescheduled: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
}

const ALL_STATUSES = [
  "requested",
  "confirmed",
  "arrived",
  "grooming in progress",
  "grooming finished",
  "rescheduled",
  "cancelled",
]

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [booking, setBooking] = useState<AdminBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState("")
  const [rescheduledDate, setRescheduledDate] = useState("")
  const [rescheduledTimeRange, setRescheduledTimeRange] = useState("")
  const [storeSessions, setStoreSessions] = useState<string[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Assign groomer state
  const [groomers, setGroomers] = useState<ApiUser[]>([])
  const [assignedGroomers, setAssignedGroomers] = useState<AssignGroomerItem[]>([])
  const [assigningGroomer, setAssigningGroomer] = useState(false)

  useEffect(() => {
    Promise.all([
      getAdminBookingById(id),
      getUsers({ page: 1, limit: 200, role: "groomer" }),
    ])
      .then(([bookingRes, groomersRes]) => {
        const b = bookingRes.booking
        setBooking(b)
        setSelectedStatus(b.booking_status)
        setAssignedGroomers(b.assigned_groomers ?? [])
        setGroomers(groomersRes.users)
        // Load store sessions for rescheduled dropdown
        if (b.store_id) {
          getStoreById(b.store_id)
            .then((storeRes) => setStoreSessions(storeRes.store.sessions ?? []))
            .catch(() => {})
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const statusChanged = !!booking && selectedStatus !== booking.booking_status
  const isRescheduled = selectedStatus === "rescheduled"

  const handleSaveStatus = async () => {
    if (!booking) return
    if (isRescheduled && (!rescheduledDate || !rescheduledTimeRange)) {
      toast.error("Tanggal dan sesi waktu wajib diisi untuk status rescheduled")
      return
    }
    setUpdatingStatus(true)
    try {
      await updateBookingStatus(id, {
        status: selectedStatus,
        ...(isRescheduled ? { date: rescheduledDate, time_range: rescheduledTimeRange } : {}),
      })
      const refreshed = await getAdminBookingById(id)
      setBooking(refreshed.booking)
      setSelectedStatus(refreshed.booking.booking_status)
      setRescheduledDate("")
      setRescheduledTimeRange("")
      toast.success(`Status diperbarui: ${selectedStatus}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddGroomerRow = () =>
    setAssignedGroomers((prev) => [...prev, { task: "", groomer_id: "" }])

  const handleRemoveGroomerRow = (idx: number) =>
    setAssignedGroomers((prev) => prev.filter((_, i) => i !== idx))

  const handleGroomerRowChange = (idx: number, field: keyof AssignGroomerItem, value: string) =>
    setAssignedGroomers((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    )

  const handleSaveGroomers = async () => {
    for (const row of assignedGroomers) {
      if (!row.task.trim() || !row.groomer_id) {
        toast.error("Isi task dan pilih groomer untuk setiap baris")
        return
      }
    }
    setAssigningGroomer(true)
    try {
      await assignGroomerToBooking(id, { assigned_groomers: assignedGroomers })
      const refreshed = await getAdminBookingById(id)
      setBooking(refreshed.booking)
      setAssignedGroomers(refreshed.booking.assigned_groomers ?? [])
      toast.success("Groomer berhasil di-assign")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal assign groomer")
    } finally {
      setAssigningGroomer(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Booking tidak ditemukan</p>
        <Button asChild variant="outline">
          <Link href="/admin/bookings">Kembali ke Bookings</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/bookings"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Booking #{booking._id.slice(-6).toUpperCase()}
            </h1>
            <p className="text-sm text-muted-foreground">Dibuat {formatDateTime(booking.createdAt)}</p>
          </div>
        </div>
        {/* Status update controls */}
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-3">
            <Select value={selectedStatus} onValueChange={setSelectedStatus} disabled={updatingStatus}>
              <SelectTrigger className="w-[210px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge className={`${statusColors[booking.booking_status] ?? "bg-muted text-muted-foreground"} text-sm capitalize`}>
              {booking.booking_status}
            </Badge>
          </div>
          {/* Rescheduled inline fields */}
          {isRescheduled && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Tanggal baru</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={rescheduledDate}
                  onChange={(e) => setRescheduledDate(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Sesi baru</Label>
                <Select value={rescheduledTimeRange} onValueChange={setRescheduledTimeRange} disabled={storeSessions.length === 0}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Pilih sesi" />
                  </SelectTrigger>
                  <SelectContent>
                    {storeSessions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          {statusChanged && (
            <Button size="sm" onClick={handleSaveStatus} disabled={updatingStatus} className="self-end">
              {updatingStatus ? "Menyimpan..." : "Simpan Status"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Appointment Details */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Detail Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Tanggal</span>
                <p className="font-medium text-foreground">{formatDate(booking.date)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Waktu</span>
                <p className="font-medium text-foreground">{booking.time_range}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Tipe</span>
                <p className="font-medium capitalize text-foreground">{booking.type}</p>
              </div>
              {booking.store && (
                <div>
                  <span className="text-xs text-muted-foreground">Store</span>
                  <p className="font-medium text-foreground">{booking.store.name}</p>
                </div>
              )}
            </div>

            <div>
              <span className="text-xs text-muted-foreground">Layanan</span>
              <p className="font-medium text-foreground">
                {booking.service_snapshot.name}
                <span className="ml-2 text-xs text-muted-foreground">({booking.service_snapshot.code})</span>
              </p>
            </div>

            {booking.service_snapshot.addons.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Add-ons</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {booking.service_snapshot.addons.map((addon) => (
                    <Badge key={addon._id} variant="outline" className="text-xs">
                      {addon.name} ({formatPrice(addon.price)})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Subtotal layanan</span>
                <span className="text-right font-medium">{formatPrice(booking.sub_total_service)}</span>
                {booking.travel_fee > 0 && (
                  <>
                    <span className="text-muted-foreground">Biaya perjalanan</span>
                    <span className="text-right font-medium">{formatPrice(booking.travel_fee)}</span>
                  </>
                )}
                <span className="font-medium text-foreground">Total</span>
                <span className="text-right font-bold text-foreground">{formatPrice(booking.total_price)}</span>
              </div>
            </div>

            {booking.payment_method && (
              <div>
                <span className="text-xs text-muted-foreground">Metode Pembayaran</span>
                <p className="font-medium capitalize text-foreground">{booking.payment_method}</p>
              </div>
            )}

            {booking.note && (
              <div>
                <span className="text-xs text-muted-foreground">Catatan</span>
                <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm text-foreground">{booking.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer & Pet */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <User className="h-5 w-5 text-primary" />
              Customer &amp; Hewan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {booking.customer && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Nama</span>
                  <span className="font-medium">{booking.customer.username}</span>
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{booking.customer.email}</span>
                  <span className="text-muted-foreground">Telepon</span>
                  <span className="font-medium">{booking.customer.phone_number}</span>
                </div>
              </div>
            )}
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hewan Peliharaan</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{booking.pet_snapshot.name}</span>
                <span className="text-muted-foreground">Jenis</span>
                <span className="font-medium">{booking.pet_snapshot.pet_type?.name ?? "-"}</span>
                <span className="text-muted-foreground">Ukuran</span>
                <span className="font-medium">{booking.pet_snapshot.size?.name ?? "-"}</span>
                <span className="text-muted-foreground">Bulu</span>
                <span className="font-medium">{booking.pet_snapshot.hair?.name ?? "-"}</span>
                <span className="text-muted-foreground">Ras</span>
                <span className="font-medium">{booking.pet_snapshot.breed?.name ?? "-"}</span>
                <span className="text-muted-foreground">Member</span>
                <span className="font-medium">{booking.pet_snapshot.member_type?.name ?? "-"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assign Groomer */}
        <Card id="assign-groomer" className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <UserCheck className="h-5 w-5 text-primary" />
              Assign Groomer
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {assignedGroomers.length === 0 && (
              <p className="text-sm text-muted-foreground">Belum ada groomer yang di-assign.</p>
            )}
            {assignedGroomers.map((row, idx) => (
              <div key={idx} className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1">
                  <Label className="text-xs">Task</Label>
                  <Input
                    placeholder="washing, drying, cutting..."
                    value={row.task}
                    onChange={(e) => handleGroomerRowChange(idx, "task", e.target.value)}
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <Label className="text-xs">Groomer</Label>
                  <Select value={row.groomer_id} onValueChange={(v) => handleGroomerRowChange(idx, "groomer_id", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih groomer" />
                    </SelectTrigger>
                    <SelectContent>
                      {groomers.map((g) => (
                        <SelectItem key={g._id} value={g._id}>{g.username}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveGroomerRow(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleAddGroomerRow}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Tambah Groomer
              </Button>
              {assignedGroomers.length > 0 && (
                <Button type="button" size="sm" onClick={handleSaveGroomers} disabled={assigningGroomer}>
                  {assigningGroomer ? "Menyimpan..." : "Simpan Groomer"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Logs */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Riwayat Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booking.status_logs.length > 0 ? (
              <div className="flex flex-col gap-0">
                {booking.status_logs.map((log, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                      {idx < booking.status_logs.length - 1 && (
                        <div className="w-px flex-1 bg-border/60" />
                      )}
                    </div>
                    <div className="mb-4 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={`${statusColors[log.status] ?? "bg-muted text-muted-foreground"} capitalize text-xs`}>
                          {log.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</span>
                      </div>
                      {log.note && <p className="mt-1 text-sm text-foreground">{log.note}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Belum ada riwayat status</p>
            )}
          </CardContent>
        </Card>

        {/* Grooming Sessions */}
        {booking.sessions.length > 0 && (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Sesi Grooming
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-3">
                {booking.sessions.map((session) => (
                  <div key={session._id} className="rounded-lg border border-border/50 bg-muted/30 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium capitalize text-foreground">{session.type}</span>
                      <Badge
                        className={`text-xs capitalize ${
                          session.status === "finished"
                            ? "bg-secondary/60 text-secondary-foreground"
                            : session.status === "in progress"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {session.status}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {session.started_at && (
                        <>
                          <span>Mulai</span>
                          <span>{formatDateTime(session.started_at)}</span>
                        </>
                      )}
                      {session.finished_at && (
                        <>
                          <span>Selesai</span>
                          <span>{formatDateTime(session.finished_at)}</span>
                        </>
                      )}
                    </div>
                    {session.notes && <p className="mt-2 text-xs text-foreground">{session.notes}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
