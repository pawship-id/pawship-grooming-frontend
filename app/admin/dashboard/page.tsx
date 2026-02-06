"use client"

import { CalendarDays, Users, Package, Scissors, Clock, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { bookings, customers, products, groomers } from "@/lib/mock-data"

const statusColors: Record<string, string> = {
  confirmed: "bg-secondary/60 text-secondary-foreground",
  "not-confirmed": "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  "in-progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
}

export default function AdminDashboard() {
  const todayBookings = bookings.filter((b) => b.date === "2026-02-07" || b.date === "2026-02-06")
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length
  const pendingCount = bookings.filter((b) => b.status === "not-confirmed").length

  const stats = [
    { title: "Total Bookings", value: bookings.length, icon: CalendarDays, color: "text-primary" },
    { title: "Customers", value: customers.length, icon: Users, color: "text-primary" },
    { title: "Services", value: products.filter((p) => p.isActive).length, icon: Package, color: "text-accent-foreground" },
    { title: "Active Groomers", value: groomers.filter((g) => g.isActive).length, icon: Scissors, color: "text-secondary-foreground" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your pet grooming business</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-border/50">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-secondary-foreground" />
                <span className="text-sm font-medium text-foreground">Confirmed Bookings</span>
              </div>
              <span className="font-display text-lg font-bold text-foreground">{confirmedCount}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-accent-foreground" />
                <span className="text-sm font-medium text-foreground">Pending Confirmation</span>
              </div>
              <span className="font-display text-lg font-bold text-foreground">{pendingCount}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold">Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {todayBookings.slice(0, 4).map((booking) => (
              <div
                key={booking.id}
                className="flex items-center justify-between rounded-lg border border-border/50 p-3"
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-foreground">
                    {booking.petName} ({booking.customerName})
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {booking.serviceName} - {booking.timeStart}
                  </span>
                </div>
                <Badge variant="secondary" className={statusColors[booking.status]}>
                  {booking.status.replace("-", " ")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
