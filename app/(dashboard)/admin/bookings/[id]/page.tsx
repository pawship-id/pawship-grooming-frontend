"use client"

import { useEffect, useState } from "react"
import { use } from "react"
import Link from "next/link"
import { ArrowLeft, User, Calendar, Clock, ClipboardList, Plus, Trash2, Play, CheckCircle, Loader2, Truck, Gift, ImagePlus, PawPrint, Scissors, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  getAdminBookingById,
  updateBookingStatus,
  updateBookingSession,
  createBookingSession,
  startBookingSession,
  finishBookingSession,
  deleteBookingSession,
  uploadBookingMedia,
  deleteBookingMedia,
} from "@/lib/api/bookings"
import type { AdminBooking } from "@/lib/api/bookings"
import { getStoreById } from "@/lib/api/stores"
import { getUsers } from "@/lib/api/users"
import type { ApiUser } from "@/lib/api/users"

const statusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  waitlist: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  "driver on the way": "bg-blue-100 text-blue-700",
  "groomer on the way": "bg-blue-100 text-blue-700",
  arrived: "bg-primary/10 text-primary",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
  rescheduled: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
}

const ALL_STATUSES = [
  "requested",
  "waitlist",
  "confirmed",
  "driver on the way",
  "groomer on the way",
  "arrived",
  "in progress",
  "completed",
  "rescheduled",
  "cancelled",
]

const IN_STORE_MAIN_FLOW = ["requested", "confirmed", "arrived", "in progress", "completed"]
const IN_STORE_PICKUP_MAIN_FLOW = ["requested", "confirmed", "driver on the way", "arrived", "in progress", "completed"]
const IN_HOME_MAIN_FLOW = ["requested", "confirmed", "groomer on the way", "arrived", "in progress", "completed"]

const IN_STORE_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

const IN_STORE_PICKUP_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["driver on the way", "rescheduled", "cancelled"],
  "driver on the way": ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

