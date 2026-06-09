"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Heart,
  Info,
  Minus,
  PawPrint,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  getGrowth,
  type GrowthResponse,
  type PetStatusKey,
} from "@/lib/api/dashboard";

const STATUS_META: Record<
  PetStatusKey,
  { label: string; tone: string; bg: string; desc: string }
> = {
  idle: {
    label: "Idle",
    tone: "text-slate-700",
    bg: "bg-slate-200",
    desc: "Terdaftar tapi belum pernah booking layanan apa pun (0 kunjungan selesai).",
  },
  new: {
    label: "New",
    tone: "text-blue-700",
    bg: "bg-blue-200",
    desc: "Sudah ≥1 kunjungan selesai dan booking pertamanya dalam 14 hari terakhir.",
  },
  active: {
    label: "Active",
    tone: "text-emerald-700",
    bg: "bg-emerald-200",
    desc: "Kunjungan terakhir ≤14 hari lalu (dan bukan termasuk pet baru).",
  },
  at_risk: {
    label: "At Risk",
    tone: "text-amber-700",
    bg: "bg-amber-200",
    desc: "Kunjungan terakhir 15–31 hari lalu dan sudah lebih dari 1 kali kunjungan.",
  },
  lapsed: {
    label: "Lapsed",
    tone: "text-red-700",
    bg: "bg-red-200",
    desc: "Kunjungan terakhir lebih dari 31 hari lalu dan sudah lebih dari 1 kali kunjungan.",
  },
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
          Customer & Pets Growth
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            icon={<UserPlus className="h-4 w-4 text-primary" />}
            label="Total Customer"
            value={
              loading || !data
                ? null
                : (data.total_customers ?? 0).toLocaleString("id-ID")
            }
            delta={null}
            tone="primary"
            sublabel={
              data
                ? `New Customer: ${(data.new_customers ?? 0).toLocaleString("id-ID")}`
                : undefined
            }
            info={
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Total Customer
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Jumlah customer aktif & belum dihapus (all-time), tidak
                    mengikuti filter tanggal.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    New Customer
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Jumlah customer baru yang registrasi pada periode filter
                    terpilih. Tanpa filter dihitung all-time.
                  </p>
                </div>
              </div>
            }
          />
          <KpiTile
            icon={<PawPrint className="h-4 w-4 text-emerald-600" />}
            label="Total Pet"
            value={
              loading || !data
                ? null
                : (data.total_pets ?? 0).toLocaleString("id-ID")
            }
            delta={null}
            tone="emerald"
            sublabel={
              data
                ? `New Pets: ${(data.new_pets_registered ?? 0).toLocaleString("id-ID")}`
                : undefined
            }
            info={
              <div className="space-y-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Total Pet
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Jumlah seluruh pet yang pernah terdaftar di sistem
                    (all-time), tidak mengikuti filter tanggal.
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    New Pets
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    Jumlah pet baru yang terdaftar pada periode filter terpilih.
                    Tanpa filter dihitung all-time.
                  </p>
                </div>
              </div>
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
            info={
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  First booking conversion
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Persentase pet yang terdaftar dalam 30 hari terakhir dan sudah
                  punya minimal 1 booking berstatus selesai (completed).
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Rumus: (pet daftar ≤30 hari yang sudah pernah booking selesai)
                  ÷ (total pet daftar ≤30 hari) × 100%. Selalu memakai jendela
                  30 hari terakhir, tidak mengikuti filter tanggal.
                </p>
              </div>
            }
          />
          <KpiTile
            icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
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
            info={
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">
                  Net pet growth
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Pertumbuhan bersih populasi pet = Registered − Lapsed.
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Registered
                  </span>{" "}
                  = jumlah pet baru terdaftar (sama dengan &quot;New Pets&quot;
                  di kartu Total Pet; mengikuti filter, tanpa filter =
                  all-time).
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Lapsed</span> =
                  jumlah pet berstatus Lapsed pada snapshot di bawah (kunjungan
                  terakhir &gt;31 hari lalu &amp; total kunjungan &gt;1).
                  Snapshot bersifat live all-time.
                </p>
              </div>
            }
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
  info,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  delta: number | null;
  tone: "primary" | "emerald" | "pink" | "amber";
  sublabel?: string;
  info?: React.ReactNode;
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
        <div className="flex items-center gap-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {info ? (
            <InfoHint
              ariaLabel={`Penjelasan ${label}`}
              triggerClassName="p-0.5 text-muted-foreground"
            >
              {info}
            </InfoHint>
          ) : null}
        </div>
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
              className={cn("relative rounded-md p-3 text-center", meta.bg)}
            >
              <StatusInfo
                label={meta.label}
                desc={meta.desc}
                tone={meta.tone}
              />
              <p className={cn("text-[10px] font-medium", meta.tone)}>
                {meta.label}
              </p>
              {loading ? (
                <Skeleton className="mx-auto mt-1 h-6 w-10" />
              ) : (
                <p className={cn("font-display text-xl font-bold", meta.tone)}>
                  {count}
                </p>
              )}
              <p className={cn("text-[10px]", meta.tone)}>{pct.toFixed(1)}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Deteksi apakah device punya kemampuan hover (desktop) atau touch (mobile).
 * Default false (anggap touch) sampai ter-mount, lalu pakai media query.
 */
function useHasHover() {
  const [hasHover, setHasHover] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setHasHover(mq.matches);
    const handler = (e: MediaQueryListEvent) => setHasHover(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return hasHover;
}

/**
 * Info hint generik. Desktop (punya hover) → tooltip muncul saat hover.
 * Mobile / touch → popover muncul saat di-tap (klik).
 */
function InfoHint({
  ariaLabel,
  triggerClassName,
  children,
}: {
  ariaLabel: string;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const hasHover = useHasHover();

  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "rounded-full opacity-60 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        triggerClassName,
      )}
    >
      <Info className="h-3.5 w-3.5" />
    </button>
  );

  const contentClassName = "w-64 max-w-[calc(100vw-2rem)] p-3 text-left";

  if (hasHover) {
    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            collisionPadding={12}
            className={contentClassName}
          >
            {children}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        collisionPadding={12}
        className={contentClassName}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}

/** Info untuk tiap kartu status pet. */
function StatusInfo({
  label,
  desc,
  tone,
}: {
  label: string;
  desc: string;
  tone: string;
}) {
  return (
    <InfoHint
      ariaLabel={`Penjelasan status ${label}`}
      triggerClassName={cn("absolute right-1 top-1 p-1", tone)}
    >
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {desc}
      </p>
    </InfoHint>
  );
}
