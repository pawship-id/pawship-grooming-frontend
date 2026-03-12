"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Search, Filter } from "lucide-react"
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
  "grooming in progress": "bg-primary/10 text-primary",
  "grooming finished": "bg-secondary/60 text-secondary-foreground",
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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    getAdminBookings()
      .then((res) => setBookings(res.bookings))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = bookings.filter((b) => {
    const matchesSearch =
      (b.customer?.username ?? "").toLowerCase().includes(search.toLowerCase()) ||
      b.pet_snapshot.name.toLowerCase().includes(search.toLowerCase()) ||
      b.service_snapshot.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || b.booking_status === statusFilter
    return matchesSearch && matchesStatus
  })

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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by customer, pet, or service..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="arrived">Arrived</SelectItem>
                  <SelectItem value="grooming in progress">Grooming In Progress</SelectItem>
                  <SelectItem value="grooming finished">Grooming Finished</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Travel Fee</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      No bookings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((booking) => (
                    <TableRow key={booking._id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <Link href={`/admin/bookings/${booking._id}`} className="block">
                          {formatDate(booking.date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/bookings/${booking._id}`} className="block">
                          {booking.time_range}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/bookings/${booking._id}`} className="block font-medium">
                          {booking.customer?.username ?? "-"}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/bookings/${booking._id}`} className="block">
                          {booking.pet_snapshot.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/bookings/${booking._id}`} className="block">
                          {booking.service_snapshot.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/bookings/${booking._id}`} className="block">
                          <Badge variant="outline" className="capitalize">{booking.type}</Badge>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/admin/bookings/${booking._id}`} className="block">
                          <Badge className={statusColors[booking.booking_status] ?? "bg-muted text-muted-foreground"}>
                            <span className="capitalize">{booking.booking_status}</span>
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/bookings/${booking._id}`} className="block">
                          {booking.travel_fee > 0 ? formatPrice(booking.travel_fee) : "-"}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
