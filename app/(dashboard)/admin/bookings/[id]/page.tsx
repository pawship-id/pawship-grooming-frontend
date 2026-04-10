"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Calendar,
  Clock,
  ClipboardList,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  Loader2,
  Truck,
  Gift,
  ImagePlus,
  PawPrint,
  Scissors,
  X,
  Pencil,
  Sparkles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
  getAdminBookingById,
  updateBookingStatus,
  updateBookingSession,
  createBookingSession,
  startBookingSession,
  finishBookingSession,
  deleteBookingSession,
  uploadBookingMedia,
  deleteBookingMedia,
  getBookingPreview,
  getPetBenefitsSummary,
  applyBenefitPreview,
  updateBookingPricing,
} from "@/lib/api/bookings";
import type { AdminBooking, BookingPreviewResult, ApplyBenefitPreviewResult } from "@/lib/api/bookings";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { applyGroomingFrame } from "@/lib/frame-compositor";
import { getStoreById } from "@/lib/api/stores";
import { getUsers } from "@/lib/api/users";
import type { ApiUser } from "@/lib/api/users";

const statusColors: Record<string, string> = {
  requested: "bg-accent/20 text-accent-foreground",
  waitlist: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-secondary/60 text-secondary-foreground",
  "driver on the way": "bg-blue-100 text-blue-700",
  "groomer on the way": "bg-blue-100 text-blue-700",
  arrived: "bg-primary/10 text-primary",
  "in progress": "bg-primary/10 text-primary",
  completed: "bg-secondary/60 text-secondary-foreground",
  rescheduled: "bg-accent/20 text-accent-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const ALL_STATUSES = [
  "requested",
  "waitlist",
  "confirmed",
  "driver on the way",
  "groomer on the way",
  "arrived",
  "in progress",
  "completed",
  "rescheduled",
  "cancelled",
];

const IN_STORE_MAIN_FLOW = [
  "requested",
  "confirmed",
  "arrived",
  "in progress",
  "completed",
];
const IN_STORE_PICKUP_MAIN_FLOW = [
  "requested",
  "confirmed",
  "driver on the way",
  "arrived",
  "in progress",
  "completed",
];
const IN_HOME_MAIN_FLOW = [
  "requested",
  "confirmed",
  "groomer on the way",
  "arrived",
  "in progress",
  "completed",
];

