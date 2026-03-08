import { apiAuthRequest } from "./client"

export type ApiRole = "admin" | "ops" | "groomer" | "customer"

export interface ApiUser {
  _id: string
  username: string
  email: string
  phone_number: string
  role: ApiRole
  is_active: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiPetType {
  _id: string
  name: string
}

export interface ApiPetMembership {
  membership_id: string
  start_date: string
  end_date: string
  status: "active" | "inactive" | "expired"
  usage_count: number
  max_usage: number
}

export interface ApiPet {
  _id: string
  name: string
  description?: string
  internal_note?: string
  profile_image?: {
    secure_url: string
    public_id: string
  }
  tags: string[]
  memberships: ApiPetMembership[]
  is_active: boolean
  isDeleted: boolean
  deletedAt: string | null
  createdAt: string
  updatedAt: string
  weight?: number
  birthday?: string
  pet_type: ApiPetType | null
  hair: ApiPetType | null
  size: ApiPetType | null
  breed: ApiPetType | null
  member_category: ApiPetType | null
  last_grooming_at?: string
  last_visit_at?: string
}

export interface ApiCurrentUser extends ApiUser {
  isDeleted: boolean
  pets?: ApiPet[]
}

export interface MeResponse {
  message: string
  user: ApiCurrentUser
}

export interface UsersResponse {
  message: string
  users: ApiUser[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type GetUsersParams = {
  page: number
  limit: number
  search?: string
  role?: ApiRole
  is_active?: "true" | "false"
}

export type CreateUserPayload = {
  username: string
  email: string
  phone_number: string
  password: string
  role: ApiRole
  is_active: boolean
}

export type UpdateUserPayload = {
  username: string
  email: string
  phone_number: string
  role: ApiRole
}

export async function getUsers(params: GetUsersParams) {
  const query = new URLSearchParams()
  query.set("page", String(params.page))
  query.set("limit", String(params.limit))
  if (params.search) query.set("search", params.search)
  if (params.role) query.set("role", params.role)
  if (params.is_active) query.set("is_active", params.is_active)

  return apiAuthRequest<UsersResponse>(`/users?${query.toString()}`)
}

export async function createUser(payload: CreateUserPayload) {
  return apiAuthRequest<{ message: string }>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateUser(userId: string, payload: UpdateUserPayload) {
  return apiAuthRequest<{ message: string }>(`/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteUser(userId: string) {
  return apiAuthRequest<{ message: string }>(`/users/${userId}`, {
    method: "DELETE",
  })
}

export async function toggleUserStatus(userId: string, isActive: boolean) {
  return apiAuthRequest<{ message: string }>(`/users/toggle-status/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_active: isActive }),
  })
}

export async function updateUserPassword(userId: string, password: string) {
  return apiAuthRequest<{ message: string }>(`/users/update-password/${userId}`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  })
}

export async function getCurrentUser() {
  return apiAuthRequest<MeResponse>("/users/me")
}

export interface UserDetailResponse {
  message: string
  user: ApiCurrentUser
}

export async function getUser(userId: string) {
  return apiAuthRequest<UserDetailResponse>(`/users/${userId}`)
}
