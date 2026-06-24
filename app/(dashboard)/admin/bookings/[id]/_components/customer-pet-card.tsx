"use client";

import Link from "next/link";
import { User, PawPrint, StickyNote } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminBooking } from "@/lib/api/bookings";

interface CustomerPetCardProps {
  booking: AdminBooking;
}

export function CustomerPetCard({ booking }: CustomerPetCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
          <User className="h-5 w-5 text-primary" />
          Customer &amp; Hewan
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {booking.customer && (
          <Link
            href={`/admin/users/${booking.customer_id}/detail`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-xl bg-muted/40 p-4 transition-colors hover:bg-muted/70"
          >
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
          </Link>
        )}
        <Link
          href={`/admin/users/${booking.customer_id}/pets`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-xl bg-muted/40 p-4 transition-colors hover:bg-muted/70"
        >
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
        </Link>
        {booking.pet_snapshot.internal_note && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Internal Note Pet
              </p>
              <p className="text-sm text-amber-900/90 dark:text-amber-100 whitespace-pre-wrap break-words">
                {booking.pet_snapshot.internal_note}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
