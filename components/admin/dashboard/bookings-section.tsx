"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock4,
  Minus,
  PawPrint,
  Repeat,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  getBookingsMetrics,
  type BookingsByDayBucket,
  type BookingsMetricsResponse,
  type PeakHourBucket,
} from "@/lib/api/dashboard";
import {
  getServiceTypes,
  type ApiServiceType,
} from "@/lib/api/service-types";

const STATUS_LABEL: Record<string, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  waitlist: "Waitlist",
  "driver on the way": "Driver On The Way",
  "groomer on the way": "Groomer On The Way",
  arrived: "Arrived",
  "in progress": "In Progress",
  completed: "Completed",
  returned: "Returned",
  rescheduled: "Rescheduled",
  cancelled: "Cancelled",
};

const STATUS_TONE: Record<string, string> = {
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
  requested: "bg-amber-500",
  confirmed: "bg-primary",
  "in progress": "bg-blue-500",
  rescheduled: "bg-slate-400",
};

export function BookingsSection() {
  const { storeId, preset, resolvedRange } = useDashboardFilters();
  const [data, setData] = useState<BookingsMetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceType, setServiceType] = useState<string>("all");
  const [serviceTypes, setServiceTypes] = useState<ApiServiceType[]>([]);
  const [serviceTypesLoading, setServiceTypesLoading] = useState(false);

  const range = resolvedRange();
  const fromKey = range?.from ?? "";
  const toKey = range?.to ?? "";

  useEffect(() => {
    let cancelled = false;
    setServiceTypesLoading(true);
    getServiceTypes({ page: 1, limit: 100, is_active: "true" })
      .then((res) => {
        if (!cancelled) setServiceTypes(res.serviceTypes);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setServiceTypesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBookingsMetrics({
      store_id: storeId,
      service_type: serviceType,
      from: fromKey || undefined,
      to: toKey || undefined,
    })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [storeId, serviceType, fromKey, toKey]);

  const kpis = data?.kpis;

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="font-display text-lg font-bold flex items-center gap-2 min-w-0">
          <CalendarDays className="h-4 w-4 shrink-0 text-blue-600" />
          Bookings
        </CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Jenis Layanan
          </span>
          <Select
            value={serviceType}
            onValueChange={setServiceType}
            disabled={serviceTypesLoading}
          >
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue placeholder="Pilih jenis layanan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua layanan</SelectItem>
              {serviceTypes.map((st) => (
                <SelectItem key={st._id} value={st.title}>
                  {st.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <KpiTile
            icon={<CalendarDays className="h-4 w-4 text-primary" />}
            label="Total Bookings"
            value={loading || !kpis ? null : kpis.total_bookings.toString()}
            delta={kpis?.delta.total_bookings_pct ?? null}
            tone="primary"
          />
          <KpiTile
            icon={<PawPrint className="h-4 w-4 text-emerald-600" />}
            label="New Pet"
            value={loading || !kpis ? null : kpis.new_pets.toString()}
            delta={kpis?.delta.new_pets_pct ?? null}
            tone="emerald"
          />
          <KpiTile
            icon={<Repeat className="h-4 w-4 text-blue-600" />}
            label="Returning Pet"
            value={loading || !kpis ? null : kpis.returning_pets.toString()}
            delta={kpis?.delta.returning_pets_pct ?? null}
            tone="blue"
          />
          <KpiTile
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
            label="Completed"
            value={loading || !kpis ? null : kpis.completed.toString()}
            delta={null}
            tone="emerald"
            sublabel={
              kpis && kpis.total_bookings
                ? `${Math.round((kpis.completed / kpis.total_bookings) * 100)}% of total`
                : undefined
            }
          />
          <KpiTile
            icon={<XCircle className="h-4 w-4 text-red-600" />}
            label="Cancelled"
            value={loading || !kpis ? null : kpis.cancelled.toString()}
            delta={null}
            tone="red"
            sublabel={
              kpis
                ? `${kpis.cancellation_rate_pct.toFixed(1)}% rate${kpis.cancellation_rate_pct > 15 ? " · high" : ""}`
                : undefined
            }
          />
          <KpiTile
            icon={<CalendarClock className="h-4 w-4 text-slate-500" />}
            label="Reschedule"
            value={loading || !kpis ? null : kpis.rescheduled.toString()}
            delta={null}
            tone="slate"
            sublabel={
              kpis
                ? `${kpis.reschedule_rate_pct.toFixed(1)}% rate${kpis.reschedule_rate_pct > 15 ? " · high" : ""}`
                : undefined
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ByStatusBlock loading={loading} rows={data?.by_status ?? []} />
          <ByServiceBlock
            loading={loading}
            rows={data?.by_service_type ?? []}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {preset === "today" ? (
            <PeakHourBlock loading={loading} rows={data?.peak_hour ?? []} />
          ) : (
            <PeakHourPreviewHint preset={preset} />
          )}
          {preset === "week" ? (
            <ByDayBlock loading={loading} rows={data?.by_day ?? []} />
          ) : (
            <ByDayPreviewHint preset={preset} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PeakHourBlock({
  loading,
  rows,
}: {
  loading: boolean;
  rows: PeakHourBucket[];
}) {
  const data = rows.map((r) => ({
    label: `${String(r.hour).padStart(2, "0")}:00`,
    count: r.count,
  }));
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-2">
        <Clock4 className="h-4 w-4 text-blue-600" />
        <p className="text-xs font-medium text-muted-foreground">
          Peak Hour Booking
        </p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-32 w-full" />
      ) : data.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No bookings scheduled in this period.
        </p>
      ) : (
        <div className="mt-2 h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
              <Tooltip labelClassName="text-xs" />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ByDayBlock({
  loading,
  rows,
}: {
  loading: boolean;
  rows: BookingsByDayBucket[];
}) {
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 shrink-0 text-emerald-600" />
        <p className="text-xs font-medium text-muted-foreground">
          Bookings per Day (Mon–Sun)
        </p>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-32 w-full" />
      ) : (
        <div className="mt-2 h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={28} />
              <Tooltip labelClassName="text-xs" />
              <Bar
                dataKey="count"
                fill="rgb(16 185 129)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ByDayPreviewHint({ preset }: { preset: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-4 flex items-center">
      <p className="text-xs text-muted-foreground">
        Chart "Bookings per Day" appears when period preset = "This Week"
        (current: <span className="font-medium">{preset}</span>).
      </p>
    </div>
  );
}

function PeakHourPreviewHint({ preset }: { preset: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-4 flex items-center">
      <p className="text-xs text-muted-foreground">
        Chart "Peak Hour Booking" appears when period preset = "Today"
        (current: <span className="font-medium">{preset}</span>).
      </p>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  delta,
  tone,
  sublabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  delta: number | null;
  tone: "primary" | "emerald" | "red" | "blue" | "slate";
  sublabel?: string;
}) {
  const iconBg =
    tone === "primary"
      ? "bg-primary/10"
      : tone === "emerald"
        ? "bg-emerald-100"
        : tone === "red"
          ? "bg-red-100"
          : tone === "slate"
            ? "bg-slate-100"
            : "bg-blue-100";
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          iconBg,
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {value === null ? (
          <Skeleton className="mt-1 h-6 w-16" />
        ) : (
          <p className="font-display text-lg font-bold text-foreground">
            {value}
          </p>
        )}
        {delta !== null ? (
          <DeltaBadge delta={delta} />
        ) : sublabel ? (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Repeat className="h-3 w-3" />
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Minus className="h-3 w-3" /> vs previous period
      </span>
    );
  }
  const positive = delta >= 0;
  const colour = positive ? "text-emerald-600" : "text-red-600";
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium",
        colour,
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(delta).toFixed(1)}% vs previous period
    </span>
  );
}

function ByStatusBlock({
  loading,
  rows,
}: {
  loading: boolean;
  rows: { status: string; count: number }[];
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <p className="text-xs font-medium text-muted-foreground">
        Status Distribution
      </p>
      {loading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No bookings in this period.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            const tone = STATUS_TONE[r.status] ?? "bg-slate-400";
            return (
              <li key={r.status} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {r.count} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full", tone)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ByServiceBlock({
  loading,
  rows,
}: {
  loading: boolean;
  rows: { service_type: string; count: number }[];
}) {
  const total = rows.reduce((s, r) => s + r.count, 0);
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <p className="text-xs font-medium text-muted-foreground">
        Service Type Distribution
      </p>
      {loading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No bookings in this period.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.count / total) * 100) : 0;
            return (
              <li key={r.service_type} className="text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{r.service_type}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {r.count} · {pct}%
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
