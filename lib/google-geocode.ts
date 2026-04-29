// Reverse-geocode lat/lng using Google Maps Geocoder.
// Parses address_components into Indonesian admin levels.
//
// Mapping:
//   administrative_area_level_1 → province
//   administrative_area_level_2 → city/regency (kota/kabupaten)
//   administrative_area_level_3 → district (kecamatan)
//   administrative_area_level_4 → subdistrict / village (kelurahan/desa)
//   postal_code                  → postal_code
//
// NOTE: Requires the Google Maps JavaScript API to already be loaded.

export type GeocodedAddress = {
  province?: string
  city?: string
  district?: string
  subdistrict?: string
  postal_code?: string
}

function findComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string,
): string | undefined {
  return components.find((c) => c.types.includes(type))?.long_name
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<GeocodedAddress | null> {
  if (typeof google === "undefined" || !google.maps?.Geocoder) return null

  const geocoder = new google.maps.Geocoder()
  return new Promise((resolve) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status !== "OK" || !results || results.length === 0) {
        resolve(null)
        return
      }

      // Aggregate components from the most-specific result first; fall back
      // to subsequent results for any missing field. This is needed because
      // Google sometimes returns the village in a separate result than the
      // street address.
      const out: GeocodedAddress = {}
      for (const r of results) {
        const comps = r.address_components
        out.province ??= findComponent(comps, "administrative_area_level_1")
        out.city ??= findComponent(comps, "administrative_area_level_2")
        out.district ??= findComponent(comps, "administrative_area_level_3")
        out.subdistrict ??= findComponent(comps, "administrative_area_level_4")
        out.postal_code ??= findComponent(comps, "postal_code")
      }

      resolve(out)
    })
  })
}
