"use client"

import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Calendar, Clock, MapPin, User, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { bookings } from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  confirmed: "bg-secondary/60 text-secondary-foreground",
  "not-confirmed": "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  "in-progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
}

const jobStatusColors: Record<string, string> = {
  pending: "bg-accent/20 text-accent-foreground",
  started: "bg-primary/10 text-primary",
  finished: "bg-secondary/60 text-secondary-foreground",
}

export default function GroomerDashboard() {
  const { user } = useAuth()

  const myBookings = bookings
    .filter((b) => b.groomerId === user?.id && b.status !== "cancelled")
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeStart.localeCompare(b.timeStart)
    })

  const activeJobs = myBookings.filter((b) => b.jobStatus !== "finished")
  const completedJobs = myBookings.filter((b) => b.jobStatus === "finished")

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
          {activeJobs.map((booking) => (
            <Link key={booking.id} href={`/groomer/jobs/${booking.id}`}>
              <Card className="border-border/50 transition-all hover:border-primary/30 hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="font-display text-lg font-bold text-foreground">
                        {booking.petName}
                      </span>
                      <span className="text-sm text-muted-foreground">{booking.serviceName}</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={jobStatusColors[booking.jobStatus]}>
                        {booking.jobStatus}
                      </Badge>
                      <Badge variant="outline" className="capitalize">{booking.type}</Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{booking.timeStart} - {booking.timeEnd}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      <span>{booking.customerName}</span>
                    </div>
                    {booking.type === "home" && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Home visit</span>
                      </div>
                    )}
                  </div>

                  {booking.requestNotes && (
                    <p className="rounded-md bg-muted/50 p-2 text-sm text-muted-foreground">
                      {booking.requestNotes}
                    </p>
                  )}

                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    View Details <ArrowRight className="h-3 w-3" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {completedJobs.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold text-foreground">Completed</h2>
          {completedJobs.map((booking) => (
            <Link key={booking.id} href={`/groomer/jobs/${booking.id}`}>
              <Card className="border-border/50 opacity-75 transition-all hover:opacity-100">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-foreground">{booking.petName} - {booking.serviceName}</span>
                    <span className="text-xs text-muted-foreground">{booking.date} {booking.timeStart}</span>
                  </div>
                  <Badge className={statusColors[booking.status]}>
                    {booking.status.replace("-", " ")}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {myBookings.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">No jobs assigned yet</p>
        </div>
      )}
    </div>
  )
}
