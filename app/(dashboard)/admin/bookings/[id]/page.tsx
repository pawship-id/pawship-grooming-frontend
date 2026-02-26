"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, User, Calendar, Clock, MapPin, FileText, ImageIcon as Image, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { bookings } from "@/lib/mock-data"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
  confirmed: "bg-secondary/60 text-secondary-foreground",
  "not-confirmed": "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
  "in-progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

export default function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const booking = bookings.find((b) => b.id === id)

  if (!booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Booking not found</p>
        <Button asChild variant="outline">
          <Link href="/admin/bookings">Back to Bookings</Link>
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
            <h1 className="font-display text-2xl font-bold text-foreground">Booking {booking.id}</h1>
            <p className="text-sm text-muted-foreground">Created {booking.createdAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            defaultValue={booking.status}
            onValueChange={(value) => {
              toast.success(`Status updated to ${value.replace("-", " ")}`)
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="not-confirmed">Not Confirmed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Badge className={`${statusColors[booking.status]} text-sm`}>
            {booking.status.replace("-", " ")}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Booking Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Appointment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Date</span>
                <p className="font-medium text-foreground">{booking.date}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Time</span>
                <p className="font-medium text-foreground">{booking.timeStart} - {booking.timeEnd}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Type</span>
                <p className="font-medium capitalize text-foreground">{booking.type}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Job Status</span>
                <p className="font-medium capitalize text-foreground">{booking.jobStatus}</p>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Service</span>
              <p className="font-medium text-foreground">{booking.serviceName}</p>
            </div>
            {booking.addOnNames.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Add-ons</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {booking.addOnNames.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {booking.travelFee > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Travel Fee</span>
                <p className="font-medium text-foreground">{formatPrice(booking.travelFee)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer & Pet Info */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <User className="h-5 w-5 text-primary" />
              Customer & Pet
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Customer</span>
                <p className="font-medium text-foreground">{booking.customerName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Status</span>
                <p className="font-medium text-foreground">{booking.customerStatus}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Pet</span>
                <p className="font-medium text-foreground">{booking.petName}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Groomer</span>
                <p className="font-medium text-foreground">{booking.groomerName}</p>
              </div>
            </div>
            {booking.requestNotes && (
              <div>
                <span className="text-xs text-muted-foreground">Request Notes</span>
                <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm text-foreground">{booking.requestNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pre-Conditions */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <AlertTriangle className="h-5 w-5 text-accent-foreground" />
              Pre-existing Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booking.preConditions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {booking.preConditions.map((pc) => (
                  <div key={pc.id} className="rounded-lg border border-accent/30 bg-accent/10 p-3">
                    <p className="text-sm text-foreground">{pc.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Flagged by {pc.flaggedBy} on {new Date(pc.flaggedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No pre-existing conditions flagged</p>
            )}
          </CardContent>
        </Card>

        {/* Media */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Image className="h-5 w-5 text-primary" />
              Before / After Media
            </CardTitle>
          </CardHeader>
          <CardContent>
            {booking.media.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {booking.media.map((m) => (
                  <div key={m.id} className="flex flex-col gap-2">
                    <Badge variant="outline" className="w-fit capitalize">{m.type}</Badge>
                    <div className="aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted">
                      <img
                        src={m.url || "/placeholder.svg"}
                        alt={`${m.type} photo`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.uploadedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No media uploaded yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
