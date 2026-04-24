import * as XLSX from "xlsx";
import { PetMembershipExportItem } from "./api/memberships";

function formatDate(value: string | null | undefined): string {
  if (!value) return "-";
  try {
    const date = new Date(value);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

export function exportMembershipPurchasesToExcel(
  data: PetMembershipExportItem[],
) {
  const rows = data.map((item) => ({
    "Nama Pet": item.pet_name,
    "Jenis Pet": item.pet_type,
    "Nama Owner": item.owner_name,
    "Nama Membership": item.membership_name,
    "Tanggal Beli": formatDate(item.buy_date),
    "Tanggal Mulai": formatDate(item.start_date),
    "Tanggal Selesai": formatDate(item.end_date),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths
  worksheet["!cols"] = [
    { wch: 20 }, // Nama Pet
    { wch: 15 }, // Jenis Pet
    { wch: 25 }, // Nama Owner
    { wch: 25 }, // Nama Membership
    { wch: 15 }, // Tanggal Beli
    { wch: 15 }, // Tanggal Mulai
    { wch: 15 }, // Tanggal Selesai
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Pembelian Membership");

  const today = new Date();
  const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  XLSX.writeFile(workbook, `pembelian-membership-${dateStr}.xlsx`);
}
