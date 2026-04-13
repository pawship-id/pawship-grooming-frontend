import { apiRequest, apiAuthRequest } from "./client";

export interface StoreLocation {
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface StoreContact {
  phone_number?: string;
  whatsapp?: string;
  email?: string;
}

export interface StoreOperational {
  opening_time?: string;
  closing_time?: string;
  operational_days?: string[];
  timezone?: string;
}

export interface StoreCapacity {
  default_daily_capacity_minutes?: number | null;
  overbooking_limit_minutes?: number | null;
}

export interface ZonePriceItem {
  size_category_id: string;
  price: number;
}

export interface HomeServiceZone {
  area_name: string;
  min_radius_km: number;
  max_radius_km: number;
  travel_time_minutes: number;
  price: number;
}

export interface PickupDeliveryZone {
  area_name: string;
  min_radius_km: number;
  max_radius_km: number;
  travel_time_minutes: number;
  prices: ZonePriceItem[];
}

/** @deprecated Use HomeServiceZone instead */
export interface StoreZone {
  area_name: string;
  min_radius_km: number;
  max_radius_km: number;
  travel_time_minutes: number;
  travel_fee: number;
}

export interface ServicePrice {
  pet_id?: string;
  pet_name?: string;
  size_id?: string;
  size_name?: string;
  hair_id?: string;
  hair_name?: string;
  name?: string;
  price: number;
}

export interface ServiceType {
  _id: string;
  name: string;
}

export interface SizeCategory {
  _id: string;
  name: string;
}

export interface PetType {
  _id: string;
  name: string;
}

export interface ApiService {
  _id: string;
  code: string;
  name: string;
  description?: string;
  prices: ServicePrice[];
  duration: number;
  available_for_unlimited: boolean;
  is_active: boolean;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  service_type?: ServiceType;
  size_categories?: SizeCategory[];
  pet_types?: PetType[];
}

export interface ApiStore {
  _id: string;
  code: string;
  name: string;
  description?: string;
  location?: StoreLocation;
  contact?: StoreContact;
  operational?: StoreOperational;
  capacity?: StoreCapacity;
  sessions?: string[];
  zones?: StoreZone[]; // Deprecated - kept for backward compatibility
  home_service_zones?: HomeServiceZone[];
  pickup_delivery_zones?: PickupDeliveryZone[];
  is_pickup_delivery_available?: boolean;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  services?: ApiService[];
}

export interface StoresResponse {
  message: string;
  stores: ApiStore[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StoreDetailResponse {
  message: string;
  store: ApiStore;
}

export type GetStoresParams = {
  page: number;
  limit: number;
  search?: string;
  is_active?: "true" | "false";
  city?: string;
  province?: string;
};

export type StorePayload = {
  code: string;
  name: string;
  description?: string;
  location: {
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
  };
  contact: {
    phone_number?: string;
    whatsapp?: string;
    email?: string;
  };
  operational: {
    opening_time?: string;
    closing_time?: string;
    operational_days?: string[];
    timezone?: string;
  };
  capacity: {
    default_daily_capacity_minutes: number;
    overbooking_limit_minutes: number;
  };
  sessions?: string[];
  home_service_zones?: HomeServiceZone[];
  pickup_delivery_zones?: PickupDeliveryZone[];
  is_pickup_delivery_available?: boolean;
  zones?: {
    area_name: string;
    min_radius_km: number;
    max_radius_km: number;
    travel_time_minutes: number;
    travel_fee: number;
  }[]; // Deprecated
  is_active?: boolean;
};

export async function getStores(params: GetStoresParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.is_active) query.set("is_active", params.is_active);
  if (params.city) query.set("city", params.city);
  if (params.province) query.set("province", params.province);

  return apiAuthRequest<StoresResponse>(`/stores?${query.toString()}`);
}

export async function getStoreById(storeId: string) {
  return apiAuthRequest<StoreDetailResponse>(`/stores/${storeId}`);
}

export async function createStore(payload: StorePayload) {
  return apiAuthRequest<{ message: string }>("/stores", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStore(storeId: string, payload: StorePayload) {
  return apiAuthRequest<{ message: string }>(`/stores/${storeId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteStore(storeId: string) {
  return apiAuthRequest<{ message: string }>(`/stores/${storeId}`, {
    method: "DELETE",
  });
}

export async function updateStoreStatus(storeId: string, isActive: boolean) {
  return apiAuthRequest<{ message: string }>(`/stores/${storeId}`, {
    method: "PUT",
    body: JSON.stringify({ is_active: isActive }),
  });
}

// ── Public (no-auth) store endpoints ────────────────────────────────────────

export interface PublicServiceType {
  _id: string;
  title: string;
  description: string;
  image_url: string;
}

export interface PublicStoreLocation {
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface PublicStoreContact {
  phone_number?: string;
  whatsapp?: string;
  email?: string;
}

export interface PublicStoreOperational {
  opening_time?: string;
  closing_time?: string;
  operational_days?: string[];
  timezone?: string;
}

export interface PublicStore {
  _id: string;
  code: string;
  name: string;
  description?: string;
  location?: PublicStoreLocation;
  contact?: PublicStoreContact;
  operational?: PublicStoreOperational;
  sessions?: string[];
  is_active: boolean;
  is_default_store?: boolean;
  serviceTypes: PublicServiceType[];
}

export interface PublicStoresResponse {
  message: string;
  stores: PublicStore[];
}

export async function getPublicStores() {
  return apiRequest<PublicStoresResponse>("/bookings/public/stores");
}

// ── Public services ──────────────────────────────────────────────────────────

export interface PublicServicePrice {
  pet_type_id: string;
  pet_name: string;
  size_id: string;
  size_name: string;
  hair_id?: string;
  hair_name?: string;
  price: number;
}

export interface PublicService {
  _id: string;
  code: string;
  name: string;
  description?: string;
  image_url?: string;
  prices: PublicServicePrice[];
  duration: number;
  include?: string[];
  available_for_unlimited?: boolean;
  show_in_homepage?: boolean;
  is_active: boolean;
  service_type?: { _id: string; title: string };
}

export interface PublicServicesResponse {
  message: string;
  services: PublicService[];
}

export async function getPublicServices(
  storeId: string,
  serviceTypeId: string,
) {
  return apiRequest<PublicServicesResponse>(
    `/bookings/public/services?store_id=${encodeURIComponent(storeId)}&service_type_id=${encodeURIComponent(serviceTypeId)}`,
  );
}

// ── Public user & pet endpoints ──────────────────────────────────────────────

export interface PublicUserPetRef {
  _id: string;
  name: string;
}

export interface PublicUserPet {
  _id: string;
  name: string;
  pet_type: PublicUserPetRef;
  size: PublicUserPetRef;
  breed: PublicUserPetRef;
}

export interface PublicUser {
  _id: string;
  username: string;
  email: string;
  phone_number: string;
  role: string;
}

export interface CheckUserResponse {
  message: string;
  exists: boolean;
  user: PublicUser | null;
  pets: PublicUserPet[];
}

export interface PublicOption {
  _id: string;
  name: string;
  category_options: string;
  is_active: boolean;
}

export interface PublicOptionsResponse {
  message: string;
  options: PublicOption[];
}

export interface RegisterPublicPayload {
  username: string;
  email: string;
  phone_number: string;
  pet: {
    name: string;
    pet_type_id: string;
    breed_category_id: string;
    size_category_id: string;
  };
}

export interface AddPublicPetPayload {
  phone_number: string;
  pet_name: string;
  pet_type_id: string;
  breed_category_id: string;
  size_category_id: string;
}

export async function checkUserByPhone(phone: string) {
  return apiRequest<CheckUserResponse>(
    `/bookings/public/check-user/phone/${encodeURIComponent(phone)}`,
  );
}

export async function getPublicOptions(category: string) {
  return apiRequest<PublicOptionsResponse>(
    `/bookings/public/options?category=${encodeURIComponent(category)}`,
  );
}

export async function registerPublicUser(payload: RegisterPublicPayload) {
  return apiRequest<{ message: string }>("/bookings/public/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function addPublicPet(payload: AddPublicPetPayload) {
  return apiRequest<{ message: string }>("/bookings/public/pets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Public homepage endpoints ────────────────────────────────────────────────

export interface HomepageServiceType {
  _id: string;
  title: string;
  description?: string;
  image_url?: string;
}

export interface HomepageServiceTypeResponse {
  message: string;
  serviceTypes: HomepageServiceType[];
}

export interface HomepageServicePrice {
  pet_type_id?: { _id: string; name: string } | string;
  pet_name?: string;
  size_id?: { _id: string; name: string } | string;
  size_name?: string;
  hair_id?: { _id: string; name: string } | string;
  hair_name?: string;
  price: number;
}

export interface HomepageService {
  _id: string;
  code: string;
  name: string;
  description?: string;
  image_url?: string;
  service_type?: { _id: string; title: string };
  pet_types?: { _id: string; name: string }[];
  price_type?: "single" | "multiple";
  price?: number;
  prices?: HomepageServicePrice[];
  duration: number;
  include?: string[];
  show_in_homepage: boolean;
  order: number;
}

export interface HomepageServiceResponse {
  message: string;
  services: HomepageService[];
}

export async function getHomepageServiceTypes() {
  return apiRequest<HomepageServiceTypeResponse>(
    "/service-types/public/homepage",
  );
}

export async function getHomepageServices() {
  return apiRequest<HomepageServiceResponse>("/services/public/homepage");
}

// ── Public booking preview ───────────────────────────────────────────────────

export interface PublicPreviewBenefit {
  _id: string
  applies_to: string
  service_id?: string
  label?: string
  service?: { name: string } | null
  type: string
  period: string
  value?: number
  limit: number | null
  used: number
  remaining: number | null
  can_apply: boolean
  period_reset_date?: string | null
  next_reset_date?: string | null
  amount_discount?: number
  description: string
}

export interface PublicPreviewResult {
  pet_id: string
  pet_name: string
  service_id: string
  service_name: string
  pricing: {
    original_service_price: number
    addon_prices: { _id: string; name: string; price: number }[]
    subtotal_before_benefits: number
    has_active_membership: boolean
    available_benefits: PublicPreviewBenefit[]
    estimated_total_discount: number
    estimated_final_price: number
  }
  pricing_breakdown: {
    service: { name: string; price: number }
    addons: { _id: string; name: string; price: number }[]
    travel_fee?: number
    subtotal: number
    grand_total: number
    discount: number
    final: number
  }
}

export interface PublicApplyBenefitBreakdown {
  benefit: {
    _id: string
    label: string | null
    service: { name: string } | null
  }
  applies_to: string
  benefit_type: string
  benefit_period: string
  benefit_value: number | null
  base_price: number
  amount_deducted: number
  description: string | null
  applied_at: string
}

export interface PublicApplyBenefitResult {
  applied_benefits: {
    benefit_id: string
    benefit_type: string
    benefit_period: string
    benefit_value: number | null
    amount_deducted: number
    applied_at: string
  }[]
  total_discount: number
  final_price: number
  breakdown: PublicApplyBenefitBreakdown[]
}

export async function getPublicBookingPreview(payload: {
  pet_id: string
  service_id: string
  addon_ids?: string[]
  date: string
  time_range?: string
}) {
  return apiRequest<{ message: string } & PublicPreviewResult>(
    "/bookings/public/preview",
    { method: "POST", body: JSON.stringify(payload) }
  )
}

export async function publicApplyBenefitPreview(payload: {
  pet_id: string
  selected_benefit_ids: string[]
  store_id?: string
  service_id?: string
  add_on_ids?: string[]
  original_total_price?: number
  booking_date?: string
}) {
  return apiRequest<{ message: string } & PublicApplyBenefitResult>(
    "/bookings/public/apply-benefit",
    { method: "POST", body: JSON.stringify(payload) }
  )
}
