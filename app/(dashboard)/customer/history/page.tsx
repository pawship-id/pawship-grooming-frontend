"use client"

import { bookings } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"

const historyStatusColors: Record<string, string> = {
  completed: "bg-secondary/60 text-secondary-foreground",
  cancelled: "bg-destructive/10 text-destructive",
}

export default function CustomerHistoryPage() {
  const { user } = useAuth()

  const historyBookings = bookings
    .filter((booking) => booking.customerId === user?.id && (booking.status === "completed" || booking.status === "cancelled"))
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date)
      return b.timeStart.localeCompare(a.timeStart)
    })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Booking History</h1>
        <p className="text-sm text-muted-foreground">Riwayat booking yang sudah selesai atau dibatalkan.</p>
      </div>

      {historyBookings.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Belum ada riwayat booking.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {historyBookings.map((booking) => (
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
                    <span>{booking.timeStart} - {booking.timeEnd}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
