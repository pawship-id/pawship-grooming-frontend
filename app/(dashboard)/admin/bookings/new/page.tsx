"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { StepHeader, LockedSection } from "@/components/booking/step-header";
import { getStores, getStoreById } from "@/lib/api/stores";
import type { ApiStore } from "@/lib/api/stores";
import { getUsers, getUser } from "@/lib/api/users";
import type { ApiUser, ApiPet } from "@/lib/api/users";
import { getAdminServices } from "@/lib/api/services";
import type { AdminService } from "@/lib/api/services";
import { getServiceTypes } from "@/lib/api/service-types";
import type { ApiServiceType } from "@/lib/api/service-types";
import {
  createAdminBooking,
  getBookingPreview,
  applyBenefitPreview,
  applyPromotionPreview,
} from "@/lib/api/bookings";
import type {
  BookingPreviewResult,
  ApplyBenefitPreviewResult,
  ApplyPromotionPreviewResult,
} from "@/lib/api/bookings";

import { StepCustomerPet } from "./_components/step-customer-pet";
import { StepStoreSchedule } from "./_components/step-store-schedule";
import { StepServiceAddons } from "./_components/step-service-addons";
import { StepPricePreview } from "./_components/step-price-preview";
import { StepNotesPayment } from "./_components/step-notes-payment";

// ── Default form ───────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  store_id: "",
  service_type_id: "",
  customer_id: "",
  pet_id: "",
  service_id: "",
  date: "",
  time_range: "",
  type: "",
  referal_code: "",
  payment_method: "",
  note: "",
};

// ── Page Component ─────────────────────────────────────────────────────────────

