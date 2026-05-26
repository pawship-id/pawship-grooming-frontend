/**
 * Shared formatting utilities used across booking pages.
 */

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Hotel detection — service type title equals "hotel" (case-insensitive).
export function isHotelServiceType(title?: string | null): boolean {
  return (title ?? "").trim().toLowerCase() === "hotel";
}

// Number of nights between two YYYY-MM-DD strings or Date inputs. Returns at
// least 1 (a single-night stay) so hotel pricing never falls to zero.
export function computeHotelNights(
  start: string | Date,
  end: string | Date,
): number {
  const s = typeof start === "string" ? new Date(start) : new Date(start);
  const e = typeof end === "string" ? new Date(end) : new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  const nights = Math.round(
    (e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, nights);
}
