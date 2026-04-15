"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Clock, MapPin, Store, Loader2, RefreshCw, UserPlus, Scissors, CheckCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  getGroomerOpenJobs,
  claimSession,
  type AdminBooking,
  type BookingSession,
} from "@/lib/api/bookings"
import { getCurrentUser } from "@/lib/api/users"

export default function OpenJobsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<AdminBooking[]>([])
  const [groomerSkills, setGroomerSkills] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [claimedBookingId, setClaimedBookingId] = useState<string | null>(null)

  const fetchOpenJobs = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [res, meRes] = await Promise.all([
        getGroomerOpenJobs({ limit: 50 }),
        getCurrentUser(),
      ])
      setBookings(res.bookings)
      setGroomerSkills(meRes.user?.profile?.groomer_skills ?? [])
    } catch (err: any) {
      setError(err.message || "Gagal memuat data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOpenJobs()
  }, [fetchOpenJobs])

  const handleClaim = async (bookingId: string, sessionId: string) => {
    setClaimingId(sessionId)
    try {
      await claimSession(bookingId, sessionId)
      toast.success("Session berhasil diklaim!")
      setClaimedBookingId(bookingId)
      await fetchOpenJobs()
    } catch (err: any) {
      toast.error(err.message || "Gagal mengklaim session")
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-4 w-48" />
        </div>
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <p className="text-destructive">{error}</p>
        <button onClick={fetchOpenJobs} className="text-sm font-medium text-primary underline">
          Coba lagi
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Open Jobs</h1>
          <p className="text-sm text-muted-foreground">
            {bookings.length} {bookings.length === 1 ? "booking" : "bookings"} available
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOpenJobs}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Store className="h-12 w-12 text-muted-foreground/30" />
          <p className="text-muted-foreground">Tidak ada pekerjaan tersedia saat ini</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking) => {
            const sessions = booking.sessions || []
            // A session is claimable when: unclaimed AND matches one of the groomer's skills (by name, case-insensitive)
            const isSkillMatch = (sessionType: string) =>
              groomerSkills.length === 0 ||
              groomerSkills.some((sk) => sk.toLowerCase() === sessionType.toLowerCase())
            const claimableSessions = sessions.filter(
              (s) => !s.groomer_id && !s.groomer_detail && isSkillMatch(s.type),
            )
            const unclaimedSessions = claimableSessions
            const claimedSessions = sessions.filter(
              (s) => s.groomer_id || s.groomer_detail,
            )

            return (
              <Card key={booking._id} className="border-border/50">
                <CardContent className="flex flex-col gap-4 p-5">
                  {/* Booking Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1">
                      <span className="font-display text-lg font-bold text-foreground">
                        {booking.pet_snapshot?.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {booking.service_snapshot?.name}
                      </span>
                    </div>
                    <Badge variant="outline" className="capitalize">{booking.type}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{booking.date?.split("T")[0]}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{booking.time_range}</span>
                    </div>
                    {booking.store && (
                      <div className="flex items-center gap-1">
                        <Store className="h-3.5 w-3.5" />
                        <span>{booking.store.name}</span>
                      </div>
                    )}
                    {booking.type === "in home" && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>Home visit</span>
                      </div>
                    )}
                  </div>

                  {/* Pet Info */}
                  {booking.pet_snapshot && (
                    <div className="flex flex-wrap gap-2">
                      {booking.pet_snapshot.pet_type?.name && (
                        <Badge variant="outline" className="text-xs">
                          {booking.pet_snapshot.pet_type.name}
                        </Badge>
                      )}
                      {booking.pet_snapshot.size?.name && (
                        <Badge variant="outline" className="text-xs">
                          {booking.pet_snapshot.size.name}
                        </Badge>
                      )}
                      {booking.pet_snapshot.breed?.name && (
                        <Badge variant="outline" className="text-xs">
                          {booking.pet_snapshot.breed.name}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* All Sessions */}
                  <div className="flex flex-col gap-2 rounded-lg border border-border/50 p-3">
                    <span className="text-xs font-medium text-muted-foreground">
                      Sessions ({unclaimedSessions.length} available)
                    </span>
                    {sessions.map((session) => {
                      const isClaimed = !!(session.groomer_id || session.groomer_detail)
                      const canClaim = !isClaimed && isSkillMatch(session.type)

                      return (
                        <div
                          key={session._id}
                          className={`flex items-center justify-between rounded-md p-2 ${
                            isClaimed ? "bg-secondary/30" : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-bold">
                              {session.order + 1}
                            </span>
                            <span className="text-sm capitalize text-foreground">
                              {session.type}
                            </span>
                            {isClaimed ? (
                              <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                <Scissors className="h-3 w-3" />
                                {session.groomer_detail?.username ?? "Assigned"}
                              </span>
                            ) : canClaim ? (
                              <Badge className="bg-amber-100 text-xs text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                                Open
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-muted-foreground">
                                Open
                              </Badge>
                            )}
                          </div>
                          {canClaim && (
                            <Button
                              size="sm"
                              onClick={() =>
                                session._id && handleClaim(booking._id, session._id)
                              }
                              disabled={claimingId === session._id}
                            >
                              {claimingId === session._id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <UserPlus className="mr-2 h-4 w-4" />
                              )}
                              Claim
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Post-claim navigation dialog */}
      <AlertDialog
        open={!!claimedBookingId}
        onOpenChange={(open) => { if (!open) setClaimedBookingId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Session Berhasil Diklaim!
            </AlertDialogTitle>
            <AlertDialogDescription>
              Mau langsung ke detail booking atau tetap di sini untuk klaim session lain?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setClaimedBookingId(null)}
            >
              Tetap di Sini
            </Button>
            <Button
              onClick={() => {
                const id = claimedBookingId
                setClaimedBookingId(null)
                router.push(`/groomer/jobs/${id}`)
              }}
            >
              Lihat Detail Booking
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
