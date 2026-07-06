"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Info,
  Minus,
  Receipt,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useDashboardFilters } from "@/hooks/use-dashboard-filters";
import {
  getRevenueMetrics,
  type DiscountBreakdown,
  type RevenueByGroomingServiceItem,
  type RevenueByLayananCategoryItem,
  type RevenueResponse,
} from "@/lib/api/dashboard";

function formatPrice(n: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function formatCompactPrice(n: number) {
  if (n >= 1_000_000) return `Rp ${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `Rp ${Math.round(n / 1_000)}rb`;
  return `Rp ${n}`;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
  });
}

/**
 * Definisi metric. Desktop: muncul saat hover (mouse). Mobile/touch: tap icon
 * untuk buka, tap di luar untuk tutup (ditangani Popover secara native).
 */
function InfoHint({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Definisi ${label}`}
          // p-2 gives a ~32px touch target; -my-2 cancels the vertical growth so
          // the label row height stays the same, and -ml-2 pulls the icon back
          // next to the label so the left padding doesn't add visible gap.
          className="-my-2 -ml-2 inline-flex shrink-0 items-center justify-center rounded p-2 text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") setOpen(true);
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setOpen(false);
          }}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[min(16rem,calc(100vw-2rem))] p-3 text-xs leading-relaxed"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}

export function RevenueSection() {
  const { storeId, resolvedRange } = useDashboardFilters();
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = resolvedRange();
  const fromKey = range?.from ?? "";
  const toKey = range?.to ?? "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getRevenueMetrics({
      store_id: storeId,
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
  }, [storeId, fromKey, toKey]);

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
      <CardHeader className="flex flex-col items-start gap-1 space-y-0 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <CardTitle className="font-display text-lg font-bold flex items-center gap-2 min-w-0">
          <CircleDollarSign className="h-4 w-4 shrink-0 text-primary" />
          Revenue
        </CardTitle>
        <span className="text-xs text-muted-foreground">Branch · Date</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <KpiGrid loading={loading} data={data} />

        <div className="grid gap-4 lg:grid-cols-2">
          <ByLayananCategoryBlock
            loading={loading}
            rows={data?.by_layanan_category ?? []}
          />
          <ByGroomingServiceBlock
            loading={loading}
            rows={data?.by_grooming_service ?? []}
          />
        </div>

        <TrendChart loading={loading} data={trendData} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <DiscountStreamCard
            loading={loading}
            label="Membership Benefit"
            info="Total potongan harga dari benefit membership (mis. free/diskon grooming) yang dipakai pada periode ini. Angka order di bawah = jumlah booking yang memakai benefit membership."
            value={data?.discount_breakdown.membership_benefit_total ?? 0}
            orderCount={
              data?.discount_breakdown.membership_benefit_order_count ?? null
            }
            tone="purple"
          />
          <DiscountStreamCard
            loading={loading}
            label="Promo Discount"
            info="Total potongan harga dari kode/promo yang diterapkan pada periode ini. Angka order di bawah = jumlah booking yang memakai promo."
            value={data?.discount_breakdown.promotion_discount_total ?? 0}
            orderCount={
              data?.discount_breakdown.promotion_discount_order_count ?? null
            }
            tone="blue"
          />
          <DiscountStreamCard
            loading={loading}
            label="Admin Discount"
            info="Total potongan manual oleh admin (edit harga layanan, biaya travel, atau add-on). Angka order di bawah = jumlah booking yang diberi diskon admin."
            value={data?.discount_breakdown.admin_discount_total ?? 0}
            orderCount={
              data?.discount_breakdown.admin_discount_order_count ?? null
            }
            tone="amber"
          />
          <DiscountStreamCard
            loading={loading}
            label="Total Discount"
            info="Penjumlahan seluruh diskon: membership benefit + promo + diskon admin. Catatan: satu order bisa kena lebih dari satu jenis diskon, jadi jumlah order tiap kartu bisa tumpang tindih."
            value={data?.discount_breakdown.total_attributed ?? 0}
            tone="rose"
          />
          <DiscountLeakageCard
            loading={loading}
            breakdown={data?.discount_breakdown}
          />
        </div>

        <MembershipCard loading={loading} membership={data?.membership} />
      </CardContent>
    </Card>
  );
}

