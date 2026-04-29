"use client"

import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { GeocodedAddress } from "@/lib/google-geocode"

const LocationMap = dynamic(
  () => import("@/components/location-map").then((mod) => ({ default: mod.LocationMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[420px] w-full rounded-md border border-border bg-muted/40 animate-pulse" />
    ),
  },
)

type MapPickerModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLat: number | null
  selectedLng: number | null
  onSelect: (lat: number, lng: number, components?: GeocodedAddress) => void
}

export function MapPickerModal({
  open,
  onOpenChange,
  selectedLat,
  selectedLng,
  onSelect,
}: MapPickerModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pilih Lokasi di Peta</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Klik titik pada peta atau cari nama lokasi untuk mengisi koordinat secara otomatis.
        </p>
        {open && (
          <LocationMap
            selectedLat={selectedLat}
            selectedLng={selectedLng}
            onSelect={onSelect}
          />
        )}
        <div className="flex justify-end">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Selesai
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
