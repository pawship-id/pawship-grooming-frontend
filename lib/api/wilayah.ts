// REST client for wilayah.id (Indonesia administrative regions).
// Caches each list in-memory for the page lifetime to avoid refetching.
//
// Endpoints (all return { data: WilayahItem[], meta: ... }):
//   provinces:      /api/provinces.json
//   regencies:      /api/regencies/{provinceCode}.json
//   districts:      /api/districts/{regencyCode}.json
//   villages:       /api/villages/{districtCode}.json

// Proxied via Next.js route handler at app/api/wilayah/[...path]/route.ts
// because wilayah.id does not send CORS headers for browser requests.
const BASE = "/api/wilayah"

export type WilayahItem = { code: string; name: string }

type ApiResponse = { data: WilayahItem[] }

// In-memory caches (module-level, persist for the page lifetime)
let provincesCache: WilayahItem[] | null = null
const regenciesCache = new Map<string, WilayahItem[]>()
const districtsCache = new Map<string, WilayahItem[]>()
const villagesCache = new Map<string, WilayahItem[]>()

async function fetchJson(url: string): Promise<WilayahItem[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`wilayah.id request failed (${res.status}): ${url}`)
  }
  const json = (await res.json()) as ApiResponse
  return json.data ?? []
}

export async function getProvinces(): Promise<WilayahItem[]> {
  if (provincesCache) return provincesCache
  const data = await fetchJson(`${BASE}/provinces.json`)
  provincesCache = data
  return data
}

export async function getRegencies(provinceCode: string): Promise<WilayahItem[]> {
  const cached = regenciesCache.get(provinceCode)
  if (cached) return cached
  const data = await fetchJson(`${BASE}/regencies/${provinceCode}.json`)
  regenciesCache.set(provinceCode, data)
  return data
}

export async function getDistricts(regencyCode: string): Promise<WilayahItem[]> {
  const cached = districtsCache.get(regencyCode)
  if (cached) return cached
  const data = await fetchJson(`${BASE}/districts/${regencyCode}.json`)
  districtsCache.set(regencyCode, data)
  return data
}

export async function getVillages(districtCode: string): Promise<WilayahItem[]> {
  const cached = villagesCache.get(districtCode)
  if (cached) return cached
  const data = await fetchJson(`${BASE}/villages/${districtCode}.json`)
  villagesCache.set(districtCode, data)
  return data
}

// Helper: case-insensitive name match. Some legacy data may store names
// with slight capitalization differences ("KOTA BANDUNG" vs "Kota Bandung").
export function findByName(items: WilayahItem[], name: string | undefined | null): WilayahItem | undefined {
  if (!name) return undefined
  const target = name.trim().toLowerCase()
  return items.find((it) => it.name.trim().toLowerCase() === target)
}