const IN_HOME_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["groomer on the way", "rescheduled", "cancelled"],
  "groomer on the way": ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
}

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

  // Session management state
  const [groomers, setGroomers] = useState<ApiUser[]>([])
  const [newSessionType, setNewSessionType] = useState("")
  const [newSessionGroomerId, setNewSessionGroomerId] = useState("")
  const [addingSession, setAddingSession] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [confirmingStatus, setConfirmingStatus] = useState(false)

  // Session notes editing
  const [editingNoteSessionId, setEditingNoteSessionId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState("")
  const [internalNoteDraft, setInternalNoteDraft] = useState("")
  const [savingNotes, setSavingNotes] = useState(false)

  // Assign groomer modal
  const [assignGroomerSessionId, setAssignGroomerSessionId] = useState<string | null>(null)
  const [assignGroomerValue, setAssignGroomerValue] = useState("")
  const [savingGroomer, setSavingGroomer] = useState(false)

  // Booking-level media upload/delete
  const [uploadingMediaType, setUploadingMediaType] = useState<"before" | "after" | null>(null)
  const [deletingBookingMediaId, setDeletingBookingMediaId] = useState<string | null>(null)
  const [confirmDeleteMediaId, setConfirmDeleteMediaId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      getAdminBookingById(id),
      getUsers({ page: 1, limit: 200, role: "groomer" }),
    ])
      .then(([bookingRes, groomersRes]) => {
        const b = bookingRes.booking
        setBooking(b)
        setSelectedStatus("")
        setGroomers(groomersRes.users)
        if (b.store_id) {
          getStoreById(b.store_id)
            .then((storeRes) => setStoreSessions(storeRes.store.sessions ?? []))
            .catch(() => { })
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  const refreshBooking = async () => {
    const res = await getAdminBookingById(id)
    setBooking(res.booking)
    setSelectedStatus("")
  }

  const statusChanged = selectedStatus !== ""
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
      await refreshBooking()
      setRescheduledDate("")
      setRescheduledTimeRange("")
      toast.success(`Status diperbarui: ${selectedStatus}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status")
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddSession = async () => {
    if (!newSessionType.trim() || !newSessionGroomerId) {
      toast.error("Isi tipe sesi dan pilih groomer")
      return
    }
    setAddingSession(true)
    try {
      await createBookingSession(id, { type: newSessionType.trim(), groomer_id: newSessionGroomerId })
      await refreshBooking()
      setNewSessionType("")
      setNewSessionGroomerId("")
      toast.success("Sesi berhasil ditambahkan")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah sesi")
    } finally {
      setAddingSession(false)
    }
  }

  const handleStartSession = async (sessionId: string) => {
    try {
      await startBookingSession(id, sessionId)
      await refreshBooking()
      toast.success("Sesi dimulai")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulai sesi")
    }
  }

  const handleFinishSession = async (sessionId: string) => {
    try {
      await finishBookingSession(id, sessionId, {})
      await refreshBooking()
      toast.success("Sesi selesai")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyelesaikan sesi")
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteBookingSession(id, sessionId)
      await refreshBooking()
      toast.success("Sesi dihapus")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus sesi")
    }
  }

  const handleAssignGroomer = async () => {
    if (!assignGroomerSessionId || !assignGroomerValue) return
    setSavingGroomer(true)
    try {
      await updateBookingSession(id, assignGroomerSessionId, { groomer_id: assignGroomerValue })
      await refreshBooking()
      setAssignGroomerSessionId(null)
      setAssignGroomerValue("")
      toast.success("Groomer berhasil di-assign")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal assign groomer")
    } finally {
      setSavingGroomer(false)
    }
  }

  const handleUploadBookingMedia = async (file: File, type: "before" | "after") => {
    setUploadingMediaType(type)
    try {
      await uploadBookingMedia(id, file, type)
      await refreshBooking()
      toast.success(`Foto ${type} berhasil diupload`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengupload foto")
    } finally {
      setUploadingMediaType(null)
    }
  }

  const handleDeleteBookingMedia = async (mediaId: string) => {
    setDeletingBookingMediaId(mediaId)
    try {
      await deleteBookingMedia(id, mediaId)
      await refreshBooking()
      toast.success("Foto berhasil dihapus")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus foto")
    } finally {
      setDeletingBookingMediaId(null)
      setConfirmDeleteMediaId(null)
    }
  }

  const handleSaveNotes = async () => {
    if (!editingNoteSessionId) return
    setSavingNotes(true)
    try {
      await updateBookingSession(id, editingNoteSessionId, {
        notes: notesDraft,
        internal_note: internalNoteDraft,
      })
      await refreshBooking()
      setEditingNoteSessionId(null)
      toast.success("Catatan berhasil disimpan")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan catatan")
    } finally {
      setSavingNotes(false)
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

  const isInHome = booking.type === "in home"
  const isInStorePickup = !isInHome && booking.pick_up === true
  const MAIN_FLOW = isInHome ? IN_HOME_MAIN_FLOW : isInStorePickup ? IN_STORE_PICKUP_MAIN_FLOW : IN_STORE_MAIN_FLOW
  const ALLOWED_TRANSITIONS = isInHome ? IN_HOME_TRANSITIONS : isInStorePickup ? IN_STORE_PICKUP_TRANSITIONS : IN_STORE_TRANSITIONS
  const allowedNextStatuses = ALLOWED_TRANSITIONS[booking.booking_status] ?? []
  const hasInProgressSession = booking.sessions.some((s) => s.status === "in progress")
  const allSessionsFinished =
    booking.sessions.length === 0 || booking.sessions.every((s) => s.status === "finished")
  const canComplete = selectedStatus !== "completed" || allSessionsFinished

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
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
          {/* <Badge className={`${statusColors[booking.booking_status] ?? "bg-muted text-muted-foreground"} px-3 py-1.5 text-sm capitalize`}>
          {booking.booking_status}
        </Badge> */}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Booking */}
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                Status Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Status stepper */}
              <div className="flex items-center overflow-x-auto p-1">
                {MAIN_FLOW.map((status, idx) => {
                  const currentMainIdx = MAIN_FLOW.indexOf(booking.booking_status)
                  const isReached = currentMainIdx >= idx
                  return (
                    <div key={status} className="flex items-center">
                      <div
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize
                        ${isReached ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}
                      `}
                      >
                        {isReached && (
                          booking.booking_status === "in progress" && status === "in progress"
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CheckCircle className="h-3 w-3" />
                        )}
                        {status}
                      </div>
                      {idx < MAIN_FLOW.length - 1 && (
                        <div className={`mx-1.5 h-px w-6 shrink-0 ${isReached && currentMainIdx > idx ? "bg-primary" : "bg-border/50"}`} />
                      )}
                    </div>
                  )
                })}
                {(booking.booking_status === "cancelled" || booking.booking_status === "rescheduled" || booking.booking_status === "waitlist") && (
                  <>
                    <div className="mx-2 h-px w-4 shrink-0 bg-border/50" />
                    <div
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize ring-1
                      ${booking.booking_status === "cancelled" ? "bg-destructive/10 text-destructive ring-destructive/30" : booking.booking_status === "waitlist" ? "bg-yellow-100 text-yellow-800 ring-yellow-300" : "bg-accent/20 text-accent-foreground ring-accent/30"}
                    `}
                    >
                      {booking.booking_status}
                    </div>
                  </>
                )}
              </div>

              {/* Update status form */}
              <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">Ubah Status</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Status baru</Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={setSelectedStatus}
                      disabled={updatingStatus || allowedNextStatuses.length === 0}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Pilih status baru..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNextStatuses.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allowedNextStatuses.length === 0 && (
                      <p className="text-xs text-muted-foreground">Status tidak dapat diubah lagi.</p>
                    )}
                  </div>
                  {isRescheduled && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Tanggal baru</Label>
                        <Input
                          type="date"
                          className="h-9 w-[160px] text-sm"
                          value={rescheduledDate}
                          onChange={(e) => setRescheduledDate(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">Sesi baru</Label>
                        {storeSessions.length > 0 ? (
                          <Select value={rescheduledTimeRange} onValueChange={setRescheduledTimeRange}>
                            <SelectTrigger className="h-9 w-[160px] text-sm">
                              <SelectValue placeholder="Pilih sesi" />
                            </SelectTrigger>
                            <SelectContent>
                              {storeSessions.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-9 w-[160px] text-sm"
                            placeholder="mis. 08:00 - 10:00"
                            value={rescheduledTimeRange}
                            onChange={(e) => setRescheduledTimeRange(e.target.value)}
                          />
                        )}
                      </div>
                    </>
                  )}
                  <Button onClick={() => setConfirmingStatus(true)} disabled={updatingStatus || !statusChanged || !canComplete} size="sm">
                    Simpan Status
                  </Button>
                </div>
                {selectedStatus === "completed" && !allSessionsFinished && (
                  <p className="text-xs text-destructive">Semua sesi grooming harus selesai sebelum status dapat diubah menjadi completed.</p>
                )}
              </div>
            </CardContent>
          </Card>

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

              <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
                {/* Service row */}
                {(() => {
                  const b = booking.applied_benefits?.find(
                    (ab) =>
                      ab.applies_to === "service" ||
                      (ab.service_id != null && ab.service_id === booking.service_snapshot._id)
                  )
                  const isQuota = b?.benefit_type === "quota"
                  return (
                    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{booking.service_snapshot.name}</span>
                        {b && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            isQuota
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                              : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                          }`}>
                            {isQuota ? "Gratis" : (b.benefit_value != null ? `-${b.benefit_value}%` : "Diskon")}
                          </span>
                        )}
                      </div>
                      {b ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">{formatPrice(booking.service_snapshot.price)}</span>
                          <span className="font-semibold text-primary">
                            {isQuota ? "Gratis" : formatPrice(Math.max(0, booking.service_snapshot.price - b.amount_deducted))}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(booking.service_snapshot.price)}</span>
                      )}
                    </div>
                  )
                })()}
                {/* Addon rows */}
                {booking.service_snapshot.addons?.map((addon) => {
                  const b = booking.applied_benefits?.find((ab) => ab.service_id === addon._id)
                  const isQuota = b?.benefit_type === "quota"
                  return (
                    <div key={addon._id} className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">+ {addon.name}</span>
                        {b && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            isQuota
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                              : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                          }`}>
                            {isQuota ? "Gratis" : (b.benefit_value != null ? `-${b.benefit_value}%` : "Diskon")}
                          </span>
                        )}
                      </div>
                      {b ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">{formatPrice(addon.price)}</span>
                          <span className="font-semibold text-primary">
                            {isQuota ? "Gratis" : formatPrice(Math.max(0, addon.price - b.amount_deducted))}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(addon.price)}</span>
                      )}
                    </div>
                  )
                })}
                {/* Travel fee row */}
                {booking.travel_fee > 0 && (() => {
                  const b = booking.applied_benefits?.find(
                    (ab) => ab.applies_to === "pick_up" || ab.applies_to === "travel_fee" || ab.applies_to === "pickup"
                  )
                  const isQuota = b?.benefit_type === "quota"
                  return (
                    <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Truck className="h-3.5 w-3.5" />
                          Biaya Pickup
                        </span>
                        {b && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            isQuota
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                              : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                          }`}>
                            {isQuota ? "Gratis" : (b.benefit_value != null ? `-${b.benefit_value}%` : "Diskon")}
                          </span>
                        )}
                      </div>
                      {b ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">{formatPrice(booking.travel_fee)}</span>
                          <span className="font-semibold text-primary">
                            {isQuota ? "Gratis" : formatPrice(Math.max(0, booking.travel_fee - b.amount_deducted))}
                          </span>
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(booking.travel_fee)}</span>
                      )}
                    </div>
                  )
                })()}
                {/* Subtotal + Diskon Member — hanya jika ada diskon */}
                {booking.total_discount > 0 && (
                  <>
                    <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-semibold">
                      <span>Subtotal</span>
                      <span>{formatPrice(booking.original_total_price)}</span>
                    </div>
                    <div className="flex flex-col border-t border-primary/20 bg-primary/5">
                      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <span className="flex items-center gap-1.5 font-medium text-primary">
                          <Gift className="h-3.5 w-3.5" />
                          Diskon Member
                        </span>
                        <span className="font-semibold text-primary">- {formatPrice(booking.total_discount)}</span>
                      </div>
                      {booking.applied_benefits?.length > 1 && (
                        <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                          {booking.applied_benefits.map((ab, i) => (
                            <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="truncate pr-4">{ab.benefit?.label || ab.description || ab.applies_to}</span>
                              <span className="shrink-0">- {formatPrice(ab.amount_deducted)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {/* Total Akhir */}
                <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
                  <span>Total Akhir</span>
                  <span className="text-base">{formatPrice(booking.final_total_price ?? booking.original_total_price)}</span>
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
                <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {booking.customer.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="font-semibold text-foreground">{booking.customer.username}</p>
                    <p className="text-xs text-muted-foreground">{booking.customer.email}</p>
                    <p className="text-xs text-muted-foreground">{booking.customer.phone_number}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <PawPrint className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="font-semibold text-foreground">{booking.pet_snapshot.name}</p>
                    <p className="text-xs text-muted-foreground">{booking.pet_snapshot.breed?.name ?? "-"}</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {booking.pet_snapshot.pet_type && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{booking.pet_snapshot.pet_type.name}</span>
                    )}
                    {booking.pet_snapshot.size && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{booking.pet_snapshot.size.name}</span>
                    )}
                    {booking.pet_snapshot.hair && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">{booking.pet_snapshot.hair.name}</span>
                    )}
                    {booking.pet_snapshot.member_type && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{booking.pet_snapshot.member_type.name}</span>
                    )}
                  </div>
                </div>
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
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Clock className="h-5 w-5 text-primary" />
                Sesi Grooming
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {["requested", "waitlist", "rescheduled"].includes(booking.booking_status) && booking.sessions.some((s) => s.status === "not started") && (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Sesi grooming hanya dapat dimulai setelah booking <span className="font-medium text-foreground">dikonfirmasi</span>.
                </p>
              )}
              {hasInProgressSession && booking.sessions.some((s) => s.status === "not started") && (
                <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  Selesaikan sesi yang sedang berjalan sebelum memulai sesi berikutnya.
                </p>
              )}
              {booking.sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">Belum ada sesi grooming.</p>
              )}
              {booking.sessions.map((session, idx) => {
                const isEditingNotes = editingNoteSessionId === session._id

                return (
                  <div key={session._id ?? idx} className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-3">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium capitalize text-foreground">{session.type}</span>
                        <Badge
                          className={`text-xs capitalize ${session.status === "finished"
                            ? "bg-secondary/60 text-secondary-foreground"
                            : session.status === "in progress"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                            }`}
                        >
                          {session.status}
                        </Badge>
                      </div>
                      {session._id && (
                        <div className="flex shrink-0 gap-2">
                          {session.status === "not started" && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartSession(session._id!)}
                                disabled={
                                  ["requested", "waitlist", "rescheduled", "cancelled", "completed"].includes(booking.booking_status) ||
                                  hasInProgressSession ||
                                  booking.sessions.slice(0, idx).some((s) => s.status !== "finished")
                                }
                              >
                                <Play className="mr-1.5 h-3.5 w-3.5" />
                                Mulai
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => setDeletingSessionId(session._id!)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {session.status === "in progress" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleFinishSession(session._id!)}
                            >
                              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                              Selesai
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Groomer assignment */}
                    <div className="flex flex-wrap items-center gap-2">
                      {session.groomer_detail ? (
                        <>
                          <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                            <Scissors className="h-3 w-3" />
                            {session.groomer_detail.username}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setAssignGroomerSessionId(session._id!)
                              setAssignGroomerValue(session.groomer_id ?? "")
                            }}
                          >
                            Ganti Groomer
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                            Belum ada groomer
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setAssignGroomerSessionId(session._id!)
                              setAssignGroomerValue("")
                            }}
                          >
                            Assign Groomer
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Timestamps */}
                    {(session.started_at || session.finished_at) && (
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {session.started_at && <span>Mulai: {formatDateTime(session.started_at)}</span>}
                        {session.finished_at && <span>Selesai: {formatDateTime(session.finished_at)}</span>}
                      </div>
                    )}

                    {/* Notes section */}
                    {isEditingNotes ? (
                      <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-background p-3">
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Catatan</Label>
                          <Textarea
                            placeholder="Catatan sesi..."
                            value={notesDraft}
                            onChange={(e) => setNotesDraft(e.target.value)}
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <Label className="text-xs">Catatan Internal</Label>
                          <Textarea
                            placeholder="Catatan internal (hanya untuk admin)..."
                            value={internalNoteDraft}
                            onChange={(e) => setInternalNoteDraft(e.target.value)}
                            className="min-h-[60px] text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                            {savingNotes ? "Menyimpan..." : "Simpan Catatan"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingNoteSessionId(null)}>
                            Batal
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          {session.notes ? (
                            <p className="text-xs text-foreground">Note: {session.notes}</p>
                          ) : (
                            <p className="text-xs italic text-muted-foreground">Belum ada catatan</p>
                          )}
                          {session.internal_note ? (
                            <p className="mt-1 text-xs text-muted-foreground">Internal: {session.internal_note}</p>
                          ) : (
                            <p className="mt-1 text-xs italic text-muted-foreground">Belum ada catatan internal</p>
                          )}
                        </div>
                        {session._id && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 shrink-0 px-2 text-xs"
                            onClick={() => {
                              setEditingNoteSessionId(session._id!)
                              setNotesDraft(session.notes ?? "")
                              setInternalNoteDraft(session.internal_note ?? "")
                            }}
                          >
                            Edit Catatan
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add session form */}
              {booking.booking_status !== "completed" && booking.booking_status !== "cancelled" && (
                <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/50 p-3 sm:flex-row sm:items-end">
                  <div className="flex flex-1 flex-col gap-1">
                    <Label className="text-xs">Tipe sesi</Label>
                    <Input
                      placeholder="bathing, drying, styling..."
                      value={newSessionType}
                      onChange={(e) => setNewSessionType(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Label className="text-xs">Groomer</Label>
                    <Select value={newSessionGroomerId} onValueChange={setNewSessionGroomerId}>
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
                    size="sm"
                    onClick={handleAddSession}
                    disabled={addingSession}
                    className="shrink-0"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    {addingSession ? "Menyimpan..." : "Tambah Sesi"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Foto Grooming */}
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <ImagePlus className="h-5 w-5 text-primary" />
                Foto Grooming
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {/* Before photos */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Foto Before</p>
                  <label className={`cursor-pointer ${uploadingMediaType === "before" ? "pointer-events-none opacity-60" : ""}`}>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <span>
                        {uploadingMediaType === "before" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
                        Upload Before
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadBookingMedia(file, "before")
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(booking.media ?? []).filter((m) => m.type === "before").map((m, i) => (
                    <div key={m.public_id ?? m._id ?? i} className="relative h-20 w-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.secure_url ?? m.url ?? ""} alt="before" className="h-20 w-20 rounded-lg border border-border/50 object-cover" />
                      <button
                        onClick={() => setConfirmDeleteMediaId(m.public_id ?? "")}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(booking.media ?? []).filter((m) => m.type === "before").length === 0 && (
                    <p className="text-sm italic text-muted-foreground">Belum ada foto before</p>
                  )}
                </div>
              </div>

              {/* After photos */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Foto After</p>
                  <label className={`cursor-pointer ${uploadingMediaType === "after" ? "pointer-events-none opacity-60" : ""}`}>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <span>
                        {uploadingMediaType === "after" ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
                        Upload After
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleUploadBookingMedia(file, "after")
                        e.target.value = ""
                      }}
                    />
                  </label>
                </div>
                <div className="flex flex-wrap gap-3">
                  {(booking.media ?? []).filter((m) => m.type === "after").map((m, i) => (
                    <div key={m.public_id ?? m._id ?? i} className="relative h-20 w-20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.secure_url ?? m.url ?? ""} alt="after" className="h-20 w-20 rounded-lg border border-border/50 object-cover" />
                      <button
                        onClick={() => setConfirmDeleteMediaId(m.public_id ?? "")}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(booking.media ?? []).filter((m) => m.type === "after").length === 0 && (
                    <p className="text-sm italic text-muted-foreground">Belum ada foto after</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmingStatus} onOpenChange={setConfirmingStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Status booking akan diubah menjadi{" "}
              <span className="font-semibold capitalize text-foreground">{selectedStatus}</span>.
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmingStatus(false)
                handleSaveStatus()
              }}
            >
              Ya, Ubah Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingSessionId} onOpenChange={(open) => { if (!open) setDeletingSessionId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Sesi?</AlertDialogTitle>
            <AlertDialogDescription>
              Sesi ini akan dihapus secara permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingSessionId) handleDeleteSession(deletingSessionId)
                setDeletingSessionId(null)
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!assignGroomerSessionId}
        onOpenChange={(open) => {
          if (!open) {
            setAssignGroomerSessionId(null)
            setAssignGroomerValue("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Groomer</AlertDialogTitle>
            <AlertDialogDescription>Pilih groomer untuk sesi ini</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select value={assignGroomerValue} onValueChange={setAssignGroomerValue}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih groomer..." />
              </SelectTrigger>
              <SelectContent>
                {groomers.map((g) => (
                  <SelectItem key={g._id} value={g._id}>{g.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAssignGroomer} disabled={savingGroomer || !assignGroomerValue}>
              {savingGroomer ? "Menyimpan..." : "Simpan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteMediaId} onOpenChange={(open) => { if (!open) setConfirmDeleteMediaId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Foto?</AlertDialogTitle>
            <AlertDialogDescription>Foto ini akan dihapus secara permanen dan tidak dapat dikembalikan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDeleteMediaId) handleDeleteBookingMedia(confirmDeleteMediaId) }}
              disabled={!!deletingBookingMediaId}
            >
              {deletingBookingMediaId ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

