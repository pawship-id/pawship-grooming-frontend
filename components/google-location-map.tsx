"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GoogleMap, useJsApiLoader, MarkerF } from "@react-google-maps/api"
import { Search, Loader2, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"

// Defined outside component so the reference stays stable across renders
const MAP_LIBRARIES: ("places" | "geometry" | "drawing" | "visualization")[] = ["places"]

type SearchResult = { label: string; placeId: string }

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
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
    libraries: MAP_LIBRARIES,
  })

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

  // Debounced auto-search using AutocompleteService (supports buildings, POIs, streets)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = searchQuery.trim()
    if (!q || q.length < 3 || !isLoaded) {
      setResults([])
      setDropdownOpen(false)
      return
    }
    debounceRef.current = setTimeout(() => {
      if (!autocompleteRef.current) {
        autocompleteRef.current = new google.maps.places.AutocompleteService()
      }
      setIsSearching(true)
      autocompleteRef.current.getPlacePredictions(
        { input: q, componentRestrictions: { country: "id" } },
        (predictions, status) => {
          setIsSearching(false)
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setResults(predictions.map((p) => ({ label: p.description, placeId: p.place_id })))
            setDropdownOpen(true)
          } else {
            setResults([])
            setDropdownOpen(false)
          }
        },
      )
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, isLoaded])

  // When user picks a result: fetch exact coordinates via PlacesService, move pin + map
  const handleSelectResult = useCallback((result: SearchResult) => {
    setSearchQuery(result.label)
    setDropdownOpen(false)
    setResults([])
    if (!mapRef.current) return
    const placesService = new google.maps.places.PlacesService(mapRef.current)
    placesService.getDetails(
      { placeId: result.placeId, fields: ["geometry"] },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
          const lat = Number(place.geometry.location.lat().toFixed(6))
          const lng = Number(place.geometry.location.lng().toFixed(6))
          mapRef.current?.panTo(place.geometry.location)
          mapRef.current?.setZoom(17)
          onSelect(lat, lng)
        }
      },
    )
  }, [onSelect])

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
    </div>
  )
}
