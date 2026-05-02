"use client";

import { CreditCard, Truck, Gift, Pencil, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import type { AdminBooking } from "@/lib/api/bookings";

interface PaymentSummaryProps {
  booking: AdminBooking;
}

export function PaymentSummary({ booking }: PaymentSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-4 w-4" />
          Payment Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
          {/* Service row */}
          <ServiceRow booking={booking} />

          {/* Addon rows */}
          {booking.service_snapshot.addons?.map((addon) => (
            <AddonRow key={addon._id} booking={booking} addon={addon} />
          ))}

          {/* Pickup & Delivery fee row */}
          <PickupDeliveryFeeRow booking={booking} />

          {/* Home service travel fee row */}
          <HomeServiceFeeRow booking={booking} />

          {/* Subtotal + Discount sections */}
          <DiscountSections booking={booking} />

          {/* Total Akhir */}
          <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
            <span>Total Akhir</span>
            <span className="text-base">
              {formatPrice(
                booking.final_total_price ?? booking.original_total_price,
              )}
            </span>
          </div>
        </div>

        <div>
          <span className="text-xs text-muted-foreground">
            Metode Pembayaran
          </span>
          <p className="font-medium capitalize text-foreground">
            {booking.payment_method ? booking.payment_method : "-"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Pricing sub-components ───────────────────────────────────────────────────

function BenefitBadge({
  benefitType,
  benefitValue,
}: {
  benefitType: string;
  benefitValue: number | null;
}) {
  const isQuota = benefitType === "quota";
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        isQuota
          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
          : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
      }`}
    >
      {isQuota
        ? "Gratis"
        : benefitValue != null
          ? `-${benefitValue}%`
          : "Diskon"}
    </span>
  );
}

function AdminDiscountBadge({ amount }: { amount: number }) {
  return (
    <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
      -{formatPrice(amount)}
    </span>
  );
}

function PriceDisplay({
  basePrice,
  effectivePrice,
  hasItemDisc,
  benefit,
}: {
  basePrice: number;
  effectivePrice: number;
  hasItemDisc: boolean;
  benefit?: { benefit_type: string; amount_deducted: number } | null;
}) {
  const isQuota = benefit?.benefit_type === "quota";

  if (!hasItemDisc && !benefit) {
    return <span className="font-medium">{formatPrice(basePrice)}</span>;
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs line-through text-muted-foreground">
        {formatPrice(basePrice)}
      </span>
      {hasItemDisc && benefit ? (
        <>
          <span className="text-xs line-through text-muted-foreground">
            {formatPrice(effectivePrice)}
          </span>
          <span className="font-semibold text-primary">
            {isQuota
              ? "Gratis"
              : formatPrice(
                  Math.max(0, effectivePrice - benefit.amount_deducted),
                )}
          </span>
        </>
      ) : hasItemDisc ? (
        <span className="font-semibold text-foreground">
          {formatPrice(effectivePrice)}
        </span>
      ) : (
        <span className="font-semibold text-primary">
          {isQuota
            ? "Gratis"
            : formatPrice(
                Math.max(0, effectivePrice - (benefit?.amount_deducted ?? 0)),
              )}
        </span>
      )}
    </div>
  );
}

function ServiceRow({ booking }: { booking: AdminBooking }) {
  const b = booking.applied_benefits?.find((ab) => ab.applies_to === "service");
  const svcBase =
    booking.edited_service_price ?? booking.service_snapshot.price;
  const svcItemDisc = booking.edited_service_discount ?? 0;
  const svcEffective = Math.max(0, svcBase - svcItemDisc);
  const hasItemDisc = svcItemDisc > 0;

  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">
          {booking.service_snapshot.name}
        </span>
        {hasItemDisc && <AdminDiscountBadge amount={svcItemDisc} />}
        {b && (
          <BenefitBadge
            benefitType={b.benefit_type}
            benefitValue={b.benefit_value}
          />
        )}
      </div>
      <PriceDisplay
        basePrice={svcBase}
        effectivePrice={svcEffective}
        hasItemDisc={hasItemDisc}
        benefit={b}
      />
    </div>
  );
}

function AddonRow({
  booking,
  addon,
}: {
  booking: AdminBooking;
  addon: { _id: string; name: string; price: number };
}) {
  const addonBenefits =
    booking.applied_benefits?.filter((ab) => ab.applies_to === "addon") ?? [];
  const b =
    addonBenefits.find((ab) => ab.service_id === addon._id) ??
    addonBenefits.find((ab) => !ab.service_id);
  const addonOverride = booking.edited_addon_prices?.find(
    (a) => a.addon_id === addon._id,
  );
  const addonBase = addonOverride?.price ?? addon.price;
  const addonItemDisc = addonOverride?.discount ?? 0;
  const addonEffective = Math.max(0, addonBase - addonItemDisc);
  const hasItemDisc = addonItemDisc > 0;

  return (
    <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">+ {addon.name}</span>
        {hasItemDisc && <AdminDiscountBadge amount={addonItemDisc} />}
        {b && (
          <BenefitBadge
            benefitType={b.benefit_type}
            benefitValue={b.benefit_value}
          />
        )}
      </div>
      <PriceDisplay
        basePrice={addonBase}
        effectivePrice={addonEffective}
        hasItemDisc={hasItemDisc}
        benefit={b}
      />
    </div>
  );
}

function PickupDeliveryFeeRow({ booking }: { booking: AdminBooking }) {
  if (!booking.pick_up && !booking.delivery) return null;

  const tFeeBase =
    booking.edited_travel_fee ??
    booking.travel_fee ??
    (booking.pickup_fee ?? 0) + (booking.delivery_fee ?? 0);
  if (tFeeBase <= 0) return null;

  const b = booking.applied_benefits?.find(
    (ab) =>
      ab.applies_to === "pick_up" ||
      ab.applies_to === "travel_fee" ||
      ab.applies_to === "pickup",
  );
  const feeItemDisc = booking.edited_travel_fee_discount ?? 0;
  const feeEffective = Math.max(0, tFeeBase - feeItemDisc);
  const hasItemDisc = feeItemDisc > 0;

  const label =
    booking.pick_up && booking.delivery
      ? "Biaya Pickup & Delivery"
      : booking.delivery
        ? "Biaya Delivery"
        : "Biaya Pickup";

  return (
    <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Truck className="h-3.5 w-3.5" />
          {label}
        </span>
        {hasItemDisc && <AdminDiscountBadge amount={feeItemDisc} />}
        {b && (
          <BenefitBadge
            benefitType={b.benefit_type}
            benefitValue={b.benefit_value}
          />
        )}
      </div>
      <PriceDisplay
        basePrice={tFeeBase}
        effectivePrice={feeEffective}
        hasItemDisc={hasItemDisc}
        benefit={b}
      />
    </div>
  );
}

function HomeServiceFeeRow({ booking }: { booking: AdminBooking }) {
  if (
    booking.type !== "in home" ||
    !booking.travel_fee ||
    booking.travel_fee <= 0
  )
    return null;

  const b = booking.applied_benefits?.find(
    (ab) =>
      ab.applies_to === "pick_up" ||
      ab.applies_to === "travel_fee" ||
      ab.applies_to === "pickup",
  );
  const tFeeBase = booking.edited_travel_fee ?? booking.travel_fee;
  const tFeeItemDisc = booking.edited_travel_fee_discount ?? 0;
  const tFeeEffective = Math.max(0, tFeeBase - tFeeItemDisc);
  const hasItemDisc = tFeeItemDisc > 0;

  return (
    <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Truck className="h-3.5 w-3.5" />
          Biaya Home Service
        </span>
        {hasItemDisc && <AdminDiscountBadge amount={tFeeItemDisc} />}
        {b && (
          <BenefitBadge
            benefitType={b.benefit_type}
            benefitValue={b.benefit_value}
          />
        )}
      </div>
      <PriceDisplay
        basePrice={tFeeBase}
        effectivePrice={tFeeEffective}
        hasItemDisc={hasItemDisc}
        benefit={b}
      />
    </div>
  );
}

function DiscountSections({ booking }: { booking: AdminBooking }) {
  const svcItemDisc = booking.edited_service_discount ?? 0;
  const tFeeItemDisc = booking.edited_travel_fee_discount ?? 0;
  const addonItemDisc = (booking.edited_addon_prices ?? []).reduce(
    (sum, a) => sum + (a.discount ?? 0),
    0,
  );
  const totalAdminDiscount = svcItemDisc + tFeeItemDisc + addonItemDisc;

  const totalMemberDiscount =
    booking.applied_benefits?.reduce(
      (sum, ab) => sum + (ab.amount_deducted ?? 0),
      0,
    ) ?? 0;

  const totalPromoDiscount =
    booking.applied_promotions?.reduce(
      (sum, p) => sum + (p.amount_deducted ?? 0),
      0,
    ) ?? 0;

  const hasAnyDiscount =
    totalAdminDiscount > 0 || totalMemberDiscount > 0 || totalPromoDiscount > 0;
  if (!hasAnyDiscount) return null;

  return (
    <>
      {/* Subtotal */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-semibold">
        <span>Subtotal</span>
        <span>{formatPrice(booking.original_total_price)}</span>
      </div>

      {/* Diskon Admin */}
      {totalAdminDiscount > 0 && (
        <div className="flex flex-col border-t border-orange-200/50 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-950/20">
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-orange-600 dark:text-orange-400">
              <Pencil className="h-3.5 w-3.5" />
              Diskon Admin
            </span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              - {formatPrice(totalAdminDiscount)}
            </span>
          </div>
          <div className="-mt-0.5 flex flex-col gap-0.5 px-4 pb-2.5">
            {svcItemDisc > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate pr-4">
                  {booking.service_snapshot.name}
                </span>
                <span className="shrink-0">- {formatPrice(svcItemDisc)}</span>
              </div>
            )}
            {(booking.edited_addon_prices ?? [])
              .filter((a) => (a.discount ?? 0) > 0)
              .map((a) => {
                const addon = booking.service_snapshot.addons?.find(
                  (ad) => ad._id === a.addon_id,
                );
                return (
                  <div
                    key={a.addon_id}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span className="truncate pr-4">
                      + {addon?.name ?? a.addon_id}
                    </span>
                    <span className="shrink-0">
                      - {formatPrice(a.discount ?? 0)}
                    </span>
                  </div>
                );
              })}
            {tFeeItemDisc > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate pr-4">
                  {booking.type === "in home"
                    ? "Home Service"
                    : "Pickup/Delivery"}
                </span>
                <span className="shrink-0">- {formatPrice(tFeeItemDisc)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Diskon Membership */}
      {totalMemberDiscount > 0 && (
        <div className="flex flex-col border-t border-primary/20 bg-primary/5">
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <Gift className="h-3.5 w-3.5" />
              Diskon Membership
            </span>
            <span className="font-semibold text-primary">
              - {formatPrice(totalMemberDiscount)}
            </span>
          </div>
          {booking.applied_benefits?.length > 0 && (
            <div className="-mt-0.5 flex flex-col gap-0.5 px-4 pb-2.5">
              {booking.applied_benefits.map((ab, i) => {
                const displayName = getBenefitDisplayName(ab, booking);
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs text-muted-foreground"
                  >
                    <span className="truncate pr-4">{displayName}</span>
                    <span className="shrink-0">
                      - {formatPrice(ab.amount_deducted)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Diskon Promosi */}
      {totalPromoDiscount > 0 &&
        booking.applied_promotions &&
        booking.applied_promotions.length > 0 && (
          <div className="border-t border-violet-200/50 dark:border-violet-800/30">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
                <Tag className="h-3.5 w-3.5" />
                Diskon Promosi
              </span>
              <span className="font-semibold text-violet-600 dark:text-violet-400">
                - {formatPrice(totalPromoDiscount)}
              </span>
            </div>
            <div className="-mt-0.5 flex flex-col gap-0.5 px-4 pb-2.5">
              {booking.applied_promotions.map((promo, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span className="flex items-center gap-1.5 truncate pr-4">
                    <span className="shrink-0 rounded bg-violet-100 px-1 py-px text-[9px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
                      {promo.code}
                    </span>
                    {promo.name}
                  </span>
                  <span className="shrink-0">
                    - {formatPrice(promo.amount_deducted)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getBenefitDisplayName(
  ab: AdminBooking["applied_benefits"][number],
  booking: AdminBooking,
): string {
  const benefitLabel = ab.benefit?.label || ab.description || ab.applies_to;
  let serviceName: string | null = null;

  if (ab.applies_to === "service") {
    serviceName =
      booking.service_snapshot?.name ?? ab.benefit?.service?.name ?? null;
  } else if (ab.applies_to === "addon") {
    if (ab.service_id) {
      const addon = booking.service_snapshot?.addons?.find(
        (a) => a._id === ab.service_id,
      );
      serviceName = addon?.name ?? ab.benefit?.service?.name ?? null;
    } else {
      serviceName = ab.benefit?.service?.name ?? null;
    }
  } else if (
    ab.applies_to === "pick_up" ||
    ab.applies_to === "pickup" ||
    ab.applies_to === "travel_fee"
  ) {
    serviceName =
      booking.type === "in home" ? "Home Service" : "Pickup/Delivery";
  }

  if (!serviceName) {
    serviceName =
      ab.benefit?.service?.name ??
      (ab.applies_to === "service"
        ? "Service"
        : ab.applies_to === "addon"
          ? "Addon"
          : null);
  }

  return serviceName ? `${benefitLabel}: ${serviceName}` : benefitLabel;
}
