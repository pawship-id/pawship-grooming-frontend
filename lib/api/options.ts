import { apiAuthRequest } from "./client"

export type CategoryOption =
  | "feather category"
  | "size category"
  | "breed category"
  | "member category"
  | "customer category"
  | "pet type"
  | "service type"

export interface ApiOption {
  _id: string
  name: string
  category_options: CategoryOption
  is_active: boolean
  createdAt: string
}

export interface OptionsResponse {
  message: string
  options: ApiOption[]
}

export type OptionPayload = {
  name: string
  category_options: CategoryOption
  is_active: boolean
}

export async function getOptions(category?: CategoryOption) {
  const params = new URLSearchParams()
  if (category) params.set("category", category)
  const query = params.toString()
  return apiAuthRequest<OptionsResponse>(`/options${query ? `?${query}` : ""}`)
}

export async function createOption(payload: OptionPayload) {
  return apiAuthRequest<{ message: string }>("/options", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateOption(optionId: string, payload: OptionPayload) {
  return apiAuthRequest<{ message: string }>(`/options/${optionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteOption(optionId: string) {
  return apiAuthRequest<{ message: string }>(`/options/${optionId}`, {
    method: "DELETE",
  })
}

export async function toggleOptionStatus(optionId: string, isActive: boolean) {
  return apiAuthRequest<{ message: string }>(`/options/${optionId}`, {
    method: "PUT",
    body: JSON.stringify({ is_active: isActive }),
  })
}
