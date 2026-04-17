"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatDateTime } from "@/lib/format";

interface BookingHeaderProps {
  bookingId: string;
  createdAt: string;
}

export function BookingHeader({ bookingId, createdAt }: BookingHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/bookings"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Booking #{bookingId.slice(-6).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground">
            Dibuat {formatDateTime(createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
