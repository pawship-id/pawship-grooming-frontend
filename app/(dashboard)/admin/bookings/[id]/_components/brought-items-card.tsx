"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Save, X, PackageOpen, Plus, Trash2 } from "lucide-react";
import {
  updateBookingParentItems,
  type ParentItem,
} from "@/lib/api/bookings";
import { useToast } from "@/hooks/use-toast";

interface BroughtItemsCardProps {
  bookingId: string;
  parentItems?: ParentItem[];
  broughtItemsNote?: string | null;
  onSaved: () => void;
  readOnly?: boolean;
}

function normalizeItems(
  parentItems?: ParentItem[],
  legacyNote?: string | null,
): ParentItem[] {
  if (Array.isArray(parentItems) && parentItems.length > 0) {
    return parentItems.map((it) => ({
      item: it?.item ?? "",
      item_in: !!it?.item_in,
      item_out: !!it?.item_out,
    }));
  }
  if (legacyNote && legacyNote.trim().length > 0) {
    return legacyNote
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => ({ item: line, item_in: false, item_out: false }));
  }
  return [];
}

export function BroughtItemsCard({
  bookingId,
  parentItems,
  broughtItemsNote,
  onSaved,
  readOnly = false,
}: BroughtItemsCardProps) {
  const initialItems = useMemo(
    () => normalizeItems(parentItems, broughtItemsNote),
    [parentItems, broughtItemsNote],
  );

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ParentItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const displayItems = initialItems;

  const handleEdit = () => {
    setDraft(
      initialItems.length > 0
        ? initialItems.map((it) => ({ ...it }))
        : [{ item: "", item_in: false, item_out: false }],
    );
    setIsEditing(true);
  };

  const handleCancel = () => {
    setDraft(initialItems);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const cleaned = draft
        .map((it) => ({
          item: (it.item ?? "").trim(),
          item_in: !!it.item_in,
          item_out: !!it.item_out,
        }))
        .filter((it) => it.item.length > 0);

      await updateBookingParentItems(bookingId, cleaned);
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

  const updateDraftAt = (idx: number, patch: Partial<ParentItem>) => {
    setDraft((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  };

  const addDraftItem = () => {
    setDraft((prev) => [
      ...prev,
      { item: "", item_in: false, item_out: false },
    ]);
  };

  const removeDraftItem = (idx: number) => {
    setDraft((prev) => prev.filter((_, i) => i !== idx));
  };

  // Quick-toggle MASUK/KELUAR without entering edit mode (for view mode).
  const handleQuickToggle = async (
    idx: number,
    field: "item_in" | "item_out",
    value: boolean,
  ) => {
    const next = initialItems.map((it, i) =>
      i === idx ? { ...it, [field]: value } : it,
    );
    setSaving(true);
    try {
      await updateBookingParentItems(bookingId, next);
      onSaved();
    } catch {
      toast({
        title: "Gagal",
        description: "Tidak dapat memperbarui status barang",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border/50 h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
            <PackageOpen className="h-5 w-5 text-primary" />
            Titipan Owner
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            dicek saat masuk & keluar — biar nggak ketinggalan/ketuker
          </p>
        </div>
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
            <div className="hidden grid-cols-[1fr_56px_56px_32px] gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_64px_64px_36px]">
              <span>Barang</span>
              <span className="text-center">Masuk</span>
              <span className="text-center">Keluar</span>
              <span />
            </div>
            <div className="flex flex-col gap-2">
              {draft.map((it, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-[1fr_44px_44px_32px] items-center gap-1.5 rounded-md border border-border/40 bg-background px-2 py-2 sm:grid-cols-[1fr_64px_64px_36px] sm:gap-2"
                >
                  <Input
                    placeholder="Nama barang"
                    value={it.item}
                    onChange={(e) =>
                      updateDraftAt(idx, { item: e.target.value })
                    }
                    className="h-9"
                  />
                  <div className="flex justify-center">
                    <Checkbox
                      checked={it.item_in}
                      onCheckedChange={(v) =>
                        updateDraftAt(idx, { item_in: !!v })
                      }
                      aria-label="Masuk"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={it.item_out}
                      onCheckedChange={(v) =>
                        updateDraftAt(idx, { item_out: !!v })
                      }
                      aria-label="Keluar"
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => removeDraftItem(idx)}
                    aria-label="Hapus barang"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addDraftItem}
              className="w-full gap-2 border-dashed text-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" />
              Tambah Barang Titipan
            </Button>
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
        ) : displayItems.length > 0 ? (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_48px_48px] gap-1.5 px-2 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:grid-cols-[1fr_64px_64px] sm:gap-2">
              <span>Barang</span>
              <span className="text-center">Masuk</span>
              <span className="text-center">Keluar</span>
            </div>
            <ul className="flex flex-col divide-y divide-border/40">
              {displayItems.map((it, idx) => (
                <li
                  key={idx}
                  className="grid grid-cols-[1fr_48px_48px] items-center gap-1.5 px-2 py-2.5 sm:grid-cols-[1fr_64px_64px] sm:gap-2"
                >
                  <span className="text-sm text-foreground">{it.item}</span>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={it.item_in}
                      disabled={readOnly || saving}
                      onCheckedChange={(v) =>
                        handleQuickToggle(idx, "item_in", !!v)
                      }
                      aria-label="Masuk"
                    />
                  </div>
                  <div className="flex justify-center">
                    <Checkbox
                      checked={it.item_out}
                      disabled={readOnly || saving}
                      onCheckedChange={(v) =>
                        handleQuickToggle(idx, "item_out", !!v)
                      }
                      aria-label="Keluar"
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Pawrents belum mencatat barang bawaan untuk booking ini
          </p>
        )}
      </CardContent>
    </Card>
  );
}
