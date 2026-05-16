"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  Clock,
  Infinity,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { type ApiCurrentUser, type ApiPet, getUser } from "@/lib/api/users";
import {
  type MembershipPlan,
  type PetMembership,
  type MembershipStatus,
  type BenefitsHistoryData,
  type MembershipHistoryItem,
  getMemberships,
  getPetMemberships,
  getPetMembershipCounts,
  getPetMembershipBenefitsHistory,
  getMembershipHistory,
  purchasePetMembership,
  updatePetMembership,
  renewPetMembership,
  cancelPetMembership,
} from "@/lib/api/memberships";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDatetime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const benefitTypeLabel: Record<string, string> = {
  discount: "Diskon",
  quota: "Kuota Sesi",
};

const periodLabel: Record<string, string> = {
  weekly: "Mingguan",
  monthly: "Bulanan",
  unlimited: "Tidak terbatas",
};

const appliesToLabel: Record<string, string> = {
  service: "Layanan",
  addon: "Add-on",
  pickup: "Jemput & Antar",
};

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isoToDateInput(iso: string) {
  return iso ? iso.split("T")[0] : "";
}

interface UpdateMembershipForm {
  start_date: string;
  end_date: string;
  note: string;
}

const DEFAULT_UPDATE_FORM: UpdateMembershipForm = {
  start_date: "",
  end_date: "",
  note: "",
};

// ── Sub-Components ─────────────────────────────────────────────────────────

