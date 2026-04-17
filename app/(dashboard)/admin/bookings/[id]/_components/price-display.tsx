"use client";

import { Truck, Gift, Pencil, Tag } from "lucide-react";
import { formatPrice } from "@/lib/format";
import type { AdminBooking } from "@/lib/api/bookings";

// ── Component ────────────────────────────────────────────────────────────────

interface PriceDisplayProps {
  booking: AdminBooking;
}

export function PriceDisplay({ booking }: PriceDisplayProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
      {/* Service row */}
      {(() => {
        const b = booking.applied_benefits?.find(
          (ab) => ab.applies_to === "service",
        );
        const isQuota = b?.benefit_type === "quota";
        const svcBase = booking.edited_service_price ?? booking.service_snapshot.price;
        const svcItemDisc = booking.edited_service_discount ?? 0;
        const svcEffective = Math.max(0, svcBase - svcItemDisc);
        const hasItemDisc = svcItemDisc > 0;
        return (
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                {booking.service_snapshot.name}
              </span>
              {booking.edited_service_price != null && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                  Diedit
                </span>
              )}
              {hasItemDisc && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                  -{formatPrice(svcItemDisc)}
                </span>
              )}
              {b && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isQuota
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                    : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                    }`}
                >
                  {isQuota
                    ? "Gratis"
                    : b.benefit_value != null
                      ? `-${b.benefit_value}%`
                      : "Diskon"}
                </span>
              )}
            </div>
            {(hasItemDisc || b) ? (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs line-through text-muted-foreground">
                  {formatPrice(svcBase)}
                </span>
                {hasItemDisc && b ? (
                  <>
                    <span className="text-xs line-through text-muted-foreground">
                      {formatPrice(svcEffective)}
                    </span>
                    <span className="font-semibold text-primary">
                      {isQuota ? "Gratis" : formatPrice(Math.max(0, svcEffective - b.amount_deducted))}
                    </span>
                  </>
                ) : hasItemDisc ? (
                  <span className="font-semibold text-foreground">{formatPrice(svcEffective)}</span>
                ) : (
                  <span className="font-semibold text-primary">
                    {isQuota
                      ? "Gratis"
                      : formatPrice(Math.max(0, svcEffective - b!.amount_deducted))}
                  </span>
                )}
              </div>
            ) : (
              <span className="font-medium">
                {formatPrice(svcBase)}
              </span>
            )}
          </div>
        );
      })()}

      {/* Addon rows */}
      {booking.service_snapshot.addons?.map((addon) => {
        const addonBenefits = booking.applied_benefits?.filter(
          (ab) => ab.applies_to === "addon",
        ) ?? [];
        const b =
          addonBenefits.find((ab) => ab.service_id === addon._id) ??
          addonBenefits.find((ab) => !ab.service_id);
        const isQuota = b?.benefit_type === "quota";
        const addonOverride = booking.edited_addon_prices?.find(
          (a) => a.addon_id === addon._id,
        );
        const addonBase = addonOverride?.price ?? addon.price;
        const addonItemDisc = addonOverride?.discount ?? 0;
        const addonEffective = Math.max(0, addonBase - addonItemDisc);
        const hasItemDisc = addonItemDisc > 0;
        return (
          <div
            key={addon._id}
            className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                + {addon.name}
              </span>
              {addonOverride?.price != null && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                  Diedit
                </span>
              )}
              {hasItemDisc && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                  -{formatPrice(addonItemDisc)}
                </span>
              )}
              {b && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isQuota
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                    : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                    }`}
                >
                  {isQuota
                    ? "Gratis"
                    : b.benefit_value != null
                      ? `-${b.benefit_value}%`
                      : "Diskon"}
                </span>
              )}
            </div>
            {(hasItemDisc || b) ? (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs line-through text-muted-foreground">
                  {formatPrice(addonBase)}
                </span>
                {hasItemDisc && b ? (
                  <>
                    <span className="text-xs line-through text-muted-foreground">
                      {formatPrice(addonEffective)}
                    </span>
                    <span className="font-semibold text-primary">
                      {isQuota ? "Gratis" : formatPrice(Math.max(0, addonEffective - b.amount_deducted))}
                    </span>
                  </>
                ) : hasItemDisc ? (
                  <span className="font-semibold text-foreground">{formatPrice(addonEffective)}</span>
                ) : (
                  <span className="font-semibold text-primary">
                    {isQuota
                      ? "Gratis"
                      : formatPrice(Math.max(0, addonEffective - b!.amount_deducted))}
                  </span>
                )}
              </div>
            ) : (
              <span className="font-medium">
                {formatPrice(addonBase)}
              </span>
            )}
          </div>
        );
      })}

      {/* Pickup & Delivery fee row (combined) */}
      {(booking.pick_up || booking.delivery) && (() => {
        const tFeeBase = booking.edited_travel_fee ?? booking.travel_fee ?? ((booking.pickup_fee ?? 0) + (booking.delivery_fee ?? 0));
        if (tFeeBase <= 0) return null;
        const b = booking.applied_benefits?.find(
          (ab) =>
            ab.applies_to === "pick_up" ||
            ab.applies_to === "travel_fee" ||
            ab.applies_to === "pickup",
        );
        const isQuota = b?.benefit_type === "quota";
        const feeItemDisc = booking.edited_travel_fee_discount ?? 0;
        const feeEffective = Math.max(0, tFeeBase - feeItemDisc);
        const hasItemDisc = feeItemDisc > 0;
        const benefitDeduction = b ? b.amount_deducted : 0;
        const label = booking.pick_up && booking.delivery
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
              {booking.edited_travel_fee != null && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                  Diedit
                </span>
              )}
              {hasItemDisc && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                  -{formatPrice(feeItemDisc)}
                </span>
              )}
              {b && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isQuota ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"}`}>
                  {isQuota ? "Gratis" : b.benefit_value != null ? `-${b.benefit_value}%` : "Diskon"}
                </span>
              )}
            </div>
            {(hasItemDisc || b) ? (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs line-through text-muted-foreground">{formatPrice(tFeeBase)}</span>
                {hasItemDisc && b ? (
                  <>
                    <span className="text-xs line-through text-muted-foreground">{formatPrice(feeEffective)}</span>
                    <span className="font-semibold text-primary">{isQuota ? "Gratis" : formatPrice(Math.max(0, feeEffective - benefitDeduction))}</span>
                  </>
                ) : hasItemDisc ? (
                  <span className="font-semibold text-foreground">{formatPrice(feeEffective)}</span>
                ) : (
                  <span className="font-semibold text-primary">{isQuota ? "Gratis" : formatPrice(Math.max(0, feeEffective - benefitDeduction))}</span>
                )}
              </div>
            ) : (
              <span className="font-medium">{formatPrice(tFeeBase)}</span>
            )}
          </div>
        );
      })()}

      {/* Home service travel fee row */}
      {booking.type === "in home" && booking.travel_fee > 0 && (() => {
        const b = booking.applied_benefits?.find(
          (ab) =>
            ab.applies_to === "pick_up" ||
            ab.applies_to === "travel_fee" ||
            ab.applies_to === "pickup",
        );
        const isQuota = b?.benefit_type === "quota";
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
              {booking.edited_travel_fee != null && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                  Diedit
                </span>
              )}
              {hasItemDisc && (
                <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                  -{formatPrice(tFeeItemDisc)}
                </span>
              )}
              {b && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isQuota ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"}`}>
                  {isQuota ? "Gratis" : b.benefit_value != null ? `-${b.benefit_value}%` : "Diskon"}
                </span>
              )}
            </div>
            {(hasItemDisc || b) ? (
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-xs line-through text-muted-foreground">{formatPrice(tFeeBase)}</span>
                {hasItemDisc && b ? (
                  <>
                    <span className="text-xs line-through text-muted-foreground">{formatPrice(tFeeEffective)}</span>
                    <span className="font-semibold text-primary">{isQuota ? "Gratis" : formatPrice(Math.max(0, tFeeEffective - b.amount_deducted))}</span>
                  </>
                ) : hasItemDisc ? (
                  <span className="font-semibold text-foreground">{formatPrice(tFeeEffective)}</span>
                ) : (
                  <span className="font-semibold text-primary">{isQuota ? "Gratis" : formatPrice(Math.max(0, tFeeEffective - b!.amount_deducted))}</span>
                )}
              </div>
            ) : (
              <span className="font-medium">{formatPrice(tFeeBase)}</span>
            )}
          </div>
        );
      })()}

      {/* Subtotal + Diskon — separated between admin and member */}
      {(() => {
        const svcItemDisc = booking.edited_service_discount ?? 0;
        const tFeeItemDisc = booking.edited_travel_fee_discount ?? 0;
        const addonItemDisc = (booking.edited_addon_prices ?? []).reduce(
          (sum, a) => sum + (a.discount ?? 0), 0,
        );
        const totalAdminDiscount = svcItemDisc + tFeeItemDisc + addonItemDisc;
        const totalMemberDiscount = booking.applied_benefits?.reduce(
          (sum, ab) => sum + (ab.amount_deducted ?? 0), 0,
        ) ?? 0;
        const hasAnyDiscount = totalAdminDiscount > 0 || totalMemberDiscount > 0;

        if (!hasAnyDiscount) return null;
        return (
          <>
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
                <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                  {svcItemDisc > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate pr-4">{booking.service_snapshot.name}</span>
                      <span className="shrink-0">- {formatPrice(svcItemDisc)}</span>
                    </div>
                  )}
                  {(booking.edited_addon_prices ?? []).filter(a => (a.discount ?? 0) > 0).map((a) => {
                    const addon = booking.service_snapshot.addons?.find(ad => ad._id === a.addon_id);
                    return (
                      <div key={a.addon_id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="truncate pr-4">+ {addon?.name ?? a.addon_id}</span>
                        <span className="shrink-0">- {formatPrice(a.discount ?? 0)}</span>
                      </div>
                    );
                  })}
                  {tFeeItemDisc > 0 && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="truncate pr-4">
                        {booking.type === "in home" ? "Home Service" : "Pickup/Delivery"}
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
                  <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                    {booking.applied_benefits.map((ab, i) => {
                      const benefitLabel = ab.benefit?.label || ab.description || ab.applies_to;
                      let serviceName: string | null = null;
                      if (ab.applies_to === "service") {
                        serviceName = booking.service_snapshot?.name
                          ?? ab.benefit?.service?.name
                          ?? null;
                      } else if (ab.applies_to === "addon") {
                        if (ab.service_id) {
                          const addon = booking.service_snapshot?.addons?.find(
                            (a) => a._id === ab.service_id
                          );
                          serviceName = addon?.name ?? ab.benefit?.service?.name ?? null;
                        } else {
                          serviceName = ab.benefit?.service?.name ?? null;
                        }
                      } else if (ab.applies_to === "pick_up" || ab.applies_to === "pickup" || ab.applies_to === "travel_fee") {
                        serviceName = booking.type === "in home" ? "Home Service" : "Pickup/Delivery";
                      }
                      if (!serviceName) {
                        serviceName = ab.benefit?.service?.name
                          ?? (ab.applies_to === "service" ? "Service" : ab.applies_to === "addon" ? "Addon" : null);
                      }
                      const displayName = serviceName ? `${benefitLabel}: ${serviceName}` : benefitLabel;
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span className="truncate pr-4">
                            {displayName}
                          </span>
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
          </>
        );
      })()}

      {/* Diskon Promosi */}
      {booking.applied_promotions && booking.applied_promotions.length > 0 && (() => {
        const totalPromoDiscount = booking.applied_promotions.reduce(
          (sum, p) => sum + (p.amount_deducted ?? 0), 0,
        );
        return (
          <>
            {totalPromoDiscount > 0 && (
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
                <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                  {booking.applied_promotions.map((promo, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 truncate pr-4">
                        <span className="shrink-0 rounded bg-violet-100 px-1 py-px text-[9px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
                          {promo.code}
                        </span>
                        {promo.name}
                      </span>
                      <span className="shrink-0">- {formatPrice(promo.amount_deducted)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

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
  );
}
