import { apiAuthRequest } from "./client";

export type CategoryOption =
  | "hair category"
  | "size category"
  | "breed category"
  | "customer category"
  | "pet type"
  | "session - skill";

export interface PetWeightRule {
  minWeight: number;
  maxWeight: number;
  petTypeId: string;
}

// API response may have populated petTypeId
export interface ApiPetWeightRule {
  minWeight: number;
  maxWeight: number;
  petTypeId: string | { _id: string; name: string };
}

export interface ApiOption {
  _id: string;
  name: string;
  category_options: CategoryOption;
  is_active: boolean;
  pet_weight_rules?: ApiPetWeightRule[];
  createdAt: string;
}

export interface OptionsResponse {
  message: string;
  options: ApiOption[];
}

export type OptionPayload = {
  name: string;
  category_options: CategoryOption;
  is_active: boolean;
  pet_weight_rules?: PetWeightRule[];
};

export async function getOptions(category?: CategoryOption) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  const query = params.toString();
  return apiAuthRequest<OptionsResponse>(`/options${query ? `?${query}` : ""}`);
}

export async function createOption(payload: OptionPayload) {
  return apiAuthRequest<{ message: string; option: ApiOption }>("/options", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateOption(optionId: string, payload: OptionPayload) {
  return apiAuthRequest<{ message: string }>(`/options/${optionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteOption(optionId: string) {
  return apiAuthRequest<{ message: string }>(`/options/${optionId}`, {
    method: "DELETE",
  });
}

export async function toggleOptionStatus(optionId: string, isActive: boolean) {
  return apiAuthRequest<{ message: string }>(`/options/${optionId}`, {
    method: "PUT",
    body: JSON.stringify({ is_active: isActive }),
  });
}
