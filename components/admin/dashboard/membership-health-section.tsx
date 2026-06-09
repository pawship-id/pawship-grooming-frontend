"use client";

import { useEffect, useState } from "react";
import {
  AlarmClock,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  Info,
  Layers,
  RefreshCcw,
  Sparkles,
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
  getMembershipHealth,
  type MembershipHealthResponse,
} from "@/lib/api/dashboard";

function formatPrice(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function renewalTone(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 50) return "text-amber-600";
  return "text-red-600";
}

export function MembershipHealthSection() {
  const { resolvedRange } = useDashboardFilters();
  const [data, setData] = useState<MembershipHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = resolvedRange();
  const fromKey = range?.from ?? "";
  const toKey = range?.to ?? "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMembershipHealth({
      from: fromKey || undefined,
      to: toKey || undefined,
    })
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
          <CreditCard className="h-4 w-4 text-purple-600" />
          Membership Health
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
            icon={<Sparkles className="h-4 w-4 text-purple-600" />}
            label="Active member"
            value={
              loading || !data
                ? null
                : data.active_memberships.toLocaleString("id-ID")
            }
            sublabel={
              data ? (
                <>
                  <span className="block truncate">
                    {(data.active_count ?? 0).toLocaleString("id-ID")} active ·{" "}
                    {(data.pending_count ?? 0).toLocaleString("id-ID")} pending
                  </span>
                  <span className="block truncate">
                    {(data.member_pet_count ?? 0).toLocaleString("id-ID")} pets ·{" "}
                    {(data.member_customer_count ?? 0).toLocaleString("id-ID")}{" "}
                    customer
                  </span>
                  <span className="block truncate">
                    Penetrasi {(data.penetration_rate_pct ?? 0).toFixed(1)}%
                  </span>
                </>
              ) : undefined
            }
            tone="purple"
            info={
              <>
                <p>
                  Jumlah membership yang masih berlaku (status{" "}
                  <span className="font-medium text-foreground">aktif</span> +{" "}
                  <span className="font-medium text-foreground">pending</span>),
                  dari koleksi pet-membership yang belum dibatalkan & belum
                  dihapus dengan tanggal berakhir ≥ hari ini. Global — tidak
                  terpengaruh filter tanggal.
                </p>
                <p>
                  <span className="font-medium text-foreground">Aktif</span>:
                  membership yang sudah berjalan — tanggal mulai ≤ hari ini dan
                  belum melewati tanggal berakhir.
                </p>
                <p>
                  <span className="font-medium text-foreground">Pending</span>:
                  membership yang sudah dibeli tapi belum mulai — tanggal mulai
                  masih di masa depan.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    n pets · n customer
                  </span>
                  : jumlah pet dan pemilik (customer) unik yang punya membership
                  berlaku (di-distinct, satu pet/customer dihitung sekali).
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Penetration rate
                  </span>
                  : pet terdaftar yang punya membership berlaku ÷ total pet
                  terdaftar. Memakai jumlah pet unik sehingga maksimal 100%.
                </p>
              </>
            }
          />
          <KpiTile
            icon={<CircleDollarSign className="h-4 w-4 text-emerald-600" />}
            label="Period Income"
            value={
              loading || !data ? null : formatPrice(data.membership_revenue)
            }
            sublabel={
              data && data.new_memberships > 0 ? (
                <>
                  <span className="block truncate">
                    No of Purchase : {data.new_memberships.toLocaleString("id-ID")}
                  </span>
                  <span className="block truncate">
                    Average Value : {formatPrice(data.avg_membership_value)}
                  </span>
                </>
              ) : undefined
            }
            tone="emerald"
            info={
              <>
                <p>
                  Total purchase_price dari pembelian membership yang dibuat
                  (createdAt) dalam rentang tanggal terpilih, tidak termasuk yang
                  dibatalkan. Rumus sama dengan kartu &quot;Membership
                  Revenue&quot; di tab Ringkasan.
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    No of purchase
                  </span>
                  : jumlah pembelian membership pada periode terpilih (tidak
                  termasuk yang dibatalkan).
                </p>
                <p>
                  <span className="font-medium text-foreground">
                    Average Value
                  </span>
                  : rata-rata nilai per pembelian = Period Income ÷ No of
                  purchase.
                </p>
              </>
            }
          />
          <KpiTile
            icon={<RefreshCcw className="h-4 w-4 text-blue-600" />}
            label="Renewal rate (30d)"
            value={
              loading || !data
                ? null
                : data.renewal_rate_pct === null
                  ? "—"
                  : `${data.renewal_rate_pct.toFixed(1)}%`
            }
            sublabel="Target ≥ 70%"
            tone="blue"
            valueClassName={renewalTone(data?.renewal_rate_pct ?? null)}
            info="Rolling 30 hari. Penyebut = pet yang membership-nya berakhir dalam 30 hari terakhir; pembilang = pet tersebut yang kini punya membership aktif/berlaku. Global — tidak terpengaruh filter tanggal."
          />
          <KpiTile
            icon={<AlarmClock className="h-4 w-4 text-amber-600" />}
            label="Akan habis"
            value={loading || !data ? null : `${data.expiring_7_days}`}
            sublabel={
              data
                ? `dalam 7 hari · ${data.expiring_30_days} dalam 30 hari`
                : undefined
            }
            tone="amber"
            info="Membership aktif yang tanggal berakhirnya jatuh antara hari ini dan 7 (atau 30) hari ke depan. Global — tidak terpengaruh filter tanggal."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ExpiringBlock loading={loading} data={data} />
          <TierBreakdown loading={loading} data={data} />
        </div>
      </CardContent>
    </Card>
  );
}

