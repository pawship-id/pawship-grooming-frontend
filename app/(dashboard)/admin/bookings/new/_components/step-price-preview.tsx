"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Gift,
  Info,
  MapPin,
  Receipt,
  Sparkles,
  Tag,
  Truck,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPrice } from "@/lib/format";
import type {
  BookingPreviewResult,
  ApplyBenefitPreviewResult,
  ApplyPromotionPreviewResult,
} from "@/lib/api/bookings";

// ── Types ──────────────────────────────────────────────────────────────────────

interface StepPricePreviewProps {
  form: { service_id: string; type: string; customer_id: string };
  previewData: BookingPreviewResult | null;
  previewError: string | null;
  loadingPreview: boolean;
  selectedBenefitIds: string[];
  toggleBenefit: (id: string) => void;
  selectedAddonIds: string[];
  selectedPromotionIds: string[];
  setSelectedPromotionIds: React.Dispatch<React.SetStateAction<string[]>>;
  applyBenefitResult: ApplyBenefitPreviewResult | null;
  loadingApplyBenefit: boolean;
  applyPromotionResult: ApplyPromotionPreviewResult | null;
  loadingApplyPromotion: boolean;
  isPickup: boolean;
  isDelivery: boolean;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StepPricePreview({
  form,
  previewData,
  previewError,
  loadingPreview,
  selectedBenefitIds,
  toggleBenefit,
  selectedAddonIds,
  selectedPromotionIds,
  setSelectedPromotionIds,
  applyBenefitResult,
  loadingApplyBenefit,
  applyPromotionResult,
  loadingApplyPromotion,
  isPickup,
  isDelivery,
}: StepPricePreviewProps) {
  return (
    <div className="flex flex-col gap-4">
      {loadingPreview && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      )}

      {!loadingPreview &&
        !previewData &&
        (previewError ? (
          <PreviewError
            error={previewError}
            formType={form.type}
            customerId={form.customer_id}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Pilih layanan dan tanggal untuk melihat preview harga.
          </p>
        ))}

      {!loadingPreview && previewData && (
        <div className="flex flex-col gap-5">
          {/* Benefit selection */}
          {previewData.pricing.has_active_membership &&
            previewData.pricing.available_benefits.length > 0 && (
              <BenefitSection
                benefits={previewData.pricing.available_benefits}
                selectedBenefitIds={selectedBenefitIds}
                toggleBenefit={toggleBenefit}
                serviceId={form.service_id}
                selectedAddonIds={selectedAddonIds}
              />
            )}

          {!previewData.pricing.has_active_membership && (
            <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              <span>
                Hewan ini tidak memiliki membership aktif. Tidak ada benefit
                yang tersedia.
              </span>
            </div>
          )}

          {/* Promotion selection */}
          {previewData.pricing.available_promotions &&
            previewData.pricing.available_promotions.length > 0 && (
              <PromotionSection
                promotions={previewData.pricing.available_promotions}
                selectedPromotionIds={selectedPromotionIds}
                setSelectedPromotionIds={setSelectedPromotionIds}
                selectedBenefitIds={selectedBenefitIds}
                availableBenefits={previewData.pricing.available_benefits}
              />
            )}

          {/* Pricing breakdown */}
          <PricingBreakdown
            previewData={previewData}
            selectedBenefitIds={selectedBenefitIds}
            selectedAddonIds={selectedAddonIds}
            selectedPromotionIds={selectedPromotionIds}
            applyBenefitResult={applyBenefitResult}
            loadingApplyBenefit={loadingApplyBenefit}
            applyPromotionResult={applyPromotionResult}
            loadingApplyPromotion={loadingApplyPromotion}
            formType={form.type}
            formServiceId={form.service_id}
            isPickup={isPickup}
            isDelivery={isDelivery}
          />
        </div>
      )}
    </div>
  );
}

// ── Preview Error Display ──────────────────────────────────────────────────────

