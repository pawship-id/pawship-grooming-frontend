"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, Clock, Scissors, Timer } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  getGroomerPerformance,
  type GroomerPerformanceResponse,
} from "@/lib/api/dashboard";

function workloadTone(pct: number) {
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

function onTimeTone(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-600";
}

const REFRESH_MS = 5 * 60 * 1000;

export function GroomerPerformanceSection() {
  const { storeId } = useDashboardFilters();
  const [data, setData] = useState<GroomerPerformanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = () => {
      getGroomerPerformance({ store_id: storeId })
        .then((res) => {
          if (!cancelled) {
            setData(res);
            setError(null);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled)
            setError(err instanceof Error ? err.message : "Gagal memuat data");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };

    setLoading(true);
    load();
    timer = setInterval(load, REFRESH_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [storeId]);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-col items-start gap-1 space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <CardTitle className="font-display text-lg font-bold flex items-center gap-2 min-w-0">
          <Scissors className="h-4 w-4 shrink-0 text-pink-600" />
          Performa groomer
        </CardTitle>
        <span className="text-xs text-muted-foreground">Today only</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-medium text-muted-foreground">
                Team on-time rate
              </p>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <p
                className={cn(
                  "mt-1 font-display text-2xl font-bold",
                  onTimeTone(data?.team_on_time_rate_pct ?? null),
                )}
              >
                {data?.team_on_time_rate_pct === null ||
                data?.team_on_time_rate_pct === undefined
                  ? "—"
                  : `${data.team_on_time_rate_pct.toFixed(0)}%`}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {data?.team_on_time_rate_pct === null
                ? "Belum ada sesi selesai hari ini"
                : "Target ≥ 80%"}
            </p>
          </div>
          <div className="rounded-lg border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-medium text-muted-foreground">
                Rata-rata durasi sesi
              </p>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <p className="mt-1 font-display text-2xl font-bold">
                {data?.team_avg_session_duration_min
                  ? `${data.team_avg_session_duration_min} mnt`
                  : "—"}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Acuan default: 60 mnt
            </p>
          </div>
          <div className="rounded-lg border border-border/50 p-4">
            <div className="flex items-center gap-2">
              <CircleDollarSign className="h-4 w-4 shrink-0 text-purple-600" />
              <p className="text-xs font-medium text-muted-foreground">
                Revenue / team
              </p>
            </div>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <p className="mt-1 font-display text-2xl font-bold">
                {data?.team_revenue_attributed
                  ? formatRupiah(data.team_revenue_attributed)
                  : "—"}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">
              Solo 100% · Shared 1/N
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Groomer</TableHead>
                <TableHead className="text-xs text-right">Selesai</TableHead>
                <TableHead className="text-xs text-right">
                  Berlangsung
                </TableHead>
                <TableHead className="text-xs text-right">
                  Durasi avg
                </TableHead>
                <TableHead className="text-xs text-right">
                  Overrun avg
                </TableHead>
                <TableHead className="text-xs">Workload</TableHead>
                <TableHead className="text-xs text-right">On-time</TableHead>
                <TableHead className="text-xs text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (data?.groomers ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-xs text-muted-foreground py-6"
                  >
                    Belum ada sesi groomer hari ini.
                  </TableCell>
                </TableRow>
              ) : (
                data!.groomers.map((g) => (
                  <TableRow key={g.groomer_id}>
                    <TableCell className="text-xs font-medium">
                      {g.groomer_name}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {g.orders_completed}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {g.in_progress}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {g.avg_session_duration_min
                        ? `${g.avg_session_duration_min} mnt`
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-right",
                        g.avg_overrun_mins > 0 && "text-red-600 font-medium",
                      )}
                    >
                      {g.avg_overrun_mins > 0
                        ? `+${g.avg_overrun_mins} mnt`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full", workloadTone(g.workload_pct))}
                            style={{
                              width: `${Math.min(100, g.workload_pct)}%`,
                            }}
                          />
                        </div>
                        <span className="text-muted-foreground">
                          {g.workload_pct.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-xs text-right font-medium",
                        onTimeTone(g.on_time_rate_pct),
                      )}
                    >
                      {g.on_time_rate_pct === null
                        ? "—"
                        : `${g.on_time_rate_pct.toFixed(0)}%`}
                    </TableCell>
                    <TableCell className="text-xs text-right font-medium">
                      {g.revenue_attributed > 0
                        ? formatRupiah(g.revenue_attributed)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRupiah(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)}rb`;
  return `Rp ${n}`;
}
