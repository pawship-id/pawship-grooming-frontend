"use client"

import { Sparkles, Info, Tag, Receipt, Truck, Gift, AlertTriangle, MapPin, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { formatPrice } from "@/lib/format"
import type { PublicPreviewResult, PublicApplyBenefitResult, PublicApplyPromotionResult } from "@/lib/api/stores"

interface StepPreviewProps {
  previewLoading: boolean
  previewData: PublicPreviewResult | null
  previewError: string
  // Benefit
  selectedBenefitIds: string[]
  toggleBenefit: (id: string) => void
  applyBenefitResult: PublicApplyBenefitResult | null
  applyBenefitLoading: boolean
  // Promotion
  selectedPromotionIds: string[]
  setSelectedPromotionIds: React.Dispatch<React.SetStateAction<string[]>>
  applyPromotionResult: PublicApplyPromotionResult | null
  applyPromotionLoading: boolean
  // Context
  selectedServiceId: string
  selectedAddonIds: string[]
  selectedLocationType: "in home" | "in store" | ""
}

export function StepPreview({
  previewLoading,
  previewData,
  previewError,
  selectedBenefitIds,
  toggleBenefit,
  applyBenefitResult,
  applyBenefitLoading,
  selectedPromotionIds,
  setSelectedPromotionIds,
  applyPromotionResult,
  applyPromotionLoading,
  selectedServiceId,
  selectedAddonIds,
  selectedLocationType,
}: StepPreviewProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-4 pt-6">
        {previewLoading && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}

        {!previewLoading && !previewData && (
          previewError ? (
            <PreviewError error={previewError} selectedLocationType={selectedLocationType} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Memuat informasi harga, benefit, dan promo yang tersedia...
            </p>
          )
        )}

        {!previewLoading && previewData && (
          <div className="flex flex-col gap-5">
            <BenefitSection
              previewData={previewData}
              selectedBenefitIds={selectedBenefitIds}
              toggleBenefit={toggleBenefit}
              selectedServiceId={selectedServiceId}
              selectedAddonIds={selectedAddonIds}
            />

            <PromotionSection
              previewData={previewData}
              selectedPromotionIds={selectedPromotionIds}
              setSelectedPromotionIds={setSelectedPromotionIds}
              selectedBenefitIds={selectedBenefitIds}
            />

            <PricingBreakdown
              previewData={previewData}
              selectedBenefitIds={selectedBenefitIds}
              selectedServiceId={selectedServiceId}
              selectedAddonIds={selectedAddonIds}
              selectedLocationType={selectedLocationType}
              applyBenefitResult={applyBenefitResult}
              applyBenefitLoading={applyBenefitLoading}
              selectedPromotionIds={selectedPromotionIds}
              applyPromotionResult={applyPromotionResult}
              applyPromotionLoading={applyPromotionLoading}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Preview Error Display ──────────────────────────────────────────────────
function PreviewError({ error, selectedLocationType }: { error: string; selectedLocationType: string }) {
  if (error.toLowerCase().includes("outside") || (error.toLowerCase().includes("zone") && error.toLowerCase().includes("distance"))) {
    const distMatch = error.match(/distance:\s*([\d.]+)\s*km/i)
    const distKm = distMatch ? distMatch[1] : null
    const isHomeService = error.toLowerCase().includes("home service")
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-700 dark:bg-red-950/30">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">Lokasi kamu di luar jangkauan layanan</p>
          <p className="text-xs text-red-700 dark:text-red-400">
            Lokasi kamu berada di luar radius zona {isHomeService ? "home service" : "pickup/delivery"} yang tersedia.
            {distKm && <> Jarak ke store: <strong>{distKm} km</strong>.</>}
          </p>
          <ul className="mt-0.5 flex flex-col gap-0.5 text-xs text-red-700 dark:text-red-400">
            <li>• Coba pilih store lain yang lebih dekat dengan lokasimu.</li>
            <li>• Pastikan alamat di profil kamu sudah sesuai dan koordinatnya akurat.</li>
            <li>• Jika masih bermasalah, hubungi store untuk informasi lebih lanjut.</li>
          </ul>
        </div>
      </div>
    )
  }

  if (error.toLowerCase().includes("customer") && (error.toLowerCase().includes("location") || error.toLowerCase().includes("latitude") || error.toLowerCase().includes("longitude"))) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Alamat kamu belum lengkap</p>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Layanan {selectedLocationType === "in home" ? "home service" : "pickup/delivery"} membutuhkan koordinat lokasi pada profil akun kamu. Silakan lengkapi alamat di profil.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{error}</span>
    </div>
  )
}

// ── Benefit Selection ──────────────────────────────────────────────────────
function BenefitSection({
  previewData,
  selectedBenefitIds,
  toggleBenefit,
  selectedServiceId,
  selectedAddonIds,
}: {
  previewData: PublicPreviewResult
  selectedBenefitIds: string[]
  toggleBenefit: (id: string) => void
  selectedServiceId: string
  selectedAddonIds: string[]
}) {
  if (!previewData.pricing.has_active_membership) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 shrink-0" />
        <span>Anabul kamu belum memiliki membership aktif. Tidak ada benefit yang tersedia.</span>
      </div>
    )
  }

  if (previewData.pricing.available_benefits.length === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Benefit Membership</p>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {previewData.pricing.available_benefits.filter((b) => b.can_apply).length} tersedia
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {previewData.pricing.available_benefits.map((benefit) => {
          const selected = selectedBenefitIds.includes(benefit._id)
          const canApply = benefit.can_apply
          const blockedByQuota = computeBlockedByQuota(benefit, previewData, selectedBenefitIds, selectedServiceId, selectedAddonIds)
          const isDisabled = !canApply || blockedByQuota
          return (
            <label
              key={benefit._id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                isDisabled
                  ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-50"
                  : selected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <Checkbox
                checked={selected}
                disabled={isDisabled}
                onCheckedChange={() => !isDisabled && toggleBenefit(benefit._id)}
                className="mt-0.5 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{benefit.label || benefit.description}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    benefit.type === "discount"
                      ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                  }`}>
                    {benefit.type === "discount" ? `${benefit.value}% off` : "Kuota gratis"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>{benefit.description}</span>
                  {benefit.remaining !== null && (
                    <span className={benefit.remaining === 0 ? "text-destructive" : ""}>
                      Sisa: {benefit.remaining}/{benefit.limit ?? "∞"}
                    </span>
                  )}
                </div>
                {!canApply && <span className="text-[11px] text-destructive">Tidak dapat digunakan saat ini</span>}
                {blockedByQuota && <span className="text-[11px] text-amber-600 dark:text-amber-400">Tidak dapat digabung — layanan sudah gratis dari benefit kuota</span>}
              </div>
              {benefit.type === "discount" && canApply && benefit.amount_discount != null && benefit.amount_discount > 0 && (
                <span className={`shrink-0 text-sm font-bold ${selected ? "text-primary" : "text-muted-foreground"}`}>
                  - {formatPrice(benefit.amount_discount)}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ── Promotion Selection ────────────────────────────────────────────────────
function PromotionSection({
  previewData,
  selectedPromotionIds,
  setSelectedPromotionIds,
  selectedBenefitIds,
}: {
  previewData: PublicPreviewResult
  selectedPromotionIds: string[]
  setSelectedPromotionIds: React.Dispatch<React.SetStateAction<string[]>>
  selectedBenefitIds: string[]
}) {
  if ((previewData.pricing.available_promotions?.length ?? 0) === 0) return null

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        <p className="text-sm font-semibold text-foreground">Promosi</p>
        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
          {previewData.pricing.available_promotions.length} tersedia
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {previewData.pricing.available_promotions.map((promo) => {
          const selected = selectedPromotionIds.includes(promo._id)
          const hasNonStackableSelected = previewData.pricing.available_promotions.some(
            (p) => selectedPromotionIds.includes(p._id) && !p.is_stackable
          )
          const blockedByStacking = !selected && hasNonStackableSelected
          const blockedByBenefit = (() => {
            if (selectedBenefitIds.length === 0) return false
            const benefits = previewData.pricing.available_benefits
            return benefits.some((b) => {
              if (!selectedBenefitIds.includes(b._id)) return false
              if (b.applies_to !== promo.applies_to) return false
              const bSid = b.service_id || null
              const pSid = promo.service_id || null
              return bSid === pSid
            })
          })()
          const isDisabled = blockedByStacking || blockedByBenefit
          return (
            <label
              key={promo._id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                isDisabled
                  ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-50"
                  : selected
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                    : "border-border bg-card hover:border-violet-400"
              }`}
            >
              <Checkbox
                checked={selected}
                disabled={isDisabled}
                onCheckedChange={() => {
                  if (isDisabled) return
                  if (selected) {
                    setSelectedPromotionIds((prev) => prev.filter((id) => id !== promo._id))
                  } else {
                    if (!promo.is_stackable) {
                      setSelectedPromotionIds([promo._id])
                    } else {
                      setSelectedPromotionIds((prev) => [...prev, promo._id])
                    }
                  }
                }}
                className="mt-0.5 shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{promo.name}</span>
                  <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">{promo.code}</span>
                  {promo.discount_type === "percent" ? (
                    <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">{promo.value}% off</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">Rp {promo.value.toLocaleString("id-ID")} off</span>
                  )}
                  {!promo.is_stackable && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">Non-stackable</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {promo.description && <span>{promo.description}</span>}
                  <span className="capitalize">
                    Berlaku untuk:{" "}
                    {promo.applies_to === "booking" ? "Semua" :
                      promo.service_name ? `${promo.applies_to}: ${promo.service_name}` :
                      promo.applies_to === "service" ? "Semua Service" :
                      promo.applies_to === "addon" ? "Semua Addon" :
                      promo.applies_to === "pickup" ? "Pickup/Delivery" :
                      promo.applies_to}
                  </span>
                </div>
                {blockedByStacking && <span className="text-[11px] text-amber-600 dark:text-amber-400">Tidak dapat digabung — promo non-stackable sudah dipilih</span>}
                {blockedByBenefit && <span className="text-[11px] text-amber-600 dark:text-amber-400">Tidak dapat digabung — benefit membership untuk target yang sama sudah dipilih</span>}
              </div>
              {promo.amount_discount > 0 && (
                <span className={`shrink-0 text-sm font-bold ${selected ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}>
                  - {formatPrice(promo.amount_discount)}
                </span>
              )}
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ── Pricing Breakdown ──────────────────────────────────────────────────────
function PricingBreakdown({
  previewData,
  selectedBenefitIds,
  selectedServiceId,
  selectedAddonIds,
  selectedLocationType,
  applyBenefitResult,
  applyBenefitLoading,
  selectedPromotionIds,
  applyPromotionResult,
  applyPromotionLoading,
}: {
  previewData: PublicPreviewResult
  selectedBenefitIds: string[]
  selectedServiceId: string
  selectedAddonIds: string[]
  selectedLocationType: string
  applyBenefitResult: PublicApplyBenefitResult | null
  applyBenefitLoading: boolean
  selectedPromotionIds: string[]
  applyPromotionResult: PublicApplyPromotionResult | null
  applyPromotionLoading: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary" />
        <p className="text-sm font-bold text-primary">Rincian Harga</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        {/* Service row */}
        <ServicePriceRow previewData={previewData} selectedBenefitIds={selectedBenefitIds} selectedServiceId={selectedServiceId} />

        {/* Addon rows */}
        {previewData.pricing_breakdown.addons.map((addon) => (
          <AddonPriceRow key={addon._id} addon={addon} previewData={previewData} selectedBenefitIds={selectedBenefitIds} selectedAddonIds={selectedAddonIds} />
        ))}

        {/* Subtotal */}
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-semibold">
          <span>Subtotal</span>
          <span>{formatPrice(previewData.pricing_breakdown.grand_total)}</span>
        </div>

        {/* Fee rows */}
        <FeeRow label="Biaya Pickup" fee={previewData.pricing_breakdown.pickup_fee} previewData={previewData} selectedBenefitIds={selectedBenefitIds} />
        <FeeRow label="Biaya Delivery" fee={previewData.pricing_breakdown.delivery_fee} previewData={previewData} selectedBenefitIds={selectedBenefitIds} />
        {selectedLocationType === "in home" && (
          <FeeRow label="Biaya Perjalanan" fee={previewData.pricing_breakdown.travel_fee} previewData={previewData} selectedBenefitIds={selectedBenefitIds} />
        )}

        {/* Diskon Member */}
        {selectedBenefitIds.length > 0 && (applyBenefitLoading || (applyBenefitResult && applyBenefitResult.total_discount > 0)) && (
          <div className="flex flex-col border-t border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="flex items-center gap-1.5 font-medium text-primary">
                <Gift className="h-3.5 w-3.5" />
                Diskon Member
              </span>
              {applyBenefitLoading ? (
                <span className="h-4 w-20 animate-pulse rounded bg-primary/20" />
              ) : (
                <span className="font-semibold text-primary">- {formatPrice(applyBenefitResult!.total_discount)}</span>
              )}
            </div>
            {!applyBenefitLoading && applyBenefitResult && applyBenefitResult.breakdown.length > 0 && (
              <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                {applyBenefitResult.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate pr-4">{item.benefit?.label || item.description || item.applies_to}</span>
                    <span className="shrink-0">- {formatPrice(item.amount_deducted)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Diskon Promo */}
        {selectedPromotionIds.length > 0 && (
          <div className="border-t border-border/50">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-violet-600 dark:text-violet-400 font-medium">Diskon Promosi</span>
              {applyPromotionLoading ? (
                <span className="h-4 w-20 animate-pulse rounded bg-violet-200 dark:bg-violet-800" />
              ) : applyPromotionResult ? (
                <span className="font-semibold text-violet-600 dark:text-violet-400">- {formatPrice(applyPromotionResult.total_discount)}</span>
              ) : null}
            </div>
            {!applyPromotionLoading && applyPromotionResult && applyPromotionResult.breakdown.length > 0 && (
              <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                {applyPromotionResult.breakdown.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate pr-4">{item.name || item.code || item.applies_to}</span>
                    <span className="shrink-0">- {formatPrice(item.amount_deducted)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Total Akhir */}
        {(() => {
          const grandTotal = previewData.pricing_breakdown.grand_total
          const benefitDiscount = selectedBenefitIds.length > 0 && applyBenefitResult ? applyBenefitResult.total_discount : 0
          const promoDiscount = selectedPromotionIds.length > 0 && applyPromotionResult ? applyPromotionResult.total_discount : 0
          const displayTotal = grandTotal - benefitDiscount - promoDiscount
          const showSkeleton = (selectedBenefitIds.length > 0 && applyBenefitLoading) || (selectedPromotionIds.length > 0 && applyPromotionLoading)
          return (
            <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
              <span>Total Akhir</span>
              {showSkeleton ? (
                <span className="h-5 w-24 animate-pulse rounded bg-primary/20" />
              ) : (
                <span className="text-base">{formatPrice(Math.max(0, displayTotal))}</span>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}

// ── Internal: Service Price Row ────────────────────────────────────────────
function ServicePriceRow({ previewData, selectedBenefitIds, selectedServiceId }: { previewData: PublicPreviewResult; selectedBenefitIds: string[]; selectedServiceId: string }) {
  const b = previewData.pricing.available_benefits.find(
    (x) => selectedBenefitIds.includes(x._id) && x.applies_to === "service" && (!x.service_id || x.service_id === selectedServiceId) && (x.type === "discount" || x.type === "quota") && x.can_apply
  )
  const isQuota = b?.type === "quota"
  return (
    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">{previewData.pricing_breakdown.service.name}</span>
        {b && <BenefitBadge isQuota={!!isQuota} value={b.value} />}
      </div>
      {b ? (
        <PriceWithDiscount original={previewData.pricing_breakdown.service.price} isQuota={!!isQuota} discountAmount={b.amount_discount ?? 0} />
      ) : (
        <span className="font-medium">{formatPrice(previewData.pricing_breakdown.service.price)}</span>
      )}
    </div>
  )
}

// ── Internal: Addon Price Row ──────────────────────────────────────────────
function AddonPriceRow({ addon, previewData, selectedBenefitIds, selectedAddonIds }: { addon: { _id: string; name: string; price: number }; previewData: PublicPreviewResult; selectedBenefitIds: string[]; selectedAddonIds: string[] }) {
  const b = previewData.pricing.available_benefits.find(
    (x) => selectedBenefitIds.includes(x._id) && x.applies_to === "addon" && (!x.service_id || x.service_id === addon._id) && (x.type === "discount" || x.type === "quota") && x.can_apply
  )
  const isQuota = b?.type === "quota"
  const addonDiscountAmount = !b ? 0 : (b.service_id ? (b.amount_discount ?? 0) : (isQuota ? addon.price : addon.price * (b.value ?? 0) / 100))
  return (
    <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">+ {addon.name}</span>
        {b && <BenefitBadge isQuota={!!isQuota} value={b.value} />}
      </div>
      {b ? (
        <PriceWithDiscount original={addon.price} isQuota={!!isQuota} discountAmount={addonDiscountAmount} />
      ) : (
        <span className="font-medium">{formatPrice(addon.price)}</span>
      )}
    </div>
  )
}

// ── Internal: Fee Row ──────────────────────────────────────────────────────
function FeeRow({ label, fee, previewData, selectedBenefitIds }: { label: string; fee?: number | null; previewData: PublicPreviewResult; selectedBenefitIds: string[] }) {
  if (!fee || fee <= 0) return null
  const b = previewData.pricing.available_benefits.find(
    (x) => selectedBenefitIds.includes(x._id) && x.can_apply && (x.applies_to === "pick_up" || x.applies_to === "travel_fee" || x.applies_to === "pickup")
  )
  const isQuota = b?.type === "quota"
  return (
    <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-muted-foreground"><Truck className="h-3.5 w-3.5" />{label}</span>
        {b && <BenefitBadge isQuota={!!isQuota} value={b.value} />}
      </div>
      {b ? (
        <PriceWithDiscount original={fee} isQuota={!!isQuota} discountAmount={b.amount_discount ?? 0} />
      ) : (
        <span className="font-medium">{formatPrice(fee)}</span>
      )}
    </div>
  )
}

// ── Internal: Benefit Badge ────────────────────────────────────────────────
function BenefitBadge({ isQuota, value }: { isQuota: boolean; value?: number | null }) {
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
      isQuota ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
    }`}>
      {isQuota ? "Gratis" : (value != null ? `-${value}%` : "Diskon")}
    </span>
  )
}

// ── Internal: Price With Discount ──────────────────────────────────────────
function PriceWithDiscount({ original, isQuota, discountAmount }: { original: number; isQuota: boolean; discountAmount: number }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-xs line-through text-muted-foreground">{formatPrice(original)}</span>
      <span className="font-semibold text-primary">
        {isQuota ? "Gratis" : formatPrice(Math.max(0, original - discountAmount))}
      </span>
    </div>
  )
}

// ── Internal: Blocked by Quota Computation ─────────────────────────────────
function computeBlockedByQuota(
  benefit: PublicPreviewResult["pricing"]["available_benefits"][number],
  previewData: PublicPreviewResult,
  selectedBenefitIds: string[],
  selectedServiceId: string,
  selectedAddonIds: string[],
): boolean {
  if (!benefit.can_apply || benefit.type !== "discount") return false
  const available = previewData.pricing.available_benefits
  if (benefit.applies_to === "service") {
    const discountTarget = benefit.service_id || selectedServiceId
    return available.some(
      (x) => selectedBenefitIds.includes(x._id) && x.type === "quota" && x.applies_to === "service" && (x.service_id === discountTarget || !x.service_id)
    )
  }
  if (benefit.applies_to === "addon") {
    const selectedQuotas = available.filter(
      (x) => selectedBenefitIds.includes(x._id) && x.type === "quota" && x.applies_to === "addon"
    )
    if (benefit.service_id) {
      return selectedQuotas.some((x) => !x.service_id || x.service_id === benefit.service_id)
    } else {
      if (selectedAddonIds.length === 0) return false
      const hasAllCoverQuota = selectedQuotas.some((x) => !x.service_id)
      if (hasAllCoverQuota) return true
      const coveredIds = new Set(selectedQuotas.filter((x) => x.service_id).map((x) => x.service_id))
      return selectedAddonIds.every((id) => coveredIds.has(id))
    }
  }
  return false
}
