"use client";

import { DashboardStatCards } from "@/components/admin/dashboard/stat-cards";
import { DailyCapacitySection } from "@/components/admin/dashboard/daily-capacity-section";
import { BookingTransactionSection } from "@/components/admin/dashboard/booking-transaction-section";

export default function AdminDashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Selamat datang di panel admin Pawship Grooming
        </p>
      </div>

      {/* Stat Cards */}
      <DashboardStatCards />

      {/* Transaksi Booking */}
      <BookingTransactionSection />

      {/* Daily Capacity */}
      <DailyCapacitySection />
    </div>
  );
}