function KpiGrid({
  loading,
  data,
}: {
  loading: boolean;
  data: RevenueResponse | null;
}) {
  const kpis = data?.kpis;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <KpiTile
        icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        label="Gross Revenue"
        info="Total nilai order (harga asli sebelum diskon) dari seluruh booking pada periode ini. Tidak termasuk booking berstatus cancelled & rescheduled."
        value={loading || !kpis ? null : formatPrice(kpis.gross_revenue)}
        subtext={
          loading || !kpis ? null : (
            <div className="flex flex-col gap-1">
              <RevenueBreakdown
                confirmed={kpis.gross_revenue_confirmed}
                pending={kpis.gross_revenue_pending}
              />
              <OrderTypeBreakdown
                onetime={kpis.gross_order_onetime_count}
                membership={kpis.gross_order_membership_count}
                onetimeInhome={kpis.gross_order_onetime_inhome_count}
                onetimeInstore={kpis.gross_order_onetime_instore_count}
                membershipInhome={kpis.gross_order_membership_inhome_count}
                membershipInstore={kpis.gross_order_membership_instore_count}
                onetimeInhomeValue={kpis.gross_revenue_onetime_inhome}
                onetimeInstoreValue={kpis.gross_revenue_onetime_instore}
                membershipInhomeValue={kpis.gross_revenue_membership_inhome}
                membershipInstoreValue={kpis.gross_revenue_membership_instore}
              />
            </div>
          )
        }
        delta={kpis?.delta.gross_revenue_pct ?? null}
        tone="emerald"
      />
      <KpiTile
        icon={<CircleDollarSign className="h-4 w-4 text-primary" />}
        label="Net Revenue"
        info="Gross revenue dikurangi total diskon (membership benefit, promo, dan diskon admin). Tidak termasuk booking berstatus cancelled & rescheduled."
        value={loading || !kpis ? null : formatPrice(kpis.net_revenue)}
        subtext={
          loading || !kpis ? null : (
            <div className="flex flex-col gap-1">
              <RevenueBreakdown
                confirmed={kpis.net_revenue_confirmed}
                pending={kpis.net_revenue_pending}
              />
              <OrderTypeBreakdown
                onetime={kpis.gross_order_onetime_count}
                membership={kpis.gross_order_membership_count}
                onetimeInhome={kpis.gross_order_onetime_inhome_count}
                onetimeInstore={kpis.gross_order_onetime_instore_count}
                membershipInhome={kpis.gross_order_membership_inhome_count}
                membershipInstore={kpis.gross_order_membership_instore_count}
                onetimeInhomeValue={kpis.net_revenue_onetime_inhome}
                onetimeInstoreValue={kpis.net_revenue_onetime_instore}
                membershipInhomeValue={kpis.net_revenue_membership_inhome}
                membershipInstoreValue={kpis.net_revenue_membership_instore}
              />
            </div>
          )
        }
        delta={kpis?.delta.net_revenue_pct ?? null}
        tone="primary"
      />
      <KpiTile
        icon={<ShoppingBag className="h-4 w-4 text-blue-600" />}
        label="Completed Orders"
        info="Jumlah order yang sudah selesai (status completed atau returned) pada periode ini. Tidak termasuk booking cancelled & rescheduled."
        value={loading || !kpis ? null : kpis.total_orders.toString()}
        delta={kpis?.delta.total_orders_pct ?? null}
        tone="blue"
      />
      <KpiTile
        icon={<Receipt className="h-4 w-4 text-amber-600" />}
        label="Avg Order Value"
        info="Rata-rata nilai net per order yang selesai (net revenue completed ÷ jumlah completed orders). Tidak termasuk booking cancelled & rescheduled."
        value={loading || !kpis ? null : formatPrice(kpis.avg_order_value)}
        delta={kpis?.delta.avg_order_value_pct ?? null}
        tone="amber"
      />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  info,
  value,
  subtext,
  delta,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  info?: string;
  value: string | null;
  subtext?: React.ReactNode;
  delta: number | null;
  tone: "emerald" | "primary" | "blue" | "amber";
}) {
  const iconBg =
    tone === "emerald"
      ? "bg-emerald-100"
      : tone === "primary"
        ? "bg-primary/10"
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
          {info ? <InfoHint label={label} text={info} /> : null}
        </div>
        {value === null ? (
          <Skeleton className="mt-1 h-6 w-24" />
        ) : (
          <p className="font-display text-lg font-bold text-foreground truncate">
            {value}
          </p>
        )}
        {subtext ? (
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {subtext}
          </div>
        ) : null}
        <DeltaBadge delta={delta} />
      </div>
    </div>
  );
}

function RevenueBreakdown({
  confirmed,
  pending,
}: {
  confirmed: number;
  pending: number;
}) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="truncate">Confirmed {formatPrice(confirmed)}</span>
      <span className="truncate">Pending {formatPrice(pending)}</span>
    </div>
  );
}

