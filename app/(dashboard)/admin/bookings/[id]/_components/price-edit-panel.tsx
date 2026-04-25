"use client";

import { useEffect, useState } from "react";
import { Loader2, Truck, Gift, Sparkles, Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";
import {
  getBookingPreview,
  getPetBenefitsSummary,
  applyBenefitPreview,
  applyPromotionPreview,
  updateBookingPricing,
} from "@/lib/api/bookings";
import type {
  AdminBooking,
  BookingPreviewResult,
  ApplyBenefitPreviewResult,
  ApplyPromotionPreviewResult,
} from "@/lib/api/bookings";
import { getAdminServiceById, getAdminServices } from "@/lib/api/services";
import type { AdminService, AdminServiceAddon } from "@/lib/api/services";
import { getServiceTypes } from "@/lib/api/service-types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Component ────────────────────────────────────────────────────────────────

interface PriceEditPanelProps {
  booking: AdminBooking;
  bookingId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}

export function PriceEditPanel({
  booking,
  bookingId,
  onClose,
  onSaved,
}: PriceEditPanelProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [editBenefitIds, setEditBenefitIds] = useState<string[]>([]);
  const [editServicePrice, setEditServicePrice] = useState("");
  const [editServiceDiscount, setEditServiceDiscount] = useState("");
  const [editServiceDiscountType, setEditServiceDiscountType] = useState<
    "nominal" | "pct"
  >("nominal");
  const [editTravelFee, setEditTravelFee] = useState("");
  const [editTravelFeeDiscount, setEditTravelFeeDiscount] = useState("");
  const [editTravelFeeDiscountType, setEditTravelFeeDiscountType] = useState<
    "nominal" | "pct"
  >("nominal");
  const [editAddonPrices, setEditAddonPrices] = useState<
    Record<string, string>
  >({});
  const [editAddonDiscounts, setEditAddonDiscounts] = useState<
    Record<string, string>
  >({});
  const [editAddonDiscountTypes, setEditAddonDiscountTypes] = useState<
    Record<string, "nominal" | "pct">
  >({});
  const [pricePreviewData, setPricePreviewData] =
    useState<BookingPreviewResult | null>(null);
  const [priceApplyResult, setPriceApplyResult] =
    useState<ApplyBenefitPreviewResult | null>(null);
  const [loadingPricePreview, setLoadingPricePreview] = useState(false);
  const [loadingPriceApply, setLoadingPriceApply] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [editPromotionIds, setEditPromotionIds] = useState<string[]>([]);
  const [pricePromoResult, setPricePromoResult] =
    useState<ApplyPromotionPreviewResult | null>(null);
  const [loadingPricePromo, setLoadingPricePromo] = useState(false);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [allServiceAddons, setAllServiceAddons] = useState<
    { _id: string; name: string; code?: string; price?: number }[]
  >([]);
  const [loadingServiceAddons, setLoadingServiceAddons] = useState(false);
  const [editPickup, setEditPickup] = useState(false);
  const [editDelivery, setEditDelivery] = useState(false);
  const [loadingTravelFee, setLoadingTravelFee] = useState(false);
  const [editServiceId, setEditServiceId] = useState<string>(
    booking.service_snapshot._id ?? "",
  );
  const [availableServices, setAvailableServices] = useState<AdminService[]>(
    [],
  );
  const [loadingAvailableServices, setLoadingAvailableServices] =
    useState(false);
  const [serviceChangedResetInfo, setServiceChangedResetInfo] = useState<{
    fromName: string;
    hadBenefits: boolean;
    hadPromos: boolean;
  } | null>(null);

  // ── Initialize on mount ────────────────────────────────────────────────────
  useEffect(() => {
    setEditBenefitIds(booking.selected_benefit_ids ?? []);
    setEditPromotionIds(booking.selected_promotion_ids ?? []);
    setSelectedAddonIds((booking.service_addon_ids ?? []).filter(Boolean));
    setEditPickup(booking.pick_up ?? false);
    setEditDelivery(booking.delivery ?? false);
    setEditServicePrice(
      String(
        booking.edited_service_price ?? booking.service_snapshot.price ?? "",
      ),
    );
    setEditServiceDiscount(String(booking.edited_service_discount ?? 0));
    setEditTravelFee(
      booking.pick_up || booking.delivery
        ? String(booking.edited_travel_fee ?? booking.travel_fee ?? "")
        : "",
    );
    setEditTravelFeeDiscount(
      booking.pick_up || booking.delivery
        ? String(booking.edited_travel_fee_discount ?? 0)
        : "0",
    );
    const addonPriceMap: Record<string, string> = {};
    const addonDiscountMap: Record<string, string> = {};
    (booking.service_snapshot.addons ?? []).forEach((addon) => {
      const override = (booking.edited_addon_prices ?? []).find(
        (a) => a.addon_id === addon._id,
      );
      addonPriceMap[addon._id!] = String(
        override ? override.price : addon.price,
      );
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

    // Fetch preview data
    setLoadingPricePreview(true);
    const addonIds = (booking.service_addon_ids ?? []).filter(Boolean);
    getBookingPreview({
      pet_id: booking.pet_id,
      service_id: booking.service_snapshot._id!,
      addon_ids: addonIds.length > 0 ? addonIds : undefined,
      date: booking.date
        ? new Date(booking.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      pick_up: booking.pick_up || undefined,
      delivery: booking.delivery || undefined,
      store_id: booking.store_id || undefined,
      customer_id: booking.customer_id || undefined,
      exclude_booking_id: bookingId,
    })
      .then((res) => setPricePreviewData(res))
      .catch(() => {
        // Fallback: build from pet benefits summary
        getPetBenefitsSummary(booking.pet_id)
          .then((summary) => {
            const addonIdSet = new Set(booking.service_addon_ids ?? []);
            const addonsTotal = (booking.service_snapshot.addons ?? []).reduce(
              (sum, a) => sum + (a.price ?? 0),
              0,
            );
            const allBenefits = (summary.data ?? []).flatMap((m) => m.benefits);
            const currentBenefitIdsFb = new Set(
              booking.selected_benefit_ids ?? [],
            );
            const available_benefits = allBenefits
              .filter((b) => {
                if (b.applies_to === "service")
                  return (
                    !b.service_id ||
                    b.service_id === booking.service_snapshot._id
                  );
                if (b.applies_to === "addon")
                  return (
                    (booking.service_addon_ids ?? []).length > 0 &&
                    (!b.service_id || addonIdSet.has(b.service_id))
                  );
                if (b.applies_to === "pickup")
                  return booking.pick_up === true || booking.delivery === true;
                return false;
              })
              .map((b) => {
                let discountBase = 0;
                if (b.applies_to === "service") {
                  discountBase = booking.service_snapshot.price ?? 0;
                } else if (b.applies_to === "addon") {
                  if (b.service_id) {
                    const addonSnap = (
                      booking.service_snapshot.addons ?? []
                    ).find((a) => a._id === b.service_id);
                    discountBase = addonSnap?.price ?? 0;
                  } else {
                    discountBase = addonsTotal;
                  }
                } else if (b.applies_to === "pickup") {
                  discountBase = booking.travel_fee ?? 0;
                }
                const effectiveCanApply =
                  b.can_apply || currentBenefitIdsFb.has(b._id);
                const effectiveAmount = effectiveCanApply
                  ? b.type === "discount"
                    ? ((b.value ?? 0) / 100) * discountBase
                    : discountBase
                  : 0;
                return {
                  ...b,
                  can_apply: effectiveCanApply,
                  description: b.label ?? b.applies_to,
                  amount_discount: effectiveAmount,
                };
              });
            setPricePreviewData({
              pet_id: booking.pet_id,
              pet_name: booking.pet_snapshot?.name ?? "",
              service_id: booking.service_snapshot._id ?? "",
              service_name: booking.service_snapshot.name ?? "",
              pricing: {
                original_service_price: booking.service_snapshot.price ?? 0,
                addon_prices: (booking.service_snapshot.addons ?? []).map(
                  (a) => ({
                    _id: a._id!,
                    name: a.name,
                    price: a.price,
                  }),
                ),
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
          })
          .catch(() => {
            /* Benefits genuinely unavailable */
          });
      })
      .finally(() => setLoadingPricePreview(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helper: resolve addon price based on pet attributes ────────────────────
  const resolveAddonPrice = (addon: {
    price?: number;
    price_type?: string;
    prices?: {
      pet_type_id?: string;
      size_id?: string;
      hair_id?: string;
      price: number;
    }[];
  }): number => {
    if (!addon.price_type || addon.price_type === "single")
      return addon.price ?? 0;
    const petTypeId = booking.pet_snapshot?.pet_type?._id;
    const sizeId = booking.pet_snapshot?.size?._id;
    const hairId = booking.pet_snapshot?.hair?._id;
    const match = (addon.prices ?? []).find((p) => {
      const petOk = petTypeId ? p.pet_type_id === petTypeId : !p.pet_type_id;
      const sizeOk = sizeId ? p.size_id === sizeId : !p.size_id;
      const hairOk = hairId ? p.hair_id === hairId : !p.hair_id;
      return petOk && sizeOk && hairOk;
    });
    return match?.price ?? addon.price ?? 0;
  };

  // ── Fetch available services for the same service type ──────────────────────
  useEffect(() => {
    const serviceTypeId = booking.service_snapshot.service_type?._id;
    const storeId = booking.store_id;
    if (!serviceTypeId || !storeId) return;
    setLoadingAvailableServices(true);
    getAdminServices({
      service_type_id: serviceTypeId,
      store_id: storeId,
      service_location_type: booking.type, // "in store" | "in home"
      is_active: "true",
      limit: 100,
    })
      .then((res) => setAvailableServices(res.services ?? []))
      .catch(() => {})
      .finally(() => setLoadingAvailableServices(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch all available addons from live service + store "addons" type ─────
  useEffect(() => {
    const serviceId = editServiceId || booking.service_snapshot._id;
    if (!serviceId) return;
    setLoadingServiceAddons(true);

    const fetchServiceAddons = getAdminServiceById(serviceId)
      .then((res) =>
        (res.service.addons ?? []).map((a) => ({
          _id: a._id,
          name: a.name,
          code: a.code,
          price: resolveAddonPrice(a),
          price_type: a.price_type,
          prices: a.prices,
          duration: a.duration,
        })),
      )
      .catch(
        () =>
          [] as {
            _id: string;
            name: string;
            code?: string;
            price?: number;
            price_type?: string;
            prices?: any[];
            duration?: number;
          }[],
      );

    // Also fetch services under the "addons" service type for this store
    const storeId = booking.store_id ?? (booking as any).store?._id;
    const fetchStoreAddons = storeId
      ? getServiceTypes({ limit: 100 })
          .then(async (stRes) => {
            const addonsType = stRes.serviceTypes.find(
              (st) => st.title.toLowerCase() === "addons",
            );
            if (!addonsType) return [];
            const svcRes = await getAdminServices({
              service_type_id: addonsType._id,
              store_id: storeId,
              is_active: "true",
              limit: 100,
            });
            return (svcRes.services ?? []).map((s) => ({
              _id: s._id,
              name: s.name,
              code: s.code,
              price: resolveAddonPrice(s),
              price_type: s.price_type,
              prices: s.prices,
              duration: s.duration,
            }));
          })
          .catch(
            () =>
              [] as {
                _id: string;
                name: string;
                code?: string;
                price?: number;
                price_type?: string;
                prices?: any[];
                duration?: number;
              }[],
          )
      : Promise.resolve(
          [] as {
            _id: string;
            name: string;
            code?: string;
            price?: number;
            price_type?: string;
            prices?: any[];
            duration?: number;
          }[],
        );

    Promise.all([fetchServiceAddons, fetchStoreAddons])
      .then(([serviceAddons, storeAddons]) => {
        // Merge all sources, deduplicate by _id
        const merged = new Map<string, (typeof serviceAddons)[number]>();
        for (const a of serviceAddons) merged.set(a._id, a);
        for (const a of storeAddons) {
          if (!merged.has(a._id)) merged.set(a._id, a);
        }
        // Also keep any snapshotted addons not in live (deleted addons still in booking),
        // but only if we haven't changed the service
        if (!editServiceId || editServiceId === booking.service_snapshot._id) {
          for (const a of booking.service_snapshot.addons ?? []) {
            if (!merged.has(a._id)) {
              merged.set(a._id, {
                _id: a._id,
                name: a.name,
                code: a.code,
                price: a.price,
              });
            }
          }
        }
        setAllServiceAddons(Array.from(merged.values()));
      })
      .finally(() => setLoadingServiceAddons(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editServiceId]);

  // ── Handle main service change ─────────────────────────────────────────────
  const handleServiceChange = (newServiceId: string) => {
    if (!newServiceId || newServiceId === editServiceId) return;

    const newService = availableServices.find((s) => s._id === newServiceId);
    if (!newService) return;

    // Resolve price for the pet
    const petTypeId = booking.pet_snapshot?.pet_type?._id;
    const sizeId = booking.pet_snapshot?.size?._id;
    const hairId = booking.pet_snapshot?.hair?._id;
    let resolvedPrice: number | undefined;
    if (newService.price_type === "multiple" && newService.prices?.length) {
      const match = newService.prices.find((p) => {
        const petOk = !p.pet_type_id || p.pet_type_id === petTypeId;
        const sizeOk = !p.size_id || p.size_id === sizeId;
        const hairOk = !p.hair_id || p.hair_id === hairId;
        return petOk && sizeOk && hairOk;
      });
      resolvedPrice = match?.price ?? newService.price;
    } else {
      resolvedPrice = newService.price;
    }

    setEditServiceId(newServiceId);
    setEditServicePrice(String(resolvedPrice ?? ""));
    setEditServiceDiscount("0");

    // Reset addons
    setSelectedAddonIds([]);
    setEditAddonPrices({});
    setEditAddonDiscounts({});
    setEditAddonDiscountTypes({});

    // Reset benefits/promotions — track if anything was actually cleared
    const hadBenefits = editBenefitIds.length > 0;
    const hadPromos = editPromotionIds.length > 0;
    setEditBenefitIds([]);
    setPriceApplyResult(null);
    setEditPromotionIds([]);
    setPricePromoResult(null);

    if (hadBenefits || hadPromos) {
      const fromName =
        availableServices.find((s) => s._id === editServiceId)?.name ??
        booking.service_snapshot.name;
      setServiceChangedResetInfo({ fromName, hadBenefits, hadPromos });
    } else {
      setServiceChangedResetInfo(null);
    }

    // Re-fetch booking preview for new service
    setLoadingPricePreview(true);
    setPricePreviewData(null);
    getBookingPreview({
      pet_id: booking.pet_id,
      service_id: newServiceId,
      date: booking.date
        ? new Date(booking.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      pick_up: editPickup || undefined,
      delivery: editDelivery || undefined,
      store_id: booking.store_id || undefined,
      customer_id: booking.customer_id || undefined,
      exclude_booking_id: bookingId,
    })
      .then((res) => setPricePreviewData(res))
      .catch(() => {})
      .finally(() => setLoadingPricePreview(false));
  };

  // ── Benefit conflict resolution toggle ─────────────────────────────────────
  const toggleEditBenefit = (benefitId: string) => {
    if (!pricePreviewData) {
      setEditBenefitIds((prev) =>
        prev.includes(benefitId)
          ? prev.filter((b) => b !== benefitId)
          : [...prev, benefitId],
      );
      return;
    }
    const benefit = pricePreviewData.pricing.available_benefits.find(
      (x: any) => x._id === benefitId,
    );
    if (!benefit) {
      setEditBenefitIds((prev) =>
        prev.includes(benefitId)
          ? prev.filter((b) => b !== benefitId)
          : [...prev, benefitId],
      );
      return;
    }
    setEditBenefitIds((prev) => {
      if (prev.includes(benefitId)) return prev.filter((b) => b !== benefitId);
      const addonIds = selectedAddonIds;
      const conflicts = prev.filter((selId) => {
        const sel = pricePreviewData.pricing.available_benefits.find(
          (x: any) => x._id === selId,
        );
        if (!sel || sel.applies_to !== benefit.applies_to) return false;
        if (benefit.type === sel.type) return false;
        if (benefit.applies_to === "service") {
          const quotaTarget =
            (benefit.type === "quota" ? benefit : sel).service_id ||
            booking?.service_snapshot._id;
          const discountTarget =
            (benefit.type === "discount" ? benefit : sel).service_id ||
            booking?.service_snapshot._id;
          return quotaTarget === discountTarget;
        }
        if (benefit.applies_to === "addon") {
          const quotaBenefit = benefit.type === "quota" ? benefit : sel;
          const discountBenefit = benefit.type === "discount" ? benefit : sel;
          const quotaTarget = quotaBenefit.service_id;
          const discountTarget = discountBenefit.service_id;
          if (quotaTarget && discountTarget)
            return quotaTarget === discountTarget;
          if (quotaTarget && !discountTarget) {
            const alreadyCovered = prev
              .filter((sid) => sid !== benefitId)
              .map((sid) =>
                pricePreviewData.pricing.available_benefits.find(
                  (x: any) => x._id === sid,
                ),
              )
              .filter(
                (x: any) =>
                  x?.type === "quota" &&
                  x.applies_to === "addon" &&
                  x.service_id,
              )
              .map((x: any) => x.service_id);
            const coveredAfter = new Set([...alreadyCovered, quotaTarget]);
            return (
              addonIds.length > 0 &&
              addonIds.every((aid) => coveredAfter.has(aid))
            );
          }
          if (!quotaTarget && discountTarget) return true;
          return true;
        }
        return false;
      });
      return [...prev.filter((b) => !conflicts.includes(b)), benefitId];
    });
  };

  // ── Auto-fetch apply-benefit preview ───────────────────────────────────────
  useEffect(() => {
    if (editBenefitIds.length === 0) {
      setPriceApplyResult(null);
      setLoadingPriceApply(false);
      return;
    }
    const svcBase =
      parseFloat(editServicePrice) || booking.service_snapshot.price || 0;
    const rawSvcDisc = parseFloat(editServiceDiscount) || 0;
    const svcDisc =
      editServiceDiscountType === "pct"
        ? Math.min(svcBase, (rawSvcDisc / 100) * svcBase)
        : Math.min(svcBase, rawSvcDisc);
    const tFeeBase =
      editPickup || editDelivery || booking.type === "in home"
        ? parseFloat(editTravelFee) || booking.travel_fee || 0
        : 0;
    const rawTFeeDisc =
      editPickup || editDelivery || booking.type === "in home"
        ? parseFloat(editTravelFeeDiscount) || 0
        : 0;
    const tFeeDisc =
      editTravelFeeDiscountType === "pct"
        ? Math.min(tFeeBase, (rawTFeeDisc / 100) * tFeeBase)
        : Math.min(tFeeBase, rawTFeeDisc);
    const addonTotal = selectedAddonIds.reduce((sum, addonId) => {
      const snapshotAddon = (booking.service_snapshot.addons ?? []).find(
        (a) => a._id === addonId,
      );
      const liveAddon = allServiceAddons.find((a) => a._id === addonId);
      const defaultPrice = snapshotAddon?.price ?? liveAddon?.price ?? 0;
      const base =
        parseFloat(editAddonPrices[addonId] ?? String(defaultPrice)) ||
        defaultPrice ||
        0;
      const rawDisc = parseFloat(editAddonDiscounts[addonId] ?? "0") || 0;
      const discType = editAddonDiscountTypes[addonId] ?? "nominal";
      const disc =
        discType === "pct"
          ? Math.min(base, (rawDisc / 100) * base)
          : Math.min(base, rawDisc);
      return sum + Math.max(0, base - disc);
    }, 0);
    const editedSubtotal =
      Math.max(0, svcBase - svcDisc) +
      Math.max(0, tFeeBase - tFeeDisc) +
      addonTotal;

    let cancelled = false;
    setLoadingPriceApply(true);
    applyBenefitPreview({
      pet_id: booking.pet_id,
      selected_benefit_ids: editBenefitIds,
      service_id: editServiceId || booking.service_snapshot._id,
      add_on_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      store_id: booking.store_id || undefined,
      original_total_price: editedSubtotal,
      booking_date: booking.date,
      pick_up: editPickup || undefined,
      delivery: editDelivery || undefined,
      exclude_booking_id: bookingId,
    })
      .then((res) => {
        if (!cancelled) setPriceApplyResult(res);
      })
      .catch((err) => {
        console.error("[applyBenefitPreview] error:", err);
        if (!cancelled) setPriceApplyResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPriceApply(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editBenefitIds,
    editServiceId,
    editServicePrice,
    editServiceDiscount,
    editServiceDiscountType,
    editTravelFee,
    editTravelFeeDiscount,
    editTravelFeeDiscountType,
    editAddonPrices,
    editAddonDiscounts,
    editAddonDiscountTypes,
  ]);

  // ── Auto-fetch apply-promotion preview ─────────────────────────────────────
  useEffect(() => {
    if (!pricePreviewData) return;
    if (editPromotionIds.length === 0) {
      setPricePromoResult(null);
      setLoadingPricePromo(false);
      return;
    }
    let cancelled = false;
    setLoadingPricePromo(true);
    const svcBase =
      parseFloat(editServicePrice) || booking.service_snapshot.price || 0;
    const tFeeBase =
      editPickup || editDelivery || booking.type === "in home"
        ? parseFloat(editTravelFee) || booking.travel_fee || 0
        : 0;
    const addonBaseTotal = selectedAddonIds.reduce((sum, addonId) => {
      const snapshotAddon = (booking.service_snapshot.addons ?? []).find(
        (a) => a._id === addonId,
      );
      const liveAddon = allServiceAddons.find((a) => a._id === addonId);
      const defaultPrice = snapshotAddon?.price ?? liveAddon?.price ?? 0;
      const base =
        parseFloat(editAddonPrices[addonId] ?? String(defaultPrice)) ||
        defaultPrice ||
        0;
      return sum + base;
    }, 0);
    const originalGrandTotal = svcBase + tFeeBase + addonBaseTotal;
    const editedAddonPricesArr = selectedAddonIds.map((addonId) => {
      const snapshotAddon = (booking.service_snapshot.addons ?? []).find(
        (a) => a._id === addonId,
      );
      const liveAddon = allServiceAddons.find((a) => a._id === addonId);
      const defaultPrice = snapshotAddon?.price ?? liveAddon?.price ?? 0;
      return {
        _id: addonId,
        name: snapshotAddon?.name ?? liveAddon?.name ?? addonId,
        price:
          parseFloat(editAddonPrices[addonId] ?? String(defaultPrice)) ||
          defaultPrice ||
          0,
      };
    });

    applyPromotionPreview({
      selected_promotion_ids: editPromotionIds,
      service_id: editServiceId || booking.service_snapshot._id,
      addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      original_service_price: svcBase,
      travel_fee: tFeeBase,
      grand_total: originalGrandTotal,
      pick_up: editPickup || undefined,
      delivery: editDelivery || undefined,
      has_active_membership: pricePreviewData.pricing.has_active_membership,
      addon_prices: editedAddonPricesArr,
    })
      .then((res) => {
        if (!cancelled) setPricePromoResult(res);
      })
      .catch(() => {
        if (!cancelled) setPricePromoResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingPricePromo(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editPromotionIds,
    editServiceId,
    editServicePrice,
    editTravelFee,
    editAddonPrices,
    pricePreviewData,
  ]);

  // ── Save handler ───────────────────────────────────────────────────────────
  const handleSavePricing = async () => {
    setSavingPrice(true);
    try {
      const svcPriceNum = parseFloat(editServicePrice);
      const svcBase = !isNaN(svcPriceNum)
        ? svcPriceNum
        : booking.service_snapshot.price || 0;
      const rawSvcDisc = parseFloat(editServiceDiscount) || 0;
      const svcDiscNominal =
        editServiceDiscountType === "pct"
          ? Math.min(svcBase, (rawSvcDisc / 100) * svcBase)
          : Math.min(svcBase, rawSvcDisc);

      const tFeeNum = parseFloat(editTravelFee);
      const tFeeBase = !isNaN(tFeeNum) ? tFeeNum : booking.travel_fee || 0;
      const rawTFeeDisc = parseFloat(editTravelFeeDiscount) || 0;
      const tFeeDiscNominal =
        editTravelFeeDiscountType === "pct"
          ? Math.min(tFeeBase, (rawTFeeDisc / 100) * tFeeBase)
          : Math.min(tFeeBase, rawTFeeDisc);

      const addonPricesPayload = selectedAddonIds.map((addonId) => {
        const snapshotAddon = (booking.service_snapshot.addons ?? []).find(
          (a) => a._id === addonId,
        );
        const liveAddon = allServiceAddons.find((a) => a._id === addonId);
        const defaultPrice = snapshotAddon?.price ?? liveAddon?.price ?? 0;
        const base =
          parseFloat(editAddonPrices[addonId] ?? String(defaultPrice)) ||
          defaultPrice ||
          0;
        const rawDisc = parseFloat(editAddonDiscounts[addonId] ?? "0") || 0;
        const discType = editAddonDiscountTypes[addonId] ?? "nominal";
        const discNominal =
          discType === "pct"
            ? Math.min(base, (rawDisc / 100) * base)
            : Math.min(base, rawDisc);
        return { addon_id: addonId, price: base, discount: discNominal };
      });
      await updateBookingPricing(bookingId, {
        service_id:
          editServiceId !== booking.service_snapshot._id
            ? editServiceId
            : undefined,
        service_addon_ids: selectedAddonIds,
        pick_up: editPickup,
        delivery: editDelivery,
        selected_benefit_ids: editBenefitIds,
        selected_promotion_ids:
          editPromotionIds.length > 0 ? editPromotionIds : undefined,
        service_price: !isNaN(svcPriceNum) ? svcPriceNum : undefined,
        service_discount: svcDiscNominal > 0 ? svcDiscNominal : undefined,
        travel_fee:
          (editPickup || editDelivery || booking.type === "in home") &&
          !isNaN(tFeeNum)
            ? tFeeNum
            : undefined,
        travel_fee_discount:
          (editPickup || editDelivery || booking.type === "in home") &&
          tFeeDiscNominal > 0
            ? tFeeDiscNominal
            : undefined,
        addon_prices:
          addonPricesPayload.length > 0 ? addonPricesPayload : undefined,
      });
      await onSaved();
      onClose();
      toast.success("Harga booking berhasil diperbarui");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui harga",
      );
    } finally {
      setSavingPrice(false);
    }
  };

  // ── Fetch zone-based travel fee when pickup/delivery toggles change ────────
  const fetchTravelFeeForToggle = async (
    newPickup: boolean,
    newDelivery: boolean,
  ) => {
    if (!newPickup && !newDelivery) {
      setEditTravelFee("");
      setEditTravelFeeDiscount("0");
      return;
    }
    setLoadingTravelFee(true);
    try {
      const res = await getBookingPreview({
        pet_id: booking.pet_id,
        service_id: editServiceId || booking.service_snapshot._id!,
        addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
        date: booking.date
          ? new Date(booking.date).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        pick_up: newPickup || undefined,
        delivery: newDelivery || undefined,
        store_id: booking.store_id || undefined,
        customer_id: booking.customer_id || undefined,
        exclude_booking_id: bookingId,
      });
      const tFee = res.pricing_breakdown?.travel_fee;
      if (tFee != null && tFee > 0) {
        setEditTravelFee(String(tFee));
        setEditTravelFeeDiscount("0");
      } else {
        // Fallback to stored per-leg fees
        const pFee = booking.pickup_fee ?? 0;
        const dFee = booking.delivery_fee ?? 0;
        if (newPickup && newDelivery) {
          setEditTravelFee(String(pFee + dFee));
        } else if (newPickup) {
          setEditTravelFee(String(pFee || booking.travel_fee || ""));
        } else {
          setEditTravelFee(String(dFee || booking.travel_fee || ""));
        }
        setEditTravelFeeDiscount("0");
      }
    } catch {
      // Fallback to stored per-leg fees
      const pFee = booking.pickup_fee ?? 0;
      const dFee = booking.delivery_fee ?? 0;
      if (newPickup && newDelivery) {
        setEditTravelFee(String(pFee + dFee));
      } else if (newPickup) {
        setEditTravelFee(String(pFee || booking.travel_fee || ""));
      } else {
        setEditTravelFee(String(dFee || booking.travel_fee || ""));
      }
      setEditTravelFeeDiscount("0");
    } finally {
      setLoadingTravelFee(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      {/* Main Service Selector */}
      {availableServices.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">Ganti Layanan Utama</p>
          <Select
            value={editServiceId}
            onValueChange={handleServiceChange}
            disabled={loadingAvailableServices}
          >
            <SelectTrigger className="bg-background">
              <SelectValue
                placeholder={
                  loadingAvailableServices ? "Memuat..." : "Pilih layanan"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {availableServices.map((svc) => {
                const petTypeId = booking.pet_snapshot?.pet_type?._id;
                const sizeId = booking.pet_snapshot?.size?._id;
                const hairId = booking.pet_snapshot?.hair?._id;
                let price: number | undefined;
                if (svc.price_type === "multiple" && svc.prices?.length) {
                  const match = svc.prices.find((p) => {
                    const petOk = !p.pet_type_id || p.pet_type_id === petTypeId;
                    const sizeOk = !p.size_id || p.size_id === sizeId;
                    const hairOk = !p.hair_id || p.hair_id === hairId;
                    return petOk && sizeOk && hairOk;
                  });
                  price = match?.price ?? svc.price;
                } else {
                  price = svc.price;
                }
                return (
                  <SelectItem key={svc._id} value={svc._id}>
                    <span className="flex items-center justify-between gap-4 w-full">
                      <span>{svc.name}</span>
                      {price != null && (
                        <span className="text-xs text-muted-foreground">
                          {formatPrice(price)}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {serviceChangedResetInfo && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠ Pindah dari <strong>{serviceChangedResetInfo.fromName}</strong>{" "}
              —&nbsp;
              {[
                serviceChangedResetInfo.hadBenefits && "benefit membership",
                serviceChangedResetInfo.hadPromos && "promosi",
              ]
                .filter(Boolean)
                .join(" & ")}{" "}
              telah direset.
            </p>
          )}
        </div>
      )}

      {/* Per-item price overrides */}
      <div>
        <p className="mb-3 text-sm font-semibold">Harga per Item</p>
        <div className="flex flex-col gap-2">
          {/* Service */}
          {(() => {
            const svcBase =
              parseFloat(editServicePrice) ||
              booking.service_snapshot.price ||
              0;
            const rawDisc = parseFloat(editServiceDiscount) || 0;
            const svcDiscNominal =
              editServiceDiscountType === "pct"
                ? Math.min(svcBase, (rawDisc / 100) * svcBase)
                : Math.min(svcBase, rawDisc);
            const svcEff = Math.max(0, svcBase - svcDiscNominal);
            return (
              <ItemPriceEditor
                label={
                  availableServices.find((s) => s._id === editServiceId)
                    ?.name ?? booking.service_snapshot.name
                }
                baseValue={editServicePrice}
                onBaseChange={setEditServicePrice}
                discountValue={editServiceDiscount}
                onDiscountChange={setEditServiceDiscount}
                discountType={editServiceDiscountType}
                onDiscountTypeChange={(t) => {
                  setEditServiceDiscountType(t);
                  setEditServiceDiscount("");
                }}
                effectivePrice={svcEff}
              />
            );
          })()}
          {/* Addons - Toggle & Price Editors */}
          {allServiceAddons.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3">
              <span className="text-sm font-medium text-foreground">
                Addon / Layanan Tambahan
                {loadingServiceAddons && (
                  <Loader2 className="ml-1.5 inline h-3.5 w-3.5 animate-spin" />
                )}
              </span>
              <div className="flex flex-col gap-1.5">
                {allServiceAddons.map((addon) => {
                  const isSelected = selectedAddonIds.includes(addon._id);
                  const snapshotAddon = (
                    booking.service_snapshot.addons ?? []
                  ).find((a) => a._id === addon._id);
                  const resolvedPrice =
                    snapshotAddon?.price ?? addon.price ?? 0;
                  return (
                    <label
                      key={addon._id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedAddonIds((prev) => [...prev, addon._id]);
                            setEditAddonPrices((prev) => ({
                              ...prev,
                              [addon._id]:
                                prev[addon._id] ?? String(resolvedPrice),
                            }));
                            setEditAddonDiscounts((prev) => ({
                              ...prev,
                              [addon._id]: prev[addon._id] ?? "0",
                            }));
                            setEditAddonDiscountTypes((prev) => ({
                              ...prev,
                              [addon._id]: prev[addon._id] ?? "nominal",
                            }));
                          } else {
                            setSelectedAddonIds((prev) =>
                              prev.filter((id) => id !== addon._id),
                            );
                          }
                        }}
                        className="shrink-0"
                      />
                      <span className="text-sm text-foreground">
                        {addon.name}
                      </span>
                      {resolvedPrice > 0 && (
                        <span className="text-xs text-muted-foreground">
                          ({formatPrice(resolvedPrice)})
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          {/* Pickup / Delivery toggle */}
          {booking.type === "in store" && (
            <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-card p-3">
              <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                Pickup & Delivery
                {loadingTravelFee && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                )}
              </span>
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editPickup}
                    disabled={loadingTravelFee}
                    onCheckedChange={(c) => {
                      const newPickup = !!c;
                      setEditPickup(newPickup);
                      void fetchTravelFeeForToggle(newPickup, editDelivery);
                    }}
                    className="shrink-0"
                  />
                  <span
                    className={`text-sm ${loadingTravelFee ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    Pickup (Jemput)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editDelivery}
                    disabled={loadingTravelFee}
                    onCheckedChange={(c) => {
                      const newDelivery = !!c;
                      setEditDelivery(newDelivery);
                      void fetchTravelFeeForToggle(editPickup, newDelivery);
                    }}
                    className="shrink-0"
                  />
                  <span
                    className={`text-sm ${loadingTravelFee ? "text-muted-foreground" : "text-foreground"}`}
                  >
                    Delivery (Antar)
                  </span>
                </label>
              </div>
            </div>
          )}
          {/* Addon Price Editors (only for selected addons) */}
          {selectedAddonIds.map((addonId) => {
            const snapshotAddon = (booking.service_snapshot.addons ?? []).find(
              (a) => a._id === addonId,
            );
            const liveAddon = allServiceAddons.find((a) => a._id === addonId);
            const addonName = snapshotAddon?.name ?? liveAddon?.name ?? addonId;
            const defaultPrice = snapshotAddon?.price ?? liveAddon?.price ?? 0;
            const addonBase =
              parseFloat(editAddonPrices[addonId] ?? String(defaultPrice)) ||
              defaultPrice ||
              0;
            const rawDisc = parseFloat(editAddonDiscounts[addonId] ?? "0") || 0;
            const discType = editAddonDiscountTypes[addonId] ?? "nominal";
            const addonDiscNominal =
              discType === "pct"
                ? Math.min(addonBase, (rawDisc / 100) * addonBase)
                : Math.min(addonBase, rawDisc);
            const addonEff = Math.max(0, addonBase - addonDiscNominal);
            return (
              <ItemPriceEditor
                key={addonId}
                label={`+ ${addonName}`}
                baseValue={editAddonPrices[addonId] ?? String(defaultPrice)}
                onBaseChange={(v) =>
                  setEditAddonPrices((prev) => ({ ...prev, [addonId]: v }))
                }
                discountValue={editAddonDiscounts[addonId] ?? ""}
                onDiscountChange={(v) =>
                  setEditAddonDiscounts((prev) => ({ ...prev, [addonId]: v }))
                }
                discountType={discType}
                onDiscountTypeChange={(t) => {
                  setEditAddonDiscountTypes((prev) => ({
                    ...prev,
                    [addonId]: t,
                  }));
                  setEditAddonDiscounts((prev) => ({ ...prev, [addonId]: "" }));
                }}
                effectivePrice={addonEff}
              />
            );
          })}
          {/* Travel fee */}
          {(editPickup || editDelivery || booking.type === "in home") &&
            (() => {
              const tFeeBase =
                parseFloat(editTravelFee) || booking.travel_fee || 0;
              const rawDisc = parseFloat(editTravelFeeDiscount) || 0;
              const tFeeDiscNominal =
                editTravelFeeDiscountType === "pct"
                  ? Math.min(tFeeBase, (rawDisc / 100) * tFeeBase)
                  : Math.min(tFeeBase, rawDisc);
              const tFeeEff = Math.max(0, tFeeBase - tFeeDiscNominal);
              const feeLabel =
                booking.type === "in home"
                  ? "Biaya Home Service"
                  : editPickup && editDelivery
                    ? "Biaya Pickup & Delivery"
                    : editDelivery
                      ? "Biaya Delivery"
                      : "Biaya Pickup";
              return (
                <ItemPriceEditor
                  label={feeLabel}
                  labelIcon={
                    <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  }
                  baseValue={editTravelFee}
                  onBaseChange={setEditTravelFee}
                  discountValue={editTravelFeeDiscount}
                  onDiscountChange={setEditTravelFeeDiscount}
                  discountType={editTravelFeeDiscountType}
                  onDiscountTypeChange={(t) => {
                    setEditTravelFeeDiscountType(t);
                    setEditTravelFeeDiscount("");
                  }}
                  effectivePrice={tFeeEff}
                />
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
              const addonIds = selectedAddonIds;
              const available = pricePreviewData.pricing.available_benefits;
              const blockedByQuota =
                canApply &&
                benefit.type === "discount" &&
                !isSelected &&
                (() => {
                  if (benefit.applies_to === "service") {
                    const discountTarget =
                      (benefit as any).service_id ||
                      booking?.service_snapshot._id;
                    return available.some(
                      (x: any) =>
                        editBenefitIds.includes(x._id) &&
                        x.type === "quota" &&
                        x.applies_to === "service" &&
                        (x.service_id === discountTarget || !x.service_id),
                    );
                  }
                  if (benefit.applies_to === "addon") {
                    const selectedQuotas = available.filter(
                      (x: any) =>
                        editBenefitIds.includes(x._id) &&
                        x.type === "quota" &&
                        x.applies_to === "addon",
                    );
                    if ((benefit as any).service_id) {
                      return selectedQuotas.some(
                        (x: any) =>
                          !x.service_id ||
                          x.service_id === (benefit as any).service_id,
                      );
                    } else {
                      if (addonIds.length === 0) return false;
                      if (selectedQuotas.some((x: any) => !x.service_id))
                        return true;
                      const coveredIds = new Set(
                        selectedQuotas
                          .filter((x: any) => x.service_id)
                          .map((x: any) => x.service_id),
                      );
                      return addonIds.every((id) => coveredIds.has(id));
                    }
                  }
                  return false;
                })();
              const isDisabled = !canApply || blockedByQuota;
              const appliedBreakdown =
                isSelected && priceApplyResult?.breakdown
                  ? priceApplyResult.breakdown.filter(
                      (bd) => bd.benefit?._id === benefit._id,
                    )
                  : [];
              const liveDiscount = appliedBreakdown.reduce(
                (sum, bd) => sum + (bd.amount_deducted ?? 0),
                0,
              );
              const displayDiscount =
                isSelected && priceApplyResult
                  ? liveDiscount
                  : (benefit.amount_discount ?? 0);
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
                    onCheckedChange={() =>
                      (isSelected || !isDisabled) &&
                      toggleEditBenefit(benefit._id)
                    }
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
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/70">
                        {benefit.applies_to === "service"
                          ? `Service: ${(benefit as any).service?.name || availableServices.find((s) => s._id === editServiceId)?.name || booking.service_snapshot.name}`
                          : benefit.applies_to === "addon"
                            ? (benefit as any).service_id
                              ? `Addon: ${(benefit as any).service?.name || (booking.service_snapshot.addons ?? []).find((a) => a._id === (benefit as any).service_id)?.name || "Addon"}`
                              : `Addon: ${(booking.service_snapshot.addons ?? []).map((a) => a.name).join(", ") || "Semua addon"}`
                            : benefit.applies_to === "pickup"
                              ? `Berlaku: ${[booking.pick_up && "Pickup", booking.delivery && "Delivery", booking.type === "in home" && "Home Service"].filter(Boolean).join(" & ") || "Pickup/Delivery"}`
                              : benefit.applies_to}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {benefit.remaining !== null && (
                        <span
                          className={
                            benefit.remaining === 0 ? "text-destructive" : ""
                          }
                        >
                          Sisa: {benefit.remaining}/{benefit.limit ?? "∞"}
                        </span>
                      )}
                      {isSelected && loadingPriceApply ? (
                        <span className="h-3 w-12 animate-pulse rounded bg-green-200/60" />
                      ) : (
                        displayDiscount > 0 && (
                          <span
                            className={`font-medium ${isQuotaBenefit ? "text-blue-600" : "text-green-600"}`}
                          >
                            {isQuotaBenefit
                              ? "Gratis"
                              : `-${formatPrice(displayDiscount)}`}
                          </span>
                        )
                      )}
                    </div>
                    {!benefit.can_apply && !isSelected && (
                      <span className="text-[11px] text-destructive">
                        Tidak dapat digunakan saat ini
                      </span>
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

      {/* Promotion selection */}
      {pricePreviewData?.pricing?.available_promotions &&
        pricePreviewData.pricing.available_promotions.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              <p className="text-sm font-semibold text-foreground">Promosi</p>
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
                {pricePreviewData.pricing.available_promotions.length} tersedia
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {pricePreviewData.pricing.available_promotions.map((promo) => {
                const selected = editPromotionIds.includes(promo._id);
                const hasNonStackableSelected =
                  pricePreviewData.pricing.available_promotions.some(
                    (p) => editPromotionIds.includes(p._id) && !p.is_stackable,
                  );
                const blockedByStacking = !selected && hasNonStackableSelected;
                const blockedByBenefit = (() => {
                  if (
                    editBenefitIds.length === 0 ||
                    !pricePreviewData.pricing.available_benefits
                  )
                    return false;
                  return pricePreviewData.pricing.available_benefits.some(
                    (b: any) => {
                      if (!editBenefitIds.includes(b._id)) return false;
                      if (b.applies_to !== promo.applies_to) return false;
                      const bSid = b.service_id || null;
                      const pSid = promo.service_id || null;
                      return bSid === pSid;
                    },
                  );
                })();
                const isDisabled = blockedByStacking || blockedByBenefit;
                return (
                  <label
                    key={promo._id}
                    htmlFor={`edit-promo-${promo._id}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                      isDisabled
                        ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-50"
                        : selected
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20"
                          : "border-border bg-card hover:border-violet-400"
                    }`}
                  >
                    <Checkbox
                      id={`edit-promo-${promo._id}`}
                      checked={selected}
                      disabled={isDisabled}
                      onCheckedChange={() => {
                        if (isDisabled) return;
                        if (selected) {
                          setEditPromotionIds((prev) =>
                            prev.filter((id) => id !== promo._id),
                          );
                        } else {
                          if (!promo.is_stackable) {
                            setEditPromotionIds([promo._id]);
                          } else {
                            setEditPromotionIds((prev) => [...prev, promo._id]);
                          }
                        }
                      }}
                      className="mt-0.5 shrink-0"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {promo.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
                          {promo.code}
                        </span>
                        {promo.discount_type === "percent" ? (
                          <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                            {promo.value}% off
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                            Rp {promo.value.toLocaleString("id-ID")} off
                          </span>
                        )}
                        {!promo.is_stackable && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                            Non-stackable
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        {promo.description && <span>{promo.description}</span>}
                        <span className="capitalize">
                          Berlaku untuk:{" "}
                          {promo.applies_to === "booking"
                            ? "Semua"
                            : promo.service_name
                              ? `${promo.applies_to}: ${promo.service_name}`
                              : promo.applies_to === "service"
                                ? "Semua Service"
                                : promo.applies_to === "addon"
                                  ? "Semua Addon"
                                  : promo.applies_to === "pickup"
                                    ? "Pickup/Delivery"
                                    : promo.applies_to}
                        </span>
                      </div>
                      {blockedByStacking && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">
                          Tidak dapat digabung — promo non-stackable sudah
                          dipilih
                        </span>
                      )}
                      {blockedByBenefit && (
                        <span className="text-[11px] text-amber-600 dark:text-amber-400">
                          Tidak dapat digabung — benefit membership untuk target
                          yang sama sudah dipilih
                        </span>
                      )}
                    </div>
                    {promo.amount_discount > 0 && (
                      <span
                        className={`shrink-0 text-sm font-bold ${selected ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`}
                      >
                        - {formatPrice(promo.amount_discount)}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        )}

      {/* Live Preview */}
      <LivePreviewSection
        booking={booking}
        selectedAddonIds={selectedAddonIds}
        allServiceAddons={allServiceAddons}
        editPickup={editPickup}
        editDelivery={editDelivery}
        editServicePrice={editServicePrice}
        editServiceDiscount={editServiceDiscount}
        editServiceDiscountType={editServiceDiscountType}
        editTravelFee={editTravelFee}
        editTravelFeeDiscount={editTravelFeeDiscount}
        editTravelFeeDiscountType={editTravelFeeDiscountType}
        editAddonPrices={editAddonPrices}
        editAddonDiscounts={editAddonDiscounts}
        editAddonDiscountTypes={editAddonDiscountTypes}
        editBenefitIds={editBenefitIds}
        pricePreviewData={pricePreviewData}
        priceApplyResult={priceApplyResult}
        loadingPriceApply={loadingPriceApply}
        editPromotionIds={editPromotionIds}
        pricePromoResult={pricePromoResult}
        loadingPricePromo={loadingPricePromo}
      />

      {/* Save / Cancel buttons */}
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onClose}
          disabled={savingPrice}
        >
          Batal
        </Button>
        <Button size="sm" onClick={handleSavePricing} disabled={savingPrice}>
          {savingPrice && (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          )}
          Simpan Harga
        </Button>
      </div>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ItemPriceEditor({
  label,
  labelIcon,
  baseValue,
  onBaseChange,
  discountValue,
  onDiscountChange,
  discountType,
  onDiscountTypeChange,
  effectivePrice,
}: {
  label: string;
  labelIcon?: React.ReactNode;
  baseValue: string;
  onBaseChange: (v: string) => void;
  discountValue: string;
  onDiscountChange: (v: string) => void;
  discountType: "nominal" | "pct";
  onDiscountTypeChange: (t: "nominal" | "pct") => void;
  effectivePrice: number;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-card p-3">
      <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        {labelIcon}
        {label}
      </span>
      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Harga Dasar
          </span>
          <Input
            type="number"
            min={0}
            className="h-8 bg-background"
            placeholder="Harga dasar"
            value={baseValue}
            onChange={(e) => onBaseChange(e.target.value)}
          />
        </div>
        <span className="mb-1.5 shrink-0 text-sm text-muted-foreground">−</span>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Diskon Item
          </span>
          <div className="flex gap-1">
            <Input
              type="number"
              min={0}
              max={discountType === "pct" ? 100 : undefined}
              className="h-8 min-w-0 flex-1 bg-background"
              placeholder={discountType === "pct" ? "0–100" : "0"}
              value={discountValue}
              onChange={(e) => onDiscountChange(e.target.value)}
            />
            <div className="flex h-8 shrink-0 overflow-hidden rounded-md border border-border">
              <button
                type="button"
                onClick={() => onDiscountTypeChange("nominal")}
                className={`px-1.5 text-xs font-semibold transition-colors ${discountType === "nominal" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                Rp
              </button>
              <button
                type="button"
                onClick={() => onDiscountTypeChange("pct")}
                className={`border-l border-border px-1.5 text-xs font-semibold transition-colors ${discountType === "pct" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
              >
                %
              </button>
            </div>
          </div>
        </div>
        <span className="mb-1.5 shrink-0 text-sm text-muted-foreground">=</span>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Efektif
          </span>
          <span className="mb-0.5 text-sm font-semibold text-primary">
            {formatPrice(effectivePrice)}
          </span>
        </div>
      </div>
    </div>
  );
}

function LivePreviewSection({
  booking,
  selectedAddonIds,
  allServiceAddons,
  editPickup,
  editDelivery,
  editServicePrice,
  editServiceDiscount,
  editServiceDiscountType,
  editTravelFee,
  editTravelFeeDiscount,
  editTravelFeeDiscountType,
  editAddonPrices,
  editAddonDiscounts,
  editAddonDiscountTypes,
  editBenefitIds,
  pricePreviewData,
  priceApplyResult,
  loadingPriceApply,
  editPromotionIds,
  pricePromoResult,
  loadingPricePromo,
}: {
  booking: AdminBooking;
  selectedAddonIds: string[];
  allServiceAddons: {
    _id: string;
    name: string;
    code?: string;
    price?: number;
  }[];
  editPickup: boolean;
  editDelivery: boolean;
  editServicePrice: string;
  editServiceDiscount: string;
  editServiceDiscountType: "nominal" | "pct";
  editTravelFee: string;
  editTravelFeeDiscount: string;
  editTravelFeeDiscountType: "nominal" | "pct";
  editAddonPrices: Record<string, string>;
  editAddonDiscounts: Record<string, string>;
  editAddonDiscountTypes: Record<string, "nominal" | "pct">;
  editBenefitIds: string[];
  pricePreviewData: BookingPreviewResult | null;
  priceApplyResult: ApplyBenefitPreviewResult | null;
  loadingPriceApply: boolean;
  editPromotionIds: string[];
  pricePromoResult: ApplyPromotionPreviewResult | null;
  loadingPricePromo: boolean;
}) {
  const svcBase =
    parseFloat(editServicePrice) || booking.service_snapshot.price || 0;
  const rawSvcDisc = parseFloat(editServiceDiscount) || 0;
  const svcDisc =
    editServiceDiscountType === "pct"
      ? Math.min(svcBase, (rawSvcDisc / 100) * svcBase)
      : Math.min(svcBase, rawSvcDisc);
  const tFeeBase =
    editPickup || editDelivery || booking.type === "in home"
      ? parseFloat(editTravelFee) || booking.travel_fee || 0
      : 0;
  const rawTFeeDisc =
    editPickup || editDelivery || booking.type === "in home"
      ? parseFloat(editTravelFeeDiscount) || 0
      : 0;
  const tFeeDisc =
    editTravelFeeDiscountType === "pct"
      ? Math.min(tFeeBase, (rawTFeeDisc / 100) * tFeeBase)
      : Math.min(tFeeBase, rawTFeeDisc);
  const addonBase = selectedAddonIds.reduce((sum, addonId) => {
    const snapshotAddon = (booking.service_snapshot.addons ?? []).find(
      (a) => a._id === addonId,
    );
    const liveAddon = allServiceAddons.find((a) => a._id === addonId);
    const defaultPrice = snapshotAddon?.price ?? liveAddon?.price ?? 0;
    return (
      sum +
      (parseFloat(editAddonPrices[addonId] ?? String(defaultPrice)) ||
        defaultPrice ||
        0)
    );
  }, 0);
  const addonItemDisc = selectedAddonIds.reduce((sum, addonId) => {
    const snapshotAddon = (booking.service_snapshot.addons ?? []).find(
      (a) => a._id === addonId,
    );
    const liveAddon = allServiceAddons.find((a) => a._id === addonId);
    const defaultPrice = snapshotAddon?.price ?? liveAddon?.price ?? 0;
    const base =
      parseFloat(editAddonPrices[addonId] ?? String(defaultPrice)) ||
      defaultPrice ||
      0;
    const rawDisc = parseFloat(editAddonDiscounts[addonId] ?? "0") || 0;
    const discType = editAddonDiscountTypes[addonId] ?? "nominal";
    return (
      sum +
      (discType === "pct"
        ? Math.min(base, (rawDisc / 100) * base)
        : Math.min(base, rawDisc))
    );
  }, 0);
  const originalTotal = svcBase + tFeeBase + addonBase;
  const itemDiscountTotal = svcDisc + tFeeDisc + addonItemDisc;
  const benefitDiscount =
    priceApplyResult?.total_discount ??
    (() => {
      if (
        editBenefitIds.length === 0 ||
        !pricePreviewData?.pricing?.available_benefits
      )
        return 0;
      return pricePreviewData.pricing.available_benefits
        .filter((b: any) => editBenefitIds.includes(b._id) && b.can_apply)
        .reduce((sum: number, b: any) => sum + (b.amount_discount ?? 0), 0);
    })();
  const promoDiscount = pricePromoResult?.total_discount ?? 0;
  const effectiveSubtotal = Math.max(0, originalTotal - itemDiscountTotal);
  const previewTotal = Math.max(
    0,
    effectiveSubtotal - benefitDiscount - promoDiscount,
  );

  return (
    <div className="divide-y divide-border/40 overflow-hidden rounded-lg border border-border/50 bg-card">
      <div className="flex items-center justify-between px-4 py-2.5 text-sm">
        <span className="text-muted-foreground">Subtotal Harga Dasar</span>
        <span className="font-medium">{formatPrice(originalTotal)}</span>
      </div>
      {itemDiscountTotal > 0 && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-4 py-2.5 text-sm">
            <span className="flex items-center gap-1.5 font-medium text-orange-600 dark:text-orange-400">
              <Pencil className="h-3.5 w-3.5" />
              Diskon Admin
            </span>
            <span className="font-semibold text-orange-600 dark:text-orange-400">
              - {formatPrice(itemDiscountTotal)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
            {svcDisc > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate pr-4">
                  {booking.service_snapshot.name}
                </span>
                <span className="shrink-0">- {formatPrice(svcDisc)}</span>
              </div>
            )}
            {selectedAddonIds.map((addonId) => {
              const snapshotAddon = (
                booking.service_snapshot.addons ?? []
              ).find((a) => a._id === addonId);
              const liveAddon = allServiceAddons.find((a) => a._id === addonId);
              const addonName =
                snapshotAddon?.name ?? liveAddon?.name ?? addonId;
              const defaultPrice =
                snapshotAddon?.price ?? liveAddon?.price ?? 0;
              const base =
                parseFloat(editAddonPrices[addonId] ?? String(defaultPrice)) ||
                defaultPrice ||
                0;
              const rawDisc =
                parseFloat(editAddonDiscounts[addonId] ?? "0") || 0;
              const discType = editAddonDiscountTypes[addonId] ?? "nominal";
              const disc =
                discType === "pct"
                  ? Math.min(base, (rawDisc / 100) * base)
                  : Math.min(base, rawDisc);
              if (disc <= 0) return null;
              return (
                <div
                  key={addonId}
                  className="flex items-center justify-between text-xs text-muted-foreground"
                >
                  <span className="truncate pr-4">+ {addonName}</span>
                  <span className="shrink-0">- {formatPrice(disc)}</span>
                </div>
              );
            })}
            {tFeeDisc > 0 && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate pr-4">
                  {booking.type === "in home"
                    ? "Home Service"
                    : "Pickup/Delivery"}
                </span>
                <span className="shrink-0">- {formatPrice(tFeeDisc)}</span>
              </div>
            )}
          </div>
        </div>
      )}
      {editBenefitIds.length > 0 &&
        (loadingPriceApply || benefitDiscount > 0) && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm border-t border-green-200/50 dark:border-green-800/30">
              <span className="flex items-center gap-1.5 font-medium text-green-600">
                <Gift className="h-3.5 w-3.5" />
                Diskon Membership
              </span>
              {loadingPriceApply ? (
                <span className="h-4 w-20 animate-pulse rounded bg-primary/20" />
              ) : (
                <span className="font-semibold text-green-600">
                  - {formatPrice(benefitDiscount)}
                </span>
              )}
            </div>
            {!loadingPriceApply &&
              (priceApplyResult?.breakdown?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                  {priceApplyResult!.breakdown.map((item, idx) => {
                    const bLabel =
                      item.benefit?.label ||
                      item.description ||
                      item.applies_to;
                    let itemName: string | null = null;
                    if (item.applies_to === "service") {
                      itemName =
                        pricePreviewData?.pricing_breakdown?.service?.name ??
                        item.benefit?.service?.name ??
                        null;
                    } else if (item.applies_to === "addon") {
                      const addonMatch =
                        pricePreviewData?.pricing_breakdown?.addons?.find(
                          (a) => a._id === (item as any).service_id,
                        ) ??
                        pricePreviewData?.pricing?.addon_prices?.find(
                          (a: any) => a._id === (item as any).service_id,
                        );
                      itemName =
                        addonMatch?.name ?? item.benefit?.service?.name ?? null;
                    } else if (
                      item.applies_to === "pick_up" ||
                      item.applies_to === "pickup" ||
                      item.applies_to === "travel_fee"
                    ) {
                      itemName =
                        booking.type === "in home"
                          ? "Home Service"
                          : "Pickup/Delivery";
                    }
                    if (!itemName) {
                      itemName = item.benefit?.service?.name ?? null;
                    }
                    const displayLabel = itemName
                      ? `${bLabel}: ${itemName}`
                      : bLabel;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span className="flex items-center gap-1.5 truncate pr-4">
                          {item.benefit_type === "quota" ? (
                            <span className="shrink-0 rounded bg-blue-100 px-1 py-px text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                              GRATIS
                            </span>
                          ) : (
                            <span className="shrink-0 rounded bg-green-100 px-1 py-px text-[9px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                              {item.benefit_value != null
                                ? `${item.benefit_value}%`
                                : "DISC"}
                            </span>
                          )}
                          {displayLabel}
                        </span>
                        <span className="shrink-0">
                          - {formatPrice(item.amount_deducted)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            {!loadingPriceApply &&
              !priceApplyResult &&
              benefitDiscount > 0 &&
              pricePreviewData?.pricing?.available_benefits && (
                <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                  {pricePreviewData.pricing.available_benefits
                    .filter(
                      (b: any) =>
                        editBenefitIds.includes(b._id) &&
                        b.can_apply &&
                        (b.amount_discount ?? 0) > 0,
                    )
                    .map((b: any) => {
                      const bLabel = b.label || b.description || b.applies_to;
                      let itemName: string | null = null;
                      if (b.applies_to === "service") {
                        itemName =
                          pricePreviewData?.pricing_breakdown?.service?.name ??
                          b.service?.name ??
                          null;
                      } else if (b.applies_to === "addon") {
                        const addonMatch =
                          pricePreviewData?.pricing_breakdown?.addons?.find(
                            (a: any) => a._id === b.service_id,
                          ) ??
                          pricePreviewData?.pricing?.addon_prices?.find(
                            (a: any) => a._id === b.service_id,
                          );
                        itemName = addonMatch?.name ?? b.service?.name ?? null;
                      } else if (
                        b.applies_to === "pick_up" ||
                        b.applies_to === "pickup" ||
                        b.applies_to === "travel_fee"
                      ) {
                        itemName =
                          booking.type === "in home"
                            ? "Home Service"
                            : "Pickup/Delivery";
                      }
                      if (!itemName) {
                        itemName = b.service?.name ?? null;
                      }
                      const displayLabel = itemName
                        ? `${bLabel}: ${itemName}`
                        : bLabel;
                      return (
                        <div
                          key={b._id}
                          className="flex items-center justify-between text-xs text-muted-foreground"
                        >
                          <span className="flex items-center gap-1.5 truncate pr-4">
                            {b.type === "quota" ? (
                              <span className="shrink-0 rounded bg-blue-100 px-1 py-px text-[9px] font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-400">
                                GRATIS
                              </span>
                            ) : (
                              <span className="shrink-0 rounded bg-green-100 px-1 py-px text-[9px] font-bold text-green-700 dark:bg-green-950/50 dark:text-green-400">
                                {b.value != null ? `${b.value}%` : "DISC"}
                              </span>
                            )}
                            {displayLabel}
                          </span>
                          <span className="shrink-0">
                            - {formatPrice(b.amount_discount)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>
        )}
      {/* Promotion discount row */}
      {editPromotionIds.length > 0 &&
        (loadingPricePromo || promoDiscount > 0) && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 text-sm border-t border-violet-200/50 dark:border-violet-800/30">
              <span className="flex items-center gap-1.5 font-medium text-violet-600 dark:text-violet-400">
                <Tag className="h-3.5 w-3.5" />
                Diskon Promosi
              </span>
              {loadingPricePromo ? (
                <span className="h-4 w-20 animate-pulse rounded bg-violet-200 dark:bg-violet-800" />
              ) : (
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  - {formatPrice(promoDiscount)}
                </span>
              )}
            </div>
            {!loadingPricePromo &&
              pricePromoResult &&
              pricePromoResult.breakdown.length > 0 && (
                <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                  {pricePromoResult.breakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs text-muted-foreground"
                    >
                      <span className="flex items-center gap-1.5 truncate pr-4">
                        <span className="shrink-0 rounded bg-violet-100 px-1 py-px text-[9px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-400">
                          {item.code}
                        </span>
                        {item.name}
                      </span>
                      <span className="shrink-0">
                        - {formatPrice(item.amount_deducted)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      <div className="flex items-center justify-between bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
        <span>Total Baru</span>
        {(loadingPriceApply && editBenefitIds.length > 0) ||
        (loadingPricePromo && editPromotionIds.length > 0) ? (
          <span className="h-5 w-24 animate-pulse rounded bg-primary/20" />
        ) : (
          <span className="text-base">{formatPrice(previewTotal)}</span>
        )}
      </div>
    </div>
  );
}
