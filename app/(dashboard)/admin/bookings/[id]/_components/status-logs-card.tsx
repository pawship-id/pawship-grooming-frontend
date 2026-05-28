"use client";

import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { statusColors } from "@/lib/booking-status";
import { formatDateTime } from "@/lib/format";
import type { AdminBooking } from "@/lib/api/bookings";

interface StatusLogsCardProps {
  booking: AdminBooking;
}

export function StatusLogsCard({ booking }: StatusLogsCardProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
          <ClipboardList className="h-5 w-5 text-primary" />
          Riwayat Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {booking.status_logs.length > 0 ? (
          <div className="flex flex-col gap-0">
            {booking.status_logs.map((log, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                  {idx < booking.status_logs.length - 1 && (
                    <div className="w-px flex-1 bg-border/60" />
                  )}
                </div>
                <div className="mb-4 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      className={`${statusColors[log.status] ?? "bg-muted text-muted-foreground"} capitalize text-xs`}
                    >
                      {log.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(log.timestamp)}
                    </span>
                  </div>
                  {log.note && (
                    <p className="mt-1 text-sm text-foreground">{log.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada riwayat status
          </p>
        )}
      </CardContent>
    </Card>
  );
}
