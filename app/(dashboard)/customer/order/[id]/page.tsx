"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAdminBookingById, type AdminBooking } from "@/lib/api/bookings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  Scissors,
  Store,
  XCircle,
  AlertCircle,
  User,
  Package,
  CreditCard,
  Tag,
  ImageIcon,
  Gift,
  Truck,
  Pencil,
} from "lucide-react";

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

// ── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  requested: {
    label: "Requested",
    className: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-3 w-3" />,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  waitlist: {
    label: "Waitlist",
    className: "bg-orange-100 text-orange-700 border-orange-200",
    icon: <Clock className="h-3 w-3" />,
  },
  "driver on the way": {
    label: "Driver on the way",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Scissors className="h-3 w-3" />,
  },
  "groomer on the way": {
    label: "Groomer on the way",
    className: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Scissors className="h-3 w-3" />,
  },
  arrived: {
    label: "Arrived",
    className: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  "in progress": {
    label: "In Progress",
    className: "bg-primary/10 text-primary border-primary/20",
    icon: <Scissors className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    className: "bg-secondary/60 text-secondary-foreground border-border/40",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rescheduled: {
    label: "Rescheduled",
    className: "bg-purple-100 text-purple-700 border-purple-200",
    icon: <Clock className="h-3 w-3" />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    icon: <XCircle className="h-3 w-3" />,
  },
};

// ── Loading state ────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Error state ──────────────────────────────────────────────────────────────
function ErrorState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = params.id as string;

  useEffect(() => {
    async function fetchBookingDetail() {
      try {
        setLoading(true);
        setError(null);
        const response = await getAdminBookingById(bookingId);
        setBooking(response.booking);
      } catch (err) {
        console.error("Failed to fetch booking detail:", err);
        setError("Gagal memuat detail booking. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    }

    if (bookingId) {
      fetchBookingDetail();
    }
  }, [bookingId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!booking) return <ErrorState message="Booking tidak ditemukan." />;

  const cfg = statusConfig[booking.booking_status] ?? {
    label: booking.booking_status,
    className: "bg-muted text-muted-foreground border-border",
    icon: null,
  };

  const groomerName =
    booking.sessions?.[0]?.groomer_detail?.username || "Groomer";

  // Dummy pre-conditions
  const preConditions = [
    { id: "1", description: "Minor skin irritation observed on left ear" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/customer/order")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            Order Detail
          </h1>
          <p className="text-sm text-muted-foreground">
            #{booking._id.slice(-8).toUpperCase()}
          </p>
        </div>
        <Badge
          variant="outline"
          className={`gap-1.5 text-sm font-medium ${cfg.className}`}
        >
          {cfg.icon}
          {cfg.label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Pet & Service Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pet Name & Service */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Pet Name
                </label>
                <p className="font-display text-lg font-bold">
                  {booking.pet_snapshot.name}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{booking.pet_snapshot.pet_type.name}</span>
                  <span>•</span>
                  <span>{booking.pet_snapshot.size.name}</span>
                  <span>•</span>
                  <span>{booking.pet_snapshot.breed.name}</span>
                </div>
              </div>

              <Separator />

              {/* Service */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Service
                </label>
                <p className="font-medium">{booking.service_snapshot.name}</p>
                {booking.service_snapshot.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {booking.service_snapshot.description}
                  </p>
                )}
              </div>

              {/* Add-ons */}
              {booking.service_snapshot.addons &&
                booking.service_snapshot.addons.length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Add-ons
                    </label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {booking.service_snapshot.addons.map((addon) => (
                        <Badge
                          key={addon._id}
                          variant="outline"
                          className="gap-1"
                        >
                          + {addon.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

              <Separator />

              {/* Type */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Service Type
                </label>
                <Badge
                  variant="outline"
                  className={`gap-1 text-xs ${booking.type === "home_service"
                    ? "border-violet-200 bg-violet-50 text-violet-700"
                    : "border-sky-200 bg-sky-50 text-sky-700"
                    }`}
                >
                  {booking.type === "home_service" ? (
                    <>
                      <Home className="h-3 w-3" /> Home Visit
                    </>
                  ) : (
                    <>
                      <Store className="h-3 w-3" /> In-Store
                    </>
                  )}
                </Badge>
              </div>

              {booking.type === "in store" && (
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    Pickup & Delivery
                  </label>
                  <div className="flex flex-wrap gap-1.5">
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
            </CardContent>
          </Card>

          {/* Price Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
                {/* Service row */}
                {(() => {
                  const b = booking.applied_benefits?.find(
                    (ab) => ab.applies_to === "service",
                  );
                  const isQuota = b?.benefit_type === "quota";
                  const svcBase = booking.edited_service_price ?? booking.service_snapshot.price;
                  const svcItemDisc = booking.edited_service_discount ?? 0;
                  const svcEffective = Math.max(0, svcBase - svcItemDisc);
                  const hasItemDisc = svcItemDisc > 0;
                  return (
                    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {booking.service_snapshot.name}
                        </span>
                        {hasItemDisc && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                            -{formatPrice(svcItemDisc)}
                          </span>
                        )}
                        {b && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isQuota
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                              : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                              }`}
                          >
                            {isQuota
                              ? "Gratis"
                              : b.benefit_value != null
                                ? `-${b.benefit_value}%`
                                : "Diskon"}
                          </span>
                        )}
                      </div>
                      {(hasItemDisc || b) ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">
                            {formatPrice(svcBase)}
                          </span>
                          {hasItemDisc && b ? (
                            <>
                              <span className="text-xs line-through text-muted-foreground">
                                {formatPrice(svcEffective)}
                              </span>
                              <span className="font-semibold text-primary">
                                {isQuota ? "Gratis" : formatPrice(Math.max(0, svcEffective - b.amount_deducted))}
                              </span>
                            </>
                          ) : hasItemDisc ? (
                            <span className="font-semibold text-foreground">{formatPrice(svcEffective)}</span>
                          ) : (
                            <span className="font-semibold text-primary">
                              {isQuota
                                ? "Gratis"
                                : formatPrice(Math.max(0, svcEffective - b!.amount_deducted))}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">
                          {formatPrice(svcBase)}
                        </span>
                      )}
                    </div>
                  );
                })()}
                {/* Addon rows */}
                {booking.service_snapshot.addons?.map((addon) => {
                  const addonBenefits = booking.applied_benefits?.filter(
                    (ab) => ab.applies_to === "addon",
                  ) ?? [];
                  const b =
                    addonBenefits.find((ab) => ab.service_id === addon._id) ??
                    addonBenefits.find((ab) => !ab.service_id);
                  const isQuota = b?.benefit_type === "quota";
                  const addonOverride = booking.edited_addon_prices?.find(
                    (a) => a.addon_id === addon._id,
                  );
                  const addonBase = addonOverride?.price ?? addon.price;
                  const addonItemDisc = addonOverride?.discount ?? 0;
                  const addonEffective = Math.max(0, addonBase - addonItemDisc);
                  const hasItemDisc = addonItemDisc > 0;
                  return (
                    <div
                      key={addon._id}
                      className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">+ {addon.name}</span>
                        {hasItemDisc && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                            -{formatPrice(addonItemDisc)}
                          </span>
                        )}
                        {b && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isQuota
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                              : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                              }`}
                          >
                            {isQuota
                              ? "Gratis"
                              : b.benefit_value != null
                                ? `-${b.benefit_value}%`
                                : "Diskon"}
                          </span>
                        )}
                      </div>
                      {(hasItemDisc || b) ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">
                            {formatPrice(addonBase)}
                          </span>
                          {hasItemDisc && b ? (
                            <>
                              <span className="text-xs line-through text-muted-foreground">
                                {formatPrice(addonEffective)}
                              </span>
                              <span className="font-semibold text-primary">
                                {isQuota ? "Gratis" : formatPrice(Math.max(0, addonEffective - b.amount_deducted))}
                              </span>
                            </>
                          ) : hasItemDisc ? (
                            <span className="font-semibold text-foreground">{formatPrice(addonEffective)}</span>
                          ) : (
                            <span className="font-semibold text-primary">
                              {isQuota
                                ? "Gratis"
                                : formatPrice(Math.max(0, addonEffective - b!.amount_deducted))}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(addonBase)}</span>
                      )}
                    </div>
                  );
                })}
                {/* Pickup & Delivery fee row (combined) */}
                {(booking.pick_up || booking.delivery) && (() => {
                  const tFeeBase = booking.edited_travel_fee ?? booking.travel_fee ?? ((booking.pickup_fee ?? 0) + (booking.delivery_fee ?? 0));
                  if (tFeeBase <= 0) return null;
                  const b = booking.applied_benefits?.find(
                    (ab) =>
                      ab.applies_to === "pick_up" ||
                      ab.applies_to === "travel_fee" ||
                      ab.applies_to === "pickup",
                  );
                  const isQuota = b?.benefit_type === "quota";
                  const feeItemDisc = booking.edited_travel_fee_discount ?? 0;
                  const feeEffective = Math.max(0, tFeeBase - feeItemDisc);
                  const hasItemDisc = feeItemDisc > 0;
                  const benefitDeduction = b ? b.amount_deducted : 0;
                  const label = booking.pick_up && booking.delivery
                    ? "Biaya Pickup & Delivery"
                    : booking.delivery
                      ? "Biaya Delivery"
                      : "Biaya Pickup";
                  return (
                    <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Truck className="h-3.5 w-3.5" />
                          {label}
                        </span>
                        {hasItemDisc && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                            -{formatPrice(feeItemDisc)}
                          </span>
                        )}
                        {b && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isQuota ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"}`}>
                            {isQuota ? "Gratis" : b.benefit_value != null ? `-${b.benefit_value}%` : "Diskon"}
                          </span>
                        )}
                      </div>
                      {(hasItemDisc || b) ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">{formatPrice(tFeeBase)}</span>
                          {hasItemDisc && b ? (
                            <>
                              <span className="text-xs line-through text-muted-foreground">{formatPrice(feeEffective)}</span>
                              <span className="font-semibold text-primary">{isQuota ? "Gratis" : formatPrice(Math.max(0, feeEffective - benefitDeduction))}</span>
                            </>
                          ) : hasItemDisc ? (
                            <span className="font-semibold text-foreground">{formatPrice(feeEffective)}</span>
                          ) : (
                            <span className="font-semibold text-primary">{isQuota ? "Gratis" : formatPrice(Math.max(0, feeEffective - benefitDeduction))}</span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(tFeeBase)}</span>
                      )}
                    </div>
                  );
                })()}
                {/* Home service travel fee row */}
                {booking.type === "in home" && booking.travel_fee > 0 && (() => {
                  const b = booking.applied_benefits?.find(
                    (ab) =>
                      ab.applies_to === "pick_up" ||
                      ab.applies_to === "travel_fee" ||
                      ab.applies_to === "pickup",
                  );
                  const isQuota = b?.benefit_type === "quota";
                  const tFeeBase = booking.edited_travel_fee ?? booking.travel_fee;
                  const tFeeItemDisc = booking.edited_travel_fee_discount ?? 0;
                  const tFeeEffective = Math.max(0, tFeeBase - tFeeItemDisc);
                  const hasItemDisc = tFeeItemDisc > 0;
                  return (
                    <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Truck className="h-3.5 w-3.5" />
                          Biaya Home Service
                        </span>
                        {hasItemDisc && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                            -{formatPrice(tFeeItemDisc)}
                          </span>
                        )}
                        {b && (
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${isQuota ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400" : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"}`}>
                            {isQuota ? "Gratis" : b.benefit_value != null ? `-${b.benefit_value}%` : "Diskon"}
                          </span>
                        )}
                      </div>
                      {(hasItemDisc || b) ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">{formatPrice(tFeeBase)}</span>
                          {hasItemDisc && b ? (
                            <>
                              <span className="text-xs line-through text-muted-foreground">{formatPrice(tFeeEffective)}</span>
                              <span className="font-semibold text-primary">{isQuota ? "Gratis" : formatPrice(Math.max(0, tFeeEffective - b.amount_deducted))}</span>
                            </>
                          ) : hasItemDisc ? (
                            <span className="font-semibold text-foreground">{formatPrice(tFeeEffective)}</span>
                          ) : (
                            <span className="font-semibold text-primary">{isQuota ? "Gratis" : formatPrice(Math.max(0, tFeeEffective - b!.amount_deducted))}</span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">{formatPrice(tFeeBase)}</span>
                      )}
                    </div>
                  );
                })()}
                {/* Subtotal + Diskon — separated between admin and member */}
                {(() => {
                  // Calculate admin item-level discounts
                  const svcItemDisc = booking.edited_service_discount ?? 0;
                  const tFeeItemDisc = booking.edited_travel_fee_discount ?? 0;
                  const addonItemDisc = (booking.edited_addon_prices ?? []).reduce(
                    (sum, a) => sum + (a.discount ?? 0), 0,
                  );
                  const totalAdminDiscount = svcItemDisc + tFeeItemDisc + addonItemDisc;

                  // Member benefit discount
                  const totalMemberDiscount = booking.applied_benefits?.reduce(
                    (sum, ab) => sum + (ab.amount_deducted ?? 0), 0,
                  ) ?? 0;

                  const hasAnyDiscount = totalAdminDiscount > 0 || totalMemberDiscount > 0;

                  if (!hasAnyDiscount) return null;
                  return (
                    <>
                      <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-semibold">
                        <span>Subtotal</span>
                        <span>{formatPrice(booking.original_total_price)}</span>
                      </div>
                      {/* Diskon Admin */}
                      {totalAdminDiscount > 0 && (
                        <div className="flex flex-col border-t border-orange-200/50 bg-orange-50/50 dark:border-orange-800/30 dark:bg-orange-950/20">
                          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <span className="flex items-center gap-1.5 font-medium text-orange-600 dark:text-orange-400">
                              <Pencil className="h-3.5 w-3.5" />
                              Diskon Admin
                            </span>
                            <span className="font-semibold text-orange-600 dark:text-orange-400">
                              - {formatPrice(totalAdminDiscount)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                            {svcItemDisc > 0 && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate pr-4">{booking.service_snapshot.name}</span>
                                <span className="shrink-0">- {formatPrice(svcItemDisc)}</span>
                              </div>
                            )}
                            {(booking.edited_addon_prices ?? []).filter(a => (a.discount ?? 0) > 0).map((a) => {
                              const addon = booking.service_snapshot.addons?.find(ad => ad._id === a.addon_id);
                              return (
                                <div key={a.addon_id} className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="truncate pr-4">+ {addon?.name ?? a.addon_id}</span>
                                  <span className="shrink-0">- {formatPrice(a.discount ?? 0)}</span>
                                </div>
                              );
                            })}
                            {tFeeItemDisc > 0 && (
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span className="truncate pr-4">
                                  {booking.type === "in home" ? "Home Service" : "Pickup/Delivery"}
                                </span>
                                <span className="shrink-0">- {formatPrice(tFeeItemDisc)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Diskon Membership */}
                      {totalMemberDiscount > 0 && (
                        <div className="flex flex-col border-t border-primary/20 bg-primary/5">
                          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <span className="flex items-center gap-1.5 font-medium text-primary">
                              <Gift className="h-3.5 w-3.5" />
                              Diskon Membership
                            </span>
                            <span className="font-semibold text-primary">
                              - {formatPrice(totalMemberDiscount)}
                            </span>
                          </div>
                          {booking.applied_benefits?.length > 0 && (
                            <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                              {booking.applied_benefits.map((ab, i) => {
                                const benefitLabel = ab.benefit?.label || ab.description || ab.applies_to;
                                let serviceName: string | null = null;
                                if (ab.applies_to === "service") {
                                  serviceName = booking.service_snapshot?.name
                                    ?? ab.benefit?.service?.name ?? null;
                                } else if (ab.applies_to === "addon") {
                                  if (ab.service_id) {
                                    const addon = booking.service_snapshot?.addons?.find(
                                      (a) => a._id === ab.service_id
                                    );
                                    serviceName = addon?.name ?? ab.benefit?.service?.name ?? null;
                                  } else {
                                    serviceName = ab.benefit?.service?.name ?? null;
                                  }
                                } else if (ab.applies_to === "pick_up" || ab.applies_to === "pickup" || ab.applies_to === "travel_fee") {
                                  serviceName = booking.type === "in home" ? "Home Service" : "Pickup/Delivery";
                                }
                                if (!serviceName) {
                                  serviceName = ab.benefit?.service?.name
                                    ?? (ab.applies_to === "service" ? "Service" : ab.applies_to === "addon" ? "Addon" : null);
                                }
                                const displayName = serviceName ? `${benefitLabel}: ${serviceName}` : benefitLabel;
                                return (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between text-xs text-muted-foreground"
                                  >
                                    <span className="truncate pr-4">
                                      {displayName}
                                    </span>
                                    <span className="shrink-0">- {formatPrice(ab.amount_deducted)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}
                {/* Total Akhir */}
                <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
                  <span>Total Akhir</span>
                  <span className="text-base">
                    {formatPrice(booking.final_total_price ?? booking.original_total_price)}
                  </span>
                </div>
              </div>

              {booking.payment_method && (
                <div>
                  <span className="text-xs text-muted-foreground">Metode Pembayaran</span>
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

          {/* Status History */}
          {booking.status_logs && booking.status_logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {booking.status_logs.map((log, index) => {
                    const logCfg = statusConfig[log.status] ?? {
                      label: log.status,
                      className: "bg-muted text-muted-foreground",
                      icon: null,
                    };
                    return (
                      <div
                        key={index}
                        className="flex items-start justify-between gap-4 border-l-2 border-border pl-4"
                      >
                        <div className="flex-1">
                          <Badge
                            variant="outline"
                            className={`gap-1 text-xs ${logCfg.className}`}
                          >
                            {logCfg.icon}
                            {logCfg.label}
                          </Badge>
                          {log.note && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {log.note}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Before/After Media */}
          {booking.media && booking.media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ImageIcon className="h-4 w-4" />
                  Before / After Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {["before", "after"].map((type) => {
                    const media = booking.media?.filter((m) => m.type === type);
                    return (
                      <div key={type} className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground capitalize">
                          {type === "before" ? "Sebelum" : "Sesudah"}
                        </label>
                        {media && media.length > 0 ? (
                          <div className="grid gap-2">
                            {media.map((m, idx) => (
                              <div
                                key={idx}
                                className="overflow-hidden rounded-lg border border-border/50"
                              >
                                <img
                                  src={m.url || m.secure_url}
                                  alt={`${type} grooming`}
                                  className="aspect-square w-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20">
                            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Pricing & Payment */}
        <div className="space-y-6">
          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Booking Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Date
                  </label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary/60" />
                    <span className="font-medium text-sm">
                      {formatDate(booking.date)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Time
                  </label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary/60" />
                    <span className="font-medium text-sm">
                      {booking.time_range}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Groomer
                </label>
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-primary/60" />
                  <span className="font-medium text-sm">{groomerName}</span>
                </div>
              </div>

              {booking.store && (
                <>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Store Location
                    </label>
                    <div className="flex items-center gap-2">
                      <Store className="h-4 w-4 text-primary/60" />
                      <span className="font-medium text-sm">
                        {booking.store.name}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {booking.travel_fee > 0 && (
                <>
                  <Separator />
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Travel Fee
                    </label>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary/60" />
                      <span className="font-medium text-sm">
                        {formatPrice(booking.travel_fee)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          {booking.customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="text-sm font-medium">
                    {booking.customer.username}
                  </p>
                </div>
                {booking.customer.email && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Email
                    </label>
                    <p className="text-sm">{booking.customer.email}</p>
                  </div>
                )}
                {booking.customer.phone_number && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Phone
                    </label>
                    <p className="text-sm">{booking.customer.phone_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}



          {/* Notes & Pre-conditions */}
          {(preConditions.length > 0 ||
            booking.pet_snapshot.internal_note ||
            booking.note) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle className="h-4 w-4" />
                    Notes & Special Instructions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {preConditions.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Catatan dari groomer
                      </div>
                      <ul className="flex flex-col gap-1">
                        {preConditions.map((pc) => (
                          <li key={pc.id} className="text-xs text-amber-800">
                            • {pc.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* {booking.pet_snapshot.internal_note && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Pet Internal Note
                      </label>
                      <p className="mt-1 rounded-lg bg-muted/40 px-3.5 py-2.5 text-sm italic text-muted-foreground">
                        "{booking.pet_snapshot.internal_note}"
                      </p>
                    </div>
                  )} */}

                  {booking.note && (
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">
                        Booking Note
                      </label>
                      <p className="mt-1 rounded-lg bg-muted/40 px-3.5 py-2.5 text-sm text-muted-foreground">
                        {booking.note}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
        </div>
      </div>
    </div>
  );
}
