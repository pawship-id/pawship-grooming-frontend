"use client";

import Link from "next/link";
import { Clock, MapPin, PawPrint, Scissors, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminBooking } from "@/lib/api/bookings";
import { parseTimeRange, sameDay, statusColors, toYMD, weekDays } from "./utils";

export type SchedulerView = "day" | "week";

interface Props {
  view: SchedulerView;
  anchorDate: Date;
  bookings: AdminBooking[];
}

export function Scheduler({ view, anchorDate, bookings }: Props) {
  const days = view === "day" ? [anchorDate] : weekDays(anchorDate);

  // Bucket bookings by date and sort each bucket by start time so the
  // earliest sessions show on top of each column.
  const bookingsByDay = new Map<string, AdminBooking[]>();
  for (const b of bookings) {
    const key = toYMD(new Date(b.date));
    const arr = bookingsByDay.get(key) ?? [];
    arr.push(b);
    bookingsByDay.set(key, arr);
  }
  for (const arr of bookingsByDay.values()) {
    arr.sort(
      (a, b) =>
        parseTimeRange(a.time_range).startMin -
        parseTimeRange(b.time_range).startMin,
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        view === "day" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7",
      )}
    >
      {days.map((d) => (
        <DayColumn
          key={d.toISOString()}
          date={d}
          bookings={bookingsByDay.get(toYMD(d)) ?? []}
        />
      ))}
    </div>
  );
}

function DayColumn({
  date,
  bookings,
}: {
  date: Date;
  bookings: AdminBooking[];
}) {
  const isToday = sameDay(date, new Date());

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-border/50 bg-card",
        isToday && "border-primary/50 ring-1 ring-primary/30",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-border/50 px-2.5 py-1.5",
          isToday && "bg-primary/5",
        )}
      >
        <div className="flex flex-col">
          <span
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide",
              isToday ? "text-primary" : "text-muted-foreground",
            )}
          >
            {date.toLocaleDateString("id-ID", { weekday: "short" })}
          </span>
          <span className="text-xs font-bold text-foreground">
            {date.toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            })}
          </span>
        </div>
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            isToday
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {bookings.length}
        </span>
      </div>

      <div className="flex max-h-[calc(100vh-22rem)] flex-col gap-1.5 overflow-y-auto p-1.5">
        {bookings.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-6 text-center text-[11px] text-muted-foreground">
            Tidak ada booking
          </div>
        ) : (
          bookings.map((b) => <BookingCard key={b._id} booking={b} />)
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking }: { booking: AdminBooking }) {
  // A booking can have multiple sessions, each potentially handled by a
  // different groomer. Collect every assigned groomer's name and de-dupe so
  // the card lists everyone working on this booking, not just the first.
  const groomerNames = Array.from(
    new Set(
      (booking.sessions ?? [])
        .map(
          (s) =>
            s.groomer_detail?.username ??
            (typeof s.groomer_id === "object"
              ? s.groomer_id?.username
              : null),
        )
        .filter((v): v is string => !!v),
    ),
  );
  const groomer = groomerNames.length > 0 ? groomerNames.join(", ") : null;

  return (
    <Link
      href={`/admin/bookings/${booking._id}`}
      className={cn(
        "block rounded-md border px-2 py-1.5 text-[11px] leading-tight shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring",
        statusColors[booking.booking_status] ??
          "bg-muted text-muted-foreground border-border",
      )}
      title={`${booking.booking_status} · ${booking.time_range} · ${booking.pet_snapshot.name} · ${booking.service_snapshot.name}`}
    >
      <span className="mb-1 inline-block max-w-full truncate rounded-full border border-current/30 bg-background/60 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide">
        {booking.booking_status}
      </span>
      <div className="flex items-center gap-1 font-semibold">
        <Clock className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate">{booking.time_range || "-"}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1 truncate">
        <PawPrint className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate font-medium">
          {booking.pet_snapshot.name}
        </span>
      </div>
      <div className="flex items-center gap-1 truncate opacity-90">
        <Scissors className="h-2.5 w-2.5 shrink-0" />
        <span className="truncate">{booking.service_snapshot.name}</span>
      </div>
      {groomer && (
        <div className="flex items-start gap-1 opacity-90">
          <User className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          <span className="break-words">{groomer}</span>
        </div>
      )}
      {booking.store?.name && (
        <div className="flex items-center gap-1 truncate opacity-75">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{booking.store.name}</span>
        </div>
      )}
    </Link>
  );
}
