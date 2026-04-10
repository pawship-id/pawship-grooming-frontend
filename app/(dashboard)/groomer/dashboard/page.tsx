"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Calendar, Clock, MapPin, User, ArrowRight, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { getGroomerMyJobs, type AdminBooking } from "@/lib/api/bookings"

const sessionStatusColors: Record<string, string> = {
  "not started": "bg-accent/20 text-accent-foreground",
  "in progress": "bg-primary/10 text-primary",
  finished: "bg-secondary/60 text-secondary-foreground",
}

const bookingStatusColors: Record<string, string> = {
  confirmed: "bg-secondary/60 text-secondary-foreground",
  requested: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
}

function getOverallSessionStatus(booking: AdminBooking): string {
  const sessions = booking.sessions || []
  if (sessions.length === 0) return booking.booking_status
  if (sessions.every((s) => s.status === "finished")) return "finished"
  if (sessions.some((s) => s.status === "in progress")) return "in progress"
  return "not started"
}

export default function GroomerDashboard() {
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getGroomerMyJobs({ limit: 50 })
      setBookings(res.bookings)
    } catch (err: any) {
      setError(err.message || "Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const activeJobs = bookings.filter((b) => getOverallSessionStatus(b) !== "finished")
  const completedJobs = bookings.filter((b) => getOverallSessionStatus(b) === "finished")

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-destructive">{error}</p>
        <button onClick={fetchJobs} className="text-sm font-medium text-primary underline">
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">My Jobs</h1>
        <p className="text-sm text-muted-foreground">
          You have {activeJobs.length} active {activeJobs.length === 1 ? "job" : "jobs"}
        </p>
      </div>

      {activeJobs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Active & Upcoming</h2>
          {activeJobs.map((booking) => {
            const overallStatus = getOverallSessionStatus(booking)
            return (
              <Link key={booking._id} href={`/groomer/jobs/${booking._id}`}>
                <Card className="border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="font-display text-lg font-bold text-foreground">
                          {booking.pet_snapshot?.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {booking.service_snapshot?.name}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={sessionStatusColors[overallStatus] || "bg-muted"}>
                          {overallStatus}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {booking.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{booking.date?.split("T")[0]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{booking.time_range}</span>
                      </div>
                      {booking.customer && (
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          <span>{booking.customer.username}</span>
                        </div>
                      )}
                      {booking.type === "in home" && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <span>Home visit</span>
                        </div>
                      )}
                    </div>

                    {booking.note && (
                      <p className="rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                        {booking.note}
                      </p>
                    )}

                    <div className="flex items-center gap-1 text-xs font-medium text-primary">
                      View Details <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {completedJobs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Completed</h2>
          {completedJobs.map((booking) => (
            <Link key={booking._id} href={`/groomer/jobs/${booking._id}`}>
              <Card className="border-border/50 opacity-75 transition-all hover:opacity-100">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">
                      {booking.pet_snapshot?.name} - {booking.service_snapshot?.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {booking.date?.split("T")[0]} {booking.time_range}
                    </span>
                  </div>
                  <Badge className={bookingStatusColors[booking.booking_status] || "bg-muted"}>
                    {booking.booking_status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {bookings.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No jobs assigned yet</p>
        </div>
      )}
    </div>
  )
}
