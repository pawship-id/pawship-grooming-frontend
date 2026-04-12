"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  Check,
  Lock,
  ChevronsUpDown,
  Loader2,
  Mail,
  Phone,
  Clock,
  MapPin,
  CalendarDays,
  Tag,
  Weight,
  Cake,
  Info,
  Star,
  Sparkles,
  Gift,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { getStores, getStoreById } from "@/lib/api/stores";
import type { ApiStore } from "@/lib/api/stores";
import { getUsers, getUser } from "@/lib/api/users";
import type { ApiUser, ApiPet } from "@/lib/api/users";
import { getAdminServices } from "@/lib/api/services";
import type { AdminService, AdminServicePrice } from "@/lib/api/services";
import { getServiceTypes } from "@/lib/api/service-types";
import type { ApiServiceType } from "@/lib/api/service-types";
import {
  createAdminBooking,
  getBookingPreview,
  applyBenefitPreview,
} from "@/lib/api/bookings";
import type {
  BookingPreviewResult,
  BookingPreviewBenefit,
  ApplyBenefitPreviewResult,
} from "@/lib/api/bookings";

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

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

/** Cek apakah baris harga cocok dengan pet yang dipilih (semua ID yang diset harus match) */
function isPriceMatchingPet(price: AdminServicePrice, pet: ApiPet): boolean {
  const petTypeMatch =
    !price.pet_type_id || price.pet_type_id === pet.pet_type?._id;
  const sizeMatch = !price.size_id || price.size_id === pet.size?._id;
  const hairMatch = !price.hair_id || price.hair_id === pet.hair?._id;
  return petTypeMatch && sizeMatch && hairMatch;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded-sm bg-primary/20 text-foreground">
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && (
        <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      )}
      <span className="shrink-0 text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function StepHeader({
  step,
  title,
  done,
}: {
  step: number;
  title: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          done
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : step}
      </span>
      <h2 className="font-display text-lg font-bold text-foreground">
        {title}
      </h2>
    </div>
  );
}

