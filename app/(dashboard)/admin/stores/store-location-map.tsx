"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { Search, Loader2, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"

type NominatimResult = { display_name: string; lat: string; lon: string }
type SearchResult = { label: string; lat: number; lng: number }

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

function FlyToHandler({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 15)
    }
  }, [target, map])
  return null
}

export function StoreLocationMap({ selectedLat, selectedLng, onSelect }: StoreLocationMapProps) {
  const center: [number, number] =
    selectedLat != null && selectedLng != null
      ? [selectedLat, selectedLng]
      : [-6.2088, 106.8456]

  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", onMouseDown)
    return () => document.removeEventListener("mousedown", onMouseDown)
  }, [])

  // Debounced auto-search via Nominatim
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = searchQuery.trim()
    if (!q || q.length < 3) {
      setResults([])
      setDropdownOpen(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=id&countrycodes=id&addressdetails=1`,
          { headers: { "User-Agent": "PawshipGrooming/1.0" } },
        )
        const data: NominatimResult[] = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setResults(data.map((d) => ({
            label: d.display_name,
            lat: parseFloat(d.lat),
            lng: parseFloat(d.lon),
          })))
          setDropdownOpen(true)
        } else {
          setResults([])
          setDropdownOpen(false)
        }
      } catch {
        setResults([])
      } finally {
        setIsSearching(false)
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery])

  // When user picks a result: fly map to location AND move the pin via onSelect
  const handleSelectResult = useCallback((result: SearchResult) => {
    setFlyTarget({ lat: result.lat, lng: result.lng })
    onSelect(result.lat, result.lng)
    setSearchQuery(result.label)
    setDropdownOpen(false)
    setResults([])
  }, [onSelect])

  return (
    <div className="flex flex-col gap-2">
      <div className="relative" ref={searchContainerRef}>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
          <Input
            placeholder="Cari lokasi berdasarkan nama (min. 3 karakter)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => results.length > 0 && setDropdownOpen(true)}
            className="pl-9 pr-9"
          />
        </div>
        {dropdownOpen && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border border-border bg-background shadow-md">
            {results.map((result, i) => (
              <button
                key={i}
                type="button"
                className="flex w-full items-start gap-2 px-3 py-2.5 text-sm hover:bg-muted/60 text-left"
                onMouseDown={(e) => { e.preventDefault(); handleSelectResult(result) }}
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <span className="leading-snug">{result.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
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
        <FlyToHandler target={flyTarget} />
        {selectedLat != null && selectedLng != null && (
          <CircleMarker center={[selectedLat, selectedLng]} radius={8} pathOptions={{ color: "#16a34a", fillColor: "#22c55e", fillOpacity: 0.8 }} />
        )}
      </MapContainer>
    </div>
  )
}
