"use client";

import { useState } from "react";
import {
  Clock,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  Scissors,
  Edit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  createBookingSession,
  startBookingSession,
  finishBookingSession,
  deleteBookingSession,
  updateBookingSession,
} from "@/lib/api/bookings";
import type { AdminBooking } from "@/lib/api/bookings";
import type { ApiUser } from "@/lib/api/users";
import type { ApiOption } from "@/lib/api/options";
import { formatDateTime } from "@/lib/format";

// ── Component ────────────────────────────────────────────────────────────────

interface GroomingSessionsCardProps {
  booking: AdminBooking;
  bookingId: string;
  refreshBooking: () => Promise<void>;
  groomers: ApiUser[];
  sessionSkillOptions: ApiOption[];
  readOnly?: boolean;
}

export function GroomingSessionsCard({
  booking,
  bookingId,
  refreshBooking,
  groomers,
  sessionSkillOptions,
  readOnly = false,
}: GroomingSessionsCardProps) {
  // Session add state
  const [newSessionType, setNewSessionType] = useState("");
  const [newSessionGroomerId, setNewSessionGroomerId] = useState("");
  const [addingSession, setAddingSession] = useState(false);
  const [confirmingOpenJob, setConfirmingOpenJob] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );

  // Session notes editing
  const [editingNoteSessionId, setEditingNoteSessionId] = useState<
    string | null
  >(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [internalNoteDraft, setInternalNoteDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Assign groomer modal
  const [assignGroomerSessionId, setAssignGroomerSessionId] = useState<
    string | null
  >(null);
  const [assignGroomerSessionType, setAssignGroomerSessionType] = useState("");
  const [assignGroomerValue, setAssignGroomerValue] = useState("");
  const [savingGroomer, setSavingGroomer] = useState(false);

  // Edit session start/finish time
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
  const [updatingSessionTime, setUpdatingSessionTime] = useState(false);

  // Derived values
  const storeGroomers = booking.store_id
    ? groomers.filter((g) => g.profile?.placement === booking.store_id)
    : groomers;
  const hasInProgressSession = booking.sessions.some(
    (s) => s.status === "in progress",
  );

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleAddSession = async (skipGroomerCheck = false) => {
    if (!newSessionType.trim()) {
      toast.error("Isi tipe sesi");
      return;
    }
    if (!newSessionGroomerId && !skipGroomerCheck) {
      setConfirmingOpenJob(true);
      return;
    }
    setAddingSession(true);
    try {
      await createBookingSession(bookingId, {
        type: newSessionType.trim(),
        ...(newSessionGroomerId ? { groomer_id: newSessionGroomerId } : {}),
      });
      await refreshBooking();
      setNewSessionType("");
      setNewSessionGroomerId("");
      toast.success(
        newSessionGroomerId
          ? "Sesi berhasil ditambahkan"
          : "Sesi berhasil ditambahkan sebagai Open Job",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah sesi");
    } finally {
      setAddingSession(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      await startBookingSession(bookingId, sessionId);
      await refreshBooking();
      toast.success("Sesi dimulai");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulai sesi");
    }
  };

  const handleFinishSession = async (sessionId: string) => {
    try {
      await finishBookingSession(bookingId, sessionId, {});
      await refreshBooking();
      toast.success("Sesi selesai");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyelesaikan sesi",
      );
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteBookingSession(bookingId, sessionId);
      await refreshBooking();
      toast.success("Sesi dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus sesi");
    }
  };

  const handleAssignGroomer = async () => {
    if (!assignGroomerSessionId || !assignGroomerValue) return;
    setSavingGroomer(true);
    try {
      await updateBookingSession(bookingId, assignGroomerSessionId, {
        groomer_id: assignGroomerValue,
      });
      await refreshBooking();
      setAssignGroomerSessionId(null);
      setAssignGroomerValue("");
      toast.success("Groomer berhasil di-assign");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal assign groomer");
    } finally {
      setSavingGroomer(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!editingNoteSessionId) return;
    setSavingNotes(true);
    try {
      await updateBookingSession(bookingId, editingNoteSessionId, {
        notes: notesDraft,
        internal_note: internalNoteDraft,
      });
      await refreshBooking();
      setEditingNoteSessionId(null);
      toast.success("Catatan berhasil disimpan");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan catatan",
      );
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateSessionStartDate = async () => {
    if (!editingSessionId || !newSessionStartDate || !newSessionStartTime)
      return;
    setUpdatingSessionTime(true);
    try {
      // Combine date and time into ISO string
      const startedAt = new Date(
        `${newSessionStartDate}T${newSessionStartTime}`,
      ).toISOString();
      await updateBookingSession(bookingId, editingSessionId, {
        started_at: startedAt,
      });
      await refreshBooking();
      toast.success("Tanggal dan waktu start session berhasil diubah");
      setEditSessionStartOpen(false);
      setEditingSessionId(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal mengubah tanggal start session",
      );
    } finally {
      setUpdatingSessionTime(false);
    }
  };

  const handleUpdateSessionFinishDateTime = async () => {
    if (
      !editingFinishSessionId ||
      !newSessionFinishDate ||
      !newSessionFinishTime
    )
      return;
    setUpdatingSessionTime(true);
    try {
      // Combine date and time into ISO string
      const finishedAt = new Date(
        `${newSessionFinishDate}T${newSessionFinishTime}`,
      ).toISOString();
      await updateBookingSession(bookingId, editingFinishSessionId, {
        finished_at: finishedAt,
      });
      await refreshBooking();
      toast.success("Tanggal dan waktu finish session berhasil diubah");
      setEditSessionFinishOpen(false);
      setEditingFinishSessionId(null);
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal mengubah tanggal finish session",
      );
    } finally {
      setUpdatingSessionTime(false);
    }
  };

  const bookingDate = booking.date?.split("T")[0] || "";

  return (
    <>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Sesi Grooming
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {["requested", "waitlist", "rescheduled"].includes(
            booking.booking_status,
          ) &&
            booking.sessions.some((s) => s.status === "not started") && (
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Sesi grooming hanya dapat dimulai setelah booking{" "}
                <span className="font-medium text-foreground">
                  dikonfirmasi
                </span>
                .
              </p>
            )}
          {hasInProgressSession &&
            booking.sessions.some((s) => s.status === "not started") && (
              <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                Selesaikan sesi yang sedang berjalan sebelum memulai sesi
                berikutnya.
              </p>
            )}
          {booking.sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada sesi grooming.
            </p>
          )}
          {booking.sessions.map((session, idx) => {
            const isEditingNotes = editingNoteSessionId === session._id;

            return (
              <div
                key={session._id ?? idx}
                className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-3"
              >
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize text-foreground">
                      {session.type}
                    </span>
                    <Badge
                      className={`text-xs capitalize ${
                        session.status === "finished"
                          ? "bg-secondary/60 text-secondary-foreground"
                          : session.status === "in progress"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {session.status}
                    </Badge>
                  </div>
                  {session._id && !readOnly && (
                    <div className="flex shrink-0 gap-2">
                      {session.status === "not started" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleStartSession(session._id!)}
                            disabled={
                              !session.groomer_detail ||
                              [
                                "requested",
                                "waitlist",
                                "rescheduled",
                                "cancelled",
                                "completed",
                              ].includes(booking.booking_status) ||
                              hasInProgressSession ||
                              booking.sessions
                                .slice(0, idx)
                                .some((s) => s.status !== "finished")
                            }
                          >
                            <Play className="mr-1.5 h-3.5 w-3.5" />
                            Mulai
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeletingSessionId(session._id!)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      {session.status === "in progress" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleFinishSession(session._id!)}
                        >
                          <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                          Selesai
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Groomer assignment */}
                <div className="flex flex-wrap items-center gap-2">
                  {session.groomer_detail ? (
                    <>
                      <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                        <Scissors className="h-3 w-3" />
                        {session.groomer_detail.username}
                      </span>
                      {session.status === "not started" && !readOnly && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setAssignGroomerSessionId(session._id!);
                            setAssignGroomerSessionType(session.type ?? "");
                            setAssignGroomerValue(
                              session.groomer_detail?._id ||
                                session.groomer_id ||
                                "",
                            );
                          }}
                        >
                          Ganti Groomer
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                        Belum ada groomer
                      </span>
                      {session.status === "not started" && !readOnly && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setAssignGroomerSessionId(session._id!);
                            setAssignGroomerSessionType(session.type ?? "");
                            setAssignGroomerValue("");
                          }}
                        >
                          Assign Groomer
                        </Button>
                      )}
                    </>
                  )}
                </div>

                {/* Timestamps */}
                {(session.started_at || session.finished_at) && (
                  <div className="flex flex-col gap-2">
                    {session.started_at && (
                      <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                          Mulai:{" "}
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
                          disabled={readOnly}
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
                    {session.finished_at && (
                      <div className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                        <span className="text-xs text-muted-foreground">
                          Selesai:{" "}
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
                          disabled={readOnly}
                          onClick={() => {
                            setEditingFinishSessionId(session._id || null);
                            const finishDate = new Date(session.finished_at!);
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

                {/* Notes section */}
                {isEditingNotes ? (
                  <div className="flex flex-col gap-2 rounded-md border border-border/50 bg-background p-3">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Catatan</Label>
                      <Textarea
                        placeholder="Catatan sesi..."
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Catatan Internal</Label>
                      <Textarea
                        placeholder="Catatan internal (hanya untuk admin)..."
                        value={internalNoteDraft}
                        onChange={(e) => setInternalNoteDraft(e.target.value)}
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveNotes}
                        disabled={savingNotes}
                      >
                        {savingNotes ? "Menyimpan..." : "Simpan Catatan"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingNoteSessionId(null)}
                      >
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {session.notes ? (
                        <p className="text-xs text-foreground">
                          Note: {session.notes}
                        </p>
                      ) : (
                        <p className="text-xs italic text-muted-foreground">
                          Belum ada catatan
                        </p>
                      )}
                      {session.internal_note ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Internal: {session.internal_note}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          Belum ada catatan internal
                        </p>
                      )}
                    </div>
                    {session._id && !readOnly && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 shrink-0 px-2 text-xs"
                        onClick={() => {
                          setEditingNoteSessionId(session._id!);
                          setNotesDraft(session.notes ?? "");
                          setInternalNoteDraft(session.internal_note ?? "");
                        }}
                      >
                        Edit Catatan
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Add session form */}
          {!readOnly &&
            booking.booking_status !== "completed" &&
            booking.booking_status !== "cancelled" && (
              <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/50 p-3 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1">
                  <Label className="text-xs">Tipe sesi</Label>
                  {(() => {
                    const usedTypes = booking.sessions.map((s) =>
                      s.type.toLowerCase(),
                    );
                    const availableOptions = sessionSkillOptions.filter(
                      (o) => !usedTypes.includes(o.name.toLowerCase()),
                    );
                    return availableOptions.length === 0 ? (
                      <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                        Semua tipe sesi sudah ditambahkan.
                      </p>
                    ) : (
                      <Select
                        value={newSessionType}
                        onValueChange={(val) => {
                          setNewSessionType(val);
                          setNewSessionGroomerId("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih tipe sesi..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableOptions.map((o) => (
                            <SelectItem key={o._id} value={o.name}>
                              {o.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                  })()}
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <Label className="text-xs">Groomer (opsional)</Label>
                  {storeGroomers.length === 0 && booking.store_id ? (
                    <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                      Belum ada groomer yang bertugas di store ini. Atur
                      placement melalui edit profile groomer.
                    </p>
                  ) : (
                    (() => {
                      const groomersForSession = newSessionType
                        ? storeGroomers.filter((g) =>
                            (g.profile?.groomer_skills ?? []).some(
                              (s) =>
                                s.toLowerCase() ===
                                newSessionType.toLowerCase(),
                            ),
                          )
                        : storeGroomers;
                      return (
                        <Select
                          value={newSessionGroomerId}
                          onValueChange={setNewSessionGroomerId}
                          disabled={!newSessionType}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                newSessionType
                                  ? "Pilih groomer"
                                  : "Pilih tipe sesi dulu"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {groomersForSession.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-muted-foreground">
                                Tidak ada groomer dengan skill &quot;
                                {newSessionType}&quot;
                              </div>
                            ) : (
                              groomersForSession.map((g) => (
                                <SelectItem
                                  key={g._id}
                                  value={g._id}
                                  textValue={g.username}
                                >
                                  <div className="flex flex-col text-left">
                                    <span>{g.username}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {g.profile?.groomer_skills &&
                                      g.profile.groomer_skills.length > 0
                                        ? g.profile.groomer_skills.join(", ")
                                        : "Belum set skills"}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      );
                    })()
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleAddSession()}
                  disabled={addingSession}
                  className="shrink-0"
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  {addingSession ? "Menyimpan..." : "Tambah Sesi"}
                </Button>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Open Job Confirmation */}
      <AlertDialog open={confirmingOpenJob} onOpenChange={setConfirmingOpenJob}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tambah sebagai Open Job?</AlertDialogTitle>
            <AlertDialogDescription>
              Sesi ini akan ditambahkan tanpa groomer yang ditugaskan dan masuk
              ke{" "}
              <span className="font-semibold text-foreground">Open Jobs</span>.
              Semua groomer akan dapat melihat dan mengklaim sesi ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmingOpenJob(false);
                handleAddSession(true);
              }}
            >
              Ya, Tambah Open Job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Session Confirmation */}
      <AlertDialog
        open={!!deletingSessionId}
        onOpenChange={(open) => {
          if (!open) setDeletingSessionId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Sesi?</AlertDialogTitle>
            <AlertDialogDescription>
              Sesi ini akan dihapus secara permanen dan tidak dapat
              dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingSessionId) handleDeleteSession(deletingSessionId);
                setDeletingSessionId(null);
              }}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Groomer Dialog */}
      <AlertDialog
        open={!!assignGroomerSessionId}
        onOpenChange={(open) => {
          if (!open) {
            setAssignGroomerSessionId(null);
            setAssignGroomerSessionType("");
            setAssignGroomerValue("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Groomer</AlertDialogTitle>
            <AlertDialogDescription>
              Pilih groomer untuk sesi
              {assignGroomerSessionType
                ? ` "${assignGroomerSessionType}"`
                : " ini"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            {storeGroomers.length === 0 && booking.store_id ? (
              <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                Belum ada groomer yang bertugas di store ini. Atur placement
                melalui edit profile groomer.
              </p>
            ) : (
              (() => {
                const groomersForAssign = assignGroomerSessionType
                  ? storeGroomers.filter((g) =>
                      (g.profile?.groomer_skills ?? []).some(
                        (s) =>
                          s.toLowerCase() ===
                          assignGroomerSessionType.toLowerCase(),
                      ),
                    )
                  : storeGroomers;

                // Ensure current groomer is always in the list
                const currentGroomerInList = groomersForAssign.find(
                  (g) => g._id === assignGroomerValue,
                );
                const currentGroomerFromAll = storeGroomers.find(
                  (g) => g._id === assignGroomerValue,
                );

                // If current groomer exists but not in filtered list, add them
                const finalGroomerList =
                  assignGroomerValue &&
                  currentGroomerFromAll &&
                  !currentGroomerInList
                    ? [currentGroomerFromAll, ...groomersForAssign]
                    : groomersForAssign;

                return (
                  <Select
                    value={assignGroomerValue}
                    onValueChange={setAssignGroomerValue}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih groomer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {finalGroomerList.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Tidak ada groomer dengan skill &quot;
                          {assignGroomerSessionType}&quot;
                        </div>
                      ) : (
                        finalGroomerList.map((g) => (
                          <SelectItem
                            key={g._id}
                            value={g._id}
                            textValue={g.username}
                          >
                            <div className="flex flex-col text-left">
                              <span>{g.username}</span>
                              <span className="text-xs text-muted-foreground">
                                {g.profile?.groomer_skills &&
                                g.profile.groomer_skills.length > 0
                                  ? g.profile.groomer_skills.join(", ")
                                  : "Belum set skills"}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                );
              })()
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAssignGroomer}
              disabled={savingGroomer || !assignGroomerValue}
            >
              {savingGroomer ? "Menyimpan..." : "Simpan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                  updatingSessionTime
                }
              >
                {updatingSessionTime ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditSessionStartOpen(false);
                  setEditingSessionId(null);
                }}
                disabled={updatingSessionTime}
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
                  updatingSessionTime
                }
              >
                {updatingSessionTime ? "Menyimpan..." : "Simpan"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setEditSessionFinishOpen(false);
                  setEditingFinishSessionId(null);
                }}
                disabled={updatingSessionTime}
              >
                Batal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
