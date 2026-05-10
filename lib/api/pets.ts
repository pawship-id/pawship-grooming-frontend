import { apiAuthRequest } from "./client";

export interface PetMembershipPayload {
  membership_id: string;
  start_date: string;
  end_date: string;
  status: string;
  usage_count?: number;
  max_usage?: number;
}

export interface CreatePetPayload {
  name: string;
  description?: string;
  internal_note?: string;
  profile_image?: { secure_url: string; public_id: string };
  pet_type_id: string;
  hair_category_id?: string;
  birthday?: string;
  size_category_id: string;
  breed_category_id: string;
  weight?: number;
  tags?: string[];
  last_grooming_at?: string;
  last_visit_at?: string;
  customer_id: string;
  memberships?: PetMembershipPayload[];
  is_active?: boolean;
  code?: string;
}

export type UpdatePetPayload = Partial<Omit<CreatePetPayload, "customer_id">>;

export async function createPet(payload: CreatePetPayload) {
  return apiAuthRequest<{ message: string }>("/pets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePet(petId: string, payload: UpdatePetPayload) {
  return apiAuthRequest<{ message: string }>(`/pets/${petId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePet(petId: string) {
  return apiAuthRequest<{ message: string }>(`/pets/${petId}`, {
    method: "DELETE",
  });
}

export interface GetPetsParams {
  page?: number;
  limit?: number;
  is_active?: "true" | "false";
  customer_id?: string;
}

export interface PetsResponse {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  pets: any[];
}

export async function getPets(params: GetPetsParams = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 10));
  if (params.is_active) qs.set("is_active", params.is_active);
  if (params.customer_id) qs.set("customer_id", params.customer_id);
  return apiAuthRequest<PetsResponse>(`/pets?${qs.toString()}`);
}
