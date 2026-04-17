import { apiAuthRequest } from "./client";

export interface DailyUsage {
  _id: string;
  store_id: string;
  store_name: string;
  store_code: string;
  date: string;
  used_minutes: number;
  total_capacity_minutes: number;
  remaining_minutes: number;
  overbooking_limit_minutes: number;
  max_capacity_minutes: number;
  usage_percentage: number;
  is_overbooked: boolean;
  is_at_capacity: boolean;
  has_capacity_override: boolean;
  capacity_notes: string | null;
}

export interface GetDailyUsagesParams {
  store_id?: string;
  date?: string; // YYYY-MM-DD
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
}

export interface GetDailyUsagesResponse {
  message: string;
  count: number;
  data: DailyUsage[];
}

/**
 * Get daily usage statistics for admin dashboard
 */
export async function getDailyUsages(
  params: GetDailyUsagesParams,
): Promise<GetDailyUsagesResponse> {
  const queryParams = new URLSearchParams();

  if (params.store_id) queryParams.append("store_id", params.store_id);
  if (params.date) queryParams.append("date", params.date);
  if (params.start_date) queryParams.append("start_date", params.start_date);
  if (params.end_date) queryParams.append("end_date", params.end_date);

  const url = `/bookings/daily-usages${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  return apiAuthRequest<GetDailyUsagesResponse>(url);
}
