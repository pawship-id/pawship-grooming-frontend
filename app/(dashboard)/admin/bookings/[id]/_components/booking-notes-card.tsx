"use client";

import { useState } from "react";
import { Pencil, Save, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateAdminBooking } from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";

interface BookingNotesCardProps {
  booking: AdminBooking;
  bookingId: string;
  refreshBooking: () => Promise<void>;
}

export function BookingNotesCard({
  booking,
  bookingId,
  refreshBooking,
}: BookingNotesCardProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState(booking.note || "");

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log("Updating booking note:", { bookingId, note });
      const response = await updateAdminBooking(bookingId, {
        note: note,
        // Required fields for backend validation
        pet_id: booking.pet_id,
        service_id: booking.service_snapshot._id,
        service_addon_ids: booking.service_addon_ids || [],
      });
      console.log("Update response:", response);
      toast({
        title: "Berhasil",
        description: "Catatan berhasil diperbarui",
      });
      await refreshBooking();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update note:", error);
      toast({
        title: "Gagal",
        description:
          error instanceof Error ? error.message : "Gagal memperbarui catatan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNote(booking.note || "");
    setIsEditing(false);
  };

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Catatan Booking
        </CardTitle>
        {!isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(true)}
            className="h-8 gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {isEditing ? (
          <>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="booking-note"
                className="text-xs text-muted-foreground"
              >
                Catatan
              </Label>
              <Textarea
                id="booking-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tambahkan catatan untuk booking ini..."
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Catatan ini dapat dilihat oleh admin dan groomer
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Batal
              </Button>
            </div>
          </>
        ) : (
          <>
            {booking.note ? (
              <div className="rounded-md bg-muted/50 p-4">
                <p className="whitespace-pre-wrap text-sm text-foreground">
                  {booking.note}
                </p>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border/50 p-8 text-center">
                <p className="text-sm text-muted-foreground italic">
                  Tidak ada catatan untuk booking ini
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
