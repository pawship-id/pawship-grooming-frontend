"use client";

import { Sparkles } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/format";
import type { SelectableBenefit } from "@/components/booking/types";

export interface BenefitSelectionListProps {
  benefits: SelectableBenefit[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  /** Current service ID — used for conflict detection */
  serviceId: string;
  /** Currently selected addon IDs — used for conflict detection */
  addonIds: string[];
  disabled?: boolean;
  /** If provided, shows live discount amounts from applied breakdown */
  appliedDiscounts?: Record<string, number>;
  loadingApply?: boolean;
}

function buildBenefitTitle(benefit: SelectableBenefit): string {
  const nameLabel = benefit.label || benefit.serviceName || null;

  if (benefit.type !== "discount") {
    return nameLabel ? `Kuota Sesi: ${nameLabel}` : "Kuota Gratis";
  }

  // backward compat: absence of fields = legacy percentage / all-variant
  const variantMode = benefit.variant_mode ?? "all";
  const discountType = benefit.discount_type ?? "percentage";

  // effective_value = matched variant's raw value (% or Rp) from server
  const effectiveValue = benefit.effective_value ?? benefit.value ?? null;

  let discountValueStr: string;
  if (variantMode === "per_variant") {
    if (discountType === "fixed") {
      discountValueStr =
        effectiveValue != null && !isNaN(effectiveValue)
          ? `Rp${effectiveValue.toLocaleString("id-ID")}`
          : "Diskon";
    } else {
      // percentage per_variant — show % not Rp
      discountValueStr =
        effectiveValue != null && !isNaN(effectiveValue)
          ? `${effectiveValue}%`
          : "Diskon";
    }
  } else if (discountType === "fixed") {
    discountValueStr =
      benefit.value != null && !isNaN(benefit.value)
        ? `Rp${benefit.value.toLocaleString("id-ID")}`
        : "Diskon";
  } else {
    discountValueStr =
      benefit.value != null && !isNaN(benefit.value)
        ? `${benefit.value}%`
        : "Diskon";
  }

  const variantLabel =
    variantMode === "per_variant" ? "Per Variant" : "All Variant";

  return nameLabel
    ? `Diskon: ${nameLabel} - ${discountValueStr} - ${variantLabel}`
    : `${discountValueStr} - ${variantLabel}`;
}

/**
 * Reusable benefit selection list with conflict detection
 * (quota vs discount on the same service/addon target).
 *
 * Used by: admin new booking (Step 4), admin detail (price edit), public booking (Preview step)
 */
export function BenefitSelectionList({
  benefits,
  selectedIds,
  onToggle,
  serviceId,
  addonIds,
  disabled: globalDisabled,
  appliedDiscounts,
  loadingApply,
}: BenefitSelectionListProps) {
  if (benefits.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">
            Benefit Membership
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {benefits.length}
          </Badge>
        </div>
      </div>

      {/* Benefit items */}
      <div className="flex flex-col gap-2">
        {benefits.map((benefit) => {
          const selected = selectedIds.includes(benefit._id);
          const canApply = benefit.can_apply;
          const blockedByQuota = computeBlockedByQuota(
            benefit,
            benefits,
            selectedIds,
            serviceId,
            addonIds,
          );
          const isDisabled = globalDisabled || !canApply || blockedByQuota;

          // Determine display discount
          const liveDiscount =
            appliedDiscounts && selected
              ? (appliedDiscounts[benefit._id] ?? 0)
              : 0;
          const displayDiscount =
            appliedDiscounts && selected
              ? liveDiscount
              : (benefit.amount_discount ?? 0);

          return (
            <label
              key={benefit._id}
              htmlFor={`benefit-${benefit._id}`}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                isDisabled
                  ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-50"
                  : selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Checkbox
                id={`benefit-${benefit._id}`}
                checked={selected}
                disabled={isDisabled && !selected}
                onCheckedChange={() =>
                  (selected || !isDisabled) && onToggle(benefit._id)
                }
                className="mt-0.5 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {buildBenefitTitle(benefit)}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      benefit.type === "discount"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                    }`}
                  >
                    {benefit.type === "discount"
                      ? benefit.variant_mode === "per_variant"
                        ? "Diskon per varian"
                        : benefit.discount_type === "fixed"
                          ? benefit.value != null
                            ? `Rp${benefit.value.toLocaleString("id-ID")} off`
                            : "Diskon"
                          : benefit.value != null
                            ? `${benefit.value}% off`
                            : "Diskon"
                      : "Kuota gratis"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{benefit.description}</span>
                  {benefit.remaining !== null && (
                    <span
                      className={
                        benefit.remaining === 0 ? "text-destructive" : ""
                      }
                    >
                      Sisa: {benefit.remaining}/{benefit.limit ?? "∞"}
                    </span>
                  )}
                </div>
                {!canApply && (
                  <span className="text-[11px] text-destructive">
                    Tidak dapat digunakan saat ini
                  </span>
                )}
                {blockedByQuota && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                    Tidak dapat digabung — layanan sudah gratis dari benefit
                    kuota
                  </span>
                )}
                {/* Live discount indicator (admin detail style) */}
                {loadingApply && selected ? (
                  <span className="h-3 w-12 animate-pulse rounded bg-green-200/60" />
                ) : (
                  displayDiscount > 0 &&
                  selected && (
                    <span
                      className={`text-xs font-medium ${
                        benefit.type === "quota"
                          ? "text-blue-600"
                          : "text-green-600"
                      }`}
                    >
                      {benefit.type === "quota"
                        ? "Gratis"
                        : `-${formatPrice(displayDiscount)}`}
                    </span>
                  )
                )}
              </div>
              {benefit.type === "discount" &&
                canApply &&
                displayDiscount > 0 &&
                !selected && (
                  <span className="shrink-0 text-sm font-bold text-muted-foreground">
                    - {formatPrice(displayDiscount)}
                  </span>
                )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Determines if a discount benefit is blocked by an already-selected quota
 * on the same target service/addon.
 */
function computeBlockedByQuota(
  benefit: SelectableBenefit,
  allBenefits: SelectableBenefit[],
  selectedIds: string[],
  serviceId: string,
  addonIds: string[],
): boolean {
  if (!benefit.can_apply) return false;
  if (benefit.type !== "discount") return false;

  if (benefit.applies_to === "service") {
    const discountTarget = benefit.service_id || serviceId;
    return allBenefits.some(
      (x) =>
        selectedIds.includes(x._id) &&
        x.type === "quota" &&
        x.applies_to === "service" &&
        (x.service_id === discountTarget || !x.service_id),
    );
  }

  if (benefit.applies_to === "addon") {
    const selectedQuotas = allBenefits.filter(
      (x) =>
        selectedIds.includes(x._id) &&
        x.type === "quota" &&
        x.applies_to === "addon",
    );
    if (benefit.service_id) {
      // Specific addon discount: blocked if its addon is covered by any quota
      return selectedQuotas.some(
        (x) => !x.service_id || x.service_id === benefit.service_id,
      );
    } else {
      // Null-service_id discount: blocked only when ALL selected addons are already quota-covered
      if (addonIds.length === 0) return false;
      const hasAllCoverQuota = selectedQuotas.some((x) => !x.service_id);
      if (hasAllCoverQuota) return true;
      const coveredIds = new Set(
        selectedQuotas.filter((x) => x.service_id).map((x) => x.service_id),
      );
      return addonIds.every((id) => coveredIds.has(id));
    }
  }

  return false;
}