const statusBadge: Record<string, { label: string; className: string }> = {
  active: {
    label: "Aktif",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  pending: {
    label: "Menunggu",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  expired: {
    label: "Berakhir",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  cancelled: {
    label: "Dibatalkan",
    className: "bg-muted text-muted-foreground border-border",
  },
};

function MembershipCard({
  membership: pm,
  onEdit,
  onCancel,
  onRenew,
}: {
  membership: PetMembership;
  onEdit: () => void;
  onCancel: () => void;
  onRenew: () => void;
}) {
  const badge = statusBadge[pm.status] ?? statusBadge.active;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm min-h-[180px] flex flex-col">
      {/* top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-foreground/20 via-foreground/10 to-transparent" />
      {/* decorative circles */}
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-muted/60 pointer-events-none" />
      <div className="absolute right-10 -bottom-14 h-48 w-48 rounded-full bg-muted/40 pointer-events-none" />
      <div className="relative flex flex-col gap-4 p-6 flex-1">
        {/* top row: label + badge */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-medium tracking-widest text-muted-foreground uppercase">
            Pawship Membership
          </span>
          <Badge
            variant="outline"
            className={cn("text-xs shrink-0", badge.className)}
          >
            {badge.label}
          </Badge>
        </div>
        {/* membership name */}
        <h3 className="font-display text-lg font-bold leading-tight text-foreground -mt-2">
          {pm.membership.name}
        </h3>
        <Separator className="opacity-50" />
        {/* pet info row */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Pemilik & Pet
            </p>
            <p className="text-sm font-semibold text-foreground truncate">
              {pm.pet.owner.username}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {pm.pet.name}
              {pm.pet.pet_type?.name ? ` · ${pm.pet.pet_type.name}` : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Masa Berlaku
            </p>
            <p className="text-xs font-medium text-foreground whitespace-nowrap">
              {formatDate(pm.start_date)}
            </p>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              s/d {formatDate(pm.end_date)}
            </p>
          </div>
        </div>
        {/* note */}
        {pm.purchase_note && (
          <p
            className="text-xs text-muted-foreground italic truncate"
            title={pm.purchase_note}
          >
            {pm.purchase_note}
          </p>
        )}
        {/* footer */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {pm.membership.duration_months} Bulan
            </span>
            {pm.purchase_price != null && (
              <>
                <span className="text-xs text-muted-foreground">·</span>
                {pm.purchase_price !== pm.membership.price ? (
                  <span className="text-xs">
                    <span className="text-muted-foreground line-through">
                      Rp {pm.membership.price.toLocaleString("id-ID")}
                    </span>{" "}
                    <span className="font-medium text-foreground">
                      Rp {pm.purchase_price.toLocaleString("id-ID")}
                    </span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Rp {pm.purchase_price.toLocaleString("id-ID")}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(pm.status === "active" || pm.status === "pending") && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-2"
                onClick={onEdit}
              >
                Edit
              </button>
            )}
            {pm.status === "expired" && (
              <button
                type="button"
                className="text-xs text-blue-600 hover:text-blue-700 transition-colors hover:underline underline-offset-2"
                onClick={onRenew}
              >
                Perpanjang
              </button>
            )}
            {(pm.status === "active" || pm.status === "pending") && (
              <button
                type="button"
                className="text-xs text-destructive hover:text-destructive transition-colors hover:underline underline-offset-2"
                onClick={onCancel}
              >
                Batalkan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PetMembershipsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const petId = params.petId as string;

  const [user, setUser] = useState<ApiCurrentUser | null>(null);
  const [petName, setPetName] = useState<string>("");
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [memberships, setMemberships] = useState<PetMembership[]>([]);
  const [membershipTab, setMembershipTab] =
    useState<MembershipStatus>("active");
  const [isLoadingMemberships, setIsLoadingMemberships] = useState(true);
  const [tabCounts, setTabCounts] = useState<Record<MembershipStatus, number>>({
    active: 0,
    pending: 0,
    expired: 0,
    cancelled: 0,
  });
  // All non-cancelled memberships (is_active=true): active, pending, expired — used to disable already-owned plans in purchase dialog
  const [nonCancelledMemberships, setNonCancelledMemberships] = useState<
    PetMembership[]
  >([]);

  const [benefitsHistory, setBenefitsHistory] =
    useState<BenefitsHistoryData | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  const [membershipHistory, setMembershipHistory] = useState<
    MembershipHistoryItem[]
  >([]);
  const [isLoadingHistory2, setIsLoadingHistory2] = useState(true);

  const [availablePlans, setAvailablePlans] = useState<MembershipPlan[]>([]);
  // undefined = not yet resolved, null = no pet type
  const [petTypeId, setPetTypeId] = useState<string | null | undefined>(
    undefined,
  );

  // Purchase dialog
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [purchaseStartDate, setPurchaseStartDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [purchasePrice, setPurchasePrice] = useState<string>("");
  const [purchaseNote, setPurchaseNote] = useState<string>("");
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Cancel dialog
  const [cancelTarget, setCancelTarget] = useState<PetMembership | null>(null);

  // Update dialog
  const [updateTarget, setUpdateTarget] = useState<PetMembership | null>(null);
  const [updateForm, setUpdateForm] =
    useState<UpdateMembershipForm>(DEFAULT_UPDATE_FORM);
  const [isUpdating, setIsUpdating] = useState(false);

  // Renew dialog
  const [renewTarget, setRenewTarget] = useState<PetMembership | null>(null);
  const [renewStartDate, setRenewStartDate] = useState<string>(
    () => new Date().toISOString().split("T")[0],
  );
  const [renewPrice, setRenewPrice] = useState<string>("");
  const [isRenewing, setIsRenewing] = useState(false);

  // Load user & pet name
  useEffect(() => {
    setIsLoadingUser(true);
    getUser(userId)
      .then((res) => {
        setUser(res.user);
        const pet = (res.user.pets as ApiPet[] | undefined)?.find(
          (p) => p._id === petId,
        );
        if (pet) {
          setPetName(pet.name);
          setPetTypeId(pet.pet_type?._id ?? null);
        } else {
          setPetTypeId(null);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingUser(false));
  }, [userId, petId]);

  // Load active plans filtered by pet type for purchase dropdown
  useEffect(() => {
    if (petTypeId === undefined) return; // wait until pet type is resolved
    getMemberships({
      is_active: true,
      ...(petTypeId ? { pet_type_id: petTypeId } : {}),
    })
      .then((res) => setAvailablePlans(res.data))
      .catch(() => {});
  }, [petTypeId]);

  const loadMemberships = useCallback(
    async (status: MembershipStatus = membershipTab) => {
      setIsLoadingMemberships(true);
      try {
        const res = await getPetMemberships({ pet_id: petId, status });
        setMemberships(res.data);
      } catch {
        setMemberships([]);
      } finally {
        setIsLoadingMemberships(false);
      }
    },
    [petId, membershipTab],
  );

  const loadTabCounts = useCallback(async () => {
    try {
      const res = await getPetMembershipCounts(petId);
      setTabCounts(res.data as Record<MembershipStatus, number>);
    } catch {
      /* non-critical */
    }
  }, [petId]);

  const loadNonCancelledMemberships = useCallback(async () => {
    try {
      const res = await getPetMemberships({ pet_id: petId });
      setNonCancelledMemberships(res.data);
    } catch {
      setNonCancelledMemberships([]);
    }
  }, [petId]);

  const loadBenefitsHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getPetMembershipBenefitsHistory(petId);
      setBenefitsHistory(res.data);
    } catch {
      setBenefitsHistory(null);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [petId]);

  const loadMembershipHistory = useCallback(async () => {
    setIsLoadingHistory2(true);
    try {
      const res = await getMembershipHistory(petId);
      setMembershipHistory(res.data);
    } catch {
      setMembershipHistory([]);
    } finally {
      setIsLoadingHistory2(false);
    }
  }, [petId]);

  useEffect(() => {
    loadMemberships();
    loadTabCounts();
    loadNonCancelledMemberships();
    loadBenefitsHistory();
    loadMembershipHistory();
  }, [
    loadMemberships,
    loadTabCounts,
    loadNonCancelledMemberships,
    loadBenefitsHistory,
    loadMembershipHistory,
  ]);

  // Overlap error: real-time validation for purchase start date
  // Checks against active & pending memberships (any plan) — expired & cancelled are excluded.
  // Merges consecutive/adjacent periods so that a chain like [active → pending] is treated as
  // one blocked block and the available date is calculated from the END of the full chain.
  const overlapError = (() => {
    if (!selectedPlanId || !purchaseStartDate) return null;
    const plan = availablePlans.find((p) => p._id === selectedPlanId);
    if (!plan) return null;
    const newStart = new Date(purchaseStartDate);
    const newEnd = addMonths(newStart, plan.duration_months);

    const activeAndPending = nonCancelledMemberships.filter(
      (m) => m.status === "active" || m.status === "pending",
    );

    // Find the first membership that directly conflicts (for the error label)
    const firstConflict = activeAndPending.find(
      (m) =>
        newStart < new Date(m.end_date) && newEnd > new Date(m.start_date),
    );
    if (!firstConflict) return null;

    // Merge consecutive/overlapping periods to find the full blocked-until date.
    // Periods starting within 1 day after the previous end are treated as consecutive
    // (e.g. active ends Nov 16, pending starts Nov 17 → same block).
    const sorted = [...activeAndPending].sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );
    const merged: { start: Date; end: Date }[] = [];
    for (const m of sorted) {
      const s = new Date(m.start_date);
      const e = new Date(m.end_date);
      if (merged.length === 0) {
        merged.push({ start: s, end: e });
      } else {
        const lastEnd = merged[merged.length - 1].end;
        // Merge if overlapping OR adjacent (gap ≤ 1 day)
        const isConsecutive = s.getTime() <= lastEnd.getTime() + 86_400_000;
        if (!isConsecutive) {
          merged.push({ start: s, end: e });
        } else if (e > lastEnd) {
          merged[merged.length - 1].end = e;
        }
      }
    }
    const overlapBlock = merged.find(
      (p) => newStart < p.end && newEnd > p.start,
    );
    if (!overlapBlock) return null;

    const statusLabel =
      firstConflict.status === "active" ? "Aktif" : "Menunggu";
    const planName = firstConflict.membership?.name ?? "membership lain";
    const availableFromDate = new Date(overlapBlock.end);
    availableFromDate.setDate(availableFromDate.getDate() + 1);
    const availableFrom = availableFromDate.toISOString().split("T")[0];
    return {
      message: `Tanggal mulai bertabrakan dengan "${planName}" ${statusLabel} (${formatDate(firstConflict.start_date)} – ${formatDate(firstConflict.end_date)})`,
      availableFrom,
      availableFromFormatted: formatDate(availableFromDate.toISOString()),
    };
  })();

  // Overlap error for the EDIT form. Excludes the membership being edited.
  // Triggers if the start date alone falls within another active/pending period,
  // OR if the full [start, end] range overlaps one — independent of end-date validity.
  const updateOverlapError = (() => {
    if (!updateTarget || !updateForm.start_date) return null;
    const newStart = new Date(updateForm.start_date);
    const newEnd = updateForm.end_date
      ? new Date(updateForm.end_date)
      : null;

    const others = nonCancelledMemberships.filter(
      (m) =>
        m._id !== updateTarget._id &&
        (m.status === "active" || m.status === "pending"),
    );
    if (others.length === 0) return null;

    const sorted = [...others].sort(
      (a, b) =>
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
    );

    // Conflict = start date inside a membership's period, OR full range overlaps
    const conflictsWith = (s: Date, e: Date) => {
      const startInside = newStart >= s && newStart < e;
      const rangeOverlap =
        newEnd !== null && newStart < e && newEnd > s;
      return startInside || rangeOverlap;
    };

    const firstConflict = sorted.find((m) =>
      conflictsWith(new Date(m.start_date), new Date(m.end_date)),
    );
    if (!firstConflict) return null;

    // Merge consecutive/overlapping periods to compute the full blocked-until date
    const merged: { start: Date; end: Date }[] = [];
    for (const m of sorted) {
      const s = new Date(m.start_date);
      const e = new Date(m.end_date);
      if (merged.length === 0) {
        merged.push({ start: s, end: e });
      } else {
        const lastEnd = merged[merged.length - 1].end;
        const isConsecutive = s.getTime() <= lastEnd.getTime() + 86_400_000;
        if (!isConsecutive) {
          merged.push({ start: s, end: e });
        } else if (e > lastEnd) {
          merged[merged.length - 1].end = e;
        }
      }
    }
    const overlapBlock =
      merged.find((p) => {
        const startInside = newStart >= p.start && newStart < p.end;
        const rangeOverlap =
          newEnd !== null && newStart < p.end && newEnd > p.start;
        return startInside || rangeOverlap;
      }) ?? null;
    if (!overlapBlock) return null;

    const statusLabel =
      firstConflict.status === "active" ? "Aktif" : "Menunggu";
    const planName = firstConflict.membership?.name ?? "membership lain";
    const availableFromDate = new Date(overlapBlock.end);
    availableFromDate.setDate(availableFromDate.getDate() + 1);
    const availableFrom = availableFromDate.toISOString().split("T")[0];
    return {
      message: `Tanggal mulai masuk ke periode "${planName}" ${statusLabel} (${formatDate(firstConflict.start_date)} – ${formatDate(firstConflict.end_date)})`,
      availableFrom,
      availableFromFormatted: formatDate(availableFromDate.toISOString()),
    };
  })();

  // End date must be strictly after start date in the EDIT form
  const updateDateRangeError = (() => {
    if (!updateForm.start_date || !updateForm.end_date) return null;
    const s = new Date(updateForm.start_date);
    const e = new Date(updateForm.end_date);
    if (e <= s) {
      return "Tanggal berakhir tidak boleh lebih kecil atau sama dengan tanggal mulai";
    }
    return null;
  })();

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      toast.error("Pilih paket membership terlebih dahulu");
      return;
    }
    if (overlapError) {
      toast.error(overlapError.message);
      return;
    }
    setIsPurchasing(true);
    try {
      const payload: Parameters<typeof purchasePetMembership>[0] = {
        pet_id: petId,
        membership_plan_id: selectedPlanId,
        start_date: new Date(purchaseStartDate).toISOString(),
      };
      if (purchasePrice !== "") {
        payload.purchase_price = Number(
          purchasePrice.replace(/\./g, "").replace(/\D/g, ""),
        );
      }
      if (purchaseNote.trim()) {
        payload.purchase_note = purchaseNote.trim();
      }
      await purchasePetMembership(payload);
      toast.success("Membership berhasil dibeli");
      setPurchaseOpen(false);
      setSelectedPlanId("");
      setPurchaseStartDate(new Date().toISOString().split("T")[0]);
      setPurchasePrice("");
      setPurchaseNote("");
      loadMemberships();
      loadTabCounts();
      loadNonCancelledMemberships();
      loadMembershipHistory();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membeli membership",
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelPetMembership(cancelTarget._id);
      toast.success("Membership berhasil dibatalkan");
      setCancelTarget(null);
      loadMemberships();
      loadTabCounts();
      loadNonCancelledMemberships();
      loadMembershipHistory();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membatalkan membership",
      );
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateTarget) return;
    if (updateDateRangeError) {
      toast.error(updateDateRangeError);
      return;
    }
    if (updateOverlapError) {
      toast.error(updateOverlapError.message);
      return;
    }
    setIsUpdating(true);
    try {
      const payload: Record<string, string> = {};
      if (updateForm.start_date)
        payload.start_date = new Date(updateForm.start_date).toISOString();
      if (updateForm.end_date)
        payload.end_date = new Date(updateForm.end_date).toISOString();
      if (updateForm.note.trim()) payload.note = updateForm.note.trim();
      await updatePetMembership(updateTarget._id, payload);
      toast.success("Membership berhasil diperbarui");
      setUpdateTarget(null);
      setUpdateForm(DEFAULT_UPDATE_FORM);
      loadMemberships();
      loadMembershipHistory();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui membership",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewTarget) return;
    setIsRenewing(true);
    try {
      const renewPayload: { start_date?: string; purchase_price?: number } = {
        start_date: new Date(renewStartDate).toISOString(),
      };
      if (renewPrice !== "") {
        renewPayload.purchase_price = Number(
          renewPrice.replace(/\./g, "").replace(/\D/g, ""),
        );
      }
      await renewPetMembership(renewTarget._id, renewPayload);
      toast.success("Membership berhasil diperpanjang");
      setRenewTarget(null);
      setRenewStartDate(new Date().toISOString().split("T")[0]);
      setRenewPrice("");
      loadMemberships();
      loadTabCounts();
      loadMembershipHistory();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui membership",
      );
    } finally {
      setIsRenewing(false);
    }
  };

  const planName = (planId: string) =>
    availablePlans.find((p) => p._id === planId)?.name ?? planId;

  return (
    <>
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 mt-0.5 shrink-0"
            onClick={() => router.back()}
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

        {/* Membership Tabs */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-semibold text-lg">Membership</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPlanId("");
                setPurchaseStartDate(new Date().toISOString().split("T")[0]);
                loadNonCancelledMemberships();
                setPurchaseOpen(true);
              }}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Beli Membership
            </Button>
          </div>
          <Tabs
            value={membershipTab}
            onValueChange={(v) => {
              const tab = v as MembershipStatus;
              setMembershipTab(tab);
              loadMemberships(tab);
            }}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="active" className="gap-2">
                Aktif
                {tabCounts.active > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[10px] font-semibold leading-none">
                    {tabCounts.active}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="pending" className="gap-2">
                Menunggu
                {tabCounts.pending > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[10px] font-semibold leading-none">
                    {tabCounts.pending}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="expired" className="gap-2">
                Berakhir
                {tabCounts.expired > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[10px] font-semibold leading-none">
                    {tabCounts.expired}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="gap-2">
                Dibatalkan
                {tabCounts.cancelled > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground/10 px-1 text-[10px] font-semibold leading-none">
                    {tabCounts.cancelled}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {(
              [
                "active",
                "pending",
                "expired",
                "cancelled",
              ] as MembershipStatus[]
            ).map((tab) => (
              <TabsContent key={tab} value={tab}>
                {isLoadingMemberships ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div
                        key={i}
                        className="rounded-2xl bg-muted h-[168px] p-6 flex flex-col gap-3"
                      >
                        <Skeleton className="h-3 w-28" />
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-40 mt-auto" />
                      </div>
                    ))}
                  </div>
                ) : memberships.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {memberships.map((pm) => (
                      <MembershipCard
                        key={pm._id}
                        membership={pm}
                        onEdit={() => {
                          loadNonCancelledMemberships();
                          setUpdateTarget(pm);
                          setUpdateForm({
                            start_date: isoToDateInput(pm.start_date),
                            end_date: isoToDateInput(pm.end_date),
                            note: "",
                          });
                        }}
                        onCancel={() => setCancelTarget(pm)}
                        onRenew={() => {
                          setRenewStartDate(
                            new Date().toISOString().split("T")[0],
                          );
                          setRenewPrice("");
                          setRenewTarget(pm);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed border-border/50">
                    <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
                      <CreditCard className="h-10 w-10 text-muted-foreground/30" />
                      <p className="text-muted-foreground text-sm">
                        {tab === "active"
                          ? "Tidak ada membership aktif"
                          : tab === "pending"
                            ? "Tidak ada membership yang menunggu dimulai"
                            : tab === "expired"
                              ? "Tidak ada membership yang sudah berakhir"
                              : "Tidak ada membership yang dibatalkan"}
                      </p>
                      {tab === "active" && (
                        <Button
                          onClick={() => {
                            setSelectedPlanId("");
                            setPurchaseStartDate(
                              new Date().toISOString().split("T")[0],
                            );
                            loadNonCancelledMemberships();
                            setPurchaseOpen(true);
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Beli Membership
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* Benefits Summary — only visible on active tab */}
        {membershipTab === "active" && memberships.length > 0 && (
          <div>
            <h2 className="font-display font-semibold text-lg mb-3">
              Ringkasan Benefit
            </h2>
            {isLoadingMemberships ? (
              <Card className="border-border/50">
                <CardContent className="p-4 flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col gap-4">
                {memberships.map((pm) => (
                  <div key={pm._id}>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {pm.membership.name}
                    </p>
                    <Card className="border-border/50">
                      {pm.benefits_snapshot.length > 0 ? (
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
                              <TableHead>Reset Berikutnya</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pm.benefits_snapshot.map((b) => {
                              const remaining =
                                b.limit === null
                                  ? null
                                  : (b.limit ?? 0) - b.used;
                              const canApply =
                                b.limit === null ||
                                (remaining !== null && remaining > 0);
                              return (
                                <TableRow key={b._id}>
                                  <TableCell className="text-sm font-medium">
                                    {benefitTypeLabel[b.type] ?? b.type}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {appliesToLabel[b.applies_to] ??
                                      b.applies_to}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {b.service?.name ?? b.label ?? "-"}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {periodLabel[b.period] ?? b.period}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {b.type === "discount"
                                      ? `${b.value}%`
                                      : null}
                                    {b.limit === null ? (
                                      <Infinity className="h-4 w-4" />
                                    ) : (
                                      `${b.type === "discount" ? " · " : ""}${b.limit}x`
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm">
                                    {b.used}x
                                  </TableCell>
                                  <TableCell
                                    className={`text-sm font-medium ${canApply ? "text-emerald-600" : "text-destructive"}`}
                                  >
                                    {remaining === null ? (
                                      <Infinity className="h-4 w-4" />
                                    ) : (
                                      `${remaining}x`
                                    )}
                                  </TableCell>
                                  <TableCell className="text-xs text-muted-foreground">
                                    {b.period_reset_date ? (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5 shrink-0" />
                                        {formatDate(b.period_reset_date)}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      ) : (
                        <CardContent className="py-6 text-center text-sm text-muted-foreground">
                          Tidak ada benefit tersedia
                        </CardContent>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* All Memberships History */}
        <div>
          <h2 className="font-display font-semibold text-lg mb-3">
            Riwayat Membership
          </h2>
          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Paket</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Mulai</TableHead>
                  <TableHead>Berakhir</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory2 ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : membershipHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-6"
                    >
                      Belum ada riwayat membership
                    </TableCell>
                  </TableRow>
                ) : (
                  membershipHistory.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            h.event_type === "purchased"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : h.event_type === "renewed"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : h.event_type === "updated"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {h.event_type === "purchased"
                            ? "Dibeli"
                            : h.event_type === "renewed"
                              ? "Diperpanjang"
                              : h.event_type === "updated"
                                ? "Diperbarui"
                                : "Dibatalkan"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(h.event_date)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {h.membership.name}
                      </TableCell>
                      <TableCell className="text-sm">
                        {h.purchase_price != null ? (
                          h.purchase_price !== h.membership.price ? (
                            <span>
                              <span className="text-muted-foreground line-through">
                                Rp {h.membership.price.toLocaleString("id-ID")}
                              </span>{" "}
                              <span className="font-medium">
                                Rp {h.purchase_price.toLocaleString("id-ID")}
                              </span>
                            </span>
                          ) : (
                            <span>
                              Rp {h.purchase_price.toLocaleString("id-ID")}
                            </span>
                          )
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(h.start_date)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(h.end_date)}
                      </TableCell>
                      <TableCell
                        className="text-sm text-muted-foreground max-w-[200px] truncate"
                        title={h.note ?? ""}
                      >
                        {h.note || "-"}
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
          <h2 className="font-display font-semibold text-lg mb-3">
            Riwayat Penggunaan Benefit
          </h2>
          <Card className="border-border/50">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Berlaku Untuk</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Tgl Digunakan</TableHead>
                  {/* <TableHead className="text-right">Potongan</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingHistory ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !benefitsHistory?.benefits_history?.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-6"
                    >
                      Belum ada riwayat penggunaan benefit
                    </TableCell>
                  </TableRow>
                ) : (
                  benefitsHistory.benefits_history.map((h) => (
                    <TableRow key={h._id}>
                      <TableCell>
                        <Badge
                          variant={h.type === "quota" ? "secondary" : "outline"}
                          className="text-xs capitalize"
                        >
                          {benefitTypeLabel[h.type] ?? h.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {appliesToLabel[h.applies_to ?? ""] ??
                          h.applies_to ??
                          "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          {h.booking_service && (
                            <span className="text-sm font-medium text-foreground">
                              {h.booking_service}
                            </span>
                          )}
                          {h.booking_date && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(h.booking_date)}
                            </span>
                          )}
                          {/* <span className="font-mono text-[10px] text-muted-foreground/60">{h.booking_id?.slice(-8)}</span> */}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDatetime(h.applied_date)}
                      </TableCell>
                      {/* <TableCell className="text-right text-sm font-medium">
                        {h.amount_deducted > 0
                          ? `- Rp ${h.amount_deducted.toLocaleString("id-ID")}`
                          : <span className="text-muted-foreground">Gratis</span>}
                      </TableCell> */}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      {/* Purchase Dialog */}
      <Dialog
        open={purchaseOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPurchaseOpen(false);
            setSelectedPlanId("");
            setPurchaseStartDate(new Date().toISOString().split("T")[0]);
            setPurchasePrice("");
            setPurchaseNote("");
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display">Beli Membership</DialogTitle>
            <DialogDescription>
              Pilih paket membership untuk{" "}
              <span className="font-medium text-foreground">
                {petName || "Pet"}
              </span>
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handlePurchase}
            className="flex flex-col flex-1 min-h-0 gap-0"
          >
            <div className="flex-1 min-h-0 overflow-y-auto pr-4 -mr-4 flex flex-col gap-4 pb-2">
              {/* Plan Cards */}
              <div className="flex flex-col gap-2">
                <Label>
                  Paket Membership <span className="text-destructive">*</span>
                </Label>
                {availablePlans.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Tidak ada paket tersedia untuk tipe hewan ini
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {availablePlans.map((p) => {
                      const matchedNonCancelled = nonCancelledMemberships.find(
                        (am) => am.membership._id === p._id,
                      );
                      const isActivePlan = !!matchedNonCancelled;
                      const isSelected = selectedPlanId === p._id;
                      return (
                        <button
                          key={p._id}
                          type="button"
                          onClick={() => setSelectedPlanId(p._id)}
                          className={cn(
                            "relative flex items-center justify-between rounded-xl border p-4 text-left transition-all",
                            isSelected
                              ? "border-foreground bg-foreground/5 shadow-sm"
                              : "border-border hover:border-foreground/40 hover:bg-muted/40",
                          )}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-sm">
                              {p.name}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {p.duration_months} bulan
                              {p.description ? ` · ${p.description}` : ""}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {isActivePlan && (
                              <Badge variant="secondary" className="text-xs">
                                {matchedNonCancelled?.status === "active"
                                  ? "Aktif"
                                  : matchedNonCancelled?.status === "pending"
                                    ? "Menunggu"
                                    : "Berakhir"}
                              </Badge>
                            )}
                            <span className="font-bold text-sm">
                              Rp {p.price.toLocaleString("id-ID")}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Start Date & Price Override */}
              {selectedPlanId && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="purchase-start-date">Tanggal Mulai</Label>
                      <Input
                        id="purchase-start-date"
                        type="date"
                        value={purchaseStartDate}
                        onChange={(e) => setPurchaseStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="purchase-price">
                        Harga Override{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (opsional)
                        </span>
                      </Label>
                      <Input
                        id="purchase-price"
                        type="text"
                        inputMode="numeric"
                        placeholder={(() => {
                          const plan = availablePlans.find(
                            (p) => p._id === selectedPlanId,
                          );
                          return plan ? plan.price.toLocaleString("id-ID") : "0";
                        })()}
                        value={
                          purchasePrice
                            ? Number(purchasePrice).toLocaleString("id-ID")
                            : ""
                        }
                        onChange={(e) => {
                          const raw = e.target.value
                            .replace(/\./g, "")
                            .replace(/\D/g, "");
                          setPurchasePrice(raw);
                        }}
                      />
                    </div>
                  </div>
                  {overlapError && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-destructive">{overlapError.message}</p>
                      <p className="text-xs text-muted-foreground">
                        Tersedia mulai:{" "}
                        <button
                          type="button"
                          className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/70 transition-colors"
                          onClick={() => setPurchaseStartDate(overlapError.availableFrom)}
                        >
                          {overlapError.availableFromFormatted}
                        </button>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              {selectedPlanId && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="purchase-note">
                    Catatan{" "}
                    <span className="text-muted-foreground text-xs font-normal">
                      (opsional)
                    </span>
                  </Label>
                  <Textarea
                    id="purchase-note"
                    placeholder="Catatan pembelian, misal: promo ulang tahun, diskon khusus, dll..."
                    rows={2}
                    value={purchaseNote}
                    onChange={(e) => setPurchaseNote(e.target.value)}
                  />
                </div>
              )}

              {/* Selected Plan Details: Benefits + Summary */}
              {(() => {
                const plan = availablePlans.find(
                  (p) => p._id === selectedPlanId,
                );
                if (!plan) return null;
                const startDate = purchaseStartDate
                  ? new Date(purchaseStartDate)
                  : new Date();
                const endDate = addMonths(startDate, plan.duration_months);
                const overridePrice = purchasePrice
                  ? Number(purchasePrice)
                  : null;
                const finalPrice = overridePrice ?? plan.price;
                const hasOverride =
                  overridePrice !== null && overridePrice !== plan.price;
                return (
                  <>
                    {/* Benefits */}
                    {plan.benefits.length > 0 && (
                      <div className="rounded-xl border border-border/60 bg-muted/40 p-4 flex flex-col gap-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Benefit yang Didapat
                        </p>
                        <div className="flex flex-col gap-2">
                          {plan.benefits.map((b) => (
                            <div
                              key={b._id}
                              className="flex items-start gap-2 text-sm"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span className="text-foreground leading-snug">
                                {b.label ? (
                                  b.label
                                ) : b.type === "discount" ? (
                                  <>
                                    Diskon{" "}
                                    <span className="font-semibold">
                                      {b.value ?? 0}%
                                    </span>{" "}
                                    untuk{" "}
                                    {appliesToLabel[b.applies_to] ??
                                      b.applies_to}
                                    {b.service ? ` (${b.service.name})` : ""}
                                    {b.limit !== null &&
                                    b.limit !== undefined ? (
                                      <>
                                        {" "}
                                        — maks{" "}
                                        <span className="font-semibold">
                                          {b.limit}x
                                        </span>
                                      </>
                                    ) : (
                                      ""
                                    )}
                                  </>
                                ) : (
                                  <>
                                    Kuota{" "}
                                    {appliesToLabel[b.applies_to] ??
                                      b.applies_to}
                                    {b.service ? ` (${b.service.name})` : ""}
                                    {b.limit !== null &&
                                    b.limit !== undefined ? (
                                      <>
                                        {" "}
                                        — maks{" "}
                                        <span className="font-semibold">
                                          {b.limit}x
                                        </span>
                                      </>
                                    ) : (
                                      ""
                                    )}
                                  </>
                                )}
                                {b.period !== "unlimited" && (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {periodLabel[b.period] ?? b.period}
                                  </span>
                                )}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Purchase Summary */}
                    <div className="rounded-xl border border-border/60 bg-muted/40 p-4 flex flex-col gap-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Ringkasan Pembelian
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">{plan.name}</span>
                        <div className="flex items-center gap-2">
                          {hasOverride && (
                            <span className="text-sm text-muted-foreground line-through">
                              Rp {plan.price.toLocaleString("id-ID")}
                            </span>
                          )}
                          <span className="text-sm font-semibold">
                            Rp {finalPrice.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Masa Aktif
                        </span>
                        <span className="text-xs font-medium text-foreground">
                          {formatDate(startDate.toISOString())} →{" "}
                          {formatDate(endDate.toISOString())}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">
                          Durasi
                        </span>
                        <span className="text-xs text-foreground">
                          {plan.duration_months} bulan
                        </span>
                      </div>
                      <Separator className="opacity-50" />
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold">Total</span>
                        <span className="text-sm font-bold">
                          Rp {finalPrice.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="pt-4 border-t border-border mt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPurchaseOpen(false);
                  setSelectedPlanId("");
                  setPurchaseStartDate(new Date().toISOString().split("T")[0]);
                  setPurchasePrice("");
                  setPurchaseNote("");
                }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPurchasing || !selectedPlanId || !!overlapError}>
                {isPurchasing ? "Memproses..." : "Beli Sekarang"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Membership Dialog */}
      <Dialog
        open={!!updateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setUpdateTarget(null);
            setUpdateForm(DEFAULT_UPDATE_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Tanggal Membership {updateTarget?.membership.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="update-start-date">Tanggal Mulai</Label>
                <Input
                  id="update-start-date"
                  type="date"
                  value={updateForm.start_date}
                  onChange={(e) =>
                    setUpdateForm((p) => ({ ...p, start_date: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="update-end-date">Tanggal Berakhir</Label>
                <Input
                  id="update-end-date"
                  type="date"
                  value={updateForm.end_date}
                  onChange={(e) =>
                    setUpdateForm((p) => ({ ...p, end_date: e.target.value }))
                  }
                />
              </div>
            </div>
            {updateDateRangeError && (
              <p className="text-xs text-destructive -mt-1">
                {updateDateRangeError}
              </p>
            )}
            {!updateDateRangeError && updateOverlapError && (
              <div className="flex flex-col gap-1 -mt-1">
                <p className="text-xs text-destructive">
                  {updateOverlapError.message}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tersedia mulai:{" "}
                  <button
                    type="button"
                    className="font-medium text-foreground underline underline-offset-2 hover:text-foreground/70 transition-colors"
                    onClick={() =>
                      setUpdateForm((p) => ({
                        ...p,
                        start_date: updateOverlapError.availableFrom,
                      }))
                    }
                  >
                    {updateOverlapError.availableFromFormatted}
                  </button>
                </p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="update-note">
                Catatan{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                id="update-note"
                placeholder="Masukkan catatan perubahan..."
                value={updateForm.note}
                onChange={(e) =>
                  setUpdateForm((p) => ({ ...p, note: e.target.value }))
                }
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setUpdateTarget(null);
                  setUpdateForm(DEFAULT_UPDATE_FORM);
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  isUpdating ||
                  !!updateDateRangeError ||
                  !!updateOverlapError
                }
              >
                {isUpdating ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog
        open={!!renewTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRenewTarget(null);
            setRenewStartDate(new Date().toISOString().split("T")[0]);
            setRenewPrice("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Perpanjang Membership</DialogTitle>
            <DialogDescription>
              Perpanjang membership{" "}
              <span className="font-medium text-foreground">
                {renewTarget?.membership.name}
              </span>
              . Benefit akan direset sesuai dengan periode baru.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenew} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="renew-start-date">Tanggal Mulai</Label>
                <Input
                  id="renew-start-date"
                  type="date"
                  value={renewStartDate}
                  onChange={(e) => setRenewStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="renew-price">
                  Harga Override{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (opsional)
                  </span>
                </Label>
                <Input
                  id="renew-price"
                  type="text"
                  inputMode="numeric"
                  placeholder={
                    renewTarget?.membership.price
                      ? renewTarget.membership.price.toLocaleString("id-ID")
                      : "0"
                  }
                  value={
                    renewPrice
                      ? Number(renewPrice).toLocaleString("id-ID")
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value
                      .replace(/\./g, "")
                      .replace(/\D/g, "");
                    setRenewPrice(raw);
                  }}
                />
              </div>
            </div>
            {renewTarget && renewStartDate && (
              <div className="rounded-xl border border-border/60 bg-muted/40 p-3 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Masa Aktif Baru</span>
                  <span className="text-xs font-medium text-foreground">
                    {formatDate(new Date(renewStartDate).toISOString())} &rarr;{" "}
                    {formatDate(
                      addMonths(
                        new Date(renewStartDate),
                        renewTarget.membership.duration_months,
                      ).toISOString(),
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Durasi</span>
                  <span className="text-xs text-foreground">
                    {renewTarget.membership.duration_months} bulan
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRenewTarget(null);
                  setRenewStartDate(new Date().toISOString().split("T")[0]);
                  setRenewPrice("");
                }}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isRenewing || !renewStartDate}>
                {isRenewing ? "Memproses..." : "Perpanjang"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Membership</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin membatalkan membership ini? Semua benefit tidak akan
              lagi bisa digunakan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleCancel}
            >
              Batalkan Membership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
