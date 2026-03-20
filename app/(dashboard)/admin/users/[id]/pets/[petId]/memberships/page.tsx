"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  CreditCard,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  Infinity,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

import { type ApiCurrentUser, getUser } from "@/lib/api/users"
import {
  type MembershipPlan,
  type PetMembership,
  type BenefitsSummaryData,
  type BenefitsHistoryData,
  getMemberships,
  getActivePetMembership,
  getPetMembershipBenefitsSummary,
  getPetMembershipBenefitsHistory,
  getPetMemberships,
  purchasePetMembership,
  cancelPetMembership,
} from "@/lib/api/memberships"

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

const benefitTypeLabel: Record<string, string> = {
  discount: "Diskon",
  quota: "Kuota Sesi",
}

const periodLabel: Record<string, string> = {
  weekly: "Mingguan",
  monthly: "Bulanan",
  unlimited: "Tidak terbatas",
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PetMembershipsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const petId = params.petId as string

  const [user, setUser] = useState<ApiCurrentUser | null>(null)
  const [petName, setPetName] = useState<string>("")
  const [isLoadingUser, setIsLoadingUser] = useState(true)

  const [activeMembership, setActiveMembership] = useState<PetMembership | null>(null)
  const [isLoadingActive, setIsLoadingActive] = useState(true)

  const [benefitsSummary, setBenefitsSummary] = useState<BenefitsSummaryData | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)

  const [benefitsHistory, setBenefitsHistory] = useState<BenefitsHistoryData | null>(null)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)

  const [allPetMemberships, setAllPetMemberships] = useState<PetMembership[]>([])
  const [isLoadingAll, setIsLoadingAll] = useState(true)

  const [availablePlans, setAvailablePlans] = useState<MembershipPlan[]>([])

  // Purchase dialog
  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [isPurchasing, setIsPurchasing] = useState(false)

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<PetMembership | null>(null)

  // Load user & pet name
  useEffect(() => {
    setIsLoadingUser(true)
    getUser(userId)
      .then((res) => {
        setUser(res.user)
        const pet = res.user.pets?.find((p: { _id: string }) => p._id === petId)
        if (pet) setPetName((pet as { name: string }).name)
      })
      .catch(() => {})
      .finally(() => setIsLoadingUser(false))
  }, [userId, petId])

  // Load active plans for purchase dropdown
  useEffect(() => {
    getMemberships({ is_active: true })
      .then((res) => setAvailablePlans(res.data))
      .catch(() => {})
  }, [])

  const loadActiveMembership = useCallback(async () => {
    setIsLoadingActive(true)
    try {
      const res = await getActivePetMembership(petId)
      setActiveMembership(res.data)
    } catch {
      setActiveMembership(null)
    } finally {
      setIsLoadingActive(false)
    }
  }, [petId])

  const loadBenefitsSummary = useCallback(async () => {
    setIsLoadingSummary(true)
    try {
      const res = await getPetMembershipBenefitsSummary(petId)
      setBenefitsSummary(res.data)
    } catch {
      setBenefitsSummary(null)
    } finally {
      setIsLoadingSummary(false)
    }
  }, [petId])

  const loadBenefitsHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const res = await getPetMembershipBenefitsHistory(petId)
      setBenefitsHistory(res.data)
    } catch {
      setBenefitsHistory(null)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [petId])

  const loadAllPetMemberships = useCallback(async () => {
    setIsLoadingAll(true)
    try {
      const res = await getPetMemberships({ pet_id: petId })
      setAllPetMemberships(res.data)
    } catch {
      setAllPetMemberships([])
    } finally {
      setIsLoadingAll(false)
    }
  }, [petId])

  useEffect(() => {
    loadActiveMembership()
    loadBenefitsSummary()
    loadBenefitsHistory()
    loadAllPetMemberships()
  }, [loadActiveMembership, loadBenefitsSummary, loadBenefitsHistory, loadAllPetMemberships])

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanId) {
      toast.error("Pilih paket membership terlebih dahulu")
      return
    }
    setIsPurchasing(true)
    try {
      await purchasePetMembership({ pet_id: petId, membership_plan_id: selectedPlanId })
      toast.success("Membership berhasil dibeli")
      setPurchaseOpen(false)
      setSelectedPlanId("")
      loadActiveMembership()
      loadBenefitsSummary()
      loadAllPetMemberships()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membeli membership")
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await cancelPetMembership(cancelTarget._id)
      toast.success("Membership berhasil dibatalkan")
      setCancelTarget(null)
      loadActiveMembership()
      loadBenefitsSummary()
      loadAllPetMemberships()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan membership")
    }
  }

  const planName = (planId: string) =>
    availablePlans.find((p) => p._id === planId)?.name ?? planId

  return (
    <>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 mt-0.5 shrink-0"
            onClick={() => router.push(`/admin/users/${userId}/pets`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            {isLoadingUser ? (
              <>
                <Skeleton className="h-6 w-48 mb-1" />
                <Skeleton className="h-4 w-64" />
              </>
            ) : (
              <>
                <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Membership {petName || "Pet"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {user?.username} &middot; Riwayat & manajemen membership pet
                </p>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Active Membership Card */}
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Membership Aktif</h2>
          {isLoadingActive ? (
            <Card className="border-border/50">
              <CardContent className="p-4 flex flex-col gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardContent>
            </Card>
          ) : activeMembership ? (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    {activeMembership.membership.name}
                  </CardTitle>
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">
                    Aktif
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  Mulai: {formatDate(activeMembership.start_date)}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-4 w-4 shrink-0" />
                  Berakhir: {formatDate(activeMembership.end_date)}
                </span>
                <span className="text-xs font-mono text-muted-foreground/70">ID: {activeMembership._id}</span>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed border-border/50">
              <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                <CreditCard className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Tidak ada membership aktif</p>
                <Button onClick={() => { setSelectedPlanId(""); setPurchaseOpen(true) }}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Beli Membership
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Benefits Summary */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">Ringkasan Benefit</h2>
            {activeMembership && (
              <Button variant="outline" size="sm" onClick={() => { setSelectedPlanId(""); setPurchaseOpen(true) }}>
                <CreditCard className="h-4 w-4 mr-2" />
                Beli Membership
              </Button>
            )}
          </div>

          {isLoadingSummary ? (
            <Card className="border-border/50">
              <CardContent className="p-4 flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
              </CardContent>
            </Card>
          ) : benefitsSummary?.has_active_membership && benefitsSummary.benefits.length > 0 ? (
            <Card className="border-border/50">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Berlaku</TableHead>
                    <TableHead>Layanan</TableHead>
                    <TableHead>Periode</TableHead>
                    <TableHead>Nilai</TableHead>
                    <TableHead>Digunakan</TableHead>
                    <TableHead>Sisa</TableHead>
                    <TableHead>Bisa Dipakai</TableHead>
                    <TableHead>Reset Berikutnya</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {benefitsSummary.benefits.map((b) => (
                    <TableRow key={b._id}>
                      <TableCell className="text-sm font-medium">{benefitTypeLabel[b.type] ?? b.type}</TableCell>
                      <TableCell className="text-sm capitalize">{b.applies_to}</TableCell>
                      <TableCell className="text-sm">{b.service?.name ?? "-"}</TableCell>
                      <TableCell className="text-sm">{periodLabel[b.period] ?? b.period}</TableCell>
                      <TableCell className="text-sm">
                        {b.type === "discount" ? `${b.value}%` : `-`}
                      </TableCell>
                      <TableCell className="text-sm">{b.used}x</TableCell>
                      <TableCell className="text-sm">
                        {b.remaining === null ? <Infinity className="h-4 w-4" /> : `${b.remaining}x`}
                      </TableCell>
                      <TableCell>
                        {b.can_apply ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.next_reset_date ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {formatDate(b.next_reset_date)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                {benefitsSummary?.has_active_membership ? "Tidak ada benefit tersedia" : "Tidak ada membership aktif"}
              </CardContent>
            </Card>
          )}
        </div>

        {/* All Memberships History */}
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Riwayat Membership</h2>
          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paket</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Berakhir</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingAll ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : allPetMemberships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      Belum ada riwayat membership
                    </TableCell>
                  </TableRow>
                ) : (
                  allPetMemberships.map((pm) => (
                    <TableRow key={pm._id}>
                      <TableCell className="text-sm font-medium">{pm.membership.name}</TableCell>
                      <TableCell className="text-sm">{formatDate(pm.start_date)}</TableCell>
                      <TableCell className="text-sm">{formatDate(pm.end_date)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={pm.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}
                        >
                          {pm.is_active ? "Aktif" : "Tidak aktif"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {pm.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => setCancelTarget(pm)}
                          >
                            Batalkan
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Benefits Usage History */}
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">Riwayat Penggunaan Benefit</h2>
          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Potongan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 4 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !benefitsHistory?.benefits_history?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      Belum ada riwayat penggunaan benefit
                    </TableCell>
                  </TableRow>
                ) : (
                  benefitsHistory.benefits_history.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell className="text-sm">{benefitTypeLabel[h.type] ?? h.type}</TableCell>
                      <TableCell className="text-sm">{formatDatetime(h.applied_date)}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{h.booking_id}</TableCell>
                      <TableCell className="text-sm">Rp {h.amount_deducted.toLocaleString("id-ID")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      {/* Purchase Dialog */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Beli Membership untuk {petName || "Pet"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePurchase} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="plan-select">Paket Membership <span className="text-destructive">*</span></Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId} required>
                <SelectTrigger id="plan-select">
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlans.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} — {p.duration_months} bulan
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPurchaseOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isPurchasing}>
                {isPurchasing ? "Memproses..." : "Beli"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Membership</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin membatalkan membership ini? Semua benefit tidak akan lagi bisa digunakan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleCancel}>
              Batalkan Membership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
