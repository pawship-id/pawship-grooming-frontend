"use client";

import React, { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Camera,
  Calendar,
  Clock,
  User,
  MapPin,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Scissors,
  UserPlus,
  AlertCircle,
  Edit,
  PawPrint,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { applyGroomingFrame } from "@/lib/frame-compositor";
import {
  getAdminBookingById,
  startBookingSession,
  finishBookingSession,
  uploadBookingMedia,
  updateBookingSession,
  claimSession,
  uploadSessionOtherMedia,
  deleteBookingMediaAuth,
  type AdminBooking,
  type BookingSession,
} from "@/lib/api/bookings";
import { getCurrentUser } from "@/lib/api/users";
import { useAuth } from "@/lib/auth-context";

const sessionStatusColors: Record<string, string> = {
  "not started": "bg-accent/20 text-accent-foreground",
  "in progress": "bg-primary/10 text-primary",
  finished: "bg-secondary/60 text-secondary-foreground",
};

export default function GroomerJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [groomerSkills, setGroomerSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [noteSessionId, setNoteSessionId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState("");
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(
    new Set(),
  );
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [uploadingSessionMediaId, setUploadingSessionMediaId] = useState<
    string | null
  >(null);
  const [confirmDeleteMediaPublicId, setConfirmDeleteMediaPublicId] = useState<
    string | null
  >(null);
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [editSessionStartOpen, setEditSessionStartOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [newSessionStartDate, setNewSessionStartDate] = useState("");
  const [newSessionStartTime, setNewSessionStartTime] = useState("");
  const [editSessionFinishOpen, setEditSessionFinishOpen] = useState(false);
  const [editingFinishSessionId, setEditingFinishSessionId] = useState<
    string | null
  >(null);
  const [newSessionFinishDate, setNewSessionFinishDate] = useState("");
  const [newSessionFinishTime, setNewSessionFinishTime] = useState("");

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [res, meRes] = await Promise.all([
        getAdminBookingById(id),
        getCurrentUser(),
      ]);
      setBooking(res.booking);
      setGroomerSkills(meRes.user?.profile?.groomer_skills ?? []);
      // Auto-expand the first non-finished session
      const firstActive = res.booking.sessions?.find(
        (s) => s.status !== "finished",
      );
      if (firstActive?._id) {
        setExpandedSessions(new Set([firstActive._id]));
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const handleStartSession = async (sessionId: string) => {
    if (!booking) return;
    setActionLoading(`start-${sessionId}`);
    try {
      await startBookingSession(booking._id, sessionId);
      toast.success("Session started");
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal memulai session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleFinishSession = async (sessionId: string) => {
    if (!booking) return;
    setActionLoading(`finish-${sessionId}`);
    try {
      await finishBookingSession(booking._id, sessionId, {});
      toast.success("Session finished");
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyelesaikan session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClaimSession = async (sessionId: string) => {
    if (!booking) return;
    setClaimingId(sessionId);
    try {
      await claimSession(booking._id, sessionId);
      toast.success("Session berhasil diklaim!");
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengklaim session");
    } finally {
      setClaimingId(null);
    }
  };

  const handleSaveNote = async (sessionId: string) => {
    if (!booking) return;
    setActionLoading(`note-${sessionId}`);
    try {
      await updateBookingSession(booking._id, sessionId, { notes: noteValue });
      toast.success("Note saved");
      setNoteSessionId(null);
      setNoteValue("");
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan note");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSessionStartDate = async () => {
    if (
      !booking ||
      !editingSessionId ||
      !newSessionStartDate ||
      !newSessionStartTime
    )
      return;
    setActionLoading("update-session-start");
    try {
      // Combine date and time into ISO string
      const startedAt = new Date(
        `${newSessionStartDate}T${newSessionStartTime}`,
      ).toISOString();
      await updateBookingSession(booking._id, editingSessionId, {
        started_at: startedAt,
      });
      toast.success("Tanggal dan waktu start session berhasil diubah");
      setEditSessionStartOpen(false);
      setEditingSessionId(null);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah tanggal start session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateSessionFinishDateTime = async () => {
    if (
      !booking ||
      !editingFinishSessionId ||
      !newSessionFinishDate ||
      !newSessionFinishTime
    )
      return;
    setActionLoading("update-session-finish");
    try {
      // Combine date and time into ISO string
      const finishedAt = new Date(
        `${newSessionFinishDate}T${newSessionFinishTime}`,
      ).toISOString();
      await updateBookingSession(booking._id, editingFinishSessionId, {
        finished_at: finishedAt,
      });
      toast.success("Tanggal dan waktu finish session berhasil diubah");
      setEditSessionFinishOpen(false);
      setEditingFinishSessionId(null);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah tanggal finish session");
    } finally {
      setActionLoading(null);
    }
  };

  const getToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleUploadMedia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!booking) return;
    const formData = new FormData(e.currentTarget);
    const type = formData.get("mediaType") as "before" | "after" | "other";
    const rawFile = formData.get("photo") as File | null;
    if (!rawFile || rawFile.size === 0) {
      toast.error("Pilih foto terlebih dahulu");
      return;
    }
    setActionLoading("upload-booking");
    try {
      // Only apply frame for before/after; skip for other
      const fileToUpload =
        type === "other" ? rawFile : await applyGroomingFrame(rawFile, type);
      await uploadBookingMedia(booking._id, fileToUpload, type);
      toast.success(`Foto ${type} berhasil diupload`);
      setUploadOpen(false);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupload foto");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUploadSessionMedia = async (sessionId: string, file: File) => {
    if (!booking) return;
    setUploadingSessionMediaId(sessionId);
    try {
      await uploadSessionOtherMedia(booking._id, sessionId, file);
      toast.success("Foto sesi berhasil diupload");
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupload foto sesi");
    } finally {
      setUploadingSessionMediaId(null);
    }
  };

  const handleDeleteMedia = async (publicId: string) => {
    if (!booking) return;
    setDeletingMediaId(publicId);
    try {
      await deleteBookingMediaAuth(booking._id, publicId);
      toast.success("Foto berhasil dihapus");
      setConfirmDeleteMediaPublicId(null);
      await fetchBooking();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus foto");
    } finally {
      setDeletingMediaId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">{error || "Job not found"}</p>
        <Button asChild variant="outline">
          <Link href="/groomer/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const sessions = [...(booking.sessions || [])].sort(
    (a, b) => a.order - b.order,
  );
  const addons = booking.service_snapshot?.addons || [];
  const bookingDate = booking.date?.split("T")[0] || "";
  const today = getToday();

  const isSkillMatch = (sessionType: string) =>
    groomerSkills.length === 0 ||
    groomerSkills.some((sk) => sk.toLowerCase() === sessionType.toLowerCase());

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/groomer/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-foreground">
            {booking.pet_snapshot?.name} - {booking.service_snapshot?.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {booking.customer?.username}
          </p>
        </div>
        <Badge
          className={`text-sm ${sessionStatusColors[booking.booking_status] || "bg-muted"}`}
        >
          {booking.booking_status}
        </Badge>
      </div>

      {/* Appointment & Service Info */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Appointment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-foreground">{bookingDate}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-foreground">{booking.time_range}</span>
            </div>
            {booking.customer && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-primary" />
                <span className="text-foreground">
                  {booking.customer.username}
                </span>
              </div>
            )}
            {booking.type === "in home" && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-foreground">Home Visit</span>
              </div>
            )}
            <Badge variant="outline" className="w-fit capitalize">
              {booking.type}
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <span className="text-xs text-muted-foreground">
                Main Service
              </span>
              <p className="font-medium text-foreground">
                {booking.service_snapshot?.name}
              </p>
            </div>
            {addons.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Add-ons</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {addons.map((a) => (
                    <Badge key={a._id} variant="outline" className="text-xs">
                      {a.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {booking.note && (
              <div>
                <span className="text-xs text-muted-foreground">
                  Catatan Booking
                </span>
                <p className="mt-1 rounded-md bg-muted/50 p-2 text-sm text-foreground">
                  {booking.note}
                </p>
              </div>
            )}
            {booking.brought_items_note && (
              <div>
                <span className="text-xs text-muted-foreground">
                  List Barang Bawaan Pawrents
                </span>
                <p className="mt-1 rounded-md bg-muted/50 p-2 text-sm text-foreground whitespace-pre-wrap break-words">
                  {booking.brought_items_note}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pet Information */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <PawPrint className="h-5 w-5 text-primary" />
            Pet Information
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Name</span>
            <p className="font-medium text-foreground">
              {booking.pet_snapshot?.name ?? "-"}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {booking.pet_snapshot?.pet_type && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Pet Type</span>
                <p className="text-sm text-foreground">
                  {booking.pet_snapshot.pet_type.name}
                </p>
              </div>
            )}
            {booking.pet_snapshot?.breed && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Breed</span>
                <p className="text-sm text-foreground">
                  {booking.pet_snapshot.breed.name}
                </p>
              </div>
            )}
            {booking.pet_snapshot?.hair && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Hair</span>
                <p className="text-sm text-foreground">
                  {booking.pet_snapshot.hair.name}
                </p>
              </div>
            )}
            {booking.pet_snapshot?.size && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Size</span>
                <p className="text-sm text-foreground">
                  {booking.pet_snapshot.size.name}
                </p>
              </div>
            )}
          </div>
          {booking.pet_snapshot?.tags &&
            booking.pet_snapshot.tags.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Tags</span>
                <div className="flex flex-wrap gap-1">
                  {booking.pet_snapshot.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          {booking.pet_snapshot?.internal_note && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/30">
              <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Internal Note Pet
                </p>
                <p className="text-sm text-amber-900/90 dark:text-amber-100 whitespace-pre-wrap break-words">
                  {booking.pet_snapshot.internal_note}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Media */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">Media</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUploadOpen(true)}
          >
            <Camera className="mr-2 h-4 w-4" />
            Upload Photo
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Foto Sebelum */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Foto Sebelum</p>
            <div className="flex flex-wrap gap-3">
              {(booking.media ?? [])
                .filter((m) => m.type === "before")
                .map((m, idx) => (
                  <div key={m._id || idx} className="flex w-28 flex-col gap-1">
                    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
                      <button
                        type="button"
                        className="h-full w-full cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() =>
                          setPreviewImage(m.secure_url || m.url || null)
                        }
                      >
                        <img
                          src={m.secure_url || m.url || "/placeholder.svg"}
                          alt="before photo"
                          className="h-full w-full object-cover"
                        />
                      </button>
                      {m.created_by?.user_id === user?.id && m.public_id && (
                        <button
                          type="button"
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow transition-opacity hover:opacity-90"
                          onClick={() =>
                            setConfirmDeleteMediaPublicId(m.public_id!)
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {m.created_by?.name_snapshot && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {m.created_by.name_snapshot}
                      </p>
                    )}
                    {m.uploaded_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(m.uploaded_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>
                ))}
              {(booking.media ?? []).filter((m) => m.type === "before")
                .length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Belum ada foto sebelum
                </p>
              )}
            </div>
          </div>

          {/* Foto Sesudah */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Foto Sesudah</p>
            <div className="flex flex-wrap gap-3">
              {(booking.media ?? [])
                .filter((m) => m.type === "after")
                .map((m, idx) => (
                  <div key={m._id || idx} className="flex w-28 flex-col gap-1">
                    <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
                      <button
                        type="button"
                        className="h-full w-full cursor-pointer transition-opacity hover:opacity-80"
                        onClick={() =>
                          setPreviewImage(m.secure_url || m.url || null)
                        }
                      >
                        <img
                          src={m.secure_url || m.url || "/placeholder.svg"}
                          alt="after photo"
                          className="h-full w-full object-cover"
                        />
                      </button>
                      {m.created_by?.user_id === user?.id && m.public_id && (
                        <button
                          type="button"
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow transition-opacity hover:opacity-90"
                          onClick={() =>
                            setConfirmDeleteMediaPublicId(m.public_id!)
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    {m.created_by?.name_snapshot && (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {m.created_by.name_snapshot}
                      </p>
                    )}
                    {m.uploaded_at && (
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(m.uploaded_at).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                    )}
                  </div>
                ))}
              {(booking.media ?? []).filter((m) => m.type === "after")
                .length === 0 && (
                <p className="text-sm italic text-muted-foreground">
                  Belum ada foto sesudah
                </p>
              )}
            </div>
          </div>

          {/* Foto Lainnya */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-foreground">Foto Lainnya</p>
            <div className="flex flex-wrap gap-3">
              {(booking.media ?? [])
                .filter((m) => m.type === "other")
                .map((m, idx) => {
                  const session = sessions.find((s) => s._id === m.session_id);
                  return (
                    <div
                      key={m._id || idx}
                      className="flex w-28 flex-col gap-1"
                    >
                      <div className="relative aspect-[9/16] w-full overflow-hidden rounded-lg border border-border/50 bg-muted">
                        <button
                          type="button"
                          className="h-full w-full cursor-pointer transition-opacity hover:opacity-80"
                          onClick={() =>
                            setPreviewImage(m.secure_url || m.url || null)
                          }
                        >
                          <img
                            src={m.secure_url || m.url || "/placeholder.svg"}
                            alt="other photo"
                            className="h-full w-full object-cover"
                          />
                        </button>
                        {session && (
                          <span className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-center text-[10px] font-medium text-white capitalize truncate">
                            {session.type}
                          </span>
                        )}
                        {m.created_by?.user_id === user?.id && m.public_id && (
                          <button
                            type="button"
                            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow transition-opacity hover:opacity-90"
                            onClick={() =>
                              setConfirmDeleteMediaPublicId(m.public_id!)
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      {m.created_by?.name_snapshot && (
                        <p className="truncate text-[10px] text-muted-foreground">
                          {m.created_by.name_snapshot}
                        </p>
                      )}
                      {m.uploaded_at && (
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(m.uploaded_at).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  );
                })}
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

      {/* Delete Media Confirmation */}
      <AlertDialog
        open={!!confirmDeleteMediaPublicId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteMediaPublicId(null);
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
            <AlertDialogCancel disabled={!!deletingMediaId}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!deletingMediaId}
              onClick={() =>
                confirmDeleteMediaPublicId &&
                handleDeleteMedia(confirmDeleteMediaPublicId)
              }
            >
              {deletingMediaId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Sessions */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          Sessions ({sessions.length})
        </h2>
        {sessions.map((session, idx) => {
          const isExpanded = expandedSessions.has(session._id || "");
          const previousAllFinished = sessions
            .filter((s) => s.order < session.order)
            .every((s) => s.status === "finished");

          // Check if session has a scheduled start date
          const sessionStartDate =
            session.started_at?.split("T")[0] || bookingDate;
          const isBeforeSessionStart = today < sessionStartDate;

          const canStart =
            session.status === "not started" &&
            previousAllFinished &&
            !isBeforeSessionStart;
          const canFinish = session.status === "in progress";

          const isMySession = !!(
            user?.id &&
            (session.groomer_id === user.id ||
              session.groomer_detail?._id === user.id)
          );
          const isUnassigned = !session.groomer_id && !session.groomer_detail;
          const isOtherGroomer = !isMySession && !isUnassigned;

          return (
            <Card key={session._id} className="border-border/50">
              <CardContent className="p-0">
                {/* Session header — clickable */}
                <button
                  type="button"
                  onClick={() => session._id && toggleSession(session._id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {session.order + 1}
                    </span>
                    <div>
                      <span className="font-medium capitalize text-foreground">
                        {session.type}
                      </span>
                      {isMySession && session.groomer_detail && (
                        <p className="text-xs text-primary font-medium">
                          {session.groomer_detail.username} (You)
                        </p>
                      )}
                      {isOtherGroomer && session.groomer_detail && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Scissors className="h-3 w-3" />
                          {session.groomer_detail.username}
                        </p>
                      )}
                      {isUnassigned &&
                        (isSkillMatch(session.type) ? (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                            Open — belum ada groomer
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                            Open — bukan skill kamu
                          </p>
                        ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        sessionStatusColors[session.status] || "bg-muted"
                      }
                    >
                      {session.status}
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Session body — expandable */}
                {isExpanded && (
                  <div className="border-t border-border/50 p-4 flex flex-col gap-4">
                    {/* Timestamps - Start & Finish (for assigned groomer) */}
                    {isMySession && (
                      <div className="flex flex-col gap-2">
                        {/* Session start date/time display with edit button */}
                        {session.started_at && (
                          <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                            <span className="text-xs text-muted-foreground">
                              Started:{" "}
                              <span className="font-medium text-foreground">
                                {new Date(session.started_at).toLocaleString(
                                  "en-US",
                                  {
                                    month: "numeric",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )}
                              </span>
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingSessionId(session._id || null);
                                const startDate = new Date(session.started_at!);
                                setNewSessionStartDate(
                                  startDate.toISOString().split("T")[0],
                                );
                                setNewSessionStartTime(
                                  startDate.toTimeString().slice(0, 5),
                                );
                                setEditSessionStartOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}

                        {/* Session finish date/time display with edit button */}
                        {session.finished_at && (
                          <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                            <span className="text-xs text-muted-foreground">
                              Finished:{" "}
                              <span className="font-medium text-foreground">
                                {new Date(session.finished_at).toLocaleString(
                                  "en-US",
                                  {
                                    month: "numeric",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  },
                                )}
                              </span>
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditingFinishSessionId(session._id || null);
                                const finishDate = new Date(
                                  session.finished_at!,
                                );
                                setNewSessionFinishDate(
                                  finishDate.toISOString().split("T")[0],
                                );
                                setNewSessionFinishTime(
                                  finishDate.toTimeString().slice(0, 5),
                                );
                                setEditSessionFinishOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons — assigned to current groomer */}
                    {isMySession && (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {session.status === "not started" && (
                            <Button
                              size="sm"
                              onClick={() =>
                                session._id && handleStartSession(session._id)
                              }
                              disabled={
                                !canStart ||
                                actionLoading === `start-${session._id}`
                              }
                            >
                              {actionLoading === `start-${session._id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Play className="mr-2 h-4 w-4" />
                              )}
                              Start
                            </Button>
                          )}
                          {canFinish && (
                            <Button
                              size="sm"
                              onClick={() =>
                                session._id && handleFinishSession(session._id)
                              }
                              disabled={
                                actionLoading === `finish-${session._id}`
                              }
                            >
                              {actionLoading === `finish-${session._id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <CheckCircle className="mr-2 h-4 w-4" />
                              )}
                              Finish
                            </Button>
                          )}
                          {noteSessionId !== session._id ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setNoteSessionId(session._id || null);
                                setNoteValue(session.notes || "");
                              }}
                            >
                              Add Note
                            </Button>
                          ) : null}
                          {/* Upload foto sesi — hanya groomer yang mengerjakan sesi ini */}
                          {session._id && (
                            <label
                              className={`cursor-pointer ${uploadingSessionMediaId === session._id ? "pointer-events-none opacity-60" : ""}`}
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                asChild
                              >
                                <span>
                                  {uploadingSessionMediaId === session._id ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Camera className="mr-2 h-4 w-4" />
                                  )}
                                  Upload Foto Sesi
                                </span>
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file && session._id)
                                    handleUploadSessionMedia(session._id, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                        {session.status === "not started" &&
                          !previousAllFinished && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Selesaikan session sebelumnya terlebih dahulu
                              untuk memulai session ini.
                            </p>
                          )}
                        {session.status === "not started" &&
                          isBeforeSessionStart && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              Session hanya bisa dimulai pada atau setelah
                              tanggal {sessionStartDate}.
                            </p>
                          )}
                      </div>
                    )}

                    {/* Unassigned session — show claim button or skill mismatch info */}
                    {isUnassigned &&
                      (isSkillMatch(session.type) ? (
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            onClick={() =>
                              session._id && handleClaimSession(session._id)
                            }
                            disabled={claimingId === session._id}
                          >
                            {claimingId === session._id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <UserPlus className="mr-2 h-4 w-4" />
                            )}
                            Claim Session
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Klaim session ini untuk ditangani oleh Anda
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Kamu tidak bisa mengklaim session{" "}
                            <span className="font-semibold capitalize">
                              {session.type}
                            </span>{" "}
                            karena skill ini tidak terdaftar pada profilmu.
                          </p>
                        </div>
                      ))}

                    {/* Other groomer's session — read only */}
                    {isOtherGroomer && (
                      <p className="text-xs text-muted-foreground italic">
                        Sesi ini ditangani oleh{" "}
                        {session.groomer_detail?.username} — hanya bisa dilihat.
                      </p>
                    )}

                    {/* Note editor — only for assigned groomer */}
                    {isMySession && noteSessionId === session._id && (
                      <div className="flex flex-col gap-2">
                        <Textarea
                          value={noteValue}
                          onChange={(e) => setNoteValue(e.target.value)}
                          placeholder="Tulis note untuk session ini..."
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              session._id && handleSaveNote(session._id)
                            }
                            disabled={actionLoading === `note-${session._id}`}
                          >
                            {actionLoading === `note-${session._id}` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Save Note
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setNoteSessionId(null);
                              setNoteValue("");
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Existing notes (read-only for all) */}
                    {session.notes && noteSessionId !== session._id && (
                      <div className="rounded-md bg-muted/50 p-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          Note:
                        </span>
                        <p className="mt-1 text-sm text-foreground">
                          {session.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {previewImage && (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
          <div
            className="relative flex max-h-full items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImage}
              alt="preview"
              className="max-h-[90vh] w-auto max-w-full rounded-xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-foreground/80 text-background shadow-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Edit Session Start Date & Time Dialog */}
      <Dialog
        open={editSessionStartOpen}
        onOpenChange={setEditSessionStartOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Tanggal & Waktu Mulai Session
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newSessionStartDate">Tanggal Mulai</Label>
              <Input
                id="newSessionStartDate"
                type="date"
                min={bookingDate}
                value={newSessionStartDate}
                onChange={(e) => setNewSessionStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newSessionStartTime">
                Waktu Mulai (Jam:Menit)
              </Label>
              <Input
                id="newSessionStartTime"
                type="time"
                value={newSessionStartTime}
                onChange={(e) => setNewSessionStartTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tanggal tidak bisa lebih awal dari tanggal booking (
                {bookingDate})
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateSessionStartDate}
                className="flex-1 font-display font-bold"
                disabled={
                  !newSessionStartDate ||
                  !newSessionStartTime ||
                  actionLoading === "update-session-start"
                }
              >
                {actionLoading === "update-session-start" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Simpan
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditSessionStartOpen(false);
                  setEditingSessionId(null);
                }}
                disabled={actionLoading === "update-session-start"}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Session Finish Date & Time Dialog */}
      <Dialog
        open={editSessionFinishOpen}
        onOpenChange={setEditSessionFinishOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Tanggal & Waktu Finish Session
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="newSessionFinishDate">Tanggal Finish</Label>
              <Input
                id="newSessionFinishDate"
                type="date"
                min={bookingDate}
                value={newSessionFinishDate}
                onChange={(e) => setNewSessionFinishDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Tanggal tidak bisa lebih awal dari tanggal booking (
                {bookingDate})
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="newSessionFinishTime">
                Waktu Finish (Jam:Menit)
              </Label>
              <Input
                id="newSessionFinishTime"
                type="time"
                value={newSessionFinishTime}
                onChange={(e) => setNewSessionFinishTime(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Format 24 jam (contoh: 14:30)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleUpdateSessionFinishDateTime}
                className="flex-1 font-display font-bold"
                disabled={
                  !newSessionFinishDate ||
                  !newSessionFinishTime ||
                  actionLoading === "update-session-finish"
                }
              >
                {actionLoading === "update-session-finish" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Simpan
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditSessionFinishOpen(false);
                  setEditingFinishSessionId(null);
                }}
                disabled={actionLoading === "update-session-finish"}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Photo Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Upload Before/After Photo
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadMedia} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Photo Type</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    value="before"
                    defaultChecked
                    className="accent-[hsl(var(--primary))]"
                  />
                  <span className="text-sm text-foreground">Before</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    value="after"
                    className="accent-[hsl(var(--primary))]"
                  />
                  <span className="text-sm text-foreground">After</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mediaType"
                    value="other"
                    className="accent-[hsl(var(--primary))]"
                  />
                  <span className="text-sm text-foreground">Other</span>
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="photo">Photo</Label>
              <Input id="photo" name="photo" type="file" accept="image/*" />
            </div>
            <Button
              type="submit"
              className="font-display font-bold"
              disabled={actionLoading === "upload-booking"}
            >
              {actionLoading === "upload-booking" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Upload
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
