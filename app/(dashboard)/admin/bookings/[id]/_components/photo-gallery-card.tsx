"use client";

import { useEffect, useState } from "react";
import { Check, Edit, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  uploadBookingMedia,
  deleteBookingMedia,
  updateBookingMediaNotes,
} from "@/lib/api/bookings";
import type { AdminBooking, SessionMedia } from "@/lib/api/bookings";
import { applyGroomingFrame } from "@/lib/frame-compositor";
import { isGroomingServiceType } from "@/lib/format";

// ── Component ────────────────────────────────────────────────────────────────

interface PhotoGalleryCardProps {
  booking: AdminBooking;
  bookingId: string;
  refreshBooking: () => Promise<void>;
  readOnly?: boolean;
}

type MediaUploadType = "before" | "after" | "other";

// Pull either the canonical `notes` field or the legacy `note` field — older
// media documents only have `note` and we want both to render.
const getMediaNotes = (m: SessionMedia) => m.notes ?? m.note ?? "";

export function PhotoGalleryCard({
  booking,
  bookingId,
  refreshBooking,
  readOnly = false,
}: PhotoGalleryCardProps) {
  const [uploadingMediaType, setUploadingMediaType] =
    useState<MediaUploadType | null>(null);
  const [deletingBookingMediaId, setDeletingBookingMediaId] = useState<
    string | null
  >(null);
  const [confirmDeleteMediaId, setConfirmDeleteMediaId] = useState<
    string | null
  >(null);
  const [previewMediaUrl, setPreviewMediaUrl] = useState<string | null>(null);

  // Pending file + notes draft, shown in the "Add notes before upload" dialog.
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    type: MediaUploadType;
    previewUrl: string;
  } | null>(null);
  const [pendingNotes, setPendingNotes] = useState("");

  // Inline notes-editing state per media item (keyed by public_id).
  const [editingNotesPublicId, setEditingNotesPublicId] = useState<
    string | null
  >(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    // Free the object URL when the pending upload dialog closes.
    return () => {
      if (pendingUpload?.previewUrl)
        URL.revokeObjectURL(pendingUpload.previewUrl);
    };
  }, [pendingUpload]);

  const openUploadDialog = (file: File, type: MediaUploadType) => {
    const previewUrl = URL.createObjectURL(file);
    setPendingUpload({ file, type, previewUrl });
    setPendingNotes("");
  };

  const closeUploadDialog = () => {
    if (pendingUpload?.previewUrl)
      URL.revokeObjectURL(pendingUpload.previewUrl);
    setPendingUpload(null);
    setPendingNotes("");
  };

  const handleConfirmUpload = async () => {
    if (!pendingUpload) return;
    const { file, type } = pendingUpload;
    const notes = pendingNotes.trim();
    setUploadingMediaType(type);
    try {
      const fileToUpload =
        type === "other" ? file : await applyGroomingFrame(file, type);
      await uploadBookingMedia(
        bookingId,
        fileToUpload,
        type,
        notes || undefined,
      );
      await refreshBooking();
      toast.success(`Foto ${type} berhasil diupload`);
      closeUploadDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengupload foto");
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

  const handleSaveNotes = async (publicId: string) => {
    setSavingNotes(true);
    try {
      await updateBookingMediaNotes(bookingId, publicId, notesDraft.trim());
      await refreshBooking();
      toast.success("Catatan foto berhasil disimpan");
      setEditingNotesPublicId(null);
      setNotesDraft("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan catatan",
      );
    } finally {
      setSavingNotes(false);
    }
  };

  const isGrooming = isGroomingServiceType(
    booking.service_snapshot?.service_type?.title,
  );
  const beforeLabel = isGrooming ? "Foto Before" : "Foto Check-in";
  const afterLabel = isGrooming ? "Foto After" : "Foto Check-out";

  // Get session type label from session_id for "other" photos
  const getSessionLabel = (sessionId?: string) => {
    if (!sessionId) return null;
    const session = booking.sessions?.find((s) => s._id === sessionId);
    return session ? session.type : null;
  };

  const renderMediaItem = (m: SessionMedia, key: string | number) => {
    const sessionLabel =
      m.type === "other" ? getSessionLabel(m.session_id) : null;
    const notes = getMediaNotes(m);
    const isEditing = !!m.public_id && editingNotesPublicId === m.public_id;

    return (
      <div key={key} className="flex w-32 flex-col gap-1.5">
        <div className="relative aspect-[9/16] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={m.secure_url ?? m.url ?? ""}
            alt={m.type}
            className="h-full w-full cursor-pointer rounded-lg border border-border/50 object-cover"
            onClick={() => setPreviewMediaUrl(m.secure_url ?? m.url ?? "")}
          />
          {sessionLabel && (
            <span className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-black/60 px-1 py-0.5 text-center text-[10px] font-medium capitalize text-white truncate">
              {sessionLabel}
            </span>
          )}
          {!readOnly && (
            <button
              onClick={() => setConfirmDeleteMediaId(m.public_id ?? "")}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              placeholder="Catatan foto..."
              className="min-h-[60px] text-xs"
            />
            <div className="flex gap-1">
              <Button
                type="button"
                size="sm"
                className="h-6 flex-1 px-1.5 text-[11px]"
                onClick={() => m.public_id && handleSaveNotes(m.public_id)}
                disabled={savingNotes}
              >
                {savingNotes ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Check className="h-3 w-3" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-1.5 text-[11px]"
                onClick={() => {
                  setEditingNotesPublicId(null);
                  setNotesDraft("");
                }}
                disabled={savingNotes}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-1">
            {notes ? (
              <p className="flex-1 whitespace-pre-wrap break-words text-[11px] leading-tight text-foreground">
                {notes}
              </p>
            ) : (
              <p className="flex-1 text-[11px] italic text-muted-foreground/70">
                Tanpa catatan
              </p>
            )}
            {!readOnly && m.public_id && (
              <button
                type="button"
                className="shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setEditingNotesPublicId(m.public_id!);
                  setNotesDraft(notes);
                }}
                title="Edit catatan"
              >
                <Edit className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderUploadButton = (type: MediaUploadType, label: string) => {
    const isUploading = uploadingMediaType === type;
    return (
      <label
        className={`cursor-pointer ${
          isUploading ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <Button type="button" size="sm" variant="outline" asChild>
          <span>
            {isUploading ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
            )}
            {label}
          </span>
        </Button>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) openUploadDialog(file, type);
            e.target.value = "";
          }}
        />
      </label>
    );
  };

  return (
    <>
      <Card className="border-border/50 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base sm:text-lg">
            <ImagePlus className="h-5 w-5 text-primary" />
            Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Before photos */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {beforeLabel}
              </p>
              {!readOnly && renderUploadButton("before", "Upload Before")}
            </div>
            <div className="flex flex-wrap gap-3">
              {(booking.media ?? [])
                .filter((m) => m.type === "before")
                .map((m, i) => renderMediaItem(m, m.public_id ?? m._id ?? i))}
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {afterLabel}
              </p>
              {!readOnly && renderUploadButton("after", "Upload After")}
            </div>
            <div className="flex flex-wrap gap-3">
              {(booking.media ?? [])
                .filter((m) => m.type === "after")
                .map((m, i) => renderMediaItem(m, m.public_id ?? m._id ?? i))}
              {(booking.media ?? []).filter((m) => m.type === "after")
                .length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Belum ada foto after
                </p>
              )}
            </div>
          </div>

          {/* Other photos — uploaded via per-session upload */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Foto Lainnya
              </p>
              {!readOnly && renderUploadButton("other", "Upload Other")}
            </div>
            <div className="flex flex-wrap gap-3">
              {(booking.media ?? [])
                .filter((m) => m.type === "other")
                .map((m, i) => renderMediaItem(m, m.public_id ?? m._id ?? i))}
              {(booking.media ?? []).filter((m) => m.type === "other")
                .length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Belum ada foto lainnya
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload dialog — add optional caption before upload */}
      <Dialog
        open={!!pendingUpload}
        onOpenChange={(open) => {
          if (!open && uploadingMediaType === null) closeUploadDialog();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display capitalize">
              Upload Foto {pendingUpload?.type ?? ""}
            </DialogTitle>
          </DialogHeader>
          {pendingUpload && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={pendingUpload.previewUrl}
                  alt="preview"
                  className="max-h-56 w-auto rounded-lg border border-border/50 object-contain"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="upload-notes" className="text-xs">
                  Catatan / Caption (opsional)
                </Label>
                <Textarea
                  id="upload-notes"
                  value={pendingNotes}
                  onChange={(e) => setPendingNotes(e.target.value)}
                  placeholder="Mis. Kondisi bulu kusut di bagian kaki..."
                  className="min-h-[80px] text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={closeUploadDialog}
              disabled={uploadingMediaType !== null}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmUpload}
              disabled={uploadingMediaType !== null}
            >
              {uploadingMediaType !== null ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Mengupload...
                </>
              ) : (
                "Upload"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
