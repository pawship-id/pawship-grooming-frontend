"use client"

import React, { use, useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft, Play, CheckCircle, Camera, Calendar, Clock,
  User, MapPin, Loader2, ChevronDown, ChevronUp,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { applyGroomingFrame } from "@/lib/frame-compositor"
import {
  getAdminBookingById,
  startBookingSession,
  finishBookingSession,
  uploadSessionMedia,
  updateBookingSession,
  type AdminBooking,
  type BookingSession,
} from "@/lib/api/bookings"

const sessionStatusColors: Record<string, string> = {
  "not started": "bg-accent/20 text-accent-foreground",
  "in progress": "bg-primary/10 text-primary",
  finished: "bg-secondary/60 text-secondary-foreground",
}

export default function GroomerJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [booking, setBooking] = useState<AdminBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null)
  const [noteSessionId, setNoteSessionId] = useState<string | null>(null)
  const [noteValue, setNoteValue] = useState("")
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await getAdminBookingById(id)
      setBooking(res.booking)
      // Auto-expand the first non-finished session
      const firstActive = res.booking.sessions?.find((s) => s.status !== "finished")
      if (firstActive?._id) {
        setExpandedSessions(new Set([firstActive._id]))
      }
    } catch (err: any) {
      setError(err.message || "Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchBooking()
  }, [fetchBooking])

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      if (next.has(sessionId)) next.delete(sessionId)
      else next.add(sessionId)
      return next
    })
  }

  const handleStartSession = async (sessionId: string) => {
    if (!booking) return
    setActionLoading(`start-${sessionId}`)
    try {
      await startBookingSession(booking._id, sessionId)
      toast.success("Session started")
      await fetchBooking()
    } catch (err: any) {
      toast.error(err.message || "Gagal memulai session")
    } finally {
      setActionLoading(null)
    }
  }

  const handleFinishSession = async (sessionId: string) => {
    if (!booking) return
    setActionLoading(`finish-${sessionId}`)
    try {
      await finishBookingSession(booking._id, sessionId, {})
      toast.success("Session finished")
      await fetchBooking()
    } catch (err: any) {
      toast.error(err.message || "Gagal menyelesaikan session")
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveNote = async (sessionId: string) => {
    if (!booking) return
    setActionLoading(`note-${sessionId}`)
    try {
      await updateBookingSession(booking._id, sessionId, { notes: noteValue })
      toast.success("Note saved")
      setNoteSessionId(null)
      setNoteValue("")
      await fetchBooking()
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan note")
    } finally {
      setActionLoading(null)
    }
  }

  const handleUploadMedia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!booking || !uploadSessionId) return
    const formData = new FormData(e.currentTarget)
    const type = formData.get("mediaType") as "before" | "after"
    const rawFile = formData.get("photo") as File | null
    if (!rawFile || rawFile.size === 0) {
      toast.error("Pilih foto terlebih dahulu")
      return
    }
    setActionLoading(`upload-${uploadSessionId}`)
    try {
      const framedFile = await applyGroomingFrame(rawFile, type)
      await uploadSessionMedia(booking._id, uploadSessionId, framedFile, type)
      toast.success(`Foto ${type} berhasil diupload`)
      setUploadOpen(false)
      setUploadSessionId(null)
      await fetchBooking()
    } catch (err: any) {
      toast.error(err.message || "Gagal mengupload foto")
    } finally {
      setActionLoading(null)
    }
  }

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
    )
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">{error || "Job not found"}</p>
        <Button asChild variant="outline">
          <Link href="/groomer/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    )
  }

  const sessions = [...(booking.sessions || [])].sort((a, b) => a.order - b.order)
  const addons = booking.service_snapshot?.addons || []

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
          <p className="text-sm text-muted-foreground">{booking.customer?.username}</p>
        </div>
        <Badge className={`text-sm ${sessionStatusColors[booking.booking_status] || "bg-muted"}`}>
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
              <span className="text-foreground">{booking.date?.split("T")[0]}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-foreground">{booking.time_range}</span>
            </div>
            {booking.customer && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-primary" />
                <span className="text-foreground">{booking.customer.username}</span>
              </div>
            )}
            {booking.type === "in home" && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-foreground">Home Visit</span>
              </div>
            )}
            <Badge variant="outline" className="w-fit capitalize">{booking.type}</Badge>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Service Details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div>
              <span className="text-xs text-muted-foreground">Main Service</span>
              <p className="font-medium text-foreground">{booking.service_snapshot?.name}</p>
            </div>
            {addons.length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Add-ons</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {addons.map((a) => (
                    <Badge key={a._id} variant="outline" className="text-xs">{a.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            {booking.note && (
              <div>
                <span className="text-xs text-muted-foreground">Customer Notes</span>
                <p className="mt-1 rounded-md bg-muted/50 p-2 text-sm text-foreground">{booking.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sessions */}
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold text-foreground">
          Sessions ({sessions.length})
        </h2>
        {sessions.map((session) => {
          const isExpanded = expandedSessions.has(session._id || "")
          const canStart =
            session.status === "not started" &&
            sessions
              .filter((s) => s.order < session.order)
              .every((s) => s.status === "finished")
          const canFinish = session.status === "in progress"

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
                      <span className="font-medium capitalize text-foreground">{session.type}</span>
                      {session.groomer_detail && (
                        <p className="text-xs text-muted-foreground">{session.groomer_detail.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={sessionStatusColors[session.status] || "bg-muted"}>
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
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      {canStart && (
                        <Button
                          size="sm"
                          onClick={() => session._id && handleStartSession(session._id)}
                          disabled={actionLoading === `start-${session._id}`}
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
                          onClick={() => session._id && handleFinishSession(session._id)}
                          disabled={actionLoading === `finish-${session._id}`}
                        >
                          {actionLoading === `finish-${session._id}` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Finish
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setUploadSessionId(session._id || null)
                          setUploadOpen(true)
                        }}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Upload Photo
                      </Button>
                      {noteSessionId !== session._id ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNoteSessionId(session._id || null)
                            setNoteValue(session.notes || "")
                          }}
                        >
                          Add Note
                        </Button>
                      ) : null}
                    </div>

                    {/* Note editor */}
                    {noteSessionId === session._id && (
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
                            onClick={() => session._id && handleSaveNote(session._id)}
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
                              setNoteSessionId(null)
                              setNoteValue("")
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Existing notes */}
                    {session.notes && noteSessionId !== session._id && (
                      <div className="rounded-md bg-muted/50 p-3">
                        <span className="text-xs font-medium text-muted-foreground">Note:</span>
                        <p className="mt-1 text-sm text-foreground">{session.notes}</p>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {session.started_at && (
                        <span>Started: {new Date(session.started_at).toLocaleString()}</span>
                      )}
                      {session.finished_at && (
                        <span>Finished: {new Date(session.finished_at).toLocaleString()}</span>
                      )}
                    </div>

                    {/* Media gallery */}
                    {session.media && session.media.length > 0 && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground">
                          Photos ({session.media.length})
                        </span>
                        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {session.media.map((m, idx) => (
                            <div key={m._id || idx} className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit text-[10px] capitalize">
                                {m.type}
                              </Badge>
                              <div className="aspect-square overflow-hidden rounded-lg border border-border/50 bg-muted">
                                <img
                                  src={m.secure_url || m.url || "/placeholder.svg"}
                                  alt={`${m.type} photo`}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              {m.note && (
                                <span className="text-[10px] text-muted-foreground">{m.note}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Upload Photo Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Upload Before/After Photo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUploadMedia} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Photo Type</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="mediaType" value="before" defaultChecked className="accent-[hsl(var(--primary))]" />
                  <span className="text-sm text-foreground">Before</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="mediaType" value="after" className="accent-[hsl(var(--primary))]" />
                  <span className="text-sm text-foreground">After</span>
                </label>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="photo">Photo</Label>
              <Input id="photo" name="photo" type="file" accept="image/*" />
            </div>
            <Button type="submit" className="font-display font-bold" disabled={!!actionLoading}>
              {actionLoading?.startsWith("upload-") ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Upload
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
