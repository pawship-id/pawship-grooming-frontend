"use client";

import { Tag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import type { SelectableBenefit, SelectablePromotion } from "@/components/booking/types";

export interface PromotionSelectionListProps {
  promotions: SelectablePromotion[];
  selectedIds: string[];
  onToggle: (id: string, isNonStackable: boolean) => void;
  /** Currently selected benefit IDs — used for benefit conflict detection */
  selectedBenefitIds: string[];
  /** All available benefits — used for benefit conflict detection */
  benefits: SelectableBenefit[];
  disabled?: boolean;
}

/**
 * Reusable promotion selection list with stacking validation and benefit conflict detection.
 *
 * Used by: admin new booking (Step 4), admin detail (price edit), public booking (Preview step)
 */
export function PromotionSelectionList({
  promotions,
  selectedIds,
  onToggle,
  selectedBenefitIds,
  benefits,
  disabled: globalDisabled,
}: PromotionSelectionListProps) {
  if (promotions.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/30">
          <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Promosi</span>
          <Badge
            className="border-violet-200 bg-violet-100 text-[10px] text-violet-700 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-400"
          >
            {promotions.length} tersedia
          </Badge>
        </div>
      </div>

      {/* Promotion items */}
      <div className="flex flex-col gap-2">
        {promotions.map((promo) => {
          const selected = selectedIds.includes(promo._id);

          // Stacking check: if a non-stackable promo is already selected, block others
          const hasNonStackableSelected = promotions.some(
            (p) => selectedIds.includes(p._id) && !p.is_stackable,
          );
          const blockedByStacking = !selected && hasNonStackableSelected;

          // Conflict with benefit: same applies_to + service_id
          const blockedByBenefit = (() => {
            if (selectedBenefitIds.length === 0) return false;
            return benefits.some((b) => {
              if (!selectedBenefitIds.includes(b._id)) return false;
              if (b.applies_to !== promo.applies_to) return false;
              const bSid = b.service_id || null;
              const pSid = promo.service_id || null;
              return bSid === pSid;
            });
          })();

          const isDisabled =
            globalDisabled || blockedByStacking || blockedByBenefit;

          return (
            <label
              key={promo._id}
              htmlFor={`promo-${promo._id}`}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                isDisabled
                  ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-50"
                  : selected
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                    : "border-border bg-card hover:border-violet-400"
              }`}
            >
              <Checkbox
                id={`promo-${promo._id}`}
                checked={selected}
                disabled={isDisabled}
                onCheckedChange={() => {
                  if (isDisabled) return;
                  onToggle(promo._id, !promo.is_stackable);
                }}
                className="mt-0.5 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {promo.name}
                  </span>
                  <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
                    {promo.code}
                  </span>
                  {promo.discount_type === "percent" ? (
                    <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                      {promo.value}% off
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                      Rp {promo.value.toLocaleString("id-ID")} off
                    </span>
                  )}
                  {!promo.is_stackable && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                      Non-stackable
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {promo.description && <span>{promo.description}</span>}
                  <span className="capitalize">
                    Berlaku untuk:{" "}
                    {promo.applies_to === "booking"
                      ? "Semua"
                      : promo.service_name
                        ? `${promo.applies_to}: ${promo.service_name}`
                        : promo.applies_to === "service"
                          ? "Semua Service"
                          : promo.applies_to === "addon"
                            ? "Semua Addon"
                            : promo.applies_to === "pickup"
                              ? "Pickup/Delivery"
                              : promo.applies_to}
                  </span>
                </div>
                {blockedByStacking && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    Tidak dapat digabung — promo non-stackable sudah dipilih
                  </span>
                )}
                {blockedByBenefit && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    Tidak dapat digabung — benefit membership untuk target yang
                    sama sudah dipilih
                  </span>
                )}
              </div>
              {promo.amount_discount > 0 && (
                <span
                  className={`shrink-0 text-sm font-bold ${
                    selected
                      ? "text-violet-600 dark:text-violet-400"
                      : "text-muted-foreground"
                  }`}
                >
                  - {formatPrice(promo.amount_discount)}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
