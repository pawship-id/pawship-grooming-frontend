"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  Calendar,
  Truck,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/format";
import {
  getAdminBookingById,
} from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";
import { getStoreById } from "@/lib/api/stores";
import { getUsers } from "@/lib/api/users";
import type { ApiUser } from "@/lib/api/users";
import { getOptions } from "@/lib/api/options";
import type { ApiOption } from "@/lib/api/options";

import { BookingHeader } from "./_components/booking-header";
import { StatusBookingCard } from "./_components/status-booking-card";
import { PriceEditPanel } from "./_components/price-edit-panel";
import { PriceDisplay } from "./_components/price-display";
import { CustomerPetCard } from "./_components/customer-pet-card";
import { StatusLogsCard } from "./_components/status-logs-card";
import { GroomingSessionsCard } from "./_components/grooming-sessions-card";
import { PhotoGalleryCard } from "./_components/photo-gallery-card";

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [groomers, setGroomers] = useState<ApiUser[]>([]);
  const [storeSessions, setStoreSessions] = useState<string[]>([]);
  const [sessionSkillOptions, setSessionSkillOptions] = useState<ApiOption[]>([]);
  const [editingPrice, setEditingPrice] = useState(false);

  useEffect(() => {
    Promise.all([
      getAdminBookingById(id),
      getUsers({ page: 1, limit: 200, role: "groomer" }),
      getOptions("session - skill"),
    ])
      .then(([bookingRes, groomersRes, optionsRes]) => {
        const b = bookingRes.booking;
        setBooking(b);
        setGroomers(groomersRes.users);
        setSessionSkillOptions(optionsRes.options.filter((o) => o.is_active));
        if (b.store_id) {
          getStoreById(b.store_id)
            .then((storeRes) => setStoreSessions(storeRes.store.sessions ?? []))
            .catch(() => { });
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshBooking = async () => {
    const res = await getAdminBookingById(id);
    setBooking(res.booking);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Booking tidak ditemukan</p>
        <Button asChild variant="outline">
          <Link href="/admin/bookings">Kembali ke Bookings</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <BookingHeader bookingId={booking._id} createdAt={booking.createdAt} />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Booking */}
          <StatusBookingCard
            booking={booking}
            bookingId={id}
            storeSessions={storeSessions}
            refreshBooking={refreshBooking}
          />

          {/* Appointment Details */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Detail Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Tanggal</span>
                  <p className="font-medium text-foreground">
                    {formatDate(booking.date)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Waktu</span>
                  <p className="font-medium text-foreground">
                    {booking.time_range}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tipe</span>
                  <p className="font-medium capitalize text-foreground">
                    {booking.type}
                  </p>
                </div>
                {booking.store && (
                  <div>
                    <span className="text-xs text-muted-foreground">Store</span>
                    <p className="font-medium text-foreground">
                      {booking.store.name}
                    </p>
                  </div>
                )}
                {booking.type === "in store" && (
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">Pickup & Delivery</span>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {booking.pick_up && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                          <Truck className="h-3 w-3" />
                          Pickup
                        </span>
                      )}
                      {booking.delivery && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                          <Truck className="h-3 w-3" />
                          Delivery
                        </span>
                      )}
                      {!booking.pick_up && !booking.delivery && (
                        <span className="text-sm text-muted-foreground">Tidak ada</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Price edit panel */}
              {editingPrice && (
                <PriceEditPanel
                  booking={booking}
                  bookingId={id}
                  onClose={() => setEditingPrice(false)}
                  onSaved={refreshBooking}
                />
              )}

              {/* Price display */}
              <PriceDisplay booking={booking} />

              {!editingPrice && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingPrice(true)}
                  className="h-8 gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Harga
                </Button>
              )}

              {booking.payment_method && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Metode Pembayaran
                  </span>
                  <p className="font-medium capitalize text-foreground">
                    {booking.payment_method}
                  </p>
                </div>
              )}

              {booking.note && (
                <div>
                  <span className="text-xs text-muted-foreground">Catatan</span>
                  <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm text-foreground">
                    {booking.note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer & Pet */}
          <CustomerPetCard booking={booking} />

          {/* Status Logs */}
          <StatusLogsCard booking={booking} />

          {/* Grooming Sessions */}
          <GroomingSessionsCard
            booking={booking}
            bookingId={id}
            refreshBooking={refreshBooking}
            groomers={groomers}
            sessionSkillOptions={sessionSkillOptions}
          />

          {/* Photo Gallery */}
          <PhotoGalleryCard
            booking={booking}
            bookingId={id}
            refreshBooking={refreshBooking}
          />
        </div>
      </div>
    </>
  );
}
