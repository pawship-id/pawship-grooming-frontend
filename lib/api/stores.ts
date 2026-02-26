import { apiAuthRequest } from "./client"

export interface StoreLocation {
  address?: string
  city?: string
  province?: string
  postal_code?: string
  latitude?: number | null
  longitude?: number | null
}

export interface StoreContact {
  phone_number?: string
  whatsapp?: string
  email?: string
}

export interface StoreOperational {
  opening_time?: string
  closing_time?: string
  operational_days?: string[]
  timezone?: string
}

export interface StoreCapacity {
  default_daily_capacity_minutes?: number | null
  overbooking_limit_minutes?: number | null
}

export interface ApiStore {
  _id: string
  code: string
  name: string
  description?: string
  location?: StoreLocation
  contact?: StoreContact
  operational?: StoreOperational
  capacity?: StoreCapacity
  is_active: boolean
  createdAt: string
  updatedAt: string
}

export interface StoresResponse {
  message: string
  stores: ApiStore[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface StoreDetailResponse {
  message: string
  store: ApiStore
}

export type GetStoresParams = {
  page: number
  limit: number
  search?: string
  is_active?: "true" | "false"
  city?: string
  province?: string
}

export type StorePayload = {
  code: string
  name: string
  description?: string
  is_active: boolean
  location: {
    address?: string
    city?: string
    province?: string
    postal_code?: string
    latitude?: number
    longitude?: number
  }
  contact: {
    phone_number?: string
    whatsapp?: string
    email?: string
  }
  operational: {
    opening_time?: string
    closing_time?: string
    operational_days?: string[]
    timezone?: string
  }
  capacity: {
    default_daily_capacity_minutes: number
    overbooking_limit_minutes: number
  }
}

export async function getStores(params: GetStoresParams) {
  const query = new URLSearchParams()
  query.set("page", String(params.page))
  query.set("limit", String(params.limit))
  if (params.search) query.set("search", params.search)
  if (params.is_active) query.set("is_active", params.is_active)
  if (params.city) query.set("city", params.city)
  if (params.province) query.set("province", params.province)

  return apiAuthRequest<StoresResponse>(`/stores?${query.toString()}`)
}

export async function getStoreById(storeId: string) {
  return apiAuthRequest<StoreDetailResponse>(`/stores/${storeId}`)
}

export async function createStore(payload: StorePayload) {
  return apiAuthRequest<{ message: string }>("/stores", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateStore(storeId: string, payload: StorePayload) {
  return apiAuthRequest<{ message: string }>(`/stores/${storeId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteStore(storeId: string) {
  return apiAuthRequest<{ message: string }>(`/stores/${storeId}`, {
    method: "DELETE",
  })
}

export async function updateStoreStatus(storeId: string, isActive: boolean) {
  return apiAuthRequest<{ message: string }>(`/stores/${storeId}`, {
    method: "PUT",
    body: JSON.stringify({ is_active: isActive }),
  })
}
