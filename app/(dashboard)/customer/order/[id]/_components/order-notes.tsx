"use client";

import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PreCondition {
  id: string;
  description: string;
}

interface OrderNotesProps {
  preConditions: PreCondition[];
  bookingNote?: string;
}

export function OrderNotes({ preConditions, bookingNote }: OrderNotesProps) {
  if (preConditions.length === 0 && !bookingNote) return null;

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

        {bookingNote && (
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              Booking Note
            </label>
            <p className="mt-1 rounded-lg bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
              {bookingNote}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