function PreviewError({
  error,
  formType,
  customerId,
}: {
  error: string;
  formType: string;
  customerId: string;
}) {
  const lower = error.toLowerCase();

  // Store location not configured
  if (lower.includes("store location")) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-950/30">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Lokasi store belum dikonfigurasi
          </p>
          <p className="text-xs text-red-700 dark:text-red-400">
            Store ini belum mengatur koordinat lokasi (latitude/longitude).
            Silakan lengkapi lokasi store terlebih dahulu agar layanan
            pickup/delivery dan home service dapat dihitung.
          </p>
          <Link
            href="/admin/stores"
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
          >
            <MapPin className="h-3 w-3" />
            Atur lokasi store
          </Link>
        </div>
      </div>
    );
  }

  // Store has no zones configured
  if (lower.includes("store has no") && lower.includes("zone")) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-950/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            {lower.includes("home service")
              ? "Zona home service belum diatur"
              : "Zona pickup/delivery belum diatur"}
          </p>
          <p className="text-xs text-red-700 dark:text-red-400">
            {lower.includes("home service")
              ? "Store ini belum memiliki zona home service. Silakan tambahkan zona home service pada pengaturan store."
              : "Store ini belum memiliki zona pickup/delivery. Silakan tambahkan zona pickup/delivery pada pengaturan store."}
          </p>
          <Link
            href="/admin/stores"
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
          >
            <AlertTriangle className="h-3 w-3" />
            Atur zona store
          </Link>
        </div>
      </div>
    );
  }

  // Customer outside all zones
  if (
    lower.includes("outside") ||
    (lower.includes("zone") && lower.includes("distance"))
  ) {
    const distMatch = error.match(/distance:\s*([\d.]+)\s*km/i);
    const distKm = distMatch ? distMatch[1] : null;
    const isHomeService = lower.includes("home service");
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-950/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Lokasi customer di luar jangkauan zona
          </p>
          <p className="text-xs text-red-700 dark:text-red-400">
            Lokasi customer berada di luar radius maksimal zona{" "}
            {isHomeService ? "home service" : "pickup/delivery"} yang tersedia
            di store ini.
            {distKm && (
              <>
                {" "}
                Jarak customer ke store: <strong>{distKm} km</strong>.
              </>
            )}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400">
            Silakan tambahkan zona dengan radius yang lebih besar pada
            pengaturan store, atau pilih store lain yang lebih dekat dengan
            lokasi customer.
          </p>
          <Link
            href="/admin/stores"
            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
          >
            <MapPin className="h-3 w-3" />
            Atur zona store
          </Link>
        </div>
      </div>
    );
  }

  // Customer location missing
  if (
    lower.includes("customer") &&
    (lower.includes("location") ||
      lower.includes("latitude") ||
      lower.includes("longitude"))
  ) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Alamat customer belum lengkap
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {formType === "in home"
              ? "Layanan in-home membutuhkan koordinat lokasi (latitude/longitude) pada profil customer untuk menghitung biaya perjalanan."
              : "Layanan pickup/delivery membutuhkan koordinat lokasi (latitude/longitude) pada profil customer."}
          </p>
          {customerId && (
            <Link
              href={`/admin/users?edit=${customerId}`}
              className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900"
            >
              <MapPin className="h-3 w-3" />
              Lengkapi alamat customer ini
            </Link>
          )}
        </div>
      </div>
    );
  }

  // Generic location/alamat errors
  if (
    lower.includes("location") ||
    lower.includes("latitude") ||
    lower.includes("longitude") ||
    lower.includes("alamat")
  ) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Data lokasi belum lengkap
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p>
        </div>
      </div>
    );
  }

  // Zone/zona errors
  if (lower.includes("zone") || lower.includes("zona")) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-950/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">
            Masalah zona layanan
          </p>
          <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  );
}

// ── Benefit Section ────────────────────────────────────────────────────────────

