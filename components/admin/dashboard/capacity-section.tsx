"use client";

import { useEffect, useMemo, useState } from "react";
import { Gauge, Store as StoreIcon } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  getCapacityMetrics,
  type CapacityResponse,
} from "@/lib/api/dashboard";

function formatMinutes(min: number) {
  if (min <= 0) return "0 mnt";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} mnt`;
  if (m === 0) return `${h} jam`;
  return `${h} jam ${m} mnt`;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

function utilisationTone(pct: number, closed: boolean) {
  if (closed) return "bg-slate-400";
  if (pct >= 90) return "bg-red-500";
  if (pct >= 70) return "bg-amber-500";
  return "bg-emerald-500";
}

const REFRESH_MS = 5 * 60 * 1000;

export function CapacitySection() {
  const { storeId } = useDashboardFilters();
  const [data, setData] = useState<CapacityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = () => {
      getCapacityMetrics({ store_id: storeId })
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

  const trendData = useMemo(
    () =>
      (data?.trend7d ?? []).map((p) => ({
        ...p,
        label: formatShortDate(p.date),
      })),
    [data],
  );

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="font-display text-lg font-bold flex items-center gap-2">
          <Gauge className="h-4 w-4 text-emerald-600" />
          Kapasitas hari ini
        </CardTitle>
        <span className="text-xs text-muted-foreground">Today only</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border border-border/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Pemakaian per cabang
            </p>
            {loading ? (
              <div className="mt-3 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (data?.stores.length ?? 0) === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Belum ada data kapasitas untuk hari ini.
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {data!.stores.map((s) => (
                  <li key={s.store_id} className="text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.store_name}
                      </span>
                      <span className="text-muted-foreground whitespace-nowrap">
                        {s.is_closed
                          ? "Tutup"
                          : `${s.utilisation_pct.toFixed(0)}% · sisa ${formatMinutes(s.slots_remaining_minutes)}`}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full",
                          utilisationTone(s.utilisation_pct, s.is_closed),
                        )}
                        style={{
                          width: `${Math.min(100, s.utilisation_pct)}%`,
                        }}
                      />
                    </div>
                    {s.is_closed ? (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        Libur (kapasitas 0)
                      </Badge>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-border/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Tren utilisasi 7 hari
            </p>
            {loading ? (
              <Skeleton className="mt-3 h-44 w-full" />
            ) : (
              <div className="mt-3 h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={trendData}
                    margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      domain={[0, 100]}
                      width={36}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      formatter={(v: number) => `${v.toFixed(1)}%`}
                      labelClassName="text-xs"
                    />
                    <Line
                      type="monotone"
                      dataKey="utilisation_pct"
                      name="Utilisasi"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
