"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"

type LocationMapProps = {
  selectedLat: number | null
  selectedLng: number | null
  onSelect: (lat: number, lng: number) => void
}

const LeafletMap = dynamic(
  () => import("@/app/(dashboard)/admin/stores/store-location-map").then((mod) => ({ default: mod.StoreLocationMap })),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full rounded-md border border-border bg-muted/40 animate-pulse" />,
  },
)

const GoogleMap = dynamic(
  () => import("@/components/google-location-map").then((mod) => ({ default: mod.GoogleLocationMap })),
  {
    ssr: false,
    loading: () => <div className="h-[420px] w-full rounded-md border border-border bg-muted/40 animate-pulse" />,
  },
)

const mapProvider = process.env.NEXT_PUBLIC_MAP_PROVIDER ?? "google"
const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""

export function LocationMap({ selectedLat, selectedLng, onSelect }: LocationMapProps) {
  const useGoogle = mapProvider === "google" && googleApiKey.length > 0
  const [googleFailed, setGoogleFailed] = useState(false)

  const handleGoogleError = useCallback(() => {
    setGoogleFailed(true)
  }, [])

  if (useGoogle && !googleFailed) {
    return (
      <GoogleMap
        selectedLat={selectedLat}
        selectedLng={selectedLng}
        onSelect={onSelect}
        onLoadError={handleGoogleError}
      />
    )
  }

  return (
    <LeafletMap
      selectedLat={selectedLat}
      selectedLng={selectedLng}
      onSelect={onSelect}
    />
  )
}
