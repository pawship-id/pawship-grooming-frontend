"use client"

import { bookings } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, MapPin, Scissors } from "lucide-react"

const activeStatusColors: Record<string, string> = {
  confirmed: "bg-secondary/60 text-secondary-foreground",
  "not-confirmed": "bg-accent/20 text-accent-foreground",
  "in-progress": "bg-primary/10 text-primary",
}

const historyStatusColors: Record<string, string> = {
  completed: "bg-secondary/60 text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
}

export default function CustomerOrderPage() {
  const { user } = useAuth()

  const activeBookings = bookings
    .filter(
      (booking) =>
        booking.customerId === user?.id &&
        booking.status !== "completed" &&
        booking.status !== "cancelled",
    )
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date)
      return a.timeStart.localeCompare(b.timeStart)
    })

  const historyBookings = bookings
    .filter(
      (booking) =>
        booking.customerId === user?.id &&
        (booking.status === "completed" || booking.status === "cancelled"),
    )
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.timeStart.localeCompare(a.timeStart)
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Order</h1>
        <p className="text-sm text-muted-foreground">Pantau dan lihat riwayat semua booking Anda.</p>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="mb-4">
          <TabsTrigger value="active">Sedang berjalan</TabsTrigger>
          <TabsTrigger value="history">Selesai</TabsTrigger>
        </TabsList>

        {/* ── Sedang berjalan ── */}
        <TabsContent value="active" className="space-y-3">
          {activeBookings.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Belum ada booking aktif untuk ditrack.
              </CardContent>
            </Card>
          ) : (
            activeBookings.map((booking) => (
              <Card key={booking.id} className="border-border/50">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{booking.petName}</p>
                      <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
                    </div>
                    <Badge className={activeStatusColors[booking.status] || "bg-muted text-muted-foreground"}>
                      {booking.status.replace("-", " ")}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {booking.timeStart} - {booking.timeEnd}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Scissors className="h-3.5 w-3.5" />
                      <span>{booking.groomerName}</span>
                    </div>
                    {booking.type === "home" && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Home visit</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ── Selesai ── */}
        <TabsContent value="history" className="space-y-3">
          {historyBookings.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Belum ada riwayat booking.
              </CardContent>
            </Card>
          ) : (
            historyBookings.map((booking) => (
              <Card key={booking.id} className="border-border/50">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">{booking.petName}</p>
                      <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
                    </div>
                    <Badge className={historyStatusColors[booking.status] || "bg-muted text-muted-foreground"}>
                      {booking.status.replace("-", " ")}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {booking.timeStart} - {booking.timeEnd}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
