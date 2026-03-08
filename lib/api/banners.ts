import { apiAuthRequest } from "./client"

export interface BannerCta {
  label: string
  link: string
  background_color?: string
  text_color?: string
  vertical_position?: "top" | "center" | "bottom"
  horizontal_position?: "left" | "center" | "right"
}

export interface Banner {
  _id: string
  image_url: string
  public_id: string
  title?: string
  subtitle?: string
  text_align?: "left" | "center" | "right"
  text_color?: string
  cta?: BannerCta | null
  order: number
  is_active: boolean
  isDeleted: boolean
  createdAt: string
  updatedAt: string
}

export interface BannersResponse {
  message: string
  banners: Banner[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface BannerDetailResponse {
  message: string
  banner: Banner
}

export interface BannerPayload {
  image_url?: string
  public_id?: string
  title?: string
  subtitle?: string
  text_align?: "left" | "center" | "right"
  text_color?: string
  cta?: BannerCta | null
  order?: number
  is_active?: boolean
}

export interface GetBannersParams {
  page?: number
  limit?: number
  is_active?: boolean
}

export async function getAdminBanners(params?: GetBannersParams): Promise<BannersResponse> {
  const query = new URLSearchParams()
  if (params?.page !== undefined) query.set("page", String(params.page))
  if (params?.limit !== undefined) query.set("limit", String(params.limit))
  if (params?.is_active !== undefined) query.set("is_active", String(params.is_active))
  const qs = query.toString()
  return apiAuthRequest<BannersResponse>(`/banners${qs ? `?${qs}` : ""}`)
}

export async function getAdminBannerById(id: string): Promise<BannerDetailResponse> {
  return apiAuthRequest<BannerDetailResponse>(`/banners/${id}`)
}

export async function createBanner(payload: BannerPayload): Promise<{ message: string }> {
  return apiAuthRequest<{ message: string }>("/banners", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateBanner(id: string, payload: BannerPayload): Promise<{ message: string }> {
  return apiAuthRequest<{ message: string }>(`/banners/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteBanner(id: string): Promise<{ message: string }> {
  return apiAuthRequest<{ message: string }>(`/banners/${id}`, {
    method: "DELETE",
  })
}