function OrderTypeBreakdown({
  onetime,
  membership,
  onetimeInhome,
  onetimeInstore,
  membershipInhome,
  membershipInstore,
  onetimeInhomeValue,
  onetimeInstoreValue,
  membershipInhomeValue,
  membershipInstoreValue,
}: {
  onetime: number;
  membership: number;
  onetimeInhome: number;
  onetimeInstore: number;
  membershipInhome: number;
  membershipInstore: number;
  onetimeInhomeValue: number;
  onetimeInstoreValue: number;
  membershipInhomeValue: number;
  membershipInstoreValue: number;
}) {
  const total = onetime + membership;
  return (
    <div className="mt-2 flex flex-col gap-1.5 border-t border-border/40 pt-2">
      <p className="text-sm font-semibold text-foreground">
        {total}{" "}
        <span className="font-normal text-muted-foreground">order masuk</span>
      </p>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-foreground">
            One-time
          </span>
          <span className="text-[13px] font-semibold text-foreground">
            {onetime}
          </span>
        </div>
        <span className="text-[12px] text-muted-foreground">
          {onetimeInstore} In Store vs {onetimeInhome} In Home
        </span>
        <LocationValueRows
          instoreValue={onetimeInstoreValue}
          inhomeValue={onetimeInhomeValue}
        />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-foreground">
            Membership
          </span>
          <span className="text-[13px] font-semibold text-foreground">
            {membership}
          </span>
        </div>
        <span className="text-[12px] text-muted-foreground">
          {membershipInstore} In Store vs {membershipInhome} In Home
        </span>
        <LocationValueRows
          instoreValue={membershipInstoreValue}
          inhomeValue={membershipInhomeValue}
        />
      </div>
    </div>
  );
}

