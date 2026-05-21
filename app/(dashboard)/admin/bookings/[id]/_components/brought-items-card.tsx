"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pencil, Save, X, PackageOpen } from "lucide-react";
import { updateBookingBroughtItemsNote } from "@/lib/api/bookings";
import { useToast } from "@/hooks/use-toast";

interface BroughtItemsCardProps {
  bookingId: string;
  broughtItemsNote?: string | null;
  onSaved: () => void;
  readOnly?: boolean;
}

export function BroughtItemsCard({
  bookingId,
  broughtItemsNote,
  onSaved,
  readOnly = false,
}: BroughtItemsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(broughtItemsNote || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBookingBroughtItemsNote(bookingId, draft);
      toast({
        title: "Berhasil",
        description: "Daftar barang bawaan berhasil diperbarui",
      });
      setIsEditing(false);
      onSaved();
    } catch {
      toast({
        title: "Gagal",
        description: "Tidak dapat menyimpan daftar barang bawaan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(broughtItemsNote || "");
    setIsEditing(false);
  };

  const handleEdit = () => {
    setDraft(broughtItemsNote || "");
    setIsEditing(true);
  };

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <PackageOpen className="h-5 w-5 text-primary" />
          List Barang Bawaan Pawrents
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
              <Label htmlFor="brought-items">Daftar barang yang dititipkan</Label>
              <Textarea
                id="brought-items"
                placeholder={
                  "Contoh:\nTas carrier biru\nObat vitamin\nMakanan khusus\nBaju ganti\nMainan"
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={5}
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
            {broughtItemsNote ? (
              <p className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm text-foreground">
                {broughtItemsNote}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Pawrents belum mencatat barang bawaan untuk booking ini
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
