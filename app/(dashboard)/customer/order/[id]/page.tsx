"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { getAdminBookingById, type AdminBooking } from "@/lib/api/bookings";
import { ApiError } from "@/lib/api/client";
import { getStatusConfig } from "@/lib/booking-status";
import {
  BookingLoadingState,
  BookingErrorState,
} from "@/components/booking/loading-error";
import { OrderHeader } from "./_components/order-header";
import { ServiceInfo } from "./_components/service-info";
import { PaymentSummary } from "./_components/payment-summary";
import { StatusHistory } from "./_components/status-history";
import { BeforeAfterPhotos } from "./_components/before-after-photos";
import { BookingDetails } from "./_components/booking-details";
import { CustomerInfo } from "./_components/customer-info";
import { OrderNotes } from "./_components/order-notes";
import { SessionReviews } from "./_components/session-reviews";

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = params.id as string;

  async function fetchBookingDetail() {
    try {
      setLoading(true);
      setError(null);
      const response = await getAdminBookingById(bookingId);
      setBooking(response.booking);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        toast.error(
          err.message ||
            "Booking ini bukan milik Anda, silahkan hubungi admin untuk konfirmasi",
          { id: `booking-forbidden-${bookingId}` },
        );
        router.replace("/customer/order");
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        setError("Booking tidak ditemukan.");
        return;
      }
      console.error("Failed to fetch booking detail:", err);
      setError("Gagal memuat detail booking. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (bookingId) {
      fetchBookingDetail();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (loading) return <BookingLoadingState />;
  if (error) return <BookingErrorState message={error} />;
  if (!booking) return <BookingErrorState message="Booking tidak ditemukan." />;

  const cfg = getStatusConfig(booking.booking_status);
  const groomerName =
    booking.sessions?.[0]?.groomer_detail?.username || "Groomer";

  // Aggregate all media: top-level + from sessions
  const allMedia = [
    ...(booking.media ?? []),
    ...(booking.sessions?.flatMap((s) => s.media ?? []) ?? []),
  ];

  return (
    <div className="space-y-6">
      <OrderHeader
        bookingId={booking._id}
        statusLabel={cfg.label || booking.booking_status}
        statusClassName={cfg.className}
        statusIcon={cfg.icon}
        onBack={() => router.push("/customer/order")}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="space-y-6 lg:col-span-2">
          <ServiceInfo booking={booking} />
          <PaymentSummary booking={booking} />
          <BeforeAfterPhotos media={allMedia} />
          {booking.booking_status === "completed" && (
            <SessionReviews
              bookingId={booking._id}
              sessions={booking.sessions}
              onReviewSubmitted={fetchBookingDetail}
            />
          )}
          <StatusHistory statusLogs={booking.status_logs} />
        </div>

        {/* Right Column - Details */}
        <div className="space-y-6">
          <BookingDetails booking={booking} groomerName={groomerName} />
          {booking.customer && <CustomerInfo customer={booking.customer} />}
          <OrderNotes
            preConditions={[]}
            bookingNote={booking.note}
            sessions={booking.sessions}
          />
        </div>
      </div>
    </div>
  );
}
