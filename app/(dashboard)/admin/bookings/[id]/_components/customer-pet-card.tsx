"use client";

import { User, PawPrint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminBooking } from "@/lib/api/bookings";

interface CustomerPetCardProps {
  booking: AdminBooking;
}

export function CustomerPetCard({ booking }: CustomerPetCardProps) {
  return (
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
              <p className="font-semibold text-foreground">
                {booking.customer.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {booking.customer.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {booking.customer.phone_number}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
            <PawPrint className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col gap-2">
            <div>
              <p className="font-semibold text-foreground">
                {booking.pet_snapshot.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {booking.pet_snapshot.breed?.name ?? "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {booking.pet_snapshot.pet_type && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                  {booking.pet_snapshot.pet_type.name}
                </span>
              )}
              {booking.pet_snapshot.size && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                  {booking.pet_snapshot.size.name}
                </span>
              )}
              {booking.pet_snapshot.hair && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                  {booking.pet_snapshot.hair.name}
                </span>
              )}
              {booking.pet_snapshot.member_type && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {booking.pet_snapshot.member_type.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