function KpiTile({
  icon,
  label,
  value,
  sublabel,
  tone,
  valueClassName,
  info,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  sublabel?: React.ReactNode;
  tone: "purple" | "emerald" | "blue" | "amber";
  valueClassName?: string;
  info?: React.ReactNode;
}) {
  const iconBg =
    tone === "purple"
      ? "bg-purple-100"
      : tone === "emerald"
        ? "bg-emerald-100"
        : tone === "blue"
          ? "bg-blue-100"
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
            <InfoHint ariaLabel={`Sumber data ${label}`}>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <div className="mt-1 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {info}
              </div>
            </InfoHint>
          ) : null}
        </div>
        {value === null ? (
          <Skeleton className="mt-1 h-6 w-20" />
        ) : (
          <p
            className={cn(
              "font-display text-lg font-bold text-foreground truncate",
              valueClassName,
            )}
          >
            {value}
          </p>
        )}
        {sublabel ? (
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {sublabel}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExpiringBlock({
  loading,
  data,
}: {
  loading: boolean;
  data: MembershipHealthResponse | null;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-amber-600" />
        <p className="text-xs font-medium text-muted-foreground">
          Membership akan berakhir
        </p>
        <InfoHint ariaLabel="Sumber data membership akan berakhir">
          <p className="text-xs font-semibold text-foreground">
            Membership akan berakhir
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Jumlah membership aktif (is_active = true, belum dihapus) yang
            tanggal berakhirnya jatuh antara hari ini dan 7 atau 30 hari ke
            depan. Global — tidak terpengaruh filter tanggal.
          </p>
        </InfoHint>
      </div>
      {loading || !data ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
        </div>
      ) : (
        <ul className="mt-3 space-y-2 text-xs">
          <li className="flex items-center justify-between rounded-md bg-amber-50 p-3">
            <span className="font-medium">Dalam 7 hari</span>
            <span className="font-display text-lg font-bold text-amber-700">
              {data.expiring_7_days}
            </span>
          </li>
          <li className="flex items-center justify-between rounded-md bg-muted/40 p-3">
            <span className="font-medium">Dalam 30 hari</span>
            <span className="font-display text-lg font-bold">
              {data.expiring_30_days}
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}

function TierBreakdown({
  loading,
  data,
}: {
  loading: boolean;
  data: MembershipHealthResponse | null;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-purple-600" />
        <p className="text-xs font-medium text-muted-foreground">
          Distribusi tier
        </p>
        <InfoHint ariaLabel="Sumber data distribusi tier">
          <p className="text-xs font-semibold text-foreground">
            Distribusi tier
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Membership yang dibuat (createdAt) dalam rentang tanggal terpilih,
            dikelompokkan menurut nama paket (membership plan). Persentase =
            jumlah per tier ÷ total membership di periode itu.
          </p>
        </InfoHint>
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : !data || data.tier_breakdown.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Belum ada membership di periode ini.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-xs">
          {data.tier_breakdown.map((t) => (
            <li key={t.tier}>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{t.tier}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {t.count} · {t.pct.toFixed(0)}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-purple-500"
                  style={{ width: `${Math.min(100, t.pct)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

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
