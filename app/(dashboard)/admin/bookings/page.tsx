"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { getAdminBookings } from "@/lib/api/bookings"
import type { AdminBooking } from "@/lib/api/bookings"

const statusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  arrived: "bg-primary/10 text-primary",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
  rescheduled: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
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
    month: "short",
    year: "numeric",
  })
}

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10)
}

type DatePreset = "today" | "week" | "month" | "custom" | ""

function getPresetRange(preset: DatePreset): { from: string; to: string } | null {
  const now = new Date()
  if (preset === "today") {
    const d = toYMD(now)
    return { from: d, to: d }
  }
  if (preset === "week") {
    const day = now.getDay()
    const diffToMon = (day === 0 ? -6 : 1 - day)
    const mon = new Date(now)
    mon.setDate(now.getDate() + diffToMon)
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: toYMD(mon), to: toYMD(sun) }
  }
  if (preset === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return { from: toYMD(first), to: toYMD(last) }
  }
  return null
}

const LIMIT = 20

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [createdByFilter, setCreatedByFilter] = useState<string>("all")
  const [datePreset, setDatePreset] = useState<DatePreset>("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT))

  const fetchBookings = useCallback(
    (page: number) => {
      setLoading(true)
      const presetRange = getPresetRange(datePreset)
      const from = datePreset === "custom" ? dateFrom : (presetRange?.from ?? "")
      const to = datePreset === "custom" ? dateTo : (presetRange?.to ?? "")

      getAdminBookings({
        page,
        limit: LIMIT,
        status: statusFilter === "all" ? undefined : statusFilter,
        date_from: from || undefined,
        date_to: to || undefined,
        created_by_role: createdByFilter === "all" ? undefined : createdByFilter,
      })
        .then((res) => {
          setBookings(res.bookings)
          setTotalCount(res.total ?? 0)
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    },
    [statusFilter, createdByFilter, datePreset, dateFrom, dateTo],
  )

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, createdByFilter, datePreset, dateFrom, dateTo])

  useEffect(() => {
    fetchBookings(currentPage)
  }, [fetchBookings, currentPage])

  const filtered = bookings.filter((b) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (b.customer?.username ?? "").toLowerCase().includes(q) ||
      b.pet_snapshot.name.toLowerCase().includes(q) ||
      b.service_snapshot.name.toLowerCase().includes(q)
    )
  })

  function handlePreset(preset: DatePreset) {
    setDatePreset((prev) => (prev === preset ? "" : preset))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Bookings</h1>
          <p className="text-sm text-muted-foreground">Manage all grooming appointments</p>
        </div>
        <Button asChild>
          <Link href="/admin/bookings/new">
            <Plus className="mr-2 h-4 w-4" />
            New Booking
          </Link>
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari customer, hewan, atau layanan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filters row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="requested">Requested</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="arrived">Arrived</SelectItem>
                    <SelectItem value="in progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Dibuat Oleh</label>
                <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
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

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Tanggal Booking</label>
                <div className="flex flex-wrap gap-1">
                  {(["today", "week", "month", "custom"] as DatePreset[]).map((preset) => (
                    <Button
                      key={preset}
                      variant={datePreset === preset ? "default" : "outline"}
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handlePreset(preset)}
                    >
                      {preset === "today" ? "Hari Ini" : preset === "week" ? "Minggu Ini" : preset === "month" ? "Bulan Ini" : "Custom"}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom date range */}
            {datePreset === "custom" && (
              <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Dari</label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-[150px] text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Sampai</label>
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
            {(statusFilter !== "all" || createdByFilter !== "all" || datePreset !== "") && (
              <div className="flex items-center justify-between border-t pt-2">
                <div className="flex flex-wrap gap-1">
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs capitalize">{statusFilter}</Badge>
                  )}
                  {createdByFilter !== "all" && (
                    <Badge variant="secondary" className="text-xs capitalize">{createdByFilter}</Badge>
                  )}
                  {datePreset !== "" && datePreset !== "custom" && (
                    <Badge variant="secondary" className="text-xs">
                      {datePreset === "today" ? "Hari Ini" : datePreset === "week" ? "Minggu Ini" : "Bulan Ini"}
                    </Badge>
                  )}
                  {datePreset === "custom" && (dateFrom || dateTo) && (
                    <Badge variant="secondary" className="text-xs">
                      {dateFrom || "…"} → {dateTo || "…"}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground"
                  onClick={() => {
                    setStatusFilter("all")
                    setCreatedByFilter("all")
                    setDatePreset("")
                    setDateFrom("")
                    setDateTo("")
                  }}
                >
                  Reset semua
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tgl Booking</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Hewan</TableHead>
                  <TableHead>Layanan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Dibuat</TableHead>
                  <TableHead className="text-right">Harga</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Tidak ada booking ditemukan
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((booking) => (
                    <TableRow
                      key={booking._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/admin/bookings/${booking._id}`)}
                    >
                      <TableCell>{formatDate(booking.date)}</TableCell>
                      <TableCell className="whitespace-nowrap">{booking.time_range}</TableCell>
                      <TableCell className="font-medium">{booking.customer?.username ?? "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{booking.pet_snapshot.name}</span>
                          <span className="text-xs text-muted-foreground capitalize">{booking.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{booking.service_snapshot.name}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[booking.booking_status] ?? "bg-muted text-muted-foreground"}>
                          <span className="capitalize">{booking.booking_status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {booking.created_by_role === "admin" ? (
                            <Badge variant="secondary" className="w-fit text-xs">Admin</Badge>
                          ) : booking.created_by_role === "customer" ? (
                            <Badge variant="outline" className="w-fit text-xs">Customer</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(booking.createdAt)}</span>
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

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {totalCount} booking
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1 || loading}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm">
                Halaman {currentPage} dari {totalPages}
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
    </div>
  )
}