function BenefitSection({
  benefits,
  selectedBenefitIds,
  toggleBenefit,
  serviceId,
  selectedAddonIds,
}: {
  benefits: any[];
  selectedBenefitIds: string[];
  toggleBenefit: (id: string) => void;
  serviceId: string;
  selectedAddonIds: string[];
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">
          Benefit Membership
        </p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {benefits.filter((b: any) => b.can_apply).length} tersedia
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {benefits.map((benefit: any) => {
          const selected = selectedBenefitIds.includes(benefit._id);
          const canApply = benefit.can_apply;
          const blockedByQuota =
            canApply &&
            benefit.type === "discount" &&
            computeBlockedByQuota(
              benefit,
              benefits,
              selectedBenefitIds,
              serviceId,
              selectedAddonIds,
            );
          const isDisabled = !canApply || blockedByQuota;

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
                disabled={isDisabled}
                onCheckedChange={() =>
                  !isDisabled && toggleBenefit(benefit._id)
                }
                className="mt-0.5 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {benefit.label || benefit.description}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      benefit.type === "discount"
                        ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                    }`}
                  >
                    {benefit.type === "discount"
                      ? `${benefit.value}% off`
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
              </div>
              {benefit.type === "discount" &&
                canApply &&
                benefit.amount_discount != null &&
                benefit.amount_discount > 0 && (
                  <span
                    className={`shrink-0 text-sm font-bold ${selected ? "text-primary" : "text-muted-foreground"}`}
                  >
                    - {formatPrice(benefit.amount_discount)}
                  </span>
                )}
            </label>
          );
        })}
      </div>
    </div>
  );
}

/** Determines if a discount benefit is blocked by a selected quota on the same target */
function computeBlockedByQuota(
  benefit: any,
  allBenefits: any[],
  selectedIds: string[],
  serviceId: string,
  addonIds: string[],
): boolean {
  if (benefit.applies_to === "service") {
    const discountTarget = benefit.service_id || serviceId;
    return allBenefits.some(
      (x: any) =>
        selectedIds.includes(x._id) &&
        x.type === "quota" &&
        x.applies_to === "service" &&
        (x.service_id === discountTarget || !x.service_id),
    );
  }
  if (benefit.applies_to === "addon") {
    const selectedQuotas = allBenefits.filter(
      (x: any) =>
        selectedIds.includes(x._id) &&
        x.type === "quota" &&
        x.applies_to === "addon",
    );
    if (benefit.service_id) {
      return selectedQuotas.some(
        (x: any) => !x.service_id || x.service_id === benefit.service_id,
      );
    } else {
      if (addonIds.length === 0) return false;
      const hasAllCoverQuota = selectedQuotas.some((x: any) => !x.service_id);
      if (hasAllCoverQuota) return true;
      const coveredIds = new Set(
        selectedQuotas
          .filter((x: any) => x.service_id)
          .map((x: any) => x.service_id),
      );
      return addonIds.every((id) => coveredIds.has(id));
    }
  }
  return false;
}

// ── Promotion Section ──────────────────────────────────────────────────────────

function PromotionSection({
  promotions,
  selectedPromotionIds,
  setSelectedPromotionIds,
  selectedBenefitIds,
  availableBenefits,
}: {
  promotions: any[];
  selectedPromotionIds: string[];
  setSelectedPromotionIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedBenefitIds: string[];
  availableBenefits: any[];
}) {
  const getLimitLabel = (promo: any) => {
    if (!promo.limit_type || promo.limit_type === "none") return null;

    const limitTypeLabel =
      promo.limit_type === "per_user" ? "Per User" : "Per Pet";
    const periodLabel =
      promo.usage_period === "daily"
        ? "Harian"
        : promo.usage_period === "weekly"
          ? "Mingguan"
          : promo.usage_period === "monthly"
            ? "Bulanan"
            : "Selamanya";

    const remaining = (promo.max_usage || 0) - (promo.usage_count || 0);
    return `${limitTypeLabel} - ${remaining}/${promo.max_usage} tersisa (${periodLabel})`;
  };

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        <p className="text-sm font-semibold text-foreground">Promosi</p>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
          {promotions.length} tersedia
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {promotions.map((promo: any) => {
          const selected = selectedPromotionIds.includes(promo._id);
          const hasNonStackableSelected = promotions.some(
            (p: any) => selectedPromotionIds.includes(p._id) && !p.is_stackable,
          );
          const blockedByStacking = !selected && hasNonStackableSelected;

          const blockedByBenefit = (() => {
            if (selectedBenefitIds.length === 0) return false;
            return availableBenefits.some((b: any) => {
              if (!selectedBenefitIds.includes(b._id)) return false;
              if (b.applies_to !== promo.applies_to) return false;
              const bSid = b.service_id || null;
              const pSid = promo.service_id || null;
              return bSid === pSid;
            });
          })();

          const blockedByLimit = promo.can_use === false;
          const isDisabled =
            blockedByStacking || blockedByBenefit || blockedByLimit;

          const limitLabel = getLimitLabel(promo);

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
                  if (selected) {
                    setSelectedPromotionIds((prev) =>
                      prev.filter((id) => id !== promo._id),
                    );
                  } else {
                    if (!promo.is_stackable) {
                      setSelectedPromotionIds([promo._id]);
                    } else {
                      setSelectedPromotionIds((prev) => [...prev, promo._id]);
                    }
                  }
                }}
                className="mt-0.5 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
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
                {limitLabel && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <Info className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                    <span
                      className={
                        blockedByLimit
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-blue-600 dark:text-blue-400"
                      }
                    >
                      {limitLabel}
                    </span>
                  </div>
                )}
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
                {blockedByLimit && (
                  <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">
                    {promo.limit_message || "Limit penggunaan telah tercapai"}
                  </span>
                )}
              </div>
              {promo.amount_discount > 0 && (
                <span
                  className={`shrink-0 text-sm font-bold ${selected ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
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

// ── Pricing Breakdown ──────────────────────────────────────────────────────────

function PricingBreakdown({
  previewData,
  selectedBenefitIds,
  selectedAddonIds,
  selectedPromotionIds,
  applyBenefitResult,
  loadingApplyBenefit,
  applyPromotionResult,
  loadingApplyPromotion,
  formType,
  formServiceId,
  isPickup,
  isDelivery,
}: {
  previewData: BookingPreviewResult;
  selectedBenefitIds: string[];
  selectedAddonIds: string[];
  selectedPromotionIds: string[];
  applyBenefitResult: ApplyBenefitPreviewResult | null;
  loadingApplyBenefit: boolean;
  applyPromotionResult: ApplyPromotionPreviewResult | null;
  loadingApplyPromotion: boolean;
  formType: string;
  formServiceId: string;
  isPickup: boolean;
  isDelivery: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-primary">Rincian Harga</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        {/* Service row */}
        {(() => {
          const b = previewData.pricing.available_benefits.find(
            (x) =>
              selectedBenefitIds.includes(x._id) &&
              x.applies_to === "service" &&
              (!x.service_id || x.service_id === formServiceId) &&
              (x.type === "discount" || x.type === "quota") &&
              x.can_apply,
          );
          const isQuota = b?.type === "quota";
          return (
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {previewData.pricing_breakdown.service.name}
                </span>
                {b && <BenefitBadge isQuota={isQuota!} value={b.value} />}
              </div>
              {b ? (
                <PriceWithDiscount
                  original={previewData.pricing_breakdown.service.price}
                  isQuota={isQuota!}
                  discount={b.amount_discount ?? 0}
                />
              ) : (
                <span className="font-medium">
                  {formatPrice(previewData.pricing_breakdown.service.price)}
                </span>
              )}
            </div>
          );
        })()}

        {/* Addon rows */}
        {previewData.pricing_breakdown.addons.map((addon) => {
          const b = previewData.pricing.available_benefits.find(
            (x) =>
              selectedBenefitIds.includes(x._id) &&
              x.applies_to === "addon" &&
              (!x.service_id || x.service_id === addon._id) &&
              (x.type === "discount" || x.type === "quota") &&
              x.can_apply,
          );
          const isQuota = b?.type === "quota";
          const addonDiscountAmount = !b
            ? 0
            : b.service_id
              ? (b.amount_discount ?? 0)
              : isQuota
                ? addon.price
                : (addon.price * (b.value ?? 0)) / 100;
          return (
            <div
              key={addon._id}
              className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">+ {addon.name}</span>
                {b && <BenefitBadge isQuota={isQuota!} value={b.value} />}
              </div>
              {b ? (
                <PriceWithDiscount
                  original={addon.price}
                  isQuota={isQuota!}
                  discount={addonDiscountAmount}
                />
              ) : (
                <span className="font-medium">{formatPrice(addon.price)}</span>
              )}
            </div>
          );
        })}

        {/* Travel fee row */}
        {(formType === "in home" || isPickup || isDelivery) &&
          previewData.pricing_breakdown.travel_fee != null &&
          previewData.pricing_breakdown.travel_fee > 0 &&
          (() => {
            const b = previewData.pricing.available_benefits.find(
              (x) =>
                selectedBenefitIds.includes(x._id) &&
                x.can_apply &&
                (x.applies_to === "pick_up" ||
                  x.applies_to === "travel_fee" ||
                  x.applies_to === "pickup"),
            );
            const isQuota = b?.type === "quota";
            const tFee = previewData.pricing_breakdown.travel_fee!;
            const travelLabel =
              formType === "in home"
                ? "Biaya Perjalanan (In-Home Service)"
                : isPickup && isDelivery
                  ? "Biaya Perjalanan (Pickup & Delivery)"
                  : isPickup
                    ? "Biaya Perjalanan (Pickup)"
                    : "Biaya Perjalanan (Delivery)";

            return (
              <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Truck className="h-3.5 w-3.5" />
                    {travelLabel}
                  </span>
                  {b && <BenefitBadge isQuota={isQuota!} value={b.value} />}
                </div>
                {b ? (
                  <PriceWithDiscount
                    original={tFee}
                    isQuota={isQuota!}
                    discount={b.amount_discount ?? 0}
                  />
                ) : (
                  <span className="font-medium">{formatPrice(tFee)}</span>
                )}
              </div>
            );
          })()}

        {/* Subtotal */}
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(previewData.pricing_breakdown.grand_total)}</span>
        </div>

        {/* Member discount */}
        {selectedBenefitIds.length > 0 &&
          (loadingApplyBenefit ||
            (applyBenefitResult && applyBenefitResult.total_discount > 0)) && (
            <div className="flex flex-col border-t border-primary/20 bg-primary/5">
              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-primary">
                  <Gift className="h-3.5 w-3.5" />
                  Diskon Member
                </span>
                {loadingApplyBenefit ? (
                  <span className="h-4 w-20 animate-pulse rounded bg-primary/20" />
                ) : (
                  <span className="font-semibold text-primary">
                    - {formatPrice(applyBenefitResult!.total_discount)}
                  </span>
                )}
              </div>
              {!loadingApplyBenefit &&
                applyBenefitResult &&
                applyBenefitResult.breakdown.length > 0 && (
                  <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                    {applyBenefitResult.breakdown.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span className="truncate pr-4">
                          {item.benefit?.label ||
                            item.description ||
                            item.applies_to}
                        </span>
                        <span className="shrink-0">
                          - {formatPrice(item.amount_deducted)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

        {/* Promotion discount */}
        {selectedPromotionIds.length > 0 && (
          <div className="border-t border-border/50">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="font-medium text-violet-600 dark:text-violet-400">
                Diskon Promosi
              </span>
              {loadingApplyPromotion ? (
                <span className="h-4 w-20 animate-pulse rounded bg-violet-200 dark:bg-violet-800" />
              ) : applyPromotionResult ? (
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  - {formatPrice(applyPromotionResult.total_discount)}
                </span>
              ) : null}
            </div>
            {!loadingApplyPromotion &&
              applyPromotionResult &&
              applyPromotionResult.breakdown.length > 0 && (
                <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                  {applyPromotionResult.breakdown.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span className="truncate pr-4">
                        {item.name || item.code || item.applies_to}
                      </span>
                      <span className="shrink-0">
                        - {formatPrice(item.amount_deducted)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* Grand total */}
        {(() => {
          const grandTotal = previewData.pricing_breakdown.grand_total;
          const benefitDiscount =
            selectedBenefitIds.length > 0 && applyBenefitResult != null
              ? applyBenefitResult.total_discount
              : 0;
          const promoDiscount =
            selectedPromotionIds.length > 0 && applyPromotionResult != null
              ? applyPromotionResult.total_discount
              : 0;
          const displayTotal = grandTotal - benefitDiscount - promoDiscount;
          const showSkeleton =
            (selectedBenefitIds.length > 0 && loadingApplyBenefit) ||
            (selectedPromotionIds.length > 0 && loadingApplyPromotion);
          return (
            <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
              <span>Total Akhir</span>
              {showSkeleton ? (
                <span className="h-5 w-24 animate-pulse rounded bg-primary/20" />
              ) : (
                <span className="text-base">
                  {formatPrice(Math.max(0, displayTotal))}
                </span>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Helper sub-components ──────────────────────────────────────────────────────

function BenefitBadge({
  isQuota,
  value,
}: {
  isQuota: boolean;
  value?: number | null;
}) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
        isQuota
          ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
          : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
      }`}
    >
      {isQuota ? "Gratis" : value != null ? `-${value}%` : "Diskon"}
    </span>
  );
}

function PriceWithDiscount({
  original,
  isQuota,
  discount,
}: {
  original: number;
  isQuota: boolean;
  discount: number;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs line-through text-muted-foreground">
        {formatPrice(original)}
      </span>
      <span className="font-semibold text-primary">
        {isQuota ? "Gratis" : formatPrice(Math.max(0, original - discount))}
      </span>
    </div>
  );
}
