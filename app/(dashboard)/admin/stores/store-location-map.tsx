"use client"

import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"

type StoreLocationMapProps = {
  selectedLat: number | null
  selectedLng: number | null
  onSelect: (lat: number, lng: number) => void
}

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      const { lat, lng } = event.latlng
      onSelect(Number(lat.toFixed(6)), Number(lng.toFixed(6)))
    },
  })

  return null
}

export function StoreLocationMap({ selectedLat, selectedLng, onSelect }: StoreLocationMapProps) {
  const center: [number, number] =
    selectedLat != null && selectedLng != null
      ? [selectedLat, selectedLng]
      : [-6.2088, 106.8456]

  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom
      className="h-[420px] w-full rounded-md border border-border"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onSelect={onSelect} />
      {selectedLat != null && selectedLng != null && (
        <CircleMarker center={[selectedLat, selectedLng]} radius={8} pathOptions={{ color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.8 }} />
      )}
    </MapContainer>
  )
}
