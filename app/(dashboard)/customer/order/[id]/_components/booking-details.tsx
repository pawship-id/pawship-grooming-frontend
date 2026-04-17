"use client";

import {
  Calendar,
  Clock,
  MapPin,
  Scissors,
  Store,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatPrice } from "@/lib/format";
import type { AdminBooking } from "@/lib/api/bookings";

interface BookingDetailsProps {
  booking: AdminBooking;
  groomerName: string;
}

export function BookingDetails({ booking, groomerName }: BookingDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Booking Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Date
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary/60" />
              <span className="text-sm font-medium">
                {formatDate(booking.date)}
              </span>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Time
            </label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary/60" />
              <span className="text-sm font-medium">{booking.time_range}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Groomer
          </label>
          <div className="flex items-center gap-2">
            <Scissors className="h-4 w-4 text-primary/60" />
            <span className="text-sm font-medium">{groomerName}</span>
          </div>
        </div>

        {booking.store && (
          <>
            <Separator />
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Store Location
              </label>
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary/60" />
                <span className="text-sm font-medium">
                  {booking.store.name}
                </span>
              </div>
            </div>
          </>
        )}

        {booking.travel_fee > 0 && (
          <>
            <Separator />
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Travel Fee
              </label>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary/60" />
                <span className="text-sm font-medium">
                  {formatPrice(booking.travel_fee)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
