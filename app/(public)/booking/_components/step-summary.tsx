"use client"

import { MapPin, User, PawPrint, Clock, CalendarDays, Truck, Home, Store, CheckCircle2, MessageCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
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
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-4 p-6">
        {/* Store */}
        <div className="flex items-start gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Store</p>
            <p className="text-sm font-semibold text-foreground">{selectedStore.name}</p>
            <p className="text-xs text-muted-foreground">
              {[selectedStore.location?.address, selectedStore.location?.city].filter(Boolean).join(", ")}
            </p>
          </div>
        </div>

        <Separator />

        {/* User & Pet */}
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Pemilik</p>
            <p className="text-sm font-semibold text-foreground">{existingUser ? existingUser.username : userName}</p>
            <p className="text-xs text-muted-foreground">{phone}</p>
          </div>
          <div className="ml-auto flex items-start gap-3 text-right">
            <div>
              <p className="text-xs text-muted-foreground">Anabul</p>
              <p className="text-sm font-semibold text-foreground">{petLabel}</p>
            </div>
            <PawPrint className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          </div>
        </div>

        <Separator />

        {/* Service */}
        <div>
          <p className="text-xs text-muted-foreground">Jenis Layanan</p>
          <p className="text-xs font-medium text-primary">{selectedServiceType?.title}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{selectedService.name}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {selectedService.duration} menit
          </div>
        </div>

        {/* Schedule */}
        {selectedDate && selectedTimeRange && (
          <>
            <Separator />
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Jadwal</p>
                <p className="text-sm font-semibold text-foreground">
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="text-xs text-muted-foreground">{selectedTimeRange}</p>
              </div>
            </div>
          </>
        )}

        {/* Add-ons */}
        {selectedAddons.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Add-On ({selectedAddons.length})</p>
              {selectedAddons.map((addon) => (
                <div key={addon._id} className="flex items-center gap-1.5">
                  <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30 text-[10px]">
                    add-on
                  </Badge>
                  <span className="text-sm text-foreground">{addon.name}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Location type & Pickup/Delivery indicators */}
        {selectedLocationType && (
          <>
            <Separator />
            <div className="flex items-center gap-2">
              {selectedLocationType === "in home" ? (
                <Home className="h-4 w-4 text-primary" />
              ) : (
                <Store className="h-4 w-4 text-primary" />
              )}
              <span className="text-sm font-medium text-foreground">
                {selectedLocationType === "in home" ? "Home Service" : "In Store"}
              </span>
            </div>
            {selectedLocationType === "in store" && (isPickup || isDelivery) && (
              <div className="flex flex-wrap gap-2 ml-6">
                {isPickup && (
                  <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30 text-[10px]">
                    <Truck className="mr-1 h-3 w-3" /> Pickup
                  </Badge>
                )}
                {isDelivery && (
                  <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30 text-[10px]">
                    <Truck className="mr-1 h-3 w-3" /> Delivery
                  </Badge>
                )}
              </div>
            )}
          </>
        )}

        {/* Compact Total */}
        {previewData && (
          <>
            <Separator />
            {(() => {
              const grandTotal = previewData.pricing_breakdown.grand_total
              const benefitDiscount = selectedBenefitIds.length > 0 && applyBenefitResult ? applyBenefitResult.total_discount : 0
              const promoDiscount = selectedPromotionIds.length > 0 && applyPromotionResult ? applyPromotionResult.total_discount : 0
              const displayTotal = Math.max(0, grandTotal - benefitDiscount - promoDiscount)
              return (
                <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                  <span className="text-sm font-bold text-primary">Total yang Harus Dibayar</span>
                  <span className="text-base font-bold text-primary">{formatPrice(displayTotal)}</span>
                </div>
              )
            })()}
          </>
        )}

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
