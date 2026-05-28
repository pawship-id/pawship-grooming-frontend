"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, Save, X, FileText } from "lucide-react";
import { updateBookingNote } from "@/lib/api/bookings";
import { useToast } from "@/hooks/use-toast";

interface BookingNotesCardProps {
  bookingId: string;
  note?: string;
  onNoteSaved: () => void;
  readOnly?: boolean;
}

export function BookingNotesCard({
  bookingId,
  note,
  onNoteSaved,
  readOnly = false,
}: BookingNotesCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteDraft, setNoteDraft] = useState(note || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBookingNote(bookingId, noteDraft);
      toast({
        title: "Berhasil",
        description: "Catatan booking berhasil diperbarui",
      });
      setIsEditing(false);
      onNoteSaved();
    } catch (error) {
      toast({
        title: "Gagal",
        description: "Tidak dapat menyimpan catatan booking",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setNoteDraft(note || "");
    setIsEditing(false);
  };

  const handleEdit = () => {
    setNoteDraft(note || "");
    setIsEditing(true);
  };

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
          <FileText className="h-5 w-5 text-primary" />
          Catatan Booking
        </CardTitle>
        {!readOnly && !isEditing && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleEdit}
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
            <div className="space-y-2">
              <Label htmlFor="booking-note">Catatan</Label>
              <Textarea
                id="booking-note"
                placeholder="Tambahkan catatan untuk booking ini..."
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="gap-1.5"
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={saving}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Batal
              </Button>
            </div>
          </>
        ) : (
          <div>
            {note ? (
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm text-foreground">
                {note}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Belum ada catatan untuk booking ini
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