function LocationValueRows({
  instoreValue,
  inhomeValue,
}: {
  instoreValue: number;
  inhomeValue: number;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-muted/40 px-2 py-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">In Store</span>
        <span className="text-[11px] font-medium text-foreground">
          {formatPrice(instoreValue)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">In Home</span>
        <span className="text-[11px] font-medium text-foreground">
          {formatPrice(inhomeValue)}
        </span>
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

function ByGroomingServiceBlock({
  loading,
  rows,
}: {
  loading: boolean;
  rows: RevenueByGroomingServiceItem[];
}) {
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-xs font-medium text-muted-foreground">
            Per Service (grooming only)
          </p>
          <InfoHint
            label="Per Service (grooming only)"
            text="Rincian revenue per layanan grooming (berdasarkan harga layanan), beserta persentase terhadap total grooming dan jumlah order. Tidak termasuk booking cancelled & rescheduled."
          />
        </div>
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No grooming revenue in this period.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.slice(0, 6).map((r) => (
            <li key={r.service_id ?? r.service_name} className="text-xs">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <span className="truncate font-medium">{r.service_name}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatPrice(r.revenue)} · {r.pct_of_total}% · {r.order_count}{" "}
                  order
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, r.pct_of_total)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const CATEGORY_TONE: Record<string, string> = {
  grooming: "bg-emerald-500",
  hotel: "bg-blue-500",
  daycare: "bg-amber-500",
  spa: "bg-pink-500",
  addon: "bg-purple-500",
  pickup: "bg-orange-500",
  other: "bg-slate-400",
};

function ByLayananCategoryBlock({
  loading,
  rows,
}: {
  loading: boolean;
  rows: RevenueByLayananCategoryItem[];
}) {
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-muted-foreground">
          Per Service Category (all services)
        </p>
        <InfoHint
          label="Per Service Category (all services)"
          text="Revenue dikelompokkan per kategori layanan (grooming, hotel, daycare, spa, add-on, pickup, lainnya) beserta persentasenya terhadap total. Tidak termasuk booking cancelled & rescheduled."
        />
      </div>
      {loading ? (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No revenue in this period.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.category} className="text-xs">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                <span className="truncate font-medium">{r.label}</span>
                <span className="text-muted-foreground whitespace-nowrap">
                  {formatPrice(r.revenue)} · {r.pct_of_total}%
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full",
                    CATEGORY_TONE[r.category] ?? "bg-slate-400",
                  )}
                  style={{ width: `${Math.min(100, r.pct_of_total)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MembershipCard({
  loading,
  membership,
}: {
  loading: boolean;
  membership: RevenueResponse["membership"] | undefined;
}) {
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-purple-600" />
        <p className="text-xs font-medium text-muted-foreground">
          Membership Revenue
        </p>
        <InfoHint
          label="Membership Revenue"
          text="Total nilai pembelian membership (purchase price) pada periode terpilih. Tidak termasuk membership yang dibatalkan (cancelled). Jika tidak ada filter periode, dihitung sepanjang waktu (all time)."
        />
      </div>
      {loading || !membership ? (
        <Skeleton className="mt-3 h-6 w-24" />
      ) : (
        <p className="mt-2 font-display text-lg font-bold">
          {formatPrice(membership.membership_revenue)}
        </p>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="flex items-center gap-1">
            <p className="text-muted-foreground">No of purchase</p>
            <InfoHint
              label="No of purchase"
              text="Jumlah pembelian membership pada periode terpilih (tidak termasuk yang dibatalkan). Tanpa filter periode = total sepanjang waktu."
            />
          </div>
          {loading || !membership ? (
            <Skeleton className="mt-0.5 h-4 w-10" />
          ) : (
            <p className="font-medium">{membership.new_memberships_count}</p>
          )}
        </div>
        <div>
          <div className="flex items-center gap-1">
            <p className="text-muted-foreground">Average Value</p>
            <InfoHint
              label="Average Value"
              text="Rata-rata nilai per pembelian membership (Membership Revenue ÷ No of purchase), tidak termasuk yang dibatalkan."
            />
          </div>
          {loading || !membership ? (
            <Skeleton className="mt-0.5 h-4 w-16" />
          ) : (
            <p className="font-medium">
              {formatCompactPrice(membership.avg_membership_value)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DiscountStreamCard({
  loading,
  label,
  info,
  value,
  orderCount,
  tone,
}: {
  loading: boolean;
  label: string;
  info?: string;
  value: number;
  orderCount?: number | null;
  tone: "purple" | "blue" | "amber" | "rose";
}) {
  const iconBg =
    tone === "purple"
      ? "bg-purple-100 text-purple-600"
      : tone === "blue"
        ? "bg-blue-100 text-blue-600"
        : tone === "amber"
          ? "bg-amber-100 text-amber-600"
          : "bg-rose-100 text-rose-600";
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            iconBg,
          )}
        >
          <TrendingDown className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {info ? <InfoHint label={label} text={info} /> : null}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : (
        <p className="mt-1 font-display text-lg font-bold">
          {formatPrice(value)}
        </p>
      )}
      {orderCount !== undefined ? (
        loading ? (
          <Skeleton className="mt-1 h-3 w-16" />
        ) : (
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {orderCount ?? 0} order
          </p>
        )
      ) : null}
    </div>
  );
}

function DiscountLeakageCard({
  loading,
  breakdown,
}: {
  loading: boolean;
  breakdown: DiscountBreakdown | undefined;
}) {
  const leakage = breakdown?.leakage_pct ?? 0;
  const tone =
    leakage > 20
      ? "text-red-600 bg-red-50 border-red-200"
      : leakage > 15
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-foreground border-border/50";
  return (
    <div className={cn("rounded-lg border p-4", tone)}>
      <div className="flex items-center gap-2">
        <TrendingDown className="h-4 w-4" />
        <p className="text-xs font-medium">Discount leakage rate</p>
        <InfoHint
          label="Discount leakage rate"
          text="Persentase total diskon terhadap gross revenue (total diskon ÷ gross revenue × 100). Makin tinggi makin banyak revenue yang 'bocor' jadi diskon. Target sehat < 15%."
        />
      </div>
      {loading || !breakdown ? (
        <Skeleton className="mt-2 h-6 w-16" />
      ) : (
        <p className="mt-1 font-display text-lg font-bold">
          {leakage.toFixed(1)}%
        </p>
      )}
      <p className="mt-0.5 text-[11px] opacity-80">
        {leakage > 20
          ? "Near the limit — review!"
          : leakage > 15
            ? "Approaching limit"
            : "Healthy (< 15% target)"}
      </p>
    </div>
  );
}

function TrendChart({
  loading,
  data,
}: {
  loading: boolean;
  data: { date: string; label: string; gross: number; net: number }[];
}) {
  return (
    <div className="rounded-lg border border-border/50 p-4">
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium text-muted-foreground">
          Last 7 Days Trend (Gross vs Net)
        </p>
        <InfoHint
          label="Last 7 Days Trend"
          text="Tren gross revenue vs net revenue selama 7 hari terakhir. Gross = sebelum diskon, Net = setelah diskon. Tidak termasuk booking cancelled & rescheduled."
        />
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-44 w-full" />
      ) : (
        <div className="mt-3 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => formatCompactPrice(v)}
                width={56}
              />
              <RechartsTooltip
                formatter={(v: number) => formatPrice(v)}
                labelClassName="text-xs"
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="gross"
                name="Gross"
                stroke="#10b981"
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="net"
                name="Net"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
