import { apiAuthRequest } from "./client";
import type { AdminBooking } from "./bookings";

export interface FinancialReportParams {
  date_from?: string;
  date_to?: string;
  store_id?: string;
  booking_status?: string;
  /** 'in store' | 'in home' — server-side filter */
  booking_type?: string;
  limit?: number;
}

interface FinancialReportResponse {
  message: string;
  bookings: AdminBooking[];
  total: number;
}

export async function getFinancialReport(
  params: FinancialReportParams = {},
): Promise<AdminBooking[]> {
  const qs = new URLSearchParams();
  if (params.date_from) qs.set("date_from", params.date_from);
  if (params.date_to) qs.set("date_to", params.date_to);
  if (params.store_id && params.store_id !== "all")
    qs.set("store_id", params.store_id);
  if (params.booking_status && params.booking_status !== "all")
    qs.set("booking_status", params.booking_status);
  if (params.booking_type && params.booking_type !== "all")
    qs.set("booking_type", params.booking_type);
  qs.set("limit", String(params.limit ?? 10000));

  const data = await apiAuthRequest<FinancialReportResponse>(
    `/reports/financial?${qs}`,
  );
  return data.bookings ?? [];
}
