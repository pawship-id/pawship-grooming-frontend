import { apiAuthRequest } from "./client"

export interface AdminServicePrice {
  pet_type_id?: string
  pet_name?: string
  size_id?: string
  size_name?: string
  hair_id?: string
  hair_name?: string
  price: number
}

export interface AdminServiceRef {
  _id: string
  name: string
}

export interface AdminServiceTypeRef {
  _id: string
  title: string
}

export interface AdminServiceAddon {
  _id: string
  code: string
  name: string
  image_url?: string
}

export interface AdminService {
  _id: string
  code: string
  name: string
  description?: string
  service_type?: AdminServiceTypeRef
  pet_types?: AdminServiceRef[]
  size_categories?: AdminServiceRef[]
  hair_categories?: AdminServiceRef[]
  prices?: AdminServicePrice[]
  duration: number
  available_for_unlimited: boolean
  image_url?: string
  public_id?: string
  avaiable_store?: AdminServiceRef[]
  addons?: AdminServiceAddon[]
  include?: string[]
  show_in_homepage: boolean
  order: number
  service_location_type?: string
  is_active: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminServicesResponse {
  message: string
  services: AdminService[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AdminServiceDetailResponse {
  message: string
  service: AdminService
}

export type ServicePayload = {
  code?: string
  name?: string
  description?: string
  service_type_id?: string
  pet_type_ids?: string[]
  size_category_ids?: string[]
  hair_category_ids?: string[]
  prices?: { pet_type_id: string; size_id: string; hair_id: string; price: number }[]
  duration?: number
  available_for_unlimited?: boolean
  available_store_ids?: string[]
  addon_ids?: string[]
  include?: string[]
  image_url?: string
  public_id?: string
  show_in_homepage?: boolean
  order?: number
  service_location_type?: string
  is_active?: boolean
}

export type GetAdminServicesParams = {
  page?: number
  limit?: number
  search?: string
  is_active?: "true" | "false"
  service_type_id?: string
  pet_type_id?: string
  size_category_id?: string
  store_id?: string
  available_for_unlimited?: "true" | "false"
}

export async function getAdminServices(params: GetAdminServicesParams = {}) {
  const query = new URLSearchParams()
  if (params.page) query.set("page", String(params.page))
  if (params.limit) query.set("limit", String(params.limit))
  if (params.search) query.set("search", params.search)
  if (params.is_active) query.set("is_active", params.is_active)
  if (params.service_type_id) query.set("service_type_id", params.service_type_id)
  if (params.pet_type_id) query.set("pet_type_id", params.pet_type_id)
  if (params.size_category_id) query.set("size_category_id", params.size_category_id)
  if (params.store_id) query.set("store_id", params.store_id)
  if (params.available_for_unlimited) query.set("available_for_unlimited", params.available_for_unlimited)
  const qs = query.toString()
  return apiAuthRequest<AdminServicesResponse>(`/services${qs ? `?${qs}` : ""}`)
}

export async function getAdminServiceById(id: string) {
  return apiAuthRequest<AdminServiceDetailResponse>(`/services/${id}`)
}

export async function createAdminService(payload: ServicePayload) {
  return apiAuthRequest<{ message: string }>("/services", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateAdminService(id: string, payload: ServicePayload) {
  return apiAuthRequest<{ message: string }>(`/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminService(id: string) {
  return apiAuthRequest<{ message: string }>(`/services/${id}`, {
    method: "DELETE",
  })
}