export default function NewBookingPage() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [selectedBenefitIds, setSelectedBenefitIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [customPaymentMethod, setCustomPaymentMethod] = useState("");

  const [stores, setStores] = useState<ApiStore[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ApiServiceType[]>([]);
  const [customers, setCustomers] = useState<ApiUser[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOpen, setCustomerOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [sessions, setSessions] = useState<string[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);
  const [pets, setPets] = useState<ApiPet[]>([]);
  const [allStoreServices, setAllStoreServices] = useState<AdminService[]>([]);

  const [previewData, setPreviewData] = useState<BookingPreviewResult | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [applyBenefitResult, setApplyBenefitResult] =
    useState<ApplyBenefitPreviewResult | null>(null);
  const [loadingApplyBenefit, setLoadingApplyBenefit] = useState(false);

  const [selectedPromotionIds, setSelectedPromotionIds] = useState<string[]>(
    [],
  );
  const [applyPromotionResult, setApplyPromotionResult] =
    useState<ApplyPromotionPreviewResult | null>(null);
  const [loadingApplyPromotion, setLoadingApplyPromotion] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingStore, setLoadingStore] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingPets, setLoadingPets] = useState(false);

  const [isPickup, setIsPickup] = useState(false);
  const [isDelivery, setIsDelivery] = useState(false);

  // ── Initial data ─────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      getStores({ page: 1, limit: 100, is_active: "true" }),
      getServiceTypes({ is_active: "true" }),
    ])
      .then(([storesRes, typesRes]) => {
        setStores(storesRes.stores);
        setServiceTypes(typesRes.serviceTypes);
      })
      .catch(() => toast.error("Gagal memuat data awal"))
      .finally(() => setLoadingInit(false));
  }, []);

  // ── Customer search with debounce ──────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(
      () => {
        setLoadingCustomers(true);
        getUsers({
          page: 1,
          limit: 20,
          role: "customer",
          search: customerSearch || undefined,
        })
          .then((res) => setCustomers(res.users))
          .catch(() => {})
          .finally(() => setLoadingCustomers(false));
      },
      customerSearch ? 400 : 0,
    );
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // ── Data fetchers ────────────────────────────────────────────────────────────

  const fetchServices = async (
    storeId: string,
    typeId: string,
    locationType?: string,
  ) => {
    setLoadingServices(true);
    try {
      const params: any = {
        store_id: storeId,
        service_type_id: typeId,
        is_active: "true",
        limit: 100,
      };
      if (locationType) params.service_location_type = locationType;
      const res = await getAdminServices(params);
      setServices(res.services);
    } catch {
      toast.error("Gagal memuat layanan");
    } finally {
      setLoadingServices(false);
    }
  };

  const fetchAllStoreServices = async (storeId: string) => {
    try {
      const res = await getAdminServices({
        store_id: storeId,
        is_active: "true",
        limit: 500,
      });
      setAllStoreServices(res.services);
    } catch {
      // fail silently
    }
  };

  // ── Change handlers ──────────────────────────────────────────────────────────

  const handleStoreChange = async (storeId: string) => {
    setForm((p) => ({
      ...p,
      store_id: storeId,
      time_range: "",
      type: "",
      service_id: "",
    }));
    setSelectedAddonIds([]);
    setSessions([]);
    setServices([]);
    setAllStoreServices([]);
    setIsPickup(false);
    setIsDelivery(false);
    if (!storeId) return;
    setLoadingStore(true);
    try {
      const [storeRes] = await Promise.all([
        getStoreById(storeId),
        fetchAllStoreServices(storeId),
      ]);
      setSessions(storeRes.store.sessions ?? []);
    } catch {
      toast.error("Gagal memuat data store");
    } finally {
      setLoadingStore(false);
    }
  };

  const handleServiceTypeChange = async (typeId: string) => {
    setForm((p) => ({ ...p, service_type_id: typeId, service_id: "" }));
    setSelectedAddonIds([]);
    setServices([]);
    setIsPickup(false);
    setIsDelivery(false);
    if (form.store_id && form.type && typeId)
      await fetchServices(form.store_id, typeId, form.type);
  };

  const handleCustomerChange = async (customerId: string) => {
    setForm((p) => ({ ...p, customer_id: customerId, pet_id: "" }));
    setPets([]);
    if (!customerId) return;
    setLoadingPets(true);
    try {
      const res = await getUser(customerId);
      setPets(res.user.pets ?? []);
    } catch {
      toast.error("Gagal memuat data hewan customer");
    } finally {
      setLoadingPets(false);
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────

  const selectedCustomer = customers.find((c) => c._id === form.customer_id);
  const selectedPet = pets.find((p) => p._id === form.pet_id);
  const selectedStore = stores.find((s) => s._id === form.store_id);
  const selectedServiceType = serviceTypes.find(
    (t) => t._id === form.service_type_id,
  );
  const selectedService = services.find((s) => s._id === form.service_id);

  const isAddonServiceType = selectedServiceType?.title
    ? selectedServiceType.title.toLowerCase().includes("addons")
    : false;

  const addons = selectedService?.addons ?? [];

  const pickupDeliveryAvailableForStore =
    selectedStore?.is_pickup_delivery_available === true;
  const hasPickupDeliveryZones =
    (selectedStore?.pickup_delivery_zones ?? []).length > 0;
  const pickupDeliveryAvailableForService =
    selectedService?.is_pickup_delivery_available === true;

  const mainAddress = selectedCustomer?.profile?.addresses?.find(
    (addr) => addr.is_main_address,
  );
  const customerHasLocation = !!(
    mainAddress?.latitude && mainAddress?.longitude
  );

  const canUsePickupDelivery =
    form.type === "in store" &&
    pickupDeliveryAvailableForStore &&
    pickupDeliveryAvailableForService &&
    hasPickupDeliveryZones &&
    customerHasLocation;

  // ── Step gates ───────────────────────────────────────────────────────────────

  const step1Done = !!form.customer_id && !!form.pet_id;
  const step2Done =
    step1Done &&
    !!form.store_id &&
    !!form.type &&
    !!form.date &&
    !!form.time_range;
  const step3Done = step2Done && !!form.service_type_id && !!form.service_id;

  // ── Toggle handlers ──────────────────────────────────────────────────────────

  const toggleAddon = (id: string) =>
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );

  const toggleBenefit = (id: string) => {
    if (!previewData) {
      setSelectedBenefitIds((prev) =>
        prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
      );
      return;
    }
    const benefit = previewData.pricing.available_benefits.find(
      (x: any) => x._id === id,
    );
    if (!benefit) {
      setSelectedBenefitIds((prev) =>
        prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
      );
      return;
    }
    setSelectedBenefitIds((prev) => {
      if (prev.includes(id)) return prev.filter((b) => b !== id);
      // When adding a benefit, auto-remove conflicting benefits on the same target
      const conflicts = prev.filter((selId) => {
        const sel = previewData.pricing.available_benefits.find(
          (x: any) => x._id === selId,
        );
        if (!sel || sel.applies_to !== benefit.applies_to) return false;
        if (benefit.type === sel.type) return false;
        if (benefit.applies_to === "service") {
          const quotaTarget =
            (benefit.type === "quota" ? benefit : sel).service_id ||
            form.service_id;
          const discountTarget =
            (benefit.type === "discount" ? benefit : sel).service_id ||
            form.service_id;
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
            const alreadyCoveredByOtherQuotas = prev
              .filter((sid) => sid !== id)
              .map((sid) =>
                previewData.pricing.available_benefits.find(
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
            const coveredAfter = new Set([
              ...alreadyCoveredByOtherQuotas,
              quotaTarget,
            ]);
            return (
              selectedAddonIds.length > 0 &&
              selectedAddonIds.every((aid) => coveredAfter.has(aid))
            );
          }
          if (!quotaTarget && discountTarget) return true;
          return true;
        }
        return false;
      });
      return [...prev.filter((b) => !conflicts.includes(b)), id];
    });
  };

  // ── Preview: auto-fetch whenever pet / service / addons / date change ───────

  useEffect(() => {
    if (!form.pet_id || !form.service_id || !form.date) {
      setPreviewData(null);
      setPreviewError(null);
      setSelectedBenefitIds([]);
      return;
    }
    let cancelled = false;
    setLoadingPreview(true);
    setPreviewData(null);
    setPreviewError(null);
    setSelectedBenefitIds([]);
    setApplyBenefitResult(null);

    const isInHomeService = form.type === "in home";
    const needsPickupDelivery = !isInHomeService && (isPickup || isDelivery);
    const needsLocation = isInHomeService || needsPickupDelivery;

    getBookingPreview({
      pet_id: form.pet_id,
      service_id: form.service_id,
      addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      date: form.date,
      time_range: form.time_range || undefined,
      service_location_type: form.type || undefined,
      pick_up: needsPickupDelivery ? isPickup : undefined,
      delivery: needsPickupDelivery ? isDelivery : undefined,
      store_id: needsLocation ? form.store_id : undefined,
      customer_id: needsLocation ? form.customer_id : undefined,
    })
      .then((res) => {
        if (!cancelled) setPreviewData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setPreviewError(
            err instanceof Error ? err.message : "Gagal memuat preview",
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    form.pet_id,
    form.service_id,
    form.date,
    form.time_range,
    form.store_id,
    form.customer_id,
    form.type,
    selectedAddonIds,
    isPickup,
    isDelivery,
  ]);

  // ── Apply benefit: auto-fetch whenever benefit selection changes ──────────

  useEffect(() => {
    if (!form.pet_id || !form.service_id) return;
    if (selectedBenefitIds.length === 0) {
      setApplyBenefitResult(null);
      setLoadingApplyBenefit(false);
      return;
    }
    let cancelled = false;
    setLoadingApplyBenefit(true);

    const isInHomeService = form.type === "in home";
    const needsPickupDelivery = !isInHomeService && (isPickup || isDelivery);

    applyBenefitPreview({
      pet_id: form.pet_id,
      selected_benefit_ids: selectedBenefitIds,
      service_id: form.service_id,
      add_on_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      store_id:
        isInHomeService || needsPickupDelivery ? form.store_id : undefined,
      original_total_price: previewData?.pricing_breakdown?.grand_total,
      booking_date: form.date || undefined,
      pick_up: needsPickupDelivery ? isPickup : undefined,
      delivery: needsPickupDelivery ? isDelivery : undefined,
    })
      .then((res) => {
        if (!cancelled) setApplyBenefitResult(res);
      })
      .catch(() => {
        if (!cancelled) setApplyBenefitResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingApplyBenefit(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedBenefitIds,
    form.pet_id,
    form.service_id,
    form.type,
    form.store_id,
    selectedAddonIds,
    isPickup,
    isDelivery,
  ]);

  // ── Apply promotion: auto-fetch whenever promotion selection changes ──────

  useEffect(() => {
    if (!form.service_id || !previewData) return;
    if (selectedPromotionIds.length === 0) {
      setApplyPromotionResult(null);
      setLoadingApplyPromotion(false);
      return;
    }
    let cancelled = false;
    setLoadingApplyPromotion(true);

    const isInHomeService = form.type === "in home";
    const needsPickupDelivery = !isInHomeService && (isPickup || isDelivery);

    applyPromotionPreview({
      selected_promotion_ids: selectedPromotionIds,
      service_id: form.service_id,
      addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      original_service_price: previewData.pricing.original_service_price,
      travel_fee: previewData.pricing_breakdown.travel_fee ?? 0,
      grand_total: previewData.pricing_breakdown.grand_total,
      pick_up: needsPickupDelivery ? isPickup : undefined,
      delivery: needsPickupDelivery ? isDelivery : undefined,
      has_active_membership: previewData.pricing.has_active_membership,
      addon_prices: previewData.pricing.addon_prices,
      customer_id: form.customer_id || undefined,
      pet_id: form.pet_id || undefined,
      booking_date: form.date || undefined,
    })
      .then((res) => {
        if (!cancelled) setApplyPromotionResult(res);
      })
      .catch(() => {
        if (!cancelled) setApplyPromotionResult(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingApplyPromotion(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    selectedPromotionIds,
    form.service_id,
    form.type,
    form.customer_id,
    form.pet_id,
    form.date,
    selectedAddonIds,
    isPickup,
    isDelivery,
    previewData,
  ]);

  // Reset promotion selection when preview data changes
  useEffect(() => {
    setSelectedPromotionIds([]);
    setApplyPromotionResult(null);
  }, [form.service_id, selectedAddonIds.length]);

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step3Done) {
      toast.error("Lengkapi semua langkah wajib terlebih dahulu");
      return;
    }
    setSubmitting(true);
    try {
      const isInHomeService = form.type === "in home";

      const result = await createAdminBooking({
        service_type_id: form.service_type_id,
        customer_id: form.customer_id,
        pet_id: form.pet_id,
        store_id: form.store_id,
        service_id: form.service_id,
        date: form.date,
        time_range: form.time_range,
        type: form.type as "in home" | "in store",
        service_addon_ids:
          selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
        pick_up: !isInHomeService && isPickup ? true : undefined,
        delivery: !isInHomeService && isDelivery ? true : undefined,
        selected_benefit_ids:
          selectedBenefitIds.length > 0 ? selectedBenefitIds : undefined,
        selected_promotion_ids:
          selectedPromotionIds.length > 0 ? selectedPromotionIds : undefined,
        referal_code: form.referal_code || undefined,
        payment_method:
          form.payment_method === "other"
            ? customPaymentMethod.trim() || undefined
            : form.payment_method || undefined,
        note: form.note || undefined,
      });
      toast.success("Booking berhasil dibuat");
      router.push(
        result?._id ? `/admin/bookings/${result._id}` : "/admin/bookings",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal membuat booking";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/bookings"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            New Booking
          </h1>
          <p className="text-sm text-muted-foreground">
            Buat jadwal grooming baru
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* ── Step 1: Customer & Pet ─────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <StepHeader step={1} title="Pilih Customer & Pet" done={step1Done} />
          <StepCustomerPet
            form={form}
            setForm={setForm}
            customers={customers}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            customerOpen={customerOpen}
            setCustomerOpen={setCustomerOpen}
            loadingCustomers={loadingCustomers}
            handleCustomerChange={handleCustomerChange}
            selectedCustomer={selectedCustomer}
            loadingInit={loadingInit}
            pets={pets}
            loadingPets={loadingPets}
            selectedPet={selectedPet}
          />
        </section>

        <Separator />

        {/* ── Step 2: Store & Jadwal ─────────────────────────────────────── */}
        {!step1Done ? (
          <LockedSection step={2} title="Store & Jadwal" />
        ) : (
          <section className="flex flex-col gap-4">
            <StepHeader step={2} title="Store & Jadwal" done={step2Done} />
            <StepStoreSchedule
              form={form}
              setForm={setForm}
              stores={stores}
              selectedStore={selectedStore}
              sessions={sessions}
              loadingInit={loadingInit}
              loadingStore={loadingStore}
              handleStoreChange={handleStoreChange}
              fetchServices={fetchServices}
              resetServiceState={() => {
                setServices([]);
                setSelectedAddonIds([]);
                setIsPickup(false);
              }}
            />
          </section>
        )}

        <Separator />

        {/* ── Step 3: Layanan & Add-ons ──────────────────────────────────── */}
        {!step2Done ? (
          <LockedSection step={3} title="Layanan & Add-ons" />
        ) : (
          <section className="flex flex-col gap-4">
            <StepHeader step={3} title="Layanan & Add-ons" done={step3Done} />
            <StepServiceAddons
              form={form}
              setForm={setForm}
              serviceTypes={serviceTypes}
              selectedServiceType={selectedServiceType}
              services={services}
              loadingServices={loadingServices}
              loadingInit={loadingInit}
              handleServiceTypeChange={handleServiceTypeChange}
              selectedService={selectedService}
              selectedPet={selectedPet}
              selectedStore={selectedStore}
              addons={addons}
              selectedAddonIds={selectedAddonIds}
              toggleAddon={toggleAddon}
              allStoreServices={allStoreServices}
              isAddonServiceType={isAddonServiceType}
              canUsePickupDelivery={canUsePickupDelivery}
              pickupDeliveryAvailableForService={
                pickupDeliveryAvailableForService
              }
              pickupDeliveryAvailableForStore={pickupDeliveryAvailableForStore}
              hasPickupDeliveryZones={hasPickupDeliveryZones}
              customerHasLocation={customerHasLocation}
              isPickup={isPickup}
              isDelivery={isDelivery}
              handlePickupToggle={(checked) => setIsPickup(checked)}
              handleDeliveryToggle={(checked) => setIsDelivery(checked)}
              resetPickupDelivery={() => {
                setSelectedAddonIds([]);
                setIsPickup(false);
                setIsDelivery(false);
              }}
            />
          </section>
        )}

        <Separator />

        {/* ── Step 4: Preview Harga & Benefit ────────────────────────────── */}
        {!step3Done ? (
          <LockedSection step={4} title="Preview Harga & Benefit" />
        ) : (
          <section className="flex flex-col gap-4">
            <StepHeader
              step={4}
              title="Preview Harga & Benefit"
              done={!!previewData}
            />
            <Card className="border-border/50">
              <CardContent className="pt-6">
                <StepPricePreview
                  form={form}
                  previewData={previewData}
                  previewError={previewError}
                  loadingPreview={loadingPreview}
                  selectedBenefitIds={selectedBenefitIds}
                  toggleBenefit={toggleBenefit}
                  selectedAddonIds={selectedAddonIds}
                  selectedPromotionIds={selectedPromotionIds}
                  setSelectedPromotionIds={setSelectedPromotionIds}
                  applyBenefitResult={applyBenefitResult}
                  loadingApplyBenefit={loadingApplyBenefit}
                  applyPromotionResult={applyPromotionResult}
                  loadingApplyPromotion={loadingApplyPromotion}
                  isPickup={isPickup}
                  isDelivery={isDelivery}
                />
              </CardContent>
            </Card>
          </section>
        )}

        <Separator />

        {/* ── Step 5: Catatan & Info Tambahan ────────────────────────────── */}
        {!step3Done ? (
          <LockedSection step={5} title="Catatan & Info Tambahan" />
        ) : (
          <section className="flex flex-col gap-4">
            <StepHeader
              step={5}
              title="Catatan & Info Tambahan"
              done={!!(form.note || form.payment_method || form.referal_code)}
            />
            <StepNotesPayment
              form={form}
              setForm={setForm}
              customPaymentMethod={customPaymentMethod}
              setCustomPaymentMethod={setCustomPaymentMethod}
            />
          </section>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            className="font-display font-bold"
            disabled={submitting || !step3Done}
          >
            {submitting ? "Menyimpan..." : "Buat Booking"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/bookings">Batal</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
