"use client";

import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BookingSession } from "@/lib/api/bookings";

interface PreCondition {
  id: string;
  description: string;
}

interface OrderNotesProps {
  preConditions: PreCondition[];
  bookingNote?: string;
  sessions?: BookingSession[];
}

export function OrderNotes({
  preConditions,
  bookingNote,
  sessions,
}: OrderNotesProps) {
  const sessionNotes = sessions?.filter((s) => s.notes && s.notes.trim()) ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertCircle className="h-4 w-4" />
          Notes & Special Instructions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {preConditions.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
              Catatan dari groomer
            </div>
            <ul className="flex flex-col gap-1">
              {preConditions.map((pc) => (
                <li key={pc.id} className="text-xs text-amber-800">
                  • {pc.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            Catatan Sesi Groomer
          </label>
          {sessionNotes.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {sessionNotes.map((s, i) => (
                <li
                  key={s._id ?? i}
                  className="rounded-lg bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground"
                >
                  {sessionNotes.length > 1 && (
                    <span className="mb-0.5 block text-xs font-medium text-foreground">
                      Sesi {i + 1}
                      {s.type ? ` — ${s.type}` : ""}
                    </span>
                  )}
                  {sessionNotes.length === 1 && s.type && (
                    <span className="mb-0.5 block text-xs font-medium text-foreground">
                      {s.type}
                    </span>
                  )}
                  {s.notes}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground/60">
              Belum ada catatan
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Booking Note
          </label>
          {bookingNote ? (
            <p className="mt-1 rounded-lg bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
              {bookingNote}
            </p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground/60">
              Belum ada catatan
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
