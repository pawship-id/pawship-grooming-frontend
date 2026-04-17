"use client"

import { MapPin, User, PawPrint, Clock, CalendarDays, Truck, Home, Store, CheckCircle2, MessageCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/format"
import type { PublicStore, PublicService, PublicServiceType, PublicUser, PublicPreviewResult, PublicApplyBenefitResult, PublicApplyPromotionResult } from "@/lib/api/stores"

interface StepSummaryProps {
  selectedStore: PublicStore
  selectedService: PublicService
  selectedServiceType: PublicServiceType | undefined
  selectedAddons: PublicService[]
  selectedDate: string
  selectedTimeRange: string
  selectedLocationType: "in home" | "in store" | ""
  isPickup: boolean
  isDelivery: boolean
  existingUser: PublicUser | null
  userName: string
  phone: string
  petLabel: string
  // Preview & discount
  previewData: PublicPreviewResult | null
  previewLoading: boolean
  selectedBenefitIds: string[]
  applyBenefitResult: PublicApplyBenefitResult | null
  selectedPromotionIds: string[]
  applyPromotionResult: PublicApplyPromotionResult | null
  // Booking submit
  bookingCreated: boolean
  submittingBooking: boolean
  formError: string
  handleCreateBooking: () => void
}

export function StepSummary({
  selectedStore,
  selectedService,
  selectedServiceType,
  selectedAddons,
  selectedDate,
  selectedTimeRange,
  selectedLocationType,
  isPickup,
  isDelivery,
  existingUser,
  userName,
  phone,
  petLabel,
  previewData,
  previewLoading,
  selectedBenefitIds,
  applyBenefitResult,
  selectedPromotionIds,
  applyPromotionResult,
  bookingCreated,
  submittingBooking,
  formError,
  handleCreateBooking,
}: StepSummaryProps) {
  const grandTotal = previewData?.pricing_breakdown.grand_total ?? 0
  const benefitDiscount = selectedBenefitIds.length > 0 && applyBenefitResult ? applyBenefitResult.total_discount : 0
  const promoDiscount = selectedPromotionIds.length > 0 && applyPromotionResult ? applyPromotionResult.total_discount : 0
  const displayTotal = Math.max(0, grandTotal - benefitDiscount - promoDiscount)

  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-0 p-0 divide-y divide-border/60">

        {/* Store */}
        <div className="flex items-start gap-3 px-6 py-4">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Store</p>
            <p className="text-sm font-semibold text-foreground">{selectedStore.name}</p>
            {(selectedStore.location?.address || selectedStore.location?.city) && (
              <p className="text-xs text-muted-foreground truncate">
                {[selectedStore.location?.address, selectedStore.location?.city].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* User & Pet */}
        <div className="grid grid-cols-2 divide-x divide-border/60">
          <div className="flex items-start gap-3 px-6 py-4">
            <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Pemilik</p>
              <p className="text-sm font-semibold text-foreground truncate">{existingUser ? existingUser.username : userName}</p>
              <p className="text-xs text-muted-foreground">{phone}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 px-6 py-4">
            <PawPrint className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Anabul</p>
              <p className="text-sm font-semibold text-foreground truncate">{petLabel}</p>
            </div>
          </div>
        </div>

        {/* Service */}
        <div className="flex items-start gap-3 px-6 py-4">
          <div className="mt-0.5 h-4 w-4 shrink-0 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Layanan</p>
            {selectedServiceType && (
              <p className="text-[11px] text-primary font-medium">{selectedServiceType.title}</p>
            )}
            <p className="text-sm font-semibold text-foreground">{selectedService.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Clock className="h-3 w-3" />
              {selectedService.duration} menit
            </div>
          </div>
          {/* Location badge */}
          {selectedLocationType && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge variant="secondary" className="text-[10px] gap-1">
                {selectedLocationType === "in home"
                  ? <><Home className="h-3 w-3" /> Home Service</>
                  : <><Store className="h-3 w-3" /> In Store</>}
              </Badge>
              {selectedLocationType === "in store" && (isPickup || isDelivery) && (
                <div className="flex gap-1">
                  {isPickup && <Badge variant="outline" className="text-[10px] gap-1 bg-accent/10"><Truck className="h-3 w-3" />Pickup</Badge>}
                  {isDelivery && <Badge variant="outline" className="text-[10px] gap-1 bg-accent/10"><Truck className="h-3 w-3" />Delivery</Badge>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schedule */}
        {selectedDate && selectedTimeRange && (
          <div className="flex items-start gap-3 px-6 py-4">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Jadwal</p>
              <p className="text-sm font-semibold text-foreground">
                {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground">{selectedTimeRange}</p>
            </div>
          </div>
        )}

        {/* Add-ons */}
        {selectedAddons.length > 0 && (
          <div className="px-6 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-2">Add-On ({selectedAddons.length})</p>
            <div className="flex flex-col gap-1.5">
              {selectedAddons.map((addon) => (
                <div key={addon._id} className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-accent/10 text-[10px]">add-on</Badge>
                  <span className="text-sm text-foreground">{addon.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Total */}
        {previewData && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
              <span className="text-sm font-bold text-primary">Total yang Harus Dibayar</span>
              <span className="text-base font-bold text-primary">{formatPrice(displayTotal)}</span>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-6 py-5 flex flex-col gap-3">
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {!bookingCreated ? (
            <Button
              size="lg"
              className="w-full font-display font-bold"
              onClick={handleCreateBooking}
              disabled={submittingBooking || previewLoading}
            >
              {submittingBooking ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Membuat Booking...</> : "Konfirmasi Booking"}
            </Button>
          ) : (
            <BookingSuccess
              selectedStore={selectedStore}
              selectedService={selectedService}
              existingUser={existingUser}
              userName={userName}
              petLabel={petLabel}
              selectedDate={selectedDate}
              selectedTimeRange={selectedTimeRange}
              isPickup={isPickup}
              isDelivery={isDelivery}
              previewData={previewData}
              applyBenefitResult={applyBenefitResult}
              applyPromotionResult={applyPromotionResult}
            />
          )}
        </div>

      </CardContent>
    </Card>
  )
}

// ── Booking Success Message ────────────────────────────────────────────────
function BookingSuccess({
  selectedStore,
  selectedService,
  existingUser,
  userName,
  petLabel,
  selectedDate,
  selectedTimeRange,
  isPickup,
  isDelivery,
  previewData,
  applyBenefitResult,
  applyPromotionResult,
}: {
  selectedStore: PublicStore
  selectedService: PublicService
  existingUser: PublicUser | null
  userName: string
  petLabel: string
  selectedDate: string
  selectedTimeRange: string
  isPickup: boolean
  isDelivery: boolean
  previewData: PublicPreviewResult | null
  applyBenefitResult: PublicApplyBenefitResult | null
  applyPromotionResult: PublicApplyPromotionResult | null
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm font-medium text-primary">
          Yay! Booking kamu sudah kami terima ฅᨐฅ❤︎<br />
          Tim Pawship akan segera menghubungi kamu untuk konfirmasi dan detail selanjutnya ya.
        </p>
      </div>
      {selectedStore.contact?.whatsapp && (
        <a
          href={`https://wa.me/${selectedStore.contact.whatsapp}?text=${encodeURIComponent(`Halo! Saya ${existingUser ? existingUser.username : userName} sudah booking ${selectedService.name} di ${selectedStore.name} untuk anabul saya (${petLabel})${selectedDate ? ` pada tanggal ${new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}` : ""}${selectedTimeRange ? ` sesi ${selectedTimeRange}` : ""}${isPickup ? " (pickup)" : ""}${isDelivery ? " (delivery)" : ""}${previewData ? `. Total: ${formatPrice((() => { const g = previewData.pricing_breakdown.grand_total; const bd = applyBenefitResult?.total_discount ?? 0; const pd = applyPromotionResult?.total_discount ?? 0; return Math.max(0, g - bd - pd) })())}` : ""} melalui website Pawship.`)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline" size="lg" className="w-full gap-2 font-display font-bold">
            <MessageCircle className="h-4 w-4" />
            Tanyakan via WhatsApp
          </Button>
        </a>
      )}
    </div>
  )
}
