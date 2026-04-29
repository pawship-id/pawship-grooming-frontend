"use client";

import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { bookingStatusConfig } from "@/lib/booking-status";
import type { AdminBooking } from "@/lib/api/bookings";

interface StatusHistoryProps {
  statusLogs: AdminBooking["status_logs"];
}

export function StatusHistory({ statusLogs }: StatusHistoryProps) {
  if (!statusLogs || statusLogs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Status History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statusLogs.map((log, index) => {
            const logCfg = bookingStatusConfig[log.status] ?? {
              label: log.status,
              className: "bg-muted text-muted-foreground",
              icon: null,
            };
            return (
              <div
                key={index}
                className="flex items-start justify-between gap-4 border-l-2 border-border pl-4"
              >
                <div className="flex-1">
                  <Badge
                    variant="outline"
                    className={`gap-1 text-xs ${logCfg.className}`}
                  >
                    {logCfg.icon}
                    {logCfg.label}
                  </Badge>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {log.note.replace(/\s+by\s+.+$/i, "")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    const d = new Date(log.timestamp);
                    const months = [
                      "Januari",
                      "Februari",
                      "Maret",
                      "April",
                      "Mei",
                      "Juni",
                      "Juli",
                      "Agustus",
                      "September",
                      "Oktober",
                      "November",
                      "Desember",
                    ];
                    const hh = String(d.getHours()).padStart(2, "0");
                    const min = String(d.getMinutes()).padStart(2, "0");
                    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} pukul ${hh}.${min}`;
                  })()}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
