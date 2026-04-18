import { apiAuthRequest } from "./client";

export type AppliesTo = "service" | "addon" | "pickup" | "booking";
export type DiscountType = "percent" | "fixed";
export type PromotionLimitType = "none" | "per_user" | "per_pet";
export type PromotionUsagePeriod = "lifetime" | "daily" | "weekly" | "monthly";

export interface Promotion {
  _id: string;
  code: string;
  name: string;
  description?: string | null;
  applies_to: AppliesTo;
  service_id: string | null;
  service?: { _id: string; name: string; code: string } | null;
  discount_type: DiscountType;
  value: number;
  start_date: string;
  end_date?: string | null;
  is_available_to_membership: boolean;
  is_stackable: boolean;
  is_active: boolean;
  limit_type: PromotionLimitType;
  max_usage: number | null;
  usage_period: PromotionUsagePeriod;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromotionPayload {
  code?: string;
  name?: string;
  description?: string | null;
  applies_to?: AppliesTo;
  service_id?: string | null;
  discount_type?: DiscountType;
  value?: number;
  start_date?: string;
  end_date?: string | null;
  is_available_to_membership?: boolean;
  is_stackable?: boolean;
  is_active?: boolean;
  limit_type?: PromotionLimitType;
  max_usage?: number | null;
  usage_period?: PromotionUsagePeriod;
}

export interface GetPromotionsParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  applies_to?: AppliesTo;
  discount_type?: DiscountType;
  is_available_to_membership?: boolean;
  is_stackable?: boolean;
}

export interface PromotionsResponse {
  message: string;
  promotions: Promotion[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface PromotionDetailResponse {
  message: string;
  promotion: Promotion;
}

export async function getPromotions(params: GetPromotionsParams = {}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.is_active !== undefined)
    query.set("is_active", String(params.is_active));
  if (params.applies_to) query.set("applies_to", params.applies_to);
  if (params.discount_type) query.set("discount_type", params.discount_type);
  if (params.is_available_to_membership !== undefined)
    query.set(
      "is_available_to_membership",
      String(params.is_available_to_membership),
    );
  if (params.is_stackable !== undefined)
    query.set("is_stackable", String(params.is_stackable));
  const qs = query.toString();
  return apiAuthRequest<PromotionsResponse>(`/promotions${qs ? `?${qs}` : ""}`);
}

export async function getPromotionById(id: string) {
  return apiAuthRequest<PromotionDetailResponse>(`/promotions/${id}`);
}

export async function createPromotion(payload: PromotionPayload) {
  return apiAuthRequest<{ message: string }>("/promotions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePromotion(id: string, payload: PromotionPayload) {
  return apiAuthRequest<{ message: string }>(`/promotions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePromotion(id: string) {
  return apiAuthRequest<{ message: string }>(`/promotions/${id}`, {
    method: "DELETE",
  });
}
