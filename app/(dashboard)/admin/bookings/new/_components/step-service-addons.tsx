"use client";

import { AlertTriangle, Check, Clock, Star, Truck } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailRow } from "@/components/booking/detail-row";
import { formatPrice } from "@/lib/format";
import type { AdminService, AdminServicePrice } from "@/lib/api/services";
import type { ApiServiceType } from "@/lib/api/service-types";
import type { ApiStore } from "@/lib/api/stores";
import type { ApiPet } from "@/lib/api/users";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Cek apakah baris harga cocok dengan pet yang dipilih */
function isPriceMatchingPet(price: AdminServicePrice, pet: ApiPet): boolean {
  const petTypeMatch =
    !price.pet_type_id || price.pet_type_id === pet.pet_type?._id;
  const sizeMatch = !price.size_id || price.size_id === pet.size?._id;
  const hairMatch = !price.hair_id || price.hair_id === pet.hair?._id;
  return petTypeMatch && sizeMatch && hairMatch;
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface StepServiceAddonsProps {
  form: {
    store_id: string;
    type: string;
    service_type_id: string;
    service_id: string;
  };
  setForm: React.Dispatch<React.SetStateAction<any>>;
  serviceTypes: ApiServiceType[];
  selectedServiceType: ApiServiceType | undefined;
  services: AdminService[];
  loadingServices: boolean;
  loadingInit: boolean;
  handleServiceTypeChange: (typeId: string) => void;
  selectedService: AdminService | undefined;
  selectedPet: ApiPet | undefined;
  selectedStore: ApiStore | undefined;
  addons: { _id: string; name: string; code?: string }[];
  selectedAddonIds: string[];
  toggleAddon: (id: string) => void;
  allStoreServices: AdminService[];
  isAddonServiceType: boolean;
  /* Pickup/Delivery */
  canUsePickupDelivery: boolean;
  pickupDeliveryAvailableForService: boolean;
  pickupDeliveryAvailableForStore: boolean;
  hasPickupDeliveryZones: boolean;
  customerHasLocation: boolean;
  isPickup: boolean;
  isDelivery: boolean;
  handlePickupToggle: (checked: boolean) => void;
  handleDeliveryToggle: (checked: boolean) => void;
  resetPickupDelivery: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function StepServiceAddons({
  form,
  setForm,
  serviceTypes,
  selectedServiceType,
  services,
  loadingServices,
  loadingInit,
  handleServiceTypeChange,
  selectedService,
  selectedPet,
  selectedStore,
  addons,
  selectedAddonIds,
  toggleAddon,
  allStoreServices,
  isAddonServiceType,
  canUsePickupDelivery,
  pickupDeliveryAvailableForService,
  pickupDeliveryAvailableForStore,
  hasPickupDeliveryZones,
  customerHasLocation,
  isPickup,
  isDelivery,
  handlePickupToggle,
  handleDeliveryToggle,
  resetPickupDelivery,
}: StepServiceAddonsProps) {
  return (
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

          {(!form.service_type_id ||
            loadingServices ||
            services.length > 0) && (
            <Select
              value={form.service_id}
              onValueChange={(v) => {
                setForm((p: any) => ({ ...p, service_id: v }));
                resetPickupDelivery();
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

          {/* Warning: no services */}
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
                    {form.type === "in home" ? "Home Service" : "In Store"}
                  </strong>{" "}
                  di <strong>{selectedStore?.name ?? "store ini"}</strong>.
                </span>
              </div>
            )}

          {/* Service detail */}
          {selectedService && (
            <ServiceDetail
              service={selectedService}
              selectedPet={selectedPet}
            />
          )}
        </div>

        {/* Pickup & Delivery */}
        {selectedService && form.type === "in store" && (
          <PickupDeliverySection
            canUsePickupDelivery={canUsePickupDelivery}
            pickupDeliveryAvailableForService={
              pickupDeliveryAvailableForService
            }
            pickupDeliveryAvailableForStore={pickupDeliveryAvailableForStore}
            hasPickupDeliveryZones={hasPickupDeliveryZones}
            customerHasLocation={customerHasLocation}
            isPickup={isPickup}
            isDelivery={isDelivery}
            handlePickupToggle={handlePickupToggle}
            handleDeliveryToggle={handleDeliveryToggle}
          />
        )}

        {/* Add-ons */}
        {!isAddonServiceType && addons.length > 0 && (
          <AddonsSection
            addons={addons}
            selectedAddonIds={selectedAddonIds}
            toggleAddon={toggleAddon}
            allStoreServices={allStoreServices}
            selectedPet={selectedPet}
          />
        )}
      </CardContent>
    </Card>
  );
}

// ── Service Detail ─────────────────────────────────────────────────────────────

function ServiceDetail({
  service,
  selectedPet,
}: {
  service: AdminService;
  selectedPet: ApiPet | undefined;
}) {
  return (
    <div className="mt-1 rounded-xl border border-border/40 bg-muted/40 px-4 py-3">
      {service.description && (
        <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
          {service.description}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        <DetailRow
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Durasi"
          value={`${service.duration} menit`}
        />
        {service.price_type === "single" && service.price != null && (
          <DetailRow
            label="Harga"
            value={
              <span className="font-semibold text-primary">
                {formatPrice(service.price)}
              </span>
            }
          />
        )}
      </div>

      {/* Multiple prices — highlight baris yang cocok dengan pet */}
      {service.price_type === "multiple" &&
        service.prices &&
        service.prices.length > 0 && (
          <div className="mt-3">
            <div className="mb-1.5 flex items-center gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Daftar Harga
              </p>
              {selectedPet &&
                service.prices.some((p) =>
                  isPriceMatchingPet(p, selectedPet),
                ) && (
                  <span className="flex items-center gap-1 text-[10px] text-primary">
                    <Star className="h-3 w-3 fill-primary" />
                    sesuai {selectedPet.name}
                  </span>
                )}
            </div>
            <div className="flex flex-col divide-y divide-border/50 overflow-hidden rounded-lg border border-border/50 bg-card">
              {service.prices.map((price, i) => {
                const label = [price.pet_name, price.size_name, price.hair_name]
                  .filter(Boolean)
                  .join(" · ");
                const isMatch =
                  !!selectedPet && isPriceMatchingPet(price, selectedPet);
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
              !service.prices.some((p) =>
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
                    . Layanan ini mungkin tidak tersedia untuk pet ini.
                  </span>
                </div>
              )}
          </div>
        )}

      {/* Include list */}
      {service.include && service.include.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Termasuk
          </p>
          <ul className="flex flex-col gap-1">
            {service.include.map((item, i) => (
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
  );
}

// ── Pickup/Delivery Section ────────────────────────────────────────────────────

function PickupDeliverySection({
  canUsePickupDelivery,
  pickupDeliveryAvailableForService,
  pickupDeliveryAvailableForStore,
  hasPickupDeliveryZones,
  customerHasLocation,
  isPickup,
  isDelivery,
  handlePickupToggle,
  handleDeliveryToggle,
}: {
  canUsePickupDelivery: boolean;
  pickupDeliveryAvailableForService: boolean;
  pickupDeliveryAvailableForStore: boolean;
  hasPickupDeliveryZones: boolean;
  customerHasLocation: boolean;
  isPickup: boolean;
  isDelivery: boolean;
  handlePickupToggle: (checked: boolean) => void;
  handleDeliveryToggle: (checked: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label>Pickup & Delivery (opsional)</Label>

      {!pickupDeliveryAvailableForService ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Truck className="h-4 w-4 shrink-0" />
          <span>Layanan ini tidak mendukung pickup/delivery.</span>
        </div>
      ) : !pickupDeliveryAvailableForStore ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Truck className="h-4 w-4 shrink-0" />
          <span>Store ini belum mengaktifkan layanan pickup/delivery.</span>
        </div>
      ) : !hasPickupDeliveryZones ? (
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Truck className="h-4 w-4 shrink-0" />
          <span>Store ini belum menyediakan zona pickup/delivery.</span>
        </div>
      ) : !customerHasLocation ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-300/50 bg-amber-50/50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Customer belum melengkapi alamat dengan koordinat
            latitude/longitude. Mohon isi data lokasi customer terlebih dahulu.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
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
              onCheckedChange={(checked) => handlePickupToggle(!!checked)}
              className="shrink-0"
            />
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Pickup (Jemput Pet)
              </span>
            </div>
          </label>

          <label
            htmlFor="delivery"
            className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-all duration-150 ${
              isDelivery
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <Checkbox
              id="delivery"
              checked={isDelivery}
              onCheckedChange={(checked) => handleDeliveryToggle(!!checked)}
              className="shrink-0"
            />
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Delivery (Antar Pet)
              </span>
            </div>
          </label>

          {(isPickup || isDelivery) && (
            <p className="px-1 text-xs text-muted-foreground">
              {isPickup && isDelivery
                ? "Biaya pickup & delivery akan dihitung berdasarkan jarak lokasi customer ke store (2x harga zona)"
                : isPickup
                  ? "Biaya pickup akan dihitung berdasarkan jarak lokasi customer ke store"
                  : "Biaya delivery akan dihitung berdasarkan jarak lokasi customer ke store"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add-ons Section ────────────────────────────────────────────────────────────

function AddonsSection({
  addons,
  selectedAddonIds,
  toggleAddon,
  allStoreServices,
  selectedPet,
}: {
  addons: { _id: string; name: string; code?: string }[];
  selectedAddonIds: string[];
  toggleAddon: (id: string) => void;
  allStoreServices: AdminService[];
  selectedPet: ApiPet | undefined;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Label>Add-ons (opsional)</Label>
      <div className="flex flex-col gap-2">
        {addons.map((addon) => {
          const selected = selectedAddonIds.includes(addon._id);
          const addonService = allStoreServices.find(
            (s) => s._id === addon._id,
          );

          const addonPriceDisplay = (() => {
            if (!addonService) return null;
            if (addonService.prices && addonService.prices.length > 0) {
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
  );
}