const IN_STORE_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const IN_STORE_PICKUP_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["driver on the way", "rescheduled", "cancelled"],
  "driver on the way": ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const IN_HOME_TRANSITIONS: Record<string, string[]> = {
  waitlist: ["confirmed", "cancelled"],
  requested: ["confirmed", "rescheduled", "cancelled"],
  rescheduled: ["confirmed", "rescheduled", "cancelled"],
  confirmed: ["groomer on the way", "rescheduled", "cancelled"],
  "groomer on the way": ["arrived", "rescheduled", "cancelled"],
  arrived: ["in progress", "rescheduled", "cancelled"],
  "in progress": ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [booking, setBooking] = useState<AdminBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState("");
  const [rescheduledDate, setRescheduledDate] = useState("");
  const [rescheduledTimeRange, setRescheduledTimeRange] = useState("");
  const [storeSessions, setStoreSessions] = useState<string[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Session management state
  const [groomers, setGroomers] = useState<ApiUser[]>([]);
  const [newSessionType, setNewSessionType] = useState("");
  const [newSessionGroomerId, setNewSessionGroomerId] = useState("");
  const [addingSession, setAddingSession] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [confirmingStatus, setConfirmingStatus] = useState(false);

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
  const [assignGroomerValue, setAssignGroomerValue] = useState("");
  const [savingGroomer, setSavingGroomer] = useState(false);

  // Booking-level media upload/delete
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

  // Price edit state
  const [editingPrice, setEditingPrice] = useState(false);
  const [editBenefitIds, setEditBenefitIds] = useState<string[]>([]);
  const [editServicePrice, setEditServicePrice] = useState("");
  const [editServiceDiscount, setEditServiceDiscount] = useState("");
  const [editServiceDiscountType, setEditServiceDiscountType] = useState<"nominal" | "pct">("nominal");
  const [editTravelFee, setEditTravelFee] = useState("");
  const [editTravelFeeDiscount, setEditTravelFeeDiscount] = useState("");
  const [editTravelFeeDiscountType, setEditTravelFeeDiscountType] = useState<"nominal" | "pct">("nominal");
  const [editAddonPrices, setEditAddonPrices] = useState<Record<string, string>>({});
  const [editAddonDiscounts, setEditAddonDiscounts] = useState<Record<string, string>>({});
  const [editAddonDiscountTypes, setEditAddonDiscountTypes] = useState<Record<string, "nominal" | "pct">>({});
  const [pricePreviewData, setPricePreviewData] = useState<BookingPreviewResult | null>(null);
  const [priceApplyResult, setPriceApplyResult] = useState<ApplyBenefitPreviewResult | null>(null);
  const [loadingPricePreview, setLoadingPricePreview] = useState(false);
  const [loadingPriceApply, setLoadingPriceApply] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);

  // ── Price edit: open handler ──────────────────────────────────────────────
  const handleOpenPriceEdit = async () => {
    if (!booking) return;
    setEditBenefitIds(booking.selected_benefit_ids ?? []);
    setEditServicePrice(String(booking.edited_service_price ?? booking.service_snapshot.price ?? ""));
    setEditServiceDiscount(String(booking.edited_service_discount ?? 0));
    setEditTravelFee(booking.pick_up ? String(booking.edited_travel_fee ?? booking.travel_fee ?? "") : "");
    setEditTravelFeeDiscount(booking.pick_up ? String(booking.edited_travel_fee_discount ?? 0) : "0");
    const addonPriceMap: Record<string, string> = {};
    const addonDiscountMap: Record<string, string> = {};
    (booking.service_snapshot.addons ?? []).forEach((addon) => {
      const override = (booking.edited_addon_prices ?? []).find(
        (a) => a.addon_id === addon._id,
      );
      addonPriceMap[addon._id!] = String(override ? override.price : addon.price);
      addonDiscountMap[addon._id!] = String(override?.discount ?? 0);
    });
    setEditAddonPrices(addonPriceMap);
    setEditAddonDiscounts(addonDiscountMap);
    setEditServiceDiscountType("nominal");
    setEditTravelFeeDiscountType("nominal");
    const addonDiscTypeMap: Record<string, "nominal" | "pct"> = {};
    (booking.service_snapshot.addons ?? []).forEach((addon) => {
      addonDiscTypeMap[addon._id!] = "nominal";
    });
    setEditAddonDiscountTypes(addonDiscTypeMap);
    setPricePreviewData(null);
    setPriceApplyResult(null);
    setEditingPrice(true);
    setLoadingPricePreview(true);
    try {
      const addonIds = (booking.service_addon_ids ?? []).filter(Boolean);
      const res = await getBookingPreview({
        pet_id: booking.pet_id,
        service_id: booking.service_snapshot._id!,
        addon_ids: addonIds.length > 0 ? addonIds : undefined,
        date: new Date().toISOString().split("T")[0],
        pick_up: booking.pick_up || undefined,
        store_id: booking.pick_up ? booking.store_id : undefined,
        customer_id: booking.pick_up ? booking.customer_id : undefined,
      });
      setPricePreviewData(res);
    } catch {
      // Fallback: getBookingPreview can fail if service/addon was soft-deleted or
      // if pet attributes no longer match the price matrix. Fetch benefits directly.
      try {
        const summary = await getPetBenefitsSummary(booking.pet_id);
        const addonIdSet = new Set(booking.service_addon_ids ?? []);
        const addonsTotal = (booking.service_snapshot.addons ?? []).reduce(
          (sum, a) => sum + (a.price ?? 0), 0,
        );
        const allBenefits = (summary.data ?? []).flatMap((m) => m.benefits);
        const available_benefits = allBenefits
          .filter((b) => {
            if (b.applies_to === "service")
              return !b.service_id || b.service_id === booking.service_snapshot._id;
            if (b.applies_to === "addon")
              return (
                (booking.service_addon_ids ?? []).length > 0 &&
                (!b.service_id || addonIdSet.has(b.service_id))
              );
            if (b.applies_to === "pickup") return booking.pick_up === true;
            return false;
          })
          .map((b) => {
            let discountBase = 0;
            if (b.applies_to === "service") {
              discountBase = booking.service_snapshot.price ?? 0;
            } else if (b.applies_to === "addon") {
              if (b.service_id) {
                const addonSnap = (booking.service_snapshot.addons ?? []).find(
                  (a) => a._id === b.service_id,
                );
                discountBase = addonSnap?.price ?? 0;
              } else {
                discountBase = addonsTotal;
              }
            } else if (b.applies_to === "pickup") {
              discountBase = booking.travel_fee ?? 0;
            }
            const amount_discount = b.can_apply
              ? b.type === "discount"
                ? ((b.value ?? 0) / 100) * discountBase
                : discountBase
              : 0;
            return { ...b, description: b.label ?? b.applies_to, amount_discount };
          });
        setPricePreviewData({
          pet_id: booking.pet_id,
          pet_name: booking.pet_snapshot?.name ?? "",
          service_id: booking.service_snapshot._id ?? "",
          service_name: booking.service_snapshot.name ?? "",
          pricing: {
            original_service_price: booking.service_snapshot.price ?? 0,
            addon_prices: (booking.service_snapshot.addons ?? []).map((a) => ({
              _id: a._id!,
              name: a.name,
              price: a.price,
            })),
            subtotal_before_benefits: booking.original_total_price ?? 0,
            has_active_membership: allBenefits.length > 0,
            available_benefits: available_benefits as any,
            estimated_total_discount: available_benefits
              .filter((b) => b.can_apply && b.type === "discount")
              .reduce((sum, b) => sum + (b.amount_discount ?? 0), 0),
            estimated_final_price: booking.original_total_price ?? 0,
          },
          pricing_breakdown: {
            service: {
              name: booking.service_snapshot.name,
              price: booking.service_snapshot.price ?? 0,
            },
            addons: (booking.service_snapshot.addons ?? []).map((a) => ({
              _id: a._id!,
              name: a.name,
              price: a.price,
            })),
            travel_fee: booking.travel_fee,
            subtotal: booking.original_total_price ?? 0,
            grand_total: booking.original_total_price ?? 0,
            discount: 0,
            final: booking.original_total_price ?? 0,
          },
        } as any);
      } catch {
        // Benefits genuinely unavailable
      }
    } finally {
      setLoadingPricePreview(false);
    }
  };

  const handleClosePriceEdit = () => {
    setEditingPrice(false);
    setPricePreviewData(null);
    setPriceApplyResult(null);
    setEditBenefitIds([]);
    setEditServicePrice("");
    setEditServiceDiscount("");
    setEditServiceDiscountType("nominal");
    setEditTravelFee("");
    setEditTravelFeeDiscount("");
    setEditTravelFeeDiscountType("nominal");
    setEditAddonPrices({});
    setEditAddonDiscounts({});
    setEditAddonDiscountTypes({});
  };

  // ── Price edit: benefit toggle (conflict resolution as in new booking) ────
  const toggleEditBenefit = (benefitId: string) => {
    if (!pricePreviewData) {
      setEditBenefitIds((prev) =>
        prev.includes(benefitId) ? prev.filter((b) => b !== benefitId) : [...prev, benefitId],
      );
      return;
    }
    const benefit = pricePreviewData.pricing.available_benefits.find(
      (x: any) => x._id === benefitId,
    );
    if (!benefit) {
      setEditBenefitIds((prev) =>
        prev.includes(benefitId) ? prev.filter((b) => b !== benefitId) : [...prev, benefitId],
      );
      return;
    }
    setEditBenefitIds((prev) => {
      if (prev.includes(benefitId)) return prev.filter((b) => b !== benefitId);
      const addonIds = booking?.service_addon_ids ?? [];
      const conflicts = prev.filter((selId) => {
        const sel = pricePreviewData.pricing.available_benefits.find(
          (x: any) => x._id === selId,
        );
        if (!sel || sel.applies_to !== benefit.applies_to) return false;
        if (benefit.type === sel.type) return false;
        if (benefit.applies_to === "service") {
          const quotaTarget    = (benefit.type === "quota"    ? benefit : sel).service_id || booking?.service_snapshot._id;
          const discountTarget = (benefit.type === "discount" ? benefit : sel).service_id || booking?.service_snapshot._id;
          return quotaTarget === discountTarget;
        }
        if (benefit.applies_to === "addon") {
          const quotaBenefit    = benefit.type === "quota"    ? benefit : sel;
          const discountBenefit = benefit.type === "discount" ? benefit : sel;
          const quotaTarget    = quotaBenefit.service_id;
          const discountTarget = discountBenefit.service_id;
          if (quotaTarget && discountTarget) return quotaTarget === discountTarget;
          if (quotaTarget && !discountTarget) {
            const alreadyCovered = prev
              .filter((sid) => sid !== benefitId)
              .map((sid) => pricePreviewData.pricing.available_benefits.find((x: any) => x._id === sid))
              .filter((x: any) => x?.type === "quota" && x.applies_to === "addon" && x.service_id)
              .map((x: any) => x.service_id);
            const coveredAfter = new Set([...alreadyCovered, quotaTarget]);
            return addonIds.length > 0 && addonIds.every((aid) => coveredAfter.has(aid));
          }
          if (!quotaTarget && discountTarget) return true;
          return true;
        }
        return false;
      });
      return [...prev.filter((b) => !conflicts.includes(b)), benefitId];
    });
  };

  // ── Price edit: auto-fetch apply-benefit preview ──────────────────────────
  useEffect(() => {
    if (!editingPrice || !booking) return;
    if (editBenefitIds.length === 0) {
      setPriceApplyResult(null);
      setLoadingPriceApply(false);
      return;
    }
    // Compute effective subtotal (base prices minus item discounts) for benefit calculation
    const svcBase = parseFloat(editServicePrice) || booking.service_snapshot.price || 0;
    const rawSvcDisc = parseFloat(editServiceDiscount) || 0;
    const svcDisc = editServiceDiscountType === "pct" ? Math.min(svcBase, (rawSvcDisc / 100) * svcBase) : Math.min(svcBase, rawSvcDisc);
    const tFeeBase = booking.pick_up ? (parseFloat(editTravelFee) || booking.travel_fee || 0) : 0;
    const rawTFeeDisc = booking.pick_up ? (parseFloat(editTravelFeeDiscount) || 0) : 0;
    const tFeeDisc = editTravelFeeDiscountType === "pct" ? Math.min(tFeeBase, (rawTFeeDisc / 100) * tFeeBase) : Math.min(tFeeBase, rawTFeeDisc);
    const addonTotal = (booking.service_snapshot.addons ?? []).reduce((sum, addon) => {
      const base = parseFloat(editAddonPrices[addon._id!] ?? String(addon.price)) || addon.price || 0;
      const rawDisc = parseFloat(editAddonDiscounts[addon._id!] ?? "0") || 0;
      const discType = editAddonDiscountTypes[addon._id!] ?? "nominal";
      const disc = discType === "pct" ? Math.min(base, (rawDisc / 100) * base) : Math.min(base, rawDisc);
      return sum + Math.max(0, base - disc);
    }, 0);
    const editedSubtotal = Math.max(0, svcBase - svcDisc) + Math.max(0, tFeeBase - tFeeDisc) + addonTotal;

    let cancelled = false;
    setLoadingPriceApply(true);
    applyBenefitPreview({
      pet_id: booking.pet_id,
      selected_benefit_ids: editBenefitIds,
      service_id: booking.service_snapshot._id,
      add_on_ids: (booking.service_addon_ids ?? []).length > 0 ? booking.service_addon_ids : undefined,
      store_id: booking.pick_up ? booking.store_id : undefined,
      original_total_price: editedSubtotal,
      booking_date: booking.date,
    })
      .then((res) => { if (!cancelled) setPriceApplyResult(res); })
      .catch(() => { if (!cancelled) setPriceApplyResult(null); })
      .finally(() => { if (!cancelled) setLoadingPriceApply(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editBenefitIds, editServicePrice, editServiceDiscount, editServiceDiscountType, editTravelFee, editTravelFeeDiscount, editTravelFeeDiscountType, editAddonPrices, editAddonDiscounts, editAddonDiscountTypes, editingPrice]);

  // ── Price edit: save ──────────────────────────────────────────────────────
  const handleSavePricing = async () => {
    if (!booking) return;
    setSavingPrice(true);
    try {
      const svcPriceNum = parseFloat(editServicePrice);
      const svcBase = !isNaN(svcPriceNum) ? svcPriceNum : (booking.service_snapshot.price || 0);
      const rawSvcDisc = parseFloat(editServiceDiscount) || 0;
      const svcDiscNominal = editServiceDiscountType === "pct" ? Math.min(svcBase, (rawSvcDisc / 100) * svcBase) : Math.min(svcBase, rawSvcDisc);

      const tFeeNum = parseFloat(editTravelFee);
      const tFeeBase = !isNaN(tFeeNum) ? tFeeNum : (booking.travel_fee || 0);
      const rawTFeeDisc = parseFloat(editTravelFeeDiscount) || 0;
      const tFeeDiscNominal = editTravelFeeDiscountType === "pct" ? Math.min(tFeeBase, (rawTFeeDisc / 100) * tFeeBase) : Math.min(tFeeBase, rawTFeeDisc);

      const addonPricesPayload = (booking.service_snapshot.addons ?? []).map((addon) => {
        const base = parseFloat(editAddonPrices[addon._id!] ?? String(addon.price)) || addon.price || 0;
        const rawDisc = parseFloat(editAddonDiscounts[addon._id!] ?? "0") || 0;
        const discType = editAddonDiscountTypes[addon._id!] ?? "nominal";
        const discNominal = discType === "pct" ? Math.min(base, (rawDisc / 100) * base) : Math.min(base, rawDisc);
        return { addon_id: addon._id!, price: base, discount: discNominal };
      });
      await updateBookingPricing(id, {
        selected_benefit_ids: editBenefitIds,
        service_price: !isNaN(svcPriceNum) ? svcPriceNum : undefined,
        service_discount: svcDiscNominal > 0 ? svcDiscNominal : undefined,
        travel_fee: booking.pick_up && !isNaN(tFeeNum) ? tFeeNum : undefined,
        travel_fee_discount: booking.pick_up && tFeeDiscNominal > 0 ? tFeeDiscNominal : undefined,
        addon_prices: addonPricesPayload.length > 0 ? addonPricesPayload : undefined,
      });
      await refreshBooking();
      handleClosePriceEdit();
      toast.success("Harga booking berhasil diperbarui");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui harga");
    } finally {
      setSavingPrice(false);
    }
  };

  useEffect(() => {
    Promise.all([
      getAdminBookingById(id),
      getUsers({ page: 1, limit: 200, role: "groomer" }),
    ])
      .then(([bookingRes, groomersRes]) => {
        const b = bookingRes.booking;
        setBooking(b);
        setSelectedStatus("");
        setGroomers(groomersRes.users);
        if (b.store_id) {
          getStoreById(b.store_id)
            .then((storeRes) => setStoreSessions(storeRes.store.sessions ?? []))
            .catch(() => {});
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const refreshBooking = async () => {
    const res = await getAdminBookingById(id);
    setBooking(res.booking);
    setSelectedStatus("");
  };

  const statusChanged = selectedStatus !== "";
  const isRescheduled = selectedStatus === "rescheduled";

  const handleSaveStatus = async () => {
    if (!booking) return;
    if (isRescheduled && (!rescheduledDate || !rescheduledTimeRange)) {
      toast.error(
        "Tanggal dan sesi waktu wajib diisi untuk status rescheduled",
      );
      return;
    }
    setUpdatingStatus(true);
    try {
      await updateBookingStatus(id, {
        status: selectedStatus,
        ...(isRescheduled
          ? { date: rescheduledDate, time_range: rescheduledTimeRange }
          : {}),
      });
      await refreshBooking();
      setRescheduledDate("");
      setRescheduledTimeRange("");
      toast.success(`Status diperbarui: ${selectedStatus}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui status",
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleAddSession = async () => {
    if (!newSessionType.trim() || !newSessionGroomerId) {
      toast.error("Isi tipe sesi dan pilih groomer");
      return;
    }
    setAddingSession(true);
    try {
      await createBookingSession(id, {
        type: newSessionType.trim(),
        groomer_id: newSessionGroomerId,
      });
      await refreshBooking();
      setNewSessionType("");
      setNewSessionGroomerId("");
      toast.success("Sesi berhasil ditambahkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambah sesi");
    } finally {
      setAddingSession(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      await startBookingSession(id, sessionId);
      await refreshBooking();
      toast.success("Sesi dimulai");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulai sesi");
    }
  };

  const handleFinishSession = async (sessionId: string) => {
    try {
      await finishBookingSession(id, sessionId, {});
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
      await deleteBookingSession(id, sessionId);
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
      await updateBookingSession(id, assignGroomerSessionId, {
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

  const handleUploadBookingMedia = async (
    file: File,
    type: "before" | "after",
  ) => {
    setUploadingMediaType(type);
    try {
      const framedFile = await applyGroomingFrame(file, type);
      await uploadBookingMedia(id, framedFile, type);
      await refreshBooking();
      toast.success(`Foto ${type} berhasil diupload`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengupload foto");
    } finally {
      setUploadingMediaType(null);
    }
  };

  const handleDeleteBookingMedia = async (mediaId: string) => {
    setDeletingBookingMediaId(mediaId);
    try {
      await deleteBookingMedia(id, mediaId);
      await refreshBooking();
      toast.success("Foto berhasil dihapus");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus foto");
    } finally {
      setDeletingBookingMediaId(null);
      setConfirmDeleteMediaId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!editingNoteSessionId) return;
    setSavingNotes(true);
    try {
      await updateBookingSession(id, editingNoteSessionId, {
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

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Booking tidak ditemukan</p>
        <Button asChild variant="outline">
          <Link href="/admin/bookings">Kembali ke Bookings</Link>
        </Button>
      </div>
    );
  }

  const isInHome = booking.type === "in home";
  const isInStorePickup = !isInHome && booking.pick_up === true;
  const MAIN_FLOW = isInHome
    ? IN_HOME_MAIN_FLOW
    : isInStorePickup
      ? IN_STORE_PICKUP_MAIN_FLOW
      : IN_STORE_MAIN_FLOW;
  const ALLOWED_TRANSITIONS = isInHome
    ? IN_HOME_TRANSITIONS
    : isInStorePickup
      ? IN_STORE_PICKUP_TRANSITIONS
      : IN_STORE_TRANSITIONS;
  const allowedNextStatuses = ALLOWED_TRANSITIONS[booking.booking_status] ?? [];
  const hasInProgressSession = booking.sessions.some(
    (s) => s.status === "in progress",
  );
  const allSessionsFinished =
    booking.sessions.length === 0 ||
    booking.sessions.every((s) => s.status === "finished");
  const canComplete = selectedStatus !== "completed" || allSessionsFinished;

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/bookings"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Booking #{booking._id.slice(-6).toUpperCase()}
              </h1>
              <p className="text-sm text-muted-foreground">
                Dibuat {formatDateTime(booking.createdAt)}
              </p>
            </div>
          </div>
          {/* <Badge className={`${statusColors[booking.booking_status] ?? "bg-muted text-muted-foreground"} px-3 py-1.5 text-sm capitalize`}>
          {booking.booking_status}
        </Badge> */}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Status Booking */}
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                Status Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              {/* Status stepper */}
              <div className="flex items-center overflow-x-auto p-1">
                {MAIN_FLOW.map((status, idx) => {
                  const currentMainIdx = MAIN_FLOW.indexOf(
                    booking.booking_status,
                  );
                  const isReached = currentMainIdx >= idx;
                  return (
                    <div key={status} className="flex items-center">
                      <div
                        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize
                        ${isReached ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground"}
                      `}
                      >
                        {isReached &&
                          (booking.booking_status === "in progress" &&
                          status === "in progress" ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <CheckCircle className="h-3 w-3" />
                          ))}
                        {status}
                      </div>
                      {idx < MAIN_FLOW.length - 1 && (
                        <div
                          className={`mx-1.5 h-px w-6 shrink-0 ${isReached && currentMainIdx > idx ? "bg-primary" : "bg-border/50"}`}
                        />
                      )}
                    </div>
                  );
                })}
                {(booking.booking_status === "cancelled" ||
                  booking.booking_status === "rescheduled" ||
                  booking.booking_status === "waitlist") && (
                  <>
                    <div className="mx-2 h-px w-4 shrink-0 bg-border/50" />
                    <div
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium capitalize ring-1
                      ${booking.booking_status === "cancelled" ? "bg-destructive/10 text-destructive ring-destructive/30" : booking.booking_status === "waitlist" ? "bg-yellow-100 text-yellow-800 ring-yellow-300" : "bg-accent/20 text-accent-foreground ring-accent/30"}
                    `}
                    >
                      {booking.booking_status}
                    </div>
                  </>
                )}
              </div>

              {/* Update status form */}
              <div className="flex flex-col gap-3 rounded-lg border border-border/50 bg-muted/30 p-4">
                <p className="text-sm font-medium text-foreground">
                  Ubah Status
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Status baru
                    </Label>
                    <Select
                      value={selectedStatus}
                      onValueChange={setSelectedStatus}
                      disabled={
                        updatingStatus || allowedNextStatuses.length === 0
                      }
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Pilih status baru..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNextStatuses.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {allowedNextStatuses.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Status tidak dapat diubah lagi.
                      </p>
                    )}
                  </div>
                  {isRescheduled && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Tanggal baru
                        </Label>
                        <Input
                          type="date"
                          className="h-9 w-[160px] text-sm"
                          value={rescheduledDate}
                          onChange={(e) => setRescheduledDate(e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-xs text-muted-foreground">
                          Sesi baru
                        </Label>
                        {storeSessions.length > 0 ? (
                          <Select
                            value={rescheduledTimeRange}
                            onValueChange={setRescheduledTimeRange}
                          >
                            <SelectTrigger className="h-9 w-[160px] text-sm">
                              <SelectValue placeholder="Pilih sesi" />
                            </SelectTrigger>
                            <SelectContent>
                              {storeSessions.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            className="h-9 w-[160px] text-sm"
                            placeholder="mis. 08:00 - 10:00"
                            value={rescheduledTimeRange}
                            onChange={(e) =>
                              setRescheduledTimeRange(e.target.value)
                            }
                          />
                        )}
                      </div>
                    </>
                  )}
                  <Button
                    onClick={() => setConfirmingStatus(true)}
                    disabled={updatingStatus || !statusChanged || !canComplete}
                    size="sm"
                  >
                    Simpan Status
                  </Button>
                </div>
                {selectedStatus === "completed" && !allSessionsFinished && (
                  <p className="text-xs text-destructive">
                    Semua sesi grooming harus selesai sebelum status dapat
                    diubah menjadi completed.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                Detail Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-muted-foreground">Tanggal</span>
                  <p className="font-medium text-foreground">
                    {formatDate(booking.date)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Waktu</span>
                  <p className="font-medium text-foreground">
                    {booking.time_range}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Tipe</span>
                  <p className="font-medium capitalize text-foreground">
                    {booking.type}
                  </p>
                </div>
                {booking.store && (
                  <div>
                    <span className="text-xs text-muted-foreground">Store</span>
                    <p className="font-medium text-foreground">
                      {booking.store.name}
                    </p>
                  </div>
                )}
              </div>

              {/* ── Edit Harga Panel ── */}
              {editingPrice && (
                <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">

                  {/* Per-item price overrides */}
                  <div>
                    <p className="mb-3 text-sm font-semibold">Harga per Item</p>
                    <div className="flex flex-col gap-2">
                      {/* Service */}
                      {(() => {
                        const svcBase = parseFloat(editServicePrice) || booking.service_snapshot.price || 0;
                        const rawDisc = parseFloat(editServiceDiscount) || 0;
                        const svcDiscNominal = editServiceDiscountType === "pct" ? Math.min(svcBase, (rawDisc / 100) * svcBase) : Math.min(svcBase, rawDisc);
                        const svcEff = Math.max(0, svcBase - svcDiscNominal);
                        return (
                          <div className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-card p-3">
                            <span className="text-sm font-medium text-foreground">
                              {booking.service_snapshot.name}
                            </span>
                            <div className="flex items-end gap-2">
                              <div className="flex flex-1 flex-col gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Harga Dasar</span>
                                <Input
                                  type="number" min={0}
                                  className="h-8 bg-background"
                                  placeholder="Harga dasar"
                                  value={editServicePrice}
                                  onChange={(e) => setEditServicePrice(e.target.value)}
                                />
                              </div>
                              <span className="mb-1.5 shrink-0 text-sm text-muted-foreground">−</span>
                              <div className="flex flex-1 flex-col gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Diskon Item</span>
                                <div className="flex gap-1">
                                  <Input
                                    type="number" min={0} max={editServiceDiscountType === "pct" ? 100 : undefined}
                                    className="h-8 min-w-0 flex-1 bg-background"
                                    placeholder={editServiceDiscountType === "pct" ? "0–100" : "0"}
                                    value={editServiceDiscount}
                                    onChange={(e) => setEditServiceDiscount(e.target.value)}
                                  />
                                  <div className="flex h-8 shrink-0 overflow-hidden rounded-md border border-border">
                                    <button type="button" onClick={() => { setEditServiceDiscountType("nominal"); setEditServiceDiscount(""); }}
                                      className={`px-1.5 text-xs font-semibold transition-colors ${editServiceDiscountType === "nominal" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                                      Rp
                                    </button>
                                    <button type="button" onClick={() => { setEditServiceDiscountType("pct"); setEditServiceDiscount(""); }}
                                      className={`border-l border-border px-1.5 text-xs font-semibold transition-colors ${editServiceDiscountType === "pct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                                      %
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <span className="mb-1.5 shrink-0 text-sm text-muted-foreground">=</span>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Efektif</span>
                                <span className="mb-0.5 text-sm font-semibold text-primary">{formatPrice(svcEff)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {/* Addons */}
                      {(booking.service_snapshot.addons ?? []).map((addon) => {
                        const addonBase = parseFloat(editAddonPrices[addon._id!] ?? String(addon.price)) || addon.price || 0;
                        const rawDisc = parseFloat(editAddonDiscounts[addon._id!] ?? "0") || 0;
                        const discType = editAddonDiscountTypes[addon._id!] ?? "nominal";
                        const addonDiscNominal = discType === "pct" ? Math.min(addonBase, (rawDisc / 100) * addonBase) : Math.min(addonBase, rawDisc);
                        const addonEff = Math.max(0, addonBase - addonDiscNominal);
                        return (
                          <div key={addon._id} className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-card p-3">
                            <span className="text-sm font-medium text-foreground">+ {addon.name}</span>
                            <div className="flex items-end gap-2">
                              <div className="flex flex-1 flex-col gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Harga Dasar</span>
                                <Input
                                  type="number" min={0}
                                  className="h-8 bg-background"
                                  placeholder="Harga dasar"
                                  value={editAddonPrices[addon._id!] ?? String(addon.price)}
                                  onChange={(e) =>
                                    setEditAddonPrices((prev) => ({ ...prev, [addon._id!]: e.target.value }))
                                  }
                                />
                              </div>
                              <span className="mb-1.5 shrink-0 text-sm text-muted-foreground">−</span>
                              <div className="flex flex-1 flex-col gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Diskon Item</span>
                                <div className="flex gap-1">
                                  <Input
                                    type="number" min={0} max={discType === "pct" ? 100 : undefined}
                                    className="h-8 min-w-0 flex-1 bg-background"
                                    placeholder={discType === "pct" ? "0–100" : "0"}
                                    value={editAddonDiscounts[addon._id!] ?? ""}
                                    onChange={(e) =>
                                      setEditAddonDiscounts((prev) => ({ ...prev, [addon._id!]: e.target.value }))
                                    }
                                  />
                                  <div className="flex h-8 shrink-0 overflow-hidden rounded-md border border-border">
                                    <button type="button" onClick={() => { setEditAddonDiscountTypes((prev) => ({ ...prev, [addon._id!]: "nominal" })); setEditAddonDiscounts((prev) => ({ ...prev, [addon._id!]: "" })); }}
                                      className={`px-1.5 text-xs font-semibold transition-colors ${discType === "nominal" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                                      Rp
                                    </button>
                                    <button type="button" onClick={() => { setEditAddonDiscountTypes((prev) => ({ ...prev, [addon._id!]: "pct" })); setEditAddonDiscounts((prev) => ({ ...prev, [addon._id!]: "" })); }}
                                      className={`border-l border-border px-1.5 text-xs font-semibold transition-colors ${discType === "pct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                                      %
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <span className="mb-1.5 shrink-0 text-sm text-muted-foreground">=</span>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Efektif</span>
                                <span className="mb-0.5 text-sm font-semibold text-primary">{formatPrice(addonEff)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {/* Travel fee */}
                      {booking.pick_up && (() => {
                        const tFeeBase = parseFloat(editTravelFee) || booking.travel_fee || 0;
                        const rawDisc = parseFloat(editTravelFeeDiscount) || 0;
                        const tFeeDiscNominal = editTravelFeeDiscountType === "pct" ? Math.min(tFeeBase, (rawDisc / 100) * tFeeBase) : Math.min(tFeeBase, rawDisc);
                        const tFeeEff = Math.max(0, tFeeBase - tFeeDiscNominal);
                        return (
                          <div className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-card p-3">
                            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              Biaya Pickup
                            </span>
                            <div className="flex items-end gap-2">
                              <div className="flex flex-1 flex-col gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Harga Dasar</span>
                                <Input
                                  type="number" min={0}
                                  className="h-8 bg-background"
                                  placeholder="Harga dasar"
                                  value={editTravelFee}
                                  onChange={(e) => setEditTravelFee(e.target.value)}
                                />
                              </div>
                              <span className="mb-1.5 shrink-0 text-sm text-muted-foreground">−</span>
                              <div className="flex flex-1 flex-col gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Diskon Item</span>
                                <div className="flex gap-1">
                                  <Input
                                    type="number" min={0} max={editTravelFeeDiscountType === "pct" ? 100 : undefined}
                                    className="h-8 min-w-0 flex-1 bg-background"
                                    placeholder={editTravelFeeDiscountType === "pct" ? "0–100" : "0"}
                                    value={editTravelFeeDiscount}
                                    onChange={(e) => setEditTravelFeeDiscount(e.target.value)}
                                  />
                                  <div className="flex h-8 shrink-0 overflow-hidden rounded-md border border-border">
                                    <button type="button" onClick={() => { setEditTravelFeeDiscountType("nominal"); setEditTravelFeeDiscount(""); }}
                                      className={`px-1.5 text-xs font-semibold transition-colors ${editTravelFeeDiscountType === "nominal" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                                      Rp
                                    </button>
                                    <button type="button" onClick={() => { setEditTravelFeeDiscountType("pct"); setEditTravelFeeDiscount(""); }}
                                      className={`border-l border-border px-1.5 text-xs font-semibold transition-colors ${editTravelFeeDiscountType === "pct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}>
                                      %
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <span className="mb-1.5 shrink-0 text-sm text-muted-foreground">=</span>
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Efektif</span>
                                <span className="mb-0.5 text-sm font-semibold text-primary">{formatPrice(tFeeEff)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Benefit Membership */}
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Benefit Membership
                    </p>
                    {loadingPricePreview ? (
                      <div className="flex flex-col gap-2">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="h-14 animate-pulse rounded-lg bg-muted/60"
                          />
                        ))}
                      </div>
                    ) : pricePreviewData?.pricing?.available_benefits?.length ? (
                      <div className="flex flex-col gap-2">
                        {pricePreviewData.pricing.available_benefits.map((benefit) => {
                          const isSelected = editBenefitIds.includes(benefit._id);
                          const isQuotaBenefit = benefit.type === "quota";
                          const canApply = benefit.can_apply;
                          const addonIds = booking?.service_addon_ids ?? [];
                          const available = pricePreviewData.pricing.available_benefits;
                          const blockedByQuota = canApply && benefit.type === "discount" && !isSelected && (() => {
                            if (benefit.applies_to === "service") {
                              const discountTarget = (benefit as any).service_id || booking?.service_snapshot._id;
                              return available.some(
                                (x: any) => editBenefitIds.includes(x._id) && x.type === "quota" &&
                                  x.applies_to === "service" &&
                                  (x.service_id === discountTarget || !x.service_id),
                              );
                            }
                            if (benefit.applies_to === "addon") {
                              const selectedQuotas = available.filter(
                                (x: any) => editBenefitIds.includes(x._id) && x.type === "quota" && x.applies_to === "addon",
                              );
                              if ((benefit as any).service_id) {
                                return selectedQuotas.some(
                                  (x: any) => !x.service_id || x.service_id === (benefit as any).service_id,
                                );
                              } else {
                                if (addonIds.length === 0) return false;
                                if (selectedQuotas.some((x: any) => !x.service_id)) return true;
                                const coveredIds = new Set(selectedQuotas.filter((x: any) => x.service_id).map((x: any) => x.service_id));
                                return addonIds.every((id) => coveredIds.has(id));
                              }
                            }
                            return false;
                          })();
                          const isDisabled = !canApply || blockedByQuota;
                          return (
                            <label
                              key={benefit._id}
                              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : isDisabled
                                    ? "cursor-not-allowed border-border/30 bg-muted/30 opacity-60"
                                    : "border-border/50 bg-card hover:border-primary/40"
                              }`}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => !isDisabled && toggleEditBenefit(benefit._id)}
                                disabled={isDisabled && !isSelected}
                                className="mt-0.5 shrink-0"
                              />
                              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {benefit.label || benefit.description}
                                  </span>
                                  <span
                                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                      isQuotaBenefit
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                        : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                    }`}
                                  >
                                    {isQuotaBenefit
                                      ? "Quota gratis"
                                      : benefit.value != null
                                        ? `${benefit.value}% off`
                                        : "Diskon"}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                  <span>{benefit.description}</span>
                                  {benefit.remaining !== null && (
                                    <span className={benefit.remaining === 0 ? "text-destructive" : ""}>
                                      Sisa: {benefit.remaining}/{benefit.limit ?? "∞"}
                                    </span>
                                  )}
                                  {benefit.amount_discount != null && benefit.amount_discount > 0 && (
                                    <span className="font-medium text-green-600">
                                      -{formatPrice(benefit.amount_discount)}
                                    </span>
                                  )}
                                </div>
                                {!benefit.can_apply && !isSelected && (
                                  <span className="text-[11px] text-destructive">Tidak dapat digunakan saat ini</span>
                                )}
                                {blockedByQuota && (
                                  <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                    Tidak dapat digabung — sudah ada benefit kuota
                                  </span>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Tidak ada benefit membership yang tersedia.
                      </p>
                    )}
                  </div>

                  {/* Live Preview */}
                  {(() => {
                    const svcBase = parseFloat(editServicePrice) || booking.service_snapshot.price || 0;
                    const rawSvcDisc = parseFloat(editServiceDiscount) || 0;
                    const svcDisc = editServiceDiscountType === "pct" ? Math.min(svcBase, (rawSvcDisc / 100) * svcBase) : Math.min(svcBase, rawSvcDisc);
                    const tFeeBase = booking.pick_up ? (parseFloat(editTravelFee) || booking.travel_fee || 0) : 0;
                    const rawTFeeDisc = booking.pick_up ? (parseFloat(editTravelFeeDiscount) || 0) : 0;
                    const tFeeDisc = editTravelFeeDiscountType === "pct" ? Math.min(tFeeBase, (rawTFeeDisc / 100) * tFeeBase) : Math.min(tFeeBase, rawTFeeDisc);
                    const addonBase = (booking.service_snapshot.addons ?? []).reduce((sum, addon) => {
                      return sum + (parseFloat(editAddonPrices[addon._id!] ?? String(addon.price)) || addon.price || 0);
                    }, 0);
                    const addonItemDisc = (booking.service_snapshot.addons ?? []).reduce((sum, addon) => {
                      const base = parseFloat(editAddonPrices[addon._id!] ?? String(addon.price)) || addon.price || 0;
                      const rawDisc = parseFloat(editAddonDiscounts[addon._id!] ?? "0") || 0;
                      const discType = editAddonDiscountTypes[addon._id!] ?? "nominal";
                      return sum + (discType === "pct" ? Math.min(base, (rawDisc / 100) * base) : Math.min(base, rawDisc));
                    }, 0);
                    const originalTotal = svcBase + tFeeBase + addonBase;
                    const itemDiscountTotal = svcDisc + tFeeDisc + addonItemDisc;
                    const effectiveSubtotal = Math.max(0, originalTotal - itemDiscountTotal);
                    const benefitDiscount = priceApplyResult?.total_discount ?? 0;
                    const previewTotal = Math.max(0, effectiveSubtotal - benefitDiscount);
                    return (
                      <div className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/50 bg-card">
                        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="text-muted-foreground">Subtotal Harga Dasar</span>
                          <span className="font-medium">{formatPrice(originalTotal)}</span>
                        </div>
                        {itemDiscountTotal > 0 && (
                          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <span className="text-orange-600 dark:text-orange-400">Diskon Item</span>
                            <span className="font-medium text-orange-600 dark:text-orange-400">
                              - {formatPrice(itemDiscountTotal)}
                            </span>
                          </div>
                        )}
                        {itemDiscountTotal > 0 && (
                          <div className="flex items-center justify-between px-4 py-2.5 text-sm font-semibold">
                            <span>Subtotal Setelah Diskon</span>
                            <span>{formatPrice(effectiveSubtotal)}</span>
                          </div>
                        )}
                        {(editBenefitIds.length > 0) && (loadingPriceApply || benefitDiscount > 0) && (
                          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <span className="flex items-center gap-1.5 text-green-600">
                              <Gift className="h-3.5 w-3.5" />
                              Diskon Benefit
                            </span>
                            {loadingPriceApply ? (
                              <span className="h-4 w-20 animate-pulse rounded bg-primary/20" />
                            ) : (
                              <span className="font-medium text-green-600">
                                - {formatPrice(benefitDiscount)}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex items-center justify-between bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
                          <span>Total Baru</span>
                          {loadingPriceApply && editBenefitIds.length > 0 ? (
                            <span className="h-5 w-24 animate-pulse rounded bg-primary/20" />
                          ) : (
                            <span className="text-base">{formatPrice(previewTotal)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Save / Cancel buttons */}
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClosePriceEdit}
                      disabled={savingPrice}
                    >
                      Batal
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSavePricing}
                      disabled={savingPrice}
                    >
                      {savingPrice && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Simpan Harga
                    </Button>
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
                {/* Service row */}
                {(() => {
                  const b = booking.applied_benefits?.find(
                    (ab) => ab.applies_to === "service",
                  );
                  const isQuota = b?.benefit_type === "quota";
                  const svcBase = booking.edited_service_price ?? booking.service_snapshot.price;
                  const svcItemDisc = booking.edited_service_discount ?? 0;
                  const svcEffective = Math.max(0, svcBase - svcItemDisc);
                  const hasItemDisc = svcItemDisc > 0;
                  return (
                    <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {booking.service_snapshot.name}
                        </span>
                        {booking.edited_service_price != null && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                            Diedit
                          </span>
                        )}
                        {hasItemDisc && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                            -{formatPrice(svcItemDisc)}
                          </span>
                        )}
                        {b && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              isQuota
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                            }`}
                          >
                            {isQuota
                              ? "Gratis"
                              : b.benefit_value != null
                                ? `-${b.benefit_value}%`
                                : "Diskon"}
                          </span>
                        )}
                      </div>
                      {(hasItemDisc || b) ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">
                            {formatPrice(svcBase)}
                          </span>
                          {hasItemDisc && b ? (
                            <>
                              <span className="text-xs line-through text-muted-foreground">
                                {formatPrice(svcEffective)}
                              </span>
                              <span className="font-semibold text-primary">
                                {isQuota ? "Gratis" : formatPrice(Math.max(0, svcEffective - b.amount_deducted))}
                              </span>
                            </>
                          ) : hasItemDisc ? (
                            <span className="font-semibold text-foreground">{formatPrice(svcEffective)}</span>
                          ) : (
                            <span className="font-semibold text-primary">
                              {isQuota
                                ? "Gratis"
                                : formatPrice(Math.max(0, svcEffective - b!.amount_deducted))}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">
                          {formatPrice(svcBase)}
                        </span>
                      )}
                    </div>
                  );
                })()}
                {/* Addon rows */}
                {booking.service_snapshot.addons?.map((addon) => {
                  const addonBenefits = booking.applied_benefits?.filter(
                    (ab) => ab.applies_to === "addon",
                  ) ?? [];
                  const b =
                    addonBenefits.find((ab) => ab.service_id === addon._id) ??
                    addonBenefits.find((ab) => !ab.service_id);
                  const isQuota = b?.benefit_type === "quota";
                  const addonOverride = booking.edited_addon_prices?.find(
                    (a) => a.addon_id === addon._id,
                  );
                  const addonBase = addonOverride?.price ?? addon.price;
                  const addonItemDisc = addonOverride?.discount ?? 0;
                  const addonEffective = Math.max(0, addonBase - addonItemDisc);
                  const hasItemDisc = addonItemDisc > 0;
                  return (
                    <div
                      key={addon._id}
                      className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          + {addon.name}
                        </span>
                        {addonOverride?.price != null && (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                            Diedit
                          </span>
                        )}
                        {hasItemDisc && (
                          <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                            -{formatPrice(addonItemDisc)}
                          </span>
                        )}
                        {b && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              isQuota
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                            }`}
                          >
                            {isQuota
                              ? "Gratis"
                              : b.benefit_value != null
                                ? `-${b.benefit_value}%`
                                : "Diskon"}
                          </span>
                        )}
                      </div>
                      {(hasItemDisc || b) ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-xs line-through text-muted-foreground">
                            {formatPrice(addonBase)}
                          </span>
                          {hasItemDisc && b ? (
                            <>
                              <span className="text-xs line-through text-muted-foreground">
                                {formatPrice(addonEffective)}
                              </span>
                              <span className="font-semibold text-primary">
                                {isQuota ? "Gratis" : formatPrice(Math.max(0, addonEffective - b.amount_deducted))}
                              </span>
                            </>
                          ) : hasItemDisc ? (
                            <span className="font-semibold text-foreground">{formatPrice(addonEffective)}</span>
                          ) : (
                            <span className="font-semibold text-primary">
                              {isQuota
                                ? "Gratis"
                                : formatPrice(Math.max(0, addonEffective - b!.amount_deducted))}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-medium">
                          {formatPrice(addonBase)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {/* Travel fee row */}
                {(booking.edited_travel_fee != null || booking.travel_fee > 0) &&
                  (() => {
                    const b = booking.applied_benefits?.find(
                      (ab) =>
                        ab.applies_to === "pick_up" ||
                        ab.applies_to === "travel_fee" ||
                        ab.applies_to === "pickup",
                    );
                    const isQuota = b?.benefit_type === "quota";
                    const tFeeBase = booking.edited_travel_fee ?? booking.travel_fee;
                    const tFeeItemDisc = booking.edited_travel_fee_discount ?? 0;
                    const tFeeEffective = Math.max(0, tFeeBase - tFeeItemDisc);
                    const hasItemDisc = tFeeItemDisc > 0;
                    if (tFeeBase <= 0) return null;
                    return (
                      <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            <Truck className="h-3.5 w-3.5" />
                            Biaya Pickup
                          </span>
                          {booking.edited_travel_fee != null && (
                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                              Diedit
                            </span>
                          )}
                          {hasItemDisc && (
                            <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/50 dark:text-orange-400">
                              -{formatPrice(tFeeItemDisc)}
                            </span>
                          )}
                          {b && (
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                isQuota
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                  : "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                              }`}
                            >
                              {isQuota
                                ? "Gratis"
                                : b.benefit_value != null
                                  ? `-${b.benefit_value}%`
                                  : "Diskon"}
                            </span>
                          )}
                        </div>
                        {(hasItemDisc || b) ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs line-through text-muted-foreground">
                              {formatPrice(tFeeBase)}
                            </span>
                            {hasItemDisc && b ? (
                              <>
                                <span className="text-xs line-through text-muted-foreground">
                                  {formatPrice(tFeeEffective)}
                                </span>
                                <span className="font-semibold text-primary">
                                  {isQuota ? "Gratis" : formatPrice(Math.max(0, tFeeEffective - b.amount_deducted))}
                                </span>
                              </>
                            ) : hasItemDisc ? (
                              <span className="font-semibold text-foreground">{formatPrice(tFeeEffective)}</span>
                            ) : (
                              <span className="font-semibold text-primary">
                                {isQuota
                                  ? "Gratis"
                                  : formatPrice(Math.max(0, tFeeEffective - b!.amount_deducted))}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="font-medium">{formatPrice(tFeeBase)}</span>
                        )}
                      </div>
                    );
                  })()}
                {/* Subtotal + Diskon — hanya jika ada diskon */}
                {booking.total_discount > 0 && (
                  <>
                    <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-semibold">
                      <span>Subtotal</span>
                      <span>{formatPrice(booking.original_total_price)}</span>
                    </div>
                    {booking.total_discount > 0 && (
                      <div className="flex flex-col border-t border-primary/20 bg-primary/5">
                        <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="flex items-center gap-1.5 font-medium text-primary">
                            <Gift className="h-3.5 w-3.5" />
                            Diskon Member
                          </span>
                          <span className="font-semibold text-primary">
                            - {formatPrice(booking.total_discount)}
                          </span>
                        </div>
                        {booking.applied_benefits?.length > 1 && (
                          <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                            {booking.applied_benefits.map((ab, i) => (
                              <div
                                key={i}
                                className="flex items-center justify-between text-xs text-muted-foreground"
                              >
                                <span className="truncate pr-4">
                                  {ab.benefit?.label ||
                                    ab.description ||
                                    ab.applies_to}
                                </span>
                                <span className="shrink-0">
                                  - {formatPrice(ab.amount_deducted)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {/* Total Akhir */}
                <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
                  <span>Total Akhir</span>
                  <span className="text-base">
                    {formatPrice(
                      booking.final_total_price ?? booking.original_total_price,
                    )}
                  </span>
                </div>
              </div>

              {!editingPrice && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOpenPriceEdit}
                  className="h-8 gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit Harga
                </Button>
              )}

              {booking.payment_method && (
                <div>
                  <span className="text-xs text-muted-foreground">
                    Metode Pembayaran
                  </span>
                  <p className="font-medium capitalize text-foreground">
                    {booking.payment_method}
                  </p>
                </div>
              )}

              {booking.note && (
                <div>
                  <span className="text-xs text-muted-foreground">Catatan</span>
                  <p className="mt-1 rounded-md bg-muted/50 p-3 text-sm text-foreground">
                    {booking.note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer & Pet */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <User className="h-5 w-5 text-primary" />
                Customer &amp; Hewan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {booking.customer && (
                <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {booking.customer.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="font-semibold text-foreground">
                      {booking.customer.username}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.customer.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.customer.phone_number}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 rounded-xl bg-muted/40 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <PawPrint className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="font-semibold text-foreground">
                      {booking.pet_snapshot.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.pet_snapshot.breed?.name ?? "-"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {booking.pet_snapshot.pet_type && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                        {booking.pet_snapshot.pet_type.name}
                      </span>
                    )}
                    {booking.pet_snapshot.size && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                        {booking.pet_snapshot.size.name}
                      </span>
                    )}
                    {booking.pet_snapshot.hair && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground">
                        {booking.pet_snapshot.hair.name}
                      </span>
                    )}
                    {booking.pet_snapshot.member_type && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        {booking.pet_snapshot.member_type.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Logs */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <ClipboardList className="h-5 w-5 text-primary" />
                Riwayat Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {booking.status_logs.length > 0 ? (
                <div className="flex flex-col gap-0">
                  {booking.status_logs.map((log, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary" />
                        {idx < booking.status_logs.length - 1 && (
                          <div className="w-px flex-1 bg-border/60" />
                        )}
                      </div>
                      <div className="mb-4 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={`${statusColors[log.status] ?? "bg-muted text-muted-foreground"} capitalize text-xs`}
                          >
                            {log.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(log.timestamp)}
                          </span>
                        </div>
                        {log.note && (
                          <p className="mt-1 text-sm text-foreground">
                            {log.note}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Belum ada riwayat status
                </p>
              )}
            </CardContent>
          </Card>

          {/* Grooming Sessions */}
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
                      {session._id && (
                        <div className="flex shrink-0 gap-2">
                          {session.status === "not started" && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartSession(session._id!)}
                                disabled={
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
                                onClick={() =>
                                  setDeletingSessionId(session._id!)
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          {session.status === "in progress" && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
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
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setAssignGroomerSessionId(session._id!);
                              setAssignGroomerValue(session.groomer_id ?? "");
                            }}
                          >
                            Ganti Groomer
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                            Belum ada groomer
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              setAssignGroomerSessionId(session._id!);
                              setAssignGroomerValue("");
                            }}
                          >
                            Assign Groomer
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Timestamps */}
                    {(session.started_at || session.finished_at) && (
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        {session.started_at && (
                          <span>
                            Mulai: {formatDateTime(session.started_at)}
                          </span>
                        )}
                        {session.finished_at && (
                          <span>
                            Selesai: {formatDateTime(session.finished_at)}
                          </span>
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
                            onChange={(e) =>
                              setInternalNoteDraft(e.target.value)
                            }
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
                        {session._id && (
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
              {booking.booking_status !== "completed" &&
                booking.booking_status !== "cancelled" && (
                  <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border/50 p-3 sm:flex-row sm:items-end">
                    <div className="flex flex-1 flex-col gap-1">
                      <Label className="text-xs">Tipe sesi</Label>
                      <Input
                        placeholder="bathing, drying, styling..."
                        value={newSessionType}
                        onChange={(e) => setNewSessionType(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <Label className="text-xs">Groomer</Label>
                      <Select
                        value={newSessionGroomerId}
                        onValueChange={setNewSessionGroomerId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih groomer" />
                        </SelectTrigger>
                        <SelectContent>
                          {groomers.map((g) => (
                            <SelectItem key={g._id} value={g._id}>
                              {g.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddSession}
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

          {/* Foto Grooming */}
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
                        <button
                          onClick={() =>
                            setConfirmDeleteMediaId(m.public_id ?? "")
                          }
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
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
                        <button
                          onClick={() =>
                            setConfirmDeleteMediaId(m.public_id ?? "")
                          }
                          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
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
        </div>
      </div>

      <AlertDialog open={confirmingStatus} onOpenChange={setConfirmingStatus}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Status booking akan diubah menjadi{" "}
              <span className="font-semibold capitalize text-foreground">
                {selectedStatus}
              </span>
              . Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmingStatus(false);
                handleSaveStatus();
              }}
            >
              Ya, Ubah Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

      <AlertDialog
        open={!!assignGroomerSessionId}
        onOpenChange={(open) => {
          if (!open) {
            setAssignGroomerSessionId(null);
            setAssignGroomerValue("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Groomer</AlertDialogTitle>
            <AlertDialogDescription>
              Pilih groomer untuk sesi ini
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Select
              value={assignGroomerValue}
              onValueChange={setAssignGroomerValue}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih groomer..." />
              </SelectTrigger>
              <SelectContent>
                {groomers.map((g) => (
                  <SelectItem key={g._id} value={g._id}>
                    {g.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
