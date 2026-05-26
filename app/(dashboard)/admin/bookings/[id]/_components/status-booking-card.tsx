"use client";

import { useState } from "react";
import {
  ClipboardList,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { updateBookingStatus } from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";
import {
  AlertTriangle,
} from "lucide-react";
import { computeHotelNights, isHotelServiceType } from "@/lib/format";

// ── Status flow configs ──────────────────────────────────────────────────────

const IN_STORE_MAIN_FLOW = [
  "requested",
  "confirmed",
  "arrived",
  "in progress",
  "completed",
  "returned",
];
const IN_STORE_PICKUP_MAIN_FLOW = [
  "requested",
  "confirmed",
  "driver on the way",
  "arrived",
  "in progress",
  "completed",
  "returned",
];
const IN_STORE_DELIVERY_MAIN_FLOW = [
  "requested",
  "confirmed",
  "arrived",
  "in progress",
  "completed",
  "driver on the way",
  "returned",
];
const IN_STORE_PICKUP_DELIVERY_MAIN_FLOW = [
  "requested",
  "confirmed",
  "driver on the way",
  "arrived",
  "in progress",
  "completed",
  "driver on the way (delivery)",
  "returned",
];
const IN_HOME_MAIN_FLOW = [
  "requested",
  "confirmed",
  "groomer on the way",
  "arrived",
  "in progress",
  "completed",
  "returned",
];

const IN_STORE_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: ["returned"],
  returned: [],
  cancelled: [],
};

const IN_STORE_PICKUP_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["driver on the way", "rescheduled", "cancelled"],
  "driver on the way": ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: ["returned"],
  returned: [],
  cancelled: [],
};

const IN_STORE_DELIVERY_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: ["driver on the way", "cancelled"],
  "driver on the way": ["returned", "cancelled"],
  returned: [],
  cancelled: [],
};

const IN_STORE_PICKUP_DELIVERY_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["driver on the way", "rescheduled", "cancelled"],
  "driver on the way": ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: ["driver on the way", "cancelled"],
  returned: [],
  cancelled: [],
};

const IN_HOME_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["groomer on the way", "rescheduled", "cancelled"],
  "groomer on the way": ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: ["returned"],
  returned: [],
  cancelled: [],
};

// ── Component ────────────────────────────────────────────────────────────────

interface StatusBookingCardProps {
  booking: AdminBooking;
  bookingId: string;
  storeSessions: string[];
  refreshBooking: () => Promise<void>;
}