function LockedSection({ step, title }: { step: number; title: string }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3 opacity-40 select-none">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
          {step}
        </span>
        <h2 className="font-display text-lg font-bold text-foreground">
          {title}
        </h2>
      </div>
      <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/40 bg-muted/20 py-5">
        <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground/60">
          Selesaikan langkah sebelumnya untuk melanjutkan
        </p>
      </div>
    </section>
  );
}

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
  /** Semua service aktif di store yang dipilih — dipakai untuk lookup harga addon */
  const [allStoreServices, setAllStoreServices] = useState<AdminService[]>([]);

  const [previewData, setPreviewData] = useState<BookingPreviewResult | null>(
    null,
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [applyBenefitResult, setApplyBenefitResult] =
    useState<ApplyBenefitPreviewResult | null>(null);
  const [loadingApplyBenefit, setLoadingApplyBenefit] = useState(false);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingStore, setLoadingStore] = useState(false);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingPets, setLoadingPets] = useState(false);

  const [isPickup, setIsPickup] = useState(false);

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

  /** Fetch semua service aktif dari store — tanpa filter type — untuk lookup harga addon */
  const fetchAllStoreServices = async (storeId: string) => {
    try {
      const res = await getAdminServices({
        store_id: storeId,
        is_active: "true",
        limit: 500,
      });
      setAllStoreServices(res.services);
    } catch {
      // fail silently — addon prices are bonus info
    }
  };

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

  // ── Derived selections ──────────────────────────────────────────────────────
  const selectedCustomer = customers.find((c) => c._id === form.customer_id);
  const selectedPet = pets.find((p) => p._id === form.pet_id);
  const selectedStore = stores.find((s) => s._id === form.store_id);
  const selectedServiceType = serviceTypes.find(
    (t) => t._id === form.service_type_id,
  );
  const selectedService = services.find((s) => s._id === form.service_id);

  // Check if selected service type is an addon type
  const isAddonServiceType = selectedServiceType?.title
    ? selectedServiceType.title.toLowerCase().includes("addons")
    : false;

  const addons = selectedService?.addons ?? [];

  const storeZones = selectedStore?.zones ?? [];
  const pickupAvailableForStore = storeZones.length > 0;
  const pickupAvailableForService =
    selectedService?.is_pick_up_available === true;

  const handlePickupToggle = (checked: boolean) => {
    setIsPickup(checked);
  };

  // ── Step gates ─────────────────────────────────────────────────────────────
  const step1Done = !!form.customer_id && !!form.pet_id;
  const step2Done =
    step1Done &&
    !!form.store_id &&
    !!form.type &&
    !!form.date &&
    !!form.time_range;
  const step3Done = step2Done && !!form.service_type_id && !!form.service_id;

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
        // Only quota<->discount pairs conflict (same scope makes the other useless)
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
          // specific-vs-specific: conflict only if same addon ID
          if (quotaTarget && discountTarget)
            return quotaTarget === discountTarget;
          // specific quota vs all-addon discount: only conflict if quota NOW makes ALL addons free
          // (i.e., after adding this quota, there are no uncovered addons left for the discount to act on)
          if (quotaTarget && !discountTarget) {
            // new benefit is being added — compute what quotas will cover after this addition
            // prev already has all currently selected; we're about to add `id` (the quota)
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
          // all-addon quota vs specific discount: quota covers all, so discount is always redundant
          if (!quotaTarget && discountTarget) return true;
          // both null: covers all addons, so they fully conflict
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
    getBookingPreview({
      pet_id: form.pet_id,
      service_id: form.service_id,
      addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      date: form.date,
      time_range: form.time_range || undefined,
      pick_up: isPickup || undefined,
      store_id: isPickup ? form.store_id : undefined,
      customer_id: isPickup ? form.customer_id : undefined,
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
    selectedAddonIds,
    isPickup,
  ]);

  // ── Apply benefit: auto-fetch whenever benefit selection changes ────────────────
  useEffect(() => {
    if (!form.pet_id || !form.service_id) return;
    if (selectedBenefitIds.length === 0) {
      setApplyBenefitResult(null);
      setLoadingApplyBenefit(false);
      return;
    }
    let cancelled = false;
    setLoadingApplyBenefit(true);
    applyBenefitPreview({
      pet_id: form.pet_id,
      selected_benefit_ids: selectedBenefitIds,
      service_id: form.service_id,
      add_on_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
      store_id: isPickup ? form.store_id : undefined,
      original_total_price: previewData?.pricing_breakdown?.grand_total,
      booking_date: form.date || undefined,
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
    selectedAddonIds,
    isPickup,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step3Done) {
      toast.error("Lengkapi semua langkah wajib terlebih dahulu");
      return;
    }

    setSubmitting(true);
    try {
      await createAdminBooking({
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
        pick_up: isPickup || undefined,
        selected_benefit_ids:
          selectedBenefitIds.length > 0 ? selectedBenefitIds : undefined,
        referal_code: form.referal_code || undefined,
        payment_method:
          form.payment_method === "other"
            ? customPaymentMethod.trim() || undefined
            : form.payment_method || undefined,
        note: form.note || undefined,
      });
      toast.success("Booking berhasil dibuat");
      router.push("/admin/bookings");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat booking");
    } finally {
      setSubmitting(false);
    }
  };

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
        {/* ── Step 1: Customer & Pet ─────────────────────────────────────────── */}
        <section className="flex flex-col gap-4">
          <StepHeader step={1} title="Pilih Customer & Pet" done={step1Done} />
          <Card className="border-border/50">
            <CardContent className="flex flex-col gap-5 pt-6">
              {/* Customer */}
              <div className="flex flex-col gap-2">
                <Label>Customer</Label>
                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerOpen}
                      disabled={loadingInit}
                      className="w-full justify-between font-normal"
                    >
                      {selectedCustomer
                        ? `${selectedCustomer.username} — ${selectedCustomer.phone_number}`
                        : loadingInit
                          ? "Memuat..."
                          : "Cari customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Cari nama, telepon, atau email..."
                        value={customerSearch}
                        onValueChange={setCustomerSearch}
                      />
                      <CommandList>
                        {loadingCustomers && (
                          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Mencari...
                          </div>
                        )}
                        {!loadingCustomers && (
                          <CommandEmpty>Customer tidak ditemukan.</CommandEmpty>
                        )}
                        {!loadingCustomers && customers.length > 0 && (
                          <CommandGroup>
                            {customers.map((c) => (
                              <CommandItem
                                key={c._id}
                                value={c._id}
                                onSelect={() => {
                                  handleCustomerChange(c._id);
                                  setCustomerOpen(false);
                                }}
                                className="flex flex-col items-start gap-0.5"
                              >
                                <div className="flex w-full items-center gap-2">
                                  <Check
                                    className={`h-4 w-4 shrink-0 ${form.customer_id === c._id ? "opacity-100" : "opacity-0"}`}
                                  />
                                  <span className="font-medium">
                                    <HighlightText
                                      text={c.username}
                                      query={customerSearch}
                                    />
                                  </span>
                                </div>
                                <span className="ml-6 text-xs text-muted-foreground">
                                  <HighlightText
                                    text={c.phone_number}
                                    query={customerSearch}
                                  />{" "}
                                  ·{" "}
                                  <HighlightText
                                    text={c.email}
                                    query={customerSearch}
                                  />
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedCustomer && (
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
                    <DetailRow
                      icon={<Mail className="h-3.5 w-3.5" />}
                      label="Email"
                      value={selectedCustomer.email}
                    />
                    <DetailRow
                      icon={<Phone className="h-3.5 w-3.5" />}
                      label="No. HP"
                      value={selectedCustomer.phone_number}
                    />
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge
                        variant={
                          selectedCustomer.is_active ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {selectedCustomer.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* Pet */}
              <div className="flex flex-col gap-2">
                <Label>Hewan Peliharaan</Label>
                <Select
                  value={form.pet_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, pet_id: v }))}
                  disabled={!form.customer_id || loadingPets}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingPets
                          ? "Memuat..."
                          : !form.customer_id
                            ? "Pilih customer dulu"
                            : pets.length === 0
                              ? "Tidak ada hewan"
                              : "Pilih hewan"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPet && (
                  <div className="mt-1 rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                      {selectedPet.pet_type?.name && (
                        <DetailRow
                          label="Tipe"
                          value={selectedPet.pet_type.name}
                        />
                      )}
                      {selectedPet.breed?.name && (
                        <DetailRow label="Ras" value={selectedPet.breed.name} />
                      )}
                      {selectedPet.size?.name && (
                        <DetailRow
                          label="Ukuran"
                          value={selectedPet.size.name}
                        />
                      )}
                      {selectedPet.hair?.name && (
                        <DetailRow label="Bulu" value={selectedPet.hair.name} />
                      )}
                      {selectedPet.weight != null && (
                        <DetailRow
                          icon={<Weight className="h-3.5 w-3.5" />}
                          label="Berat"
                          value={`${selectedPet.weight} kg`}
                        />
                      )}
                      {selectedPet.birthday && (
                        <DetailRow
                          icon={<Cake className="h-3.5 w-3.5" />}
                          label="Tgl Lahir"
                          value={new Date(
                            selectedPet.birthday,
                          ).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        />
                      )}
                    </div>
                    {selectedPet.tags && selectedPet.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        {selectedPet.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {selectedPet.description && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {selectedPet.description}
                      </p>
                    )}
                    {selectedPet.internal_note && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{selectedPet.internal_note}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* ── Step 2: Store & Jadwal ─────────────────────────────────────────── */}
        {!step1Done ? (
          <LockedSection step={2} title="Store & Jadwal" />
        ) : (
          <section className="flex flex-col gap-4">
            <StepHeader step={2} title="Store & Jadwal" done={step2Done} />
            <Card className="border-border/50">
              <CardContent className="flex flex-col gap-5 pt-6">
                {/* Store & Location Type in 2 columns */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Store */}
                  <div className="flex flex-col gap-2">
                    <Label>Store</Label>
                    <Select
                      value={form.store_id}
                      onValueChange={handleStoreChange}
                      disabled={loadingInit}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingInit ? "Memuat..." : "Pilih store"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Type */}
                  <div className="flex flex-col gap-2">
                    <Label>Lokasi Layanan</Label>
                    <Select
                      value={form.type}
                      onValueChange={async (v) => {
                        setForm((p) => ({ ...p, type: v, service_id: "" }));
                        setServices([]);
                        setSelectedAddonIds([]);
                        setIsPickup(false);
                        if (form.store_id && form.service_type_id) {
                          await fetchServices(
                            form.store_id,
                            form.service_type_id,
                            v,
                          );
                        }
                      }}
                      disabled={!form.store_id}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !form.store_id ? "Pilih store dulu" : "Pilih lokasi"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in home">Home Service</SelectItem>
                        <SelectItem value="in store">In Store</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Store Details */}
                {selectedStore && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
                    {selectedStore.location?.address && (
                      <DetailRow
                        icon={<MapPin className="h-3.5 w-3.5" />}
                        label="Alamat"
                        value={[
                          selectedStore.location.address,
                          selectedStore.location.city,
                          selectedStore.location.province,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      />
                    )}
                    {selectedStore.operational?.opening_time &&
                      selectedStore.operational?.closing_time && (
                        <DetailRow
                          icon={<Clock className="h-3.5 w-3.5" />}
                          label="Jam Buka"
                          value={`${selectedStore.operational.opening_time} – ${selectedStore.operational.closing_time}`}
                        />
                      )}
                    {selectedStore.operational?.operational_days &&
                      selectedStore.operational.operational_days.length > 0 && (
                        <DetailRow
                          icon={<CalendarDays className="h-3.5 w-3.5" />}
                          label="Hari Buka"
                          value={selectedStore.operational.operational_days.join(
                            ", ",
                          )}
                        />
                      )}
                    {selectedStore.contact?.phone_number && (
                      <DetailRow
                        icon={<Phone className="h-3.5 w-3.5" />}
                        label="Telepon"
                        value={selectedStore.contact.phone_number}
                      />
                    )}
                    {selectedStore.contact?.whatsapp && (
                      <DetailRow
                        icon={<Phone className="h-3.5 w-3.5" />}
                        label="WhatsApp"
                        value={selectedStore.contact.whatsapp}
                      />
                    )}
                  </div>
                )}

                {/* Date & Session */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="date">Tanggal</Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={form.date}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label>Sesi Waktu</Label>
                    <Select
                      value={form.time_range}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, time_range: v }))
                      }
                      disabled={sessions.length === 0 || loadingStore}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            loadingStore
                              ? "Memuat..."
                              : sessions.length === 0
                                ? "Pilih store dulu"
                                : "Pilih sesi"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <Separator />

        {/* ── Step 3: Layanan & Add-ons ──────────────────────────────────────── */}
        {!step2Done ? (
          <LockedSection step={3} title="Layanan & Add-ons" />
        ) : (
          <section className="flex flex-col gap-4">
            <StepHeader step={3} title="Layanan & Add-ons" done={step3Done} />
            <Card className="border-border/50">
              <CardContent className="flex flex-col gap-5 pt-6">
                {/* Service Type */}
                <div className="flex flex-col gap-2">
                  <Label>Tipe Layanan</Label>
                  <Select
                    value={form.service_type_id}
                    onValueChange={handleServiceTypeChange}
                    disabled={loadingInit}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          loadingInit ? "Memuat..." : "Pilih tipe layanan"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedServiceType?.description && (
                    <p className="mt-1 rounded-xl border border-border/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                      {selectedServiceType.description}
                    </p>
                  )}
                </div>

                {/* Service */}
                <div className="flex flex-col gap-2">
                  <Label>Layanan Utama</Label>

                  {/* Show dropdown when:
                      1. Belum pilih service type (disabled)
                      2. Sedang loading
                      3. Ada services available
                      Hide dropdown only when: sudah pilih service type tapi tidak ada services
                  */}
                  {(!form.service_type_id ||
                    loadingServices ||
                    services.length > 0) && (
                    <Select
                      value={form.service_id}
                      onValueChange={(v) => {
                        setForm((p) => ({ ...p, service_id: v }));
                        setSelectedAddonIds([]);
                        setIsPickup(false);
                      }}
                      disabled={!form.service_type_id || loadingServices}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            !form.service_type_id
                              ? "Silahkan pilih Tipe Layanan terlebih dahulu"
                              : loadingServices
                                ? "Memuat..."
                                : "Pilih layanan"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s._id} value={s._id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Warning when no services available after selecting service type */}
                  {!loadingServices &&
                    services.length === 0 &&
                    form.store_id &&
                    form.type &&
                    form.service_type_id && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50/50 px-3 py-2.5 text-xs text-amber-700">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          Tidak ada layanan{" "}
                          <strong>
                            {selectedServiceType?.title ?? "tipe layanan ini"}
                          </strong>{" "}
                          <strong>
                            {form.type === "in home"
                              ? "Home Service"
                              : "In Store"}
                          </strong>{" "}
                          di{" "}
                          <strong>{selectedStore?.name ?? "store ini"}</strong>.
                        </span>
                      </div>
                    )}

                  {/* Service detail */}
                  {selectedService && (
                    <div className="mt-1 rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
                      {selectedService.description && (
                        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                          {selectedService.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                        <DetailRow
                          icon={<Clock className="h-3.5 w-3.5" />}
                          label="Durasi"
                          value={`${selectedService.duration} menit`}
                        />
                        {selectedService.price_type === "single" &&
                          selectedService.price != null && (
                            <DetailRow
                              label="Harga"
                              value={
                                <span className="font-semibold text-primary">
                                  {formatPrice(selectedService.price)}
                                </span>
                              }
                            />
                          )}
                      </div>

                      {/* Multiple prices — highlight baris yang cocok dengan pet */}
                      {selectedService.price_type === "multiple" &&
                        selectedService.prices &&
                        selectedService.prices.length > 0 && (
                          <div className="mt-3">
                            <div className="mb-1.5 flex items-center gap-1.5">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Daftar Harga
                              </p>
                              {selectedPet &&
                                selectedService.prices.some((p) =>
                                  isPriceMatchingPet(p, selectedPet),
                                ) && (
                                  <span className="flex items-center gap-1 text-[10px] text-primary">
                                    <Star className="h-3 w-3 fill-primary" />
                                    sesuai {selectedPet.name}
                                  </span>
                                )}
                            </div>
                            <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-lg border border-border/50 bg-card">
                              {selectedService.prices.map((price, i) => {
                                const label = [
                                  price.pet_name,
                                  price.size_name,
                                  price.hair_name,
                                ]
                                  .filter(Boolean)
                                  .join(" · ");
                                const isMatch =
                                  !!selectedPet &&
                                  isPriceMatchingPet(price, selectedPet);
                                return (
                                  <div
                                    key={i}
                                    className={`flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                                      isMatch
                                        ? "bg-primary/10 ring-1 ring-inset ring-primary/30"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isMatch && (
                                        <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />
                                      )}
                                      <span
                                        className={
                                          isMatch
                                            ? "font-semibold text-primary"
                                            : "text-muted-foreground"
                                        }
                                      >
                                        {label || "—"}
                                      </span>
                                    </div>
                                    <span
                                      className={`font-bold ${isMatch ? "text-primary" : "text-foreground"}`}
                                    >
                                      {formatPrice(price.price)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Peringatan jika tidak ada harga yang cocok dengan pet */}
                            {selectedPet &&
                              !selectedService.prices.some((p) =>
                                isPriceMatchingPet(p, selectedPet),
                              ) && (
                                <div className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                  <span>
                                    Tidak ada harga yang tersedia untuk{" "}
                                    <strong>{selectedPet.name}</strong>
                                    {[
                                      selectedPet.pet_type?.name,
                                      selectedPet.size?.name,
                                      selectedPet.hair?.name,
                                    ].filter(Boolean).length > 0 && (
                                      <>
                                        {" "}
                                        (
                                        {[
                                          selectedPet.pet_type?.name,
                                          selectedPet.size?.name,
                                          selectedPet.hair?.name,
                                        ]
                                          .filter(Boolean)
                                          .join(", ")}
                                        )
                                      </>
                                    )}
                                    . Layanan ini mungkin tidak tersedia untuk
                                    pet ini.
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                      {/* Include list */}
                      {selectedService.include &&
                        selectedService.include.length > 0 && (
                          <div className="mt-3">
                            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Termasuk
                            </p>
                            <ul className="flex flex-col gap-1">
                              {selectedService.include.map((item, i) => (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-foreground/80"
                                >
                                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                {/* Pick-up */}
                {selectedService && (
                  <div className="flex flex-col gap-3">
                    <Label>Pickup (opsional)</Label>
                    {!pickupAvailableForService ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span>Layanan ini tidak mendukung pickup.</span>
                      </div>
                    ) : !pickupAvailableForStore ? (
                      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <Truck className="h-4 w-4 shrink-0" />
                        <span>Store ini belum menyediakan zona pickup.</span>
                      </div>
                    ) : (
                      <label
                        htmlFor="pickup"
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                          isPickup
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <Checkbox
                          id="pickup"
                          checked={isPickup}
                          onCheckedChange={(checked) =>
                            handlePickupToggle(!!checked)
                          }
                          className="shrink-0"
                        />
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            Aktifkan Pickup (Jemput / Antar)
                          </span>
                        </div>
                      </label>
                    )}
                  </div>
                )}

                {/* Add-ons (opsional) - hanya tampil jika service type bukan addon */}
                {!isAddonServiceType && addons.length > 0 && (
                  <div className="flex flex-col gap-3">
                    <Label>Add-ons (opsional)</Label>
                    <div className="flex flex-col gap-2">
                      {addons.map((addon) => {
                        const selected = selectedAddonIds.includes(addon._id);
                        const addonService = allStoreServices.find(
                          (s) => s._id === addon._id,
                        );

                        // Harga addon: cek prices[] dulu, fallback ke price
                        const addonPriceDisplay = (() => {
                          if (!addonService) return null;
                          if (
                            addonService.prices &&
                            addonService.prices.length > 0
                          ) {
                            if (selectedPet) {
                              const match = addonService.prices.find((p) =>
                                isPriceMatchingPet(p, selectedPet),
                              );
                              if (match) return formatPrice(match.price);
                            }
                            const min = Math.min(
                              ...addonService.prices.map((p) => p.price),
                            );
                            return `Mulai ${formatPrice(min)}`;
                          }
                          if (addonService.price != null)
                            return formatPrice(addonService.price);
                          return null;
                        })();

                        return (
                          <label
                            key={addon._id}
                            htmlFor={addon._id}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-border bg-card hover:border-primary/40"
                            }`}
                          >
                            <Checkbox
                              id={addon._id}
                              checked={selected}
                              onCheckedChange={() => toggleAddon(addon._id)}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium text-foreground">
                                  {addon.name}
                                </span>
                                {addon.code && (
                                  <span className="font-mono text-[10px] text-muted-foreground">
                                    {addon.code}
                                  </span>
                                )}
                                {addonService?.duration != null && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {addonService.duration} menit
                                  </span>
                                )}
                              </div>
                              {addonPriceDisplay && (
                                <span
                                  className={`shrink-0 text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}
                                >
                                  {addonPriceDisplay}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <Separator />

        {/* ── Step 4: Preview Harga & Benefit ───────────────────────────── */}
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
              <CardContent className="flex flex-col gap-4 pt-6">
                {loadingPreview && (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-8 animate-pulse rounded-lg bg-muted"
                      />
                    ))}
                  </div>
                )}

                {!loadingPreview &&
                  !previewData &&
                  (previewError ? (
                    previewError.toLowerCase().includes("location") ||
                    previewError.toLowerCase().includes("latitude") ? (
                      <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950/30">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            Alamat customer belum lengkap
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            Layanan pickup membutuhkan koordinat lokasi
                            (latitude/longitude) pada profil customer.
                          </p>
                          <Link
                            href="/admin/users"
                            className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900"
                          >
                            <MapPin className="h-3 w-3" />
                            Lengkapi alamat di halaman Users
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{previewError}</span>
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Pilih layanan dan tanggal untuk melihat preview harga.
                    </p>
                  ))}

                {!loadingPreview && previewData && (
                  <div className="flex flex-col gap-5">
                    {/* Pickup info */}
                    {isPickup && (
                      <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                        <Truck className="h-4 w-4 shrink-0 text-primary" />
                        <span className="text-sm font-semibold text-primary">
                          Pickup Aktif
                        </span>
                      </div>
                    )}
                    {pickupAvailableForService &&
                      pickupAvailableForStore &&
                      !isPickup && (
                        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                          <Truck className="h-4 w-4 shrink-0" />
                          <span>
                            Pickup tersedia untuk layanan ini namun belum
                            diaktifkan.
                          </span>
                        </div>
                      )}
                    {/* Pricing breakdown */}
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Rincian Harga
                      </p>
                      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
                        {/* Service row */}
                        {(() => {
                          const b = previewData.pricing.available_benefits.find(
                            (x) =>
                              selectedBenefitIds.includes(x._id) &&
                              x.applies_to === "service" &&
                              (!x.service_id ||
                                x.service_id === form.service_id) &&
                              (x.type === "discount" || x.type === "quota") &&
                              x.can_apply,
                          );
                          const isQuota = b?.type === "quota";
                          return (
                            <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  {previewData.pricing_breakdown.service.name}
                                </span>
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
                                      : b.value != null
                                        ? `-${b.value}%`
                                        : "Diskon"}
                                  </span>
                                )}
                              </div>
                              {b ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-xs line-through text-muted-foreground">
                                    {formatPrice(
                                      previewData.pricing_breakdown.service
                                        .price,
                                    )}
                                  </span>
                                  <span className="font-semibold text-primary">
                                    {isQuota
                                      ? "Gratis"
                                      : formatPrice(
                                          Math.max(
                                            0,
                                            previewData.pricing_breakdown
                                              .service.price -
                                              (b.amount_discount ?? 0),
                                          ),
                                        )}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-medium">
                                  {formatPrice(
                                    previewData.pricing_breakdown.service.price,
                                  )}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                        {/* Addon rows */}
                        {previewData.pricing_breakdown.addons.map((addon) => {
                          const b = previewData.pricing.available_benefits.find(
                            (x) =>
                              selectedBenefitIds.includes(x._id) &&
                              x.applies_to === "addon" &&
                              (!x.service_id || x.service_id === addon._id) &&
                              (x.type === "discount" || x.type === "quota") &&
                              x.can_apply,
                          );
                          const isQuota = b?.type === "quota";
                          // For null-service_id benefits, compute per-addon discount from b.value
                          const addonDiscountAmount = !b
                            ? 0
                            : b.service_id
                              ? (b.amount_discount ?? 0)
                              : isQuota
                                ? addon.price
                                : (addon.price * (b.value ?? 0)) / 100;
                          return (
                            <div
                              key={addon._id}
                              className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">
                                  + {addon.name}
                                </span>
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
                                      : b.value != null
                                        ? `-${b.value}%`
                                        : "Diskon"}
                                  </span>
                                )}
                              </div>
                              {b ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-xs line-through text-muted-foreground">
                                    {formatPrice(addon.price)}
                                  </span>
                                  <span className="font-semibold text-primary">
                                    {isQuota
                                      ? "Gratis"
                                      : formatPrice(
                                          Math.max(
                                            0,
                                            addon.price - addonDiscountAmount,
                                          ),
                                        )}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-medium">
                                  {formatPrice(addon.price)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {/* Travel fee row — strikethrough jika ada pickup benefit */}
                        {isPickup &&
                          previewData.pricing_breakdown.travel_fee != null &&
                          previewData.pricing_breakdown.travel_fee > 0 &&
                          (() => {
                            const b =
                              previewData.pricing.available_benefits.find(
                                (x) =>
                                  selectedBenefitIds.includes(x._id) &&
                                  x.can_apply &&
                                  (x.applies_to === "pick_up" ||
                                    x.applies_to === "travel_fee" ||
                                    x.applies_to === "pickup"),
                              );
                            const isQuota = b?.type === "quota";
                            const tFee =
                              previewData.pricing_breakdown.travel_fee!;
                            return (
                              <div className="flex items-center justify-between border-t border-border/40 px-4 py-2.5 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1.5 text-muted-foreground">
                                    <Truck className="h-3.5 w-3.5" />
                                    Biaya Pickup
                                  </span>
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
                                        : b.value != null
                                          ? `-${b.value}%`
                                          : "Diskon"}
                                    </span>
                                  )}
                                </div>
                                {b ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-xs line-through text-muted-foreground">
                                      {formatPrice(tFee)}
                                    </span>
                                    <span className="font-semibold text-primary">
                                      {isQuota
                                        ? "Gratis"
                                        : formatPrice(
                                            Math.max(
                                              0,
                                              tFee - (b.amount_discount ?? 0),
                                            ),
                                          )}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-medium">
                                    {formatPrice(tFee)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        {/* Subtotal — total semua item sebelum diskon member */}
                        <div className="flex items-center justify-between border-t border-border/50 bg-muted/30 px-4 py-2.5 text-sm font-semibold">
                          <span>Subtotal</span>
                          <span>
                            {formatPrice(
                              previewData.pricing_breakdown.grand_total,
                            )}
                          </span>
                        </div>
                        {/* Diskon Member — tampil ketika ada benefit dipilih dan ada nilai diskon */}
                        {selectedBenefitIds.length > 0 &&
                          (loadingApplyBenefit ||
                            (applyBenefitResult &&
                              applyBenefitResult.total_discount > 0)) && (
                            <div className="flex flex-col border-t border-primary/20 bg-primary/5">
                              <div className="flex items-center justify-between px-4 py-2.5 text-sm">
                                <span className="flex items-center gap-1.5 font-medium text-primary">
                                  <Gift className="h-3.5 w-3.5" />
                                  Diskon Member
                                </span>
                                {loadingApplyBenefit ? (
                                  <span className="h-4 w-20 animate-pulse rounded bg-primary/20" />
                                ) : (
                                  <span className="font-semibold text-primary">
                                    -{" "}
                                    {formatPrice(
                                      applyBenefitResult!.total_discount,
                                    )}
                                  </span>
                                )}
                              </div>
                              {/* Breakdown per benefit jika lebih dari satu */}
                              {!loadingApplyBenefit &&
                                applyBenefitResult &&
                                applyBenefitResult.breakdown.length > 1 && (
                                  <div className="flex flex-col gap-0.5 px-4 pb-2.5 -mt-0.5">
                                    {applyBenefitResult.breakdown.map(
                                      (item, i) => (
                                        <div
                                          key={i}
                                          className="flex items-center justify-between text-xs text-muted-foreground"
                                        >
                                          <span className="truncate pr-4">
                                            {item.benefit?.label ||
                                              item.description ||
                                              item.applies_to}
                                          </span>
                                          <span className="shrink-0">
                                            -{" "}
                                            {formatPrice(item.amount_deducted)}
                                          </span>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                )}
                            </div>
                          )}
                        {/* Total Akhir — grand_total dikurangi diskon member jika ada */}
                        {(() => {
                          const grandTotal =
                            previewData.pricing_breakdown.grand_total;
                          const hasDiscount =
                            selectedBenefitIds.length > 0 &&
                            applyBenefitResult != null &&
                            applyBenefitResult.total_discount > 0;
                          const displayTotal = hasDiscount
                            ? applyBenefitResult!.final_price
                            : grandTotal;
                          const showSkeleton =
                            selectedBenefitIds.length > 0 &&
                            loadingApplyBenefit;
                          return (
                            <div className="flex items-center justify-between border-t border-primary/30 bg-primary/10 px-4 py-3 text-sm font-bold text-primary">
                              <span>Total Akhir</span>
                              {showSkeleton ? (
                                <span className="h-5 w-24 animate-pulse rounded bg-primary/20" />
                              ) : (
                                <span className="text-base">
                                  {formatPrice(Math.max(0, displayTotal))}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Benefit selection */}
                    {previewData.pricing.has_active_membership &&
                      previewData.pricing.available_benefits.length > 0 && (
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold text-foreground">
                              Benefit Membership
                            </p>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              {
                                previewData.pricing.available_benefits.filter(
                                  (b) => b.can_apply,
                                ).length
                              }{" "}
                              tersedia
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {previewData.pricing.available_benefits.map(
                              (benefit) => {
                                const selected = selectedBenefitIds.includes(
                                  benefit._id,
                                );
                                const canApply = benefit.can_apply;

                                // Determine if this discount is blocked by an already-selected quota on the same target
                                const blockedByQuota =
                                  canApply &&
                                  benefit.type === "discount" &&
                                  (() => {
                                    const available =
                                      previewData.pricing.available_benefits;
                                    if (benefit.applies_to === "service") {
                                      const discountTarget =
                                        benefit.service_id || form.service_id;
                                      return available.some(
                                        (x: any) =>
                                          selectedBenefitIds.includes(x._id) &&
                                          x.type === "quota" &&
                                          x.applies_to === "service" &&
                                          (x.service_id === discountTarget ||
                                            !x.service_id),
                                      );
                                    }
                                    if (benefit.applies_to === "addon") {
                                      const selectedQuotas = available.filter(
                                        (x: any) =>
                                          selectedBenefitIds.includes(x._id) &&
                                          x.type === "quota" &&
                                          x.applies_to === "addon",
                                      );
                                      if (benefit.service_id) {
                                        // specific addon discount: blocked if its addon is covered by any quota
                                        return selectedQuotas.some(
                                          (x: any) =>
                                            !x.service_id ||
                                            x.service_id === benefit.service_id,
                                        );
                                      } else {
                                        // null-service_id discount: blocked only when ALL selected addons are already quota-covered
                                        if (selectedAddonIds.length === 0)
                                          return false;
                                        const hasAllCoverQuota =
                                          selectedQuotas.some(
                                            (x: any) => !x.service_id,
                                          );
                                        if (hasAllCoverQuota) return true;
                                        const coveredIds = new Set(
                                          selectedQuotas
                                            .filter((x: any) => x.service_id)
                                            .map((x: any) => x.service_id),
                                        );
                                        return selectedAddonIds.every((id) =>
                                          coveredIds.has(id),
                                        );
                                      }
                                    }
                                    return false;
                                  })();

                                const isDisabled = !canApply || blockedByQuota;
                                return (
                                  <label
                                    key={benefit._id}
                                    htmlFor={`benefit-${benefit._id}`}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
                                      isDisabled
                                        ? "cursor-not-allowed border-border/30 bg-muted/20 opacity-50"
                                        : selected
                                          ? "border-primary bg-primary/5"
                                          : "border-border bg-card hover:border-primary/40"
                                    }`}
                                  >
                                    <Checkbox
                                      id={`benefit-${benefit._id}`}
                                      checked={selected}
                                      disabled={isDisabled}
                                      onCheckedChange={() =>
                                        !isDisabled &&
                                        toggleBenefit(benefit._id)
                                      }
                                      className="mt-0.5 shrink-0"
                                    />
                                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">
                                          {benefit.label || benefit.description}
                                        </span>
                                        <span
                                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                            benefit.type === "discount"
                                              ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400"
                                              : "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                          }`}
                                        >
                                          {benefit.type === "discount"
                                            ? `${benefit.value}% off`
                                            : "Kuota gratis"}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                        <span>{benefit.description}</span>
                                        {benefit.remaining !== null && (
                                          <span
                                            className={
                                              benefit.remaining === 0
                                                ? "text-destructive"
                                                : ""
                                            }
                                          >
                                            Sisa: {benefit.remaining}/
                                            {benefit.limit ?? "∞"}
                                          </span>
                                        )}
                                      </div>
                                      {!canApply && (
                                        <span className="text-[11px] text-destructive">
                                          Tidak dapat digunakan saat ini
                                        </span>
                                      )}
                                      {blockedByQuota && (
                                        <span className="text-[11px] text-amber-600 dark:text-amber-400">
                                          Tidak dapat digabung — layanan sudah
                                          gratis dari benefit kuota
                                        </span>
                                      )}
                                    </div>
                                    {benefit.type === "discount" &&
                                      canApply &&
                                      benefit.amount_discount != null &&
                                      benefit.amount_discount > 0 && (
                                        <span
                                          className={`shrink-0 text-sm font-bold ${selected ? "text-primary" : "text-muted-foreground"}`}
                                        >
                                          -{" "}
                                          {formatPrice(benefit.amount_discount)}
                                        </span>
                                      )}
                                  </label>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}

                    {!previewData.pricing.has_active_membership && (
                      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>
                          Hewan ini tidak memiliki membership aktif. Tidak ada
                          benefit yang tersedia.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        <Separator />

        {/* ── Step 5: Catatan & Info Tambahan ────────────────────────────────── */}
        {!step3Done ? (
          <LockedSection step={5} title="Catatan & Info Tambahan" />
        ) : (
          <section className="flex flex-col gap-4">
            <StepHeader
              step={5}
              title="Catatan & Info Tambahan"
              done={!!(form.note || form.payment_method || form.referal_code)}
            />
            <Card className="border-border/50">
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="note">Catatan (opsional)</Label>
                  <Textarea
                    id="note"
                    placeholder="Permintaan khusus atau catatan mengenai hewan..."
                    rows={3}
                    value={form.note}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, note: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label>Metode Pembayaran (opsional)</Label>
                    <Select
                      value={form.payment_method}
                      onValueChange={(v) =>
                        setForm((p) => ({ ...p, payment_method: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih metode pembayaran" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="transfer">Transfer</SelectItem>
                        <SelectItem value="qris">QRIS</SelectItem>
                        <SelectItem value="card">Kartu Debit/Kredit</SelectItem>
                        <SelectItem value="other">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.payment_method === "other" && (
                      <Input
                        placeholder="Tulis metode pembayaran..."
                        value={customPaymentMethod}
                        onChange={(e) => setCustomPaymentMethod(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="referal_code">
                      Referral Code (opsional)
                    </Label>
                    <Input
                      id="referal_code"
                      placeholder="FRIEND20"
                      value={form.referal_code}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, referal_code: e.target.value }))
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
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
