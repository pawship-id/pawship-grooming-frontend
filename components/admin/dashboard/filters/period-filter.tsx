"use client";

import { useState } from "react";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  useDashboardFilters,
  type DashboardPeriod,
} from "@/hooks/use-dashboard-filters";

const PRESETS: { value: DashboardPeriod; label: string }[] = [
  { value: "today", label: "Hari Ini" },
  { value: "week", label: "Minggu Ini" },
  { value: "month", label: "Bulan Ini" },
  { value: "custom", label: "Custom" },
  { value: "all", label: "Semua" },
];

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PeriodFilter() {
  const { preset, from, to, setPreset, setCustomRange } = useDashboardFilters();
  const [calFromOpen, setCalFromOpen] = useState(false);
  const [calToOpen, setCalToOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((btn) => (
        <Button
          key={btn.value}
          size="sm"
          variant={preset === btn.value ? "default" : "outline"}
          onClick={() => setPreset(btn.value)}
        >
          {btn.label}
        </Button>
      ))}

      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={calFromOpen} onOpenChange={setCalFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 w-[180px] justify-start text-xs gap-1.5",
                  !from && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {from ? format(new Date(from), "dd MMM yyyy") : "Dari tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={from ? new Date(from) : undefined}
                onSelect={(d) => {
                  if (d) setCustomRange(toYMD(d), to);
                  setCalFromOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <span className="text-xs text-muted-foreground">s/d</span>

          <Popover open={calToOpen} onOpenChange={setCalToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 w-[180px] justify-start text-xs gap-1.5",
                  !to && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="h-3 w-3" />
                {to ? format(new Date(to), "dd MMM yyyy") : "Sampai tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={to ? new Date(to) : undefined}
                onSelect={(d) => {
                  if (d) setCustomRange(from, toYMD(d));
                  setCalToOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setCustomRange("", "")}
              title="Reset tanggal"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
