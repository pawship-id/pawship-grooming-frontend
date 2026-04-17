"use client"

import { Truck, Check } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import type { PublicStore } from "@/lib/api/stores"

interface StepScheduleProps {
  stepNumber: number
  selectedDate: string
  setSelectedDate: (v: string) => void
  selectedTimeRange: string
  setSelectedTimeRange: (v: string) => void
  selectedStore: PublicStore
  // Pick-up & delivery
  showPickupDeliverySection: boolean
  canUsePickupDelivery: boolean
  pickupDeliveryServiceSupports: boolean
  pickupDeliveryStoreSupports: boolean
  pickupDeliveryHasZones: boolean
  isPickup: boolean
  setIsPickup: (v: boolean) => void
  isDelivery: boolean
  setIsDelivery: (v: boolean) => void
  // Reset callbacks
  onDateChange: () => void
  onTimeChange: () => void
  onPickupDeliveryChange: () => void
}

export function StepSchedule({
  stepNumber,
  selectedDate,
  setSelectedDate,
  selectedTimeRange,
  setSelectedTimeRange,
  selectedStore,
  showPickupDeliverySection,
  canUsePickupDelivery,
  pickupDeliveryServiceSupports,
  pickupDeliveryStoreSupports,
  pickupDeliveryHasZones,
  isPickup,
  setIsPickup,
  isDelivery,
  setIsDelivery,
  onDateChange,
  onTimeChange,
  onPickupDeliveryChange,
}: StepScheduleProps) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex flex-col gap-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="booking-date">Tanggal</Label>
            <Input
              id="booking-date"
              type="date"
              min={new Date().toISOString().split("T")[0]}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                onDateChange()
              }}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Sesi</Label>
            <Select
              value={selectedTimeRange}
              onValueChange={(v) => {
                setSelectedTimeRange(v)
                onTimeChange()
              }}
            >
              <SelectTrigger><SelectValue placeholder="Pilih sesi" /></SelectTrigger>
              <SelectContent>
                {(selectedStore.sessions ?? []).map((session) => (
                  <SelectItem key={session} value={session}>{session}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(!selectedStore.sessions || selectedStore.sessions.length === 0) && (
              <p className="text-xs text-muted-foreground">Tidak ada sesi tersedia untuk store ini.</p>
            )}
          </div>
        </div>

        {/* Pickup & Delivery toggles — only for in-store services */}
        {showPickupDeliverySection && (
          <>
            <Separator />
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground">Pickup & Delivery (opsional)</p>
              {canUsePickupDelivery ? (
                <>
                  <p className="text-[11px] text-muted-foreground">Jika tidak memilih, kamu bawa sendiri anabul ke store. Biaya dihitung berdasarkan zona lokasi.</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label
                      htmlFor="pickup"
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                        isPickup ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        id="pickup"
                        checked={isPickup}
                        onCheckedChange={(checked) => {
                          setIsPickup(!!checked)
                          onPickupDeliveryChange()
                        }}
                        className="shrink-0"
                      />
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Pickup (Jemput Pet)</span>
                      </div>
                    </label>
                    <label
                      htmlFor="delivery"
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                        isDelivery ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <Checkbox
                        id="delivery"
                        checked={isDelivery}
                        onCheckedChange={(checked) => {
                          setIsDelivery(!!checked)
                          onPickupDeliveryChange()
                        }}
                        className="shrink-0"
                      />
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Delivery (Antar Pet)</span>
                      </div>
                    </label>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1.5 rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
                  <p className="text-xs text-muted-foreground">Pickup & delivery tidak tersedia untuk booking ini karena:</p>
                  <ul className="flex flex-col gap-1">
                    {!pickupDeliveryServiceSupports && (
                      <li className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        Layanan ini tidak mendukung pickup & delivery
                      </li>
                    )}
                    {!pickupDeliveryStoreSupports && (
                      <li className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        Store ini belum mengaktifkan layanan pickup & delivery
                      </li>
                    )}
                    {pickupDeliveryStoreSupports && !pickupDeliveryHasZones && (
                      <li className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                        Zona pickup & delivery belum dikonfigurasi untuk store ini
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
