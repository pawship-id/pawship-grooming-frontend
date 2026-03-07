import { apiAuthRequest } from "./client"

export interface ApiServiceTypeStore {
  _id: string
  code: string
  name: string
  description?: string
}

export interface ApiServiceType {
  _id: string
  title: string
  description?: string
  image_url?: string
  public_id?: string
  is_active: boolean
  show_in_homepage: boolean
  stores?: ApiServiceTypeStore[]
  isDeleted: boolean
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ServiceTypesResponse {
  message: string
  serviceTypes: ApiServiceType[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ServiceTypeDetailResponse {
  message: string
  serviceType: ApiServiceType
}

export interface ServiceTypePayload {
  title?: string
  description?: string
  image_url?: string
  public_id?: string
  is_active?: boolean
  show_in_homepage?: boolean
  store_ids?: string[]
}

export type GetServiceTypesParams = {
  page?: number
  limit?: number
  search?: string
  is_active?: "true" | "false"
  show_in_homepage?: "true" | "false"
}

export async function getServiceTypes(params: GetServiceTypesParams = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set("page", String(params.page))
  if (params.limit) query.set("limit", String(params.limit))
  if (params.search) query.set("search", params.search)
  if (params.is_active) query.set("is_active", params.is_active)
  if (params.show_in_homepage) query.set("show_in_homepage", params.show_in_homepage)
  const qs = query.toString()
  return apiAuthRequest<ServiceTypesResponse>(`/service-types${qs ? `?${qs}` : ""}`)
}

export async function getServiceTypeById(id: string) {
  return apiAuthRequest<ServiceTypeDetailResponse>(`/service-types/${id}`)
}

export async function createServiceType(payload: ServiceTypePayload) {
  return apiAuthRequest<{ message: string }>("/service-types", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateServiceType(id: string, payload: ServiceTypePayload) {
  return apiAuthRequest<{ message: string }>(`/service-types/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteServiceType(id: string) {
  return apiAuthRequest<{ message: string }>(`/service-types/${id}`, {
    method: "DELETE",
  })
}
