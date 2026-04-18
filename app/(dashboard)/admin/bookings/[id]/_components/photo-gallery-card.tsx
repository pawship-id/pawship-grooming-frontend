"use client";

import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { uploadBookingMedia, deleteBookingMedia } from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";
import { applyGroomingFrame } from "@/lib/frame-compositor";

// ── Component ────────────────────────────────────────────────────────────────

interface PhotoGalleryCardProps {
  booking: AdminBooking;
  bookingId: string;
  refreshBooking: () => Promise<void>;
  readOnly?: boolean;
}

export function PhotoGalleryCard({
  booking,
  bookingId,
  refreshBooking,
  readOnly = false,
}: PhotoGalleryCardProps) {
  const [uploadingMediaType, setUploadingMediaType] = useState<
    "before" | "after" | null
  >(null);
  const [deletingBookingMediaId, setDeletingBookingMediaId] = useState<
    string | null
  >(null);
  const [confirmDeleteMediaId, setConfirmDeleteMediaId] = useState<
    string | null
  >(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  const handleUploadBookingMedia = async (
    file: File,
    type: "before" | "after",
  ) => {
    setUploadingMediaType(type);
    try {
      const framedFile = await applyGroomingFrame(file, type);
      await uploadBookingMedia(bookingId, framedFile, type);
      await refreshBooking();
      toast.success(`Foto ${type} berhasil diupload`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengupload foto",
      );
    } finally {
      setUploadingMediaType(null);
    }
  };

  const handleDeleteBookingMedia = async (mediaId: string) => {
    setDeletingBookingMediaId(mediaId);
    try {
      await deleteBookingMedia(bookingId, mediaId);
      await refreshBooking();
      toast.success("Foto berhasil dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus foto");
    } finally {
      setDeletingBookingMediaId(null);
      setConfirmDeleteMediaId(null);
    }
  };

  return (
    <>
      <Card className="border-border/50 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <ImagePlus className="h-5 w-5 text-primary" />
            Foto Grooming
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Before photos */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Foto Before
              </p>
              {!readOnly && (
              <label
                className={`cursor-pointer ${uploadingMediaType === "before" ? "pointer-events-none opacity-60" : ""}`}
              >
                <Button type="button" size="sm" variant="outline" asChild>
                  <span>
                    {uploadingMediaType === "before" ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Upload Before
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadBookingMedia(file, "before");
                    e.target.value = "";
                  }}
                />
              </label>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {(booking.media ?? [])
                .filter((m) => m.type === "before")
                .map((m, i) => (
                  <div
                    key={m.public_id ?? m._id ?? i}
                    className="relative w-28 aspect-[9/16]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.secure_url ?? m.url ?? ""}
                      alt="before"
                      className="h-full w-full cursor-pointer rounded-lg border border-border/50 object-cover"
                      onClick={() =>
                        setPreviewMediaUrl(m.secure_url ?? m.url ?? "")
                      }
                    />
                    {!readOnly && (
                    <button
                      onClick={() =>
                        setConfirmDeleteMediaId(m.public_id ?? "")
                      }
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    )}
                  </div>
                ))}
              {(booking.media ?? []).filter((m) => m.type === "before")
                .length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Belum ada foto before
                </p>
              )}
            </div>
          </div>

          {/* After photos */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">
                Foto After
              </p>
              {!readOnly && (
              <label
                className={`cursor-pointer ${uploadingMediaType === "after" ? "pointer-events-none opacity-60" : ""}`}
              >
                <Button type="button" size="sm" variant="outline" asChild>
                  <span>
                    {uploadingMediaType === "after" ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Upload After
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadBookingMedia(file, "after");
                    e.target.value = "";
                  }}
                />
              </label>
              )}
            </div>
            <div className="flex flex-wrap gap-3">
              {(booking.media ?? [])
                .filter((m) => m.type === "after")
                .map((m, i) => (
                  <div
                    key={m.public_id ?? m._id ?? i}
                    className="relative w-28 aspect-[9/16]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.secure_url ?? m.url ?? ""}
                      alt="after"
                      className="h-full w-full cursor-pointer rounded-lg border border-border/50 object-cover"
                      onClick={() =>
                        setPreviewMediaUrl(m.secure_url ?? m.url ?? "")
                      }
                    />
                    {!readOnly && (
                    <button
                      onClick={() =>
                        setConfirmDeleteMediaId(m.public_id ?? "")
                      }
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    )}
                  </div>
                ))}
              {(booking.media ?? []).filter((m) => m.type === "after")
                .length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Belum ada foto after
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete media confirmation */}
      <AlertDialog
        open={!!confirmDeleteMediaId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteMediaId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Foto?</AlertDialogTitle>
            <AlertDialogDescription>
              Foto ini akan dihapus secara permanen dan tidak dapat
              dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteMediaId)
                  handleDeleteBookingMedia(confirmDeleteMediaId);
              }}
              disabled={!!deletingBookingMediaId}
            >
              {deletingBookingMediaId ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image preview modal */}
      {previewMediaUrl && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewMediaUrl(null)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="relative flex max-h-full items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewMediaUrl}
              alt="preview"
              className="max-h-[90vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewMediaUrl(null)}
              className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/80 text-background shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
