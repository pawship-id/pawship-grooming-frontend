"use client"

import { useCallback, useRef } from "react"
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api"

type GoogleLocationMapProps = {
  selectedLat: number | null
  selectedLng: number | null
  onSelect: (lat: number, lng: number) => void
  onLoadError?: () => void
}

const containerStyle = { width: "100%", height: "420px" }
const defaultCenter = { lat: -6.2088, lng: 106.8456 }

export function GoogleLocationMap({ selectedLat, selectedLng, onSelect, onLoadError }: GoogleLocationMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  })

  const center = selectedLat != null && selectedLng != null
    ? { lat: selectedLat, lng: selectedLng }
    : defaultCenter

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
  }, [])

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onSelect(
          Number(e.latLng.lat().toFixed(6)),
          Number(e.latLng.lng().toFixed(6)),
        )
      }
    },
    [onSelect],
  )

  if (loadError) {
    onLoadError?.()
    return null
  }

  if (!isLoaded) {
    return <div className="h-[420px] w-full rounded-md border border-border bg-muted/40 animate-pulse" />
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      mapContainerClassName="rounded-md border border-border"
      center={center}
      zoom={12}
      onLoad={onLoad}
      onClick={handleClick}
    >
      {selectedLat != null && selectedLng != null && (
        <MarkerF position={{ lat: selectedLat, lng: selectedLng }} />
      )}
    </GoogleMap>
  )
}
