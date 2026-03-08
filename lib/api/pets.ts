import { apiAuthRequest } from "./client"

export interface PetMembershipPayload {
  membership_id: string
  start_date: string
  end_date: string
  status: string
  usage_count?: number
  max_usage?: number
}

export interface CreatePetPayload {
  name: string
  description?: string
  internal_note?: string
  pet_type_id: string
  hair_category_id?: string
  birthday?: string
  size_category_id: string
  breed_category_id: string
  weight?: number
  member_category_id?: string
  tags?: string[]
  last_grooming_at?: string
  last_visit_at?: string
  customer_id: string
  memberships?: PetMembershipPayload[]
  is_active?: boolean
}

export type UpdatePetPayload = Partial<Omit<CreatePetPayload, "customer_id">>

export async function createPet(payload: CreatePetPayload) {
  return apiAuthRequest<{ message: string }>("/pets", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updatePet(petId: string, payload: UpdatePetPayload) {
  return apiAuthRequest<{ message: string }>(`/pets/${petId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deletePet(petId: string) {
  return apiAuthRequest<{ message: string }>(`/pets/${petId}`, {
    method: "DELETE",
  })
}
