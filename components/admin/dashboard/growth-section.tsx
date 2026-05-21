"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Heart,
  Minus,
  PawPrint,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  getGrowth,
  type GrowthResponse,
  type PetStatusKey,
} from "@/lib/api/dashboard";

const STATUS_META: Record<
  PetStatusKey,
  { label: string; tone: string; bg: string }
> = {
  idle: {
    label: "Idle",
    tone: "text-slate-700",
    bg: "bg-slate-200",
  },
  new: { label: "New", tone: "text-blue-700", bg: "bg-blue-200" },
  active: {
    label: "Active",
    tone: "text-emerald-700",
    bg: "bg-emerald-200",
  },
  at_risk: { label: "At Risk", tone: "text-amber-700", bg: "bg-amber-200" },
  lapsed: { label: "Lapsed", tone: "text-red-700", bg: "bg-red-200" },
};

const STATUS_BAR: Record<PetStatusKey, string> = {
  idle: "bg-slate-400",
  new: "bg-blue-500",
  active: "bg-emerald-500",
  at_risk: "bg-amber-500",
  lapsed: "bg-red-500",
};

export function GrowthSection() {
  const { resolvedRange } = useDashboardFilters();
  const [data, setData] = useState<GrowthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = resolvedRange();
  const fromKey = range?.from ?? "";
  const toKey = range?.to ?? "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getGrowth({ from: fromKey || undefined, to: toKey || undefined })
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Gagal memuat data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromKey, toKey]);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="font-display text-lg font-bold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          Pertumbuhan Customer & Pet
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          Global · Tanggal sebagian
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KpiTile
            icon={<UserPlus className="h-4 w-4 text-primary" />}
            label="Customer baru"
            value={loading || !data ? null : data.new_customers.toString()}
            delta={data?.delta.new_customers_pct ?? null}
            tone="primary"
          />
          <KpiTile
            icon={<PawPrint className="h-4 w-4 text-emerald-600" />}
            label="Pet baru terdaftar"
            value={
              loading || !data ? null : data.new_pets_registered.toString()
            }
            delta={data?.delta.new_pets_registered_pct ?? null}
            tone="emerald"
            sublabel={
              data
                ? `${data.pets_from_existing_owners} dari owner existing`
                : undefined
            }
          />
          <KpiTile
            icon={<Heart className="h-4 w-4 text-pink-600" />}
            label="First booking conv."
            value={
              loading || !data
                ? null
                : `${data.first_booking_conversion_pct.toFixed(1)}%`
            }
            delta={null}
            tone="pink"
            sublabel="Daftar 30 hari → booking selesai"
          />
          <KpiTile
            icon={
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            }
            label="Net pet growth"
            value={
              loading || !data
                ? null
                : data.net_pet_growth >= 0
                  ? `+${data.net_pet_growth}`
                  : `${data.net_pet_growth}`
            }
            delta={null}
            tone="emerald"
            sublabel="Registered − lapsed"
          />
          <KpiTile
            icon={<PawPrint className="h-4 w-4 text-amber-600" />}
            label="Total pet aktif"
            value={
              loading || !data
                ? null
                : data.pet_status.total.toLocaleString("id-ID")
            }
            delta={null}
            tone="amber"
            sublabel="Live snapshot"
          />
        </div>

        <PetStatusBlock loading={loading} data={data} />
      </CardContent>
    </Card>
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
  tone: "primary" | "emerald" | "pink" | "amber";
  sublabel?: string;
}) {
  const iconBg =
    tone === "primary"
      ? "bg-primary/10"
      : tone === "emerald"
        ? "bg-emerald-100"
        : tone === "pink"
          ? "bg-pink-100"
          : "bg-amber-100";
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
          <span className="mt-0.5 inline-block text-[11px] text-muted-foreground">
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
        <Minus className="h-3 w-3" /> vs periode sebelumnya
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
      {Math.abs(delta).toFixed(1)}% vs sebelumnya
    </span>
  );
}

function PetStatusBlock({
  loading,
  data,
}: {
  loading: boolean;
  data: GrowthResponse | null;
}) {
  const order: PetStatusKey[] = ["idle", "new", "active", "at_risk", "lapsed"];
  const total = data?.pet_status.total ?? 0;

  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">
          Pet status snapshot (5-tier MECE)
        </p>
        {!loading && data ? (
          <span className="text-[11px] text-muted-foreground">
            {total.toLocaleString("id-ID")} pet aktif
          </span>
        ) : null}
      </div>

      {loading || !data ? (
        <Skeleton className="mt-3 h-3 w-full rounded-full" />
      ) : total > 0 ? (
        <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full">
          {order.map((key) => {
            const count = data.pet_status[key];
            const pct = total > 0 ? (count / total) * 100 : 0;
            if (pct === 0) return null;
            return (
              <div
                key={key}
                className={cn("h-full", STATUS_BAR[key])}
                style={{ width: `${pct}%` }}
                title={`${STATUS_META[key].label}: ${count}`}
              />
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          Belum ada pet aktif.
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {order.map((key) => {
          const meta = STATUS_META[key];
          const count = data?.pet_status[key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          return (
            <div
              key={key}
              className={cn("rounded-md p-3 text-center", meta.bg)}
            >
              <p className={cn("text-[10px] font-medium", meta.tone)}>
                {meta.label}
              </p>
              {loading ? (
                <Skeleton className="mx-auto mt-1 h-6 w-10" />
              ) : (
                <p
                  className={cn(
                    "font-display text-xl font-bold",
                    meta.tone,
                  )}
                >
                  {count}
                </p>
              )}
              <p className={cn("text-[10px]", meta.tone)}>
                {pct.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
