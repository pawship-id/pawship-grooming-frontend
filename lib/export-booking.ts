import * as XLSX from "xlsx";
import { AdminBooking, AdminAppliedBenefit } from "./api/bookings";

/**
 * Calculate total benefit amount for a specific applies_to type
 */
function calculateBenefitByType(
  appliedBenefits: AdminAppliedBenefit[],
  appliesTo: string,
): number {
  return appliedBenefits
    .filter((benefit) => benefit.applies_to === appliesTo)
    .reduce((sum, benefit) => sum + benefit.amount_deducted, 0);
}

/**
 * Format date to DD/MM/YYYY
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

/**
 * Format datetime to DD/MM/YYYY HH:mm
 */
function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return "-";
  }
}

/**
 * Export bookings to Excel file
 */
export function exportBookingsToExcel(bookings: AdminBooking[]): void {
  if (!bookings || bookings.length === 0) {
    throw new Error("Tidak ada data untuk diexport");
  }

  // Determine maximum number of sessions across all bookings
  const maxSessions = Math.max(
    ...bookings.map((booking) => booking.sessions?.length || 0),
  );

  // Build column headers
  const baseHeaders = [
    "Date",
    "Time Slot",
    "Customer Name",
    "Dog Name",
    "Member Type",
    "Tipe Layanan",
    "Layanan Utama",
    "Service Type",
    "Add On 1",
    "Add On 2",
    "Add On 3",
  ];

  // Add dynamic session headers
  const sessionHeaders: string[] = [];
  for (let i = 1; i <= maxSessions; i++) {
    sessionHeaders.push(`Sesi Grooming ${i}`);
    sessionHeaders.push(`Assigned Groomer ${i}`);
  }

  const pricingHeaders = [
    "Waktu Mulai",
    "Waktu Selesai",
    "Total Grooming",
    "Membership Benefit Grooming",
    "Discount Service by Admin",
    "Total Add On",
    "Membership Benefit Add On",
    "Discount Add On by Admin",
    "Total Pick-Up",
    "Membership Benefit Pick-Up",
    "Discount Pick-Up by Admin",
    "Total Harga",
  ];

  const headers = [...baseHeaders, ...sessionHeaders, ...pricingHeaders];

  // Transform bookings to rows
  const rows = bookings.map((booking) => {
    const row: any = {};

    // Basic info
    row["Date"] = formatDate(booking.date);
    row["Time Slot"] = booking.time_range || "-";
    row["Customer Name"] = booking.customer?.username || "-";
    row["Dog Name"] = booking.pet_snapshot?.name || "-";
    row["Member Type"] = booking.pet_snapshot?.member_type?.name || "-";

    // Service details
    row["Tipe Layanan"] = booking.type || "-";
    row["Layanan Utama"] = booking.service_snapshot?.name || "-";
    row["Service Type"] = booking.service_snapshot?.service_type?.title || "-";

    // Add-ons (up to 3)
    const addons = booking.service_snapshot?.addons || [];
    row["Add On 1"] = addons[0]?.name || "-";
    row["Add On 2"] = addons[1]?.name || "-";
    row["Add On 3"] = addons[2]?.name || "-";

    // Sessions (dynamic)
    const sessions = booking.sessions || [];
    for (let i = 1; i <= maxSessions; i++) {
      const session = sessions[i - 1];
      if (session) {
        row[`Sesi Grooming ${i}`] = session.type || "-";
        row[`Assigned Groomer ${i}`] = session.groomer_detail?.username || "-";
      } else {
        row[`Sesi Grooming ${i}`] = "-";
        row[`Assigned Groomer ${i}`] = "-";
      }
    }

    // Timing
    const sortedSessions = [...sessions].sort((a, b) => a.order - b.order);
    const firstSession = sortedSessions[0];
    const lastSession = sortedSessions[sortedSessions.length - 1];

    row["Waktu Mulai"] = formatDateTime(firstSession?.started_at);
    row["Waktu Selesai"] = formatDateTime(lastSession?.finished_at);

    // Pricing - use edited prices if available, fallback to snapshot prices
    // Service Price: edited_service_price ?? snapshot price
    const servicePrice =
      booking.edited_service_price ?? booking.service_snapshot?.price ?? 0;

    // Addon Prices: use edited_addon_prices if available, fallback to snapshot prices
    let addonPrices = 0;
    addons.forEach((addon) => {
      const editedAddon = booking.edited_addon_prices?.find(
        (ea) => ea.addon_id === addon._id,
      );
      const price = editedAddon?.price ?? addon.price;
      addonPrices += price;
    });

    // Travel Fee: edited_travel_fee ?? travel_fee
    const travelFee = booking.pick_up
      ? (booking.edited_travel_fee ?? booking.travel_fee ?? 0)
      : 0;

    // Calculate benefits (membership)
    const serviceBenefit = calculateBenefitByType(
      booking.applied_benefits || [],
      "service",
    );
    const addonBenefit = calculateBenefitByType(
      booking.applied_benefits || [],
      "addon",
    );
    const pickupBenefit = calculateBenefitByType(
      booking.applied_benefits || [],
      "pickup",
    );

    // Calculate manual discounts by admin
    const serviceDiscountByAdmin = booking.edited_service_discount ?? 0;

    let addonDiscountByAdmin = 0;
    addons.forEach((addon) => {
      const editedAddon = booking.edited_addon_prices?.find(
        (ea) => ea.addon_id === addon._id,
      );
      if (editedAddon?.discount) {
        addonDiscountByAdmin += editedAddon.discount;
      }
    });

    const pickupDiscountByAdmin = booking.pick_up
      ? (booking.edited_travel_fee_discount ?? 0)
      : 0;

    row["Total Grooming"] = servicePrice;
    row["Membership Benefit Grooming"] = serviceBenefit;
    row["Discount Service by Admin"] = serviceDiscountByAdmin;
    row["Total Add On"] = addonPrices;
    row["Membership Benefit Add On"] = addonBenefit;
    row["Discount Add On by Admin"] = addonDiscountByAdmin;
    row["Total Pick-Up"] = travelFee;
    row["Membership Benefit Pick-Up"] = pickupBenefit;
    row["Discount Pick-Up by Admin"] = pickupDiscountByAdmin;
    row["Total Harga"] = booking.final_total_price || 0;

    return row;
  });

  // Create worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Set column widths for better readability
  const colWidths = headers.map((header) => {
    if (header.includes("Groomer") || header.includes("Customer"))
      return { wch: 20 };
    if (header.includes("Layanan") || header.includes("Service"))
      return { wch: 25 };
    if (header.includes("Add On")) return { wch: 20 };
    if (header.includes("Waktu")) return { wch: 18 };
    if (header.includes("Discount") && header.includes("Admin"))
      return { wch: 22 };
    if (header.includes("Total") || header.includes("Benefit"))
      return { wch: 15 };
    return { wch: 15 };
  });
  worksheet["!cols"] = colWidths;

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Bookings");

  // Generate filename with timestamp
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const filename = `Booking_Export_${year}${month}${day}_${hours}${minutes}${seconds}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
}