export function StatusBookingCard({
  booking,
  bookingId,
  storeSessions,
  refreshBooking,
}: StatusBookingCardProps) {
  const [selectedStatus, setSelectedStatus] = useState("");
  const [rescheduledDate, setRescheduledDate] = useState("");
  const [rescheduledEndDate, setRescheduledEndDate] = useState("");
  const [rescheduledTimeRange, setRescheduledTimeRange] = useState("");
  const [cancellationReason, setCancellationReason] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [confirmingStatus, setConfirmingStatus] = useState(false);

  // Hotel reschedule requires picking a new check-out date; non-hotel
  // bookings keep the existing single-day flow.
  const isHotelBooking = isHotelServiceType(
    booking.service_snapshot?.service_type?.title,
  );
  const hotelEndDateMissing =
    isHotelBooking && !!rescheduledDate && !rescheduledEndDate;
  const hotelEndDateBeforeStart =
    isHotelBooking &&
    !!rescheduledDate &&
    !!rescheduledEndDate &&
    rescheduledEndDate < rescheduledDate;
  const hotelEndDateValid =
    !isHotelBooking ||
    (!!rescheduledEndDate && rescheduledEndDate >= rescheduledDate);
  const hotelNightsPreview =
    isHotelBooking &&
    rescheduledDate &&
    rescheduledEndDate &&
    rescheduledEndDate >= rescheduledDate
      ? computeHotelNights(rescheduledDate, rescheduledEndDate)
      : 0;

  const isInHome = booking.type === "in home";
  const hasPickup = !isInHome && booking.pick_up === true;
  const hasDelivery = !isInHome && booking.delivery === true;

  const MAIN_FLOW = isInHome
    ? IN_HOME_MAIN_FLOW
    : hasPickup && hasDelivery
      ? IN_STORE_PICKUP_DELIVERY_MAIN_FLOW
      : hasPickup
        ? IN_STORE_PICKUP_MAIN_FLOW
        : hasDelivery
          ? IN_STORE_DELIVERY_MAIN_FLOW
          : IN_STORE_MAIN_FLOW;
  const ALLOWED_TRANSITIONS = isInHome
    ? IN_HOME_TRANSITIONS
    : hasPickup && hasDelivery
      ? IN_STORE_PICKUP_DELIVERY_TRANSITIONS
      : hasPickup
        ? IN_STORE_PICKUP_TRANSITIONS
        : hasDelivery
          ? IN_STORE_DELIVERY_TRANSITIONS
          : IN_STORE_TRANSITIONS;

  // For pickup+delivery: "driver on the way" appears twice (pickup phase & delivery phase).
  // Determine which phase we're in by checking if completed was already reached.
  let allowedNextStatuses: string[];
  if (
    hasPickup &&
    hasDelivery &&
    booking.booking_status === "driver on the way"
  ) {
    const passedCompleted = booking.status_logs?.some(
      (l: any) => l.status === "completed",
    );
    allowedNextStatuses = passedCompleted
      ? ["returned", "cancelled"]
      : ["arrived", "rescheduled", "cancelled"];
  } else {
    allowedNextStatuses = ALLOWED_TRANSITIONS[booking.booking_status] ?? [];
  }

  const statusChanged = selectedStatus !== "";
  const isRescheduled = selectedStatus === "rescheduled";
  const isCancelled = selectedStatus === "cancelled";
  const allSessionsFinished =
    booking.sessions.length === 0 ||
    booking.sessions.every((s) => s.status === "finished");
  const canComplete =
    selectedStatus !== "completed" || allSessionsFinished;

  const handleSaveStatus = async () => {
    if (isRescheduled && (!rescheduledDate || !rescheduledTimeRange)) {
      toast.error(
        "Tanggal dan sesi waktu wajib diisi untuk status rescheduled",
      );
      return;
    }
    if (isRescheduled && isHotelBooking && !hotelEndDateValid) {
      toast.error(
        !rescheduledEndDate
          ? "Tanggal check-out wajib diisi untuk booking hotel"
          : "Tanggal check-out tidak boleh sebelum tanggal mulai",
      );
      return;
    }
    setUpdatingStatus(true);
    try {
      await updateBookingStatus(bookingId, {
        status: selectedStatus,
        ...(isRescheduled
          ? {
              date: rescheduledDate,
              time_range: rescheduledTimeRange,
              // Send end_date only for hotel; non-hotel keeps the existing
              // server behavior (end_date mirrors date automatically).
              ...(isHotelBooking ? { end_date: rescheduledEndDate } : {}),
            }
          : {}),
        ...(isCancelled && cancellationReason
          ? { cancellation_reason: cancellationReason }
          : {}),
      });
      await refreshBooking();
      setSelectedStatus("");
      setRescheduledDate("");
      setRescheduledEndDate("");
      setRescheduledTimeRange("");
      setCancellationReason("");
      toast.success(`Status diperbarui: ${selectedStatus}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui status",
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <>
      <Card className="border-border/50 lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Status Booking
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Status stepper */}
          <div className="flex items-center overflow-x-auto p-1">
            {MAIN_FLOW.map((status, idx) => {
              // For pickup+delivery flow, "driver on the way (delivery)" is used as stepper label
              // but the actual booking_status is "driver on the way". We need to find the correct idx.
              let currentMainIdx: number;
              if (
                booking.booking_status === "driver on the way" &&
                MAIN_FLOW.includes("driver on the way (delivery)")
              ) {
                // Check if we've passed completed by looking at status logs
                const passedCompleted = booking.status_logs?.some(
                  (l: any) => l.status === "completed",
                );
                currentMainIdx = passedCompleted
                  ? MAIN_FLOW.indexOf("driver on the way (delivery)")
                  : MAIN_FLOW.indexOf("driver on the way");
              } else {
                currentMainIdx = MAIN_FLOW.indexOf(booking.booking_status);
              }
              const isReached = currentMainIdx >= idx;
              const displayLabel = status.replace(" (delivery)", "");
              return (
                <div key={`${status}-${idx}`} className="flex items-center">
                  <div
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize
                        ${isReached ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}
                      `}
                  >
                    {isReached &&
                      (booking.booking_status === "in progress" &&
                        status === "in progress" ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      ))}
                    {displayLabel}
                  </div>
                  {idx < MAIN_FLOW.length - 1 && (
                    <div
                      className={`mx-1.5 h-px w-6 shrink-0 ${isReached && currentMainIdx > idx ? "bg-primary" : "bg-border/50"}`}
                    />
                  )}
                </div>
              );
            })}
            {(booking.booking_status === "cancelled" ||
              booking.booking_status === "rescheduled" ||
              booking.booking_status === "waitlist") && (
              <>
                <div className="mx-2 h-px w-4 shrink-0 bg-border/50" />
                <div
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize ring-1
                      ${booking.booking_status === "cancelled" ? "bg-destructive/10 text-destructive ring-destructive/30" : booking.booking_status === "waitlist" ? "bg-yellow-100 text-yellow-800 ring-yellow-300" : "bg-accent/20 text-accent-foreground ring-accent/30"}
                    `}
                >
                  {booking.booking_status}
                </div>
              </>
            )}
          </div>

          {/* Update status form */}
          <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">Ubah Status</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Status baru
                </Label>
                <Select
                  value={selectedStatus}
                  onValueChange={(val) => {
                    setSelectedStatus(val);
                    if (val !== "cancelled") setCancellationReason("");
                  }}
                  disabled={
                    updatingStatus || allowedNextStatuses.length === 0
                  }
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="Pilih status baru..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedNextStatuses.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {allowedNextStatuses.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Status tidak dapat diubah lagi.
                  </p>
                )}
              </div>
              {isRescheduled && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      {isHotelBooking ? "Check-in baru" : "Tanggal baru"}
                    </Label>
                    <Input
                      type="date"
                      className="h-9 w-[160px] text-sm"
                      value={rescheduledDate}
                      onChange={(e) => {
                        setRescheduledDate(e.target.value);
                        // Clear stale end_date if it now precedes the new start
                        if (
                          isHotelBooking &&
                          rescheduledEndDate &&
                          rescheduledEndDate < e.target.value
                        ) {
                          setRescheduledEndDate("");
                        }
                      }}
                    />
                  </div>
                  {isHotelBooking && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Check-out baru
                      </Label>
                      <Input
                        type="date"
                        className="h-9 w-[160px] text-sm"
                        value={rescheduledEndDate}
                        min={rescheduledDate || undefined}
                        disabled={!rescheduledDate}
                        onChange={(e) =>
                          setRescheduledEndDate(e.target.value)
                        }
                      />
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Sesi baru
                    </Label>
                    {storeSessions.length > 0 ? (
                      <Select
                        value={rescheduledTimeRange}
                        onValueChange={setRescheduledTimeRange}
                      >
                        <SelectTrigger className="h-9 w-[160px] text-sm">
                          <SelectValue placeholder="Pilih sesi" />
                        </SelectTrigger>
                        <SelectContent>
                          {storeSessions.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        className="h-9 w-[160px] text-sm"
                        placeholder="mis. 08:00 - 10:00"
                        value={rescheduledTimeRange}
                        onChange={(e) =>
                          setRescheduledTimeRange(e.target.value)
                        }
                      />
                    )}
                  </div>
                </>
              )}
              <Button
                onClick={() => setConfirmingStatus(true)}
                disabled={
                  updatingStatus ||
                  !statusChanged ||
                  !canComplete ||
                  (isRescheduled && isHotelBooking && !hotelEndDateValid)
                }
                size="sm"
              >
                Simpan Status
              </Button>
            </div>
            {isRescheduled && isHotelBooking && (
              <>
                {hotelEndDateMissing ? (
                  <p className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Tanggal check-out wajib diisi untuk reschedule booking
                    hotel.
                  </p>
                ) : hotelEndDateBeforeStart ? (
                  <p className="flex items-start gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Tanggal check-out tidak boleh sebelum tanggal mulai.
                  </p>
                ) : hotelNightsPreview > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Durasi menginap baru:{" "}
                    <strong>{hotelNightsPreview} malam</strong>. Total harga
                    akan dihitung ulang.
                  </p>
                ) : null}
              </>
            )}
            {isCancelled && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground">
                  Alasan pembatalan
                </Label>
                <Textarea
                  className="text-sm"
                  placeholder="Masukkan alasan pembatalan booking..."
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                />
              </div>
            )}
            {selectedStatus === "completed" && !allSessionsFinished && (
              <p className="text-xs text-destructive">
                Semua sesi grooming harus selesai sebelum status dapat diubah
                menjadi completed.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation dialog */}
      <AlertDialog
        open={confirmingStatus}
        onOpenChange={setConfirmingStatus}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStatus === "returned"
                ? "Ubah ke Returned?"
                : "Ubah Status?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStatus === "returned" ? (
                <>
                  Setelah status diubah ke{" "}
                  <span className="font-semibold text-foreground">Returned</span>
                  , tidak ada lagi perubahan yang dapat dilakukan pada booking
                  ini, termasuk update sesi, groomer, harga, dan upload media.
                  <br />
                  <span className="mt-2 inline-block font-semibold text-destructive">
                    Apakah Anda yakin?
                  </span>
                </>
              ) : (
                <>
                  Status booking akan diubah menjadi{" "}
                  <span className="font-semibold capitalize text-foreground">
                    {selectedStatus}
                  </span>
                  . Tindakan ini tidak dapat dibatalkan.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmingStatus(false);
                handleSaveStatus();
              }}
              className={selectedStatus === "returned" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {selectedStatus === "returned"
                ? "Ya, Ubah ke Returned"
                : "Ya, Ubah Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
