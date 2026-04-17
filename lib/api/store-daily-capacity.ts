import { apiAuthRequest } from "./client";

export interface StoreDailyCapacity {
  _id: string;
  store_id: string;
  date: string;
  total_capacity_minutes: number;
  notes?: string;
  created_by?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreDailyCapacityDto {
  store_id: string;
  date: string; // ISO date string
  total_capacity_minutes: number;
  notes?: string;
}

export interface UpdateStoreDailyCapacityDto {
  total_capacity_minutes?: number;
  notes?: string;
}

export interface GetStoreDailyCapacitiesResponse {
  message: string;
  capacities: StoreDailyCapacity[];
}

export interface GetStoreDailyCapacityResponse {
  message: string;
  capacity: StoreDailyCapacity;
}

/**
 * Create a new store daily capacity override
 */
export async function createStoreDailyCapacity(
  data: CreateStoreDailyCapacityDto,
): Promise<{ message: string }> {
  return apiAuthRequest<{ message: string }>("/store-daily-capacities", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing store daily capacity
 */
export async function updateStoreDailyCapacity(
  id: string,
  data: UpdateStoreDailyCapacityDto,
): Promise<{ message: string }> {
  return apiAuthRequest<{ message: string }>(`/store-daily-capacities/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Get all store daily capacities
 */
export async function getStoreDailyCapacities(params?: {
  store_id?: string;
  date?: string;
}): Promise<GetStoreDailyCapacitiesResponse> {
  const queryParams = new URLSearchParams();
  if (params?.store_id) queryParams.append("store_id", params.store_id);
  if (params?.date) queryParams.append("date", params.date);

  const url = queryParams.toString()
    ? `/store-daily-capacities?${queryParams.toString()}`
    : "/store-daily-capacities";

  return apiAuthRequest<GetStoreDailyCapacitiesResponse>(url);
}

/**
 * Get a single store daily capacity by ID
 */
export async function getStoreDailyCapacity(
  id: string,
): Promise<GetStoreDailyCapacityResponse> {
  return apiAuthRequest<GetStoreDailyCapacityResponse>(
    `/store-daily-capacities/${id}`,
  );
}

/**
 * Delete a store daily capacity
 */
export async function deleteStoreDailyCapacity(
  id: string,
): Promise<{ message: string }> {
  return apiAuthRequest<{ message: string }>(`/store-daily-capacities/${id}`, {
    method: "DELETE",
  });
}
