"use client"

import { useEffect } from "react"
import { Map } from "lucide-react"
import { Combobox } from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useWilayah } from "@/hooks/use-wilayah"
import { findByName } from "@/lib/api/wilayah"
import type { GeocodedAddress } from "@/lib/google-geocode"

// Unified address value that supports both user-style (street/note/label) and
// store-style (address) shapes. Consumers spread their own state into this and
// receive partial patches via onChange.
export type AddressValue = {
  // Free-text street fields. `street` is preferred; `address` is the legacy
  // alias used by the store entity. Consumers should pick one and only update
  // the field they own.
  label?: string
  street?: string
  address?: string
  subdistrict?: string
  district?: string
  city?: string
  province?: string
  postal_code?: string
  note?: string
  latitude?: number | null
  longitude?: number | null
}

type AddressFormFieldsProps = {
  value: AddressValue
  onChange: (patch: Partial<AddressValue>) => void
  onOpenMap: () => void
  disabled?: boolean
  /** Which variant to render. `user` shows label/note; `store` hides them and
   *  uses `address` instead of `street`. */
  variant?: "user" | "store"
  /** Optional id prefix for input ids (useful when rendering multiple). */
  idPrefix?: string
  /** Pending geocode result to apply when the map picker returns. The parent
   *  passes the latest GeocodedAddress and this component applies it once. */
  pendingGeocode?: GeocodedAddress | null
  /** Called after pendingGeocode has been consumed so parent can clear it. */
  onGeocodeConsumed?: () => void
}

export function AddressFormFields({
  value,
  onChange,
  onOpenMap,
  disabled,
  variant = "user",
  idPrefix = "addr",
  pendingGeocode,
  onGeocodeConsumed,
}: AddressFormFieldsProps) {
  const wilayah = useWilayah({
    province: value.province,
    city: value.city,
    district: value.district,
    subdistrict: value.subdistrict,
  })

  // Apply reverse-geocoded result coming from MapPickerModal.
  // We resolve names → codes through the wilayah hook and propagate the
  // matched names back to the parent state. Unmatched levels are skipped.
  useEffect(() => {
    if (!pendingGeocode) return
    let cancelled = false
    async function apply() {
      const g = pendingGeocode!
      // Resolve province
      if (g.province) {
        const provs = wilayah.provinces.length ? wilayah.provinces : []
        const provItem = findByName(provs, g.province)
        if (provItem) {
          await wilayah.selectProvince(provItem.code)
          if (cancelled) return
          onChange({ province: provItem.name })

          // Resolve regency
          if (g.city) {
            const regs = await import("@/lib/api/wilayah").then((m) =>
              m.getRegencies(provItem.code),
            )
            if (cancelled) return
            const regItem = findByName(regs, g.city)
            if (regItem) {
              await wilayah.selectRegency(regItem.code)
              if (cancelled) return
              onChange({ city: regItem.name })

              // Resolve district
              if (g.district) {
                const dists = await import("@/lib/api/wilayah").then((m) =>
                  m.getDistricts(regItem.code),
                )
                if (cancelled) return
                const distItem = findByName(dists, g.district)
                if (distItem) {
                  await wilayah.selectDistrict(distItem.code)
                  if (cancelled) return
                  onChange({ district: distItem.name })

                  // Resolve village
                  if (g.subdistrict) {
                    const vills = await import("@/lib/api/wilayah").then((m) =>
                      m.getVillages(distItem.code),
                    )
                    if (cancelled) return
                    const villItem = findByName(vills, g.subdistrict)
                    if (villItem) {
                      wilayah.selectVillage(villItem.code)
                      onChange({ subdistrict: villItem.name })
                    }
                  }
                }
              }
            }
          }
        }
      }
      if (g.postal_code) onChange({ postal_code: g.postal_code })
      onGeocodeConsumed?.()
    }
    apply()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGeocode])

  const provinceOptions = wilayah.provinces.map((p) => ({
    value: p.code,
    label: p.name,
  }))
  const regencyOptions = wilayah.regencies.map((r) => ({
    value: r.code,
    label: r.name,
  }))
  const districtOptions = wilayah.districts.map((d) => ({
    value: d.code,
    label: d.name,
  }))
  const villageOptions = wilayah.villages.map((v) => ({
    value: v.code,
    label: v.name,
  }))

  const streetField = variant === "store" ? "address" : "street"
  const streetValue = (variant === "store" ? value.address : value.street) ?? ""

  return (
    <div className="grid gap-3">
      {variant === "user" && (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-label`}>Label</Label>
          <Input
            id={`${idPrefix}-label`}
            value={value.label ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Rumah, Kantor, dll"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${idPrefix}-street`}>Jalan / Alamat</Label>
        <Input
          id={`${idPrefix}-street`}
          value={streetValue}
          disabled={disabled}
          onChange={(e) =>
            onChange({ [streetField]: e.target.value } as Partial<AddressValue>)
          }
          placeholder="Nama jalan, nomor, RT/RW"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Provinsi</Label>
        <Combobox
          options={provinceOptions}
          value={wilayah.provinceCode ?? ""}
          disabled={disabled || wilayah.loading.provinces}
          placeholder={wilayah.loading.provinces ? "Memuat..." : "Pilih provinsi"}
          searchPlaceholder="Cari provinsi..."
          onValueChange={(code) => {
            const item = wilayah.provinces.find((p) => p.code === code)
            wilayah.selectProvince(code || null)
            onChange({
              province: item?.name ?? "",
              city: "",
              district: "",
              subdistrict: "",
            })
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Kota / Kabupaten</Label>
        <Combobox
          options={regencyOptions}
          value={wilayah.regencyCode ?? ""}
          disabled={disabled || !wilayah.provinceCode || wilayah.loading.regencies}
          placeholder={
            !wilayah.provinceCode
              ? "Pilih provinsi dulu"
              : wilayah.loading.regencies
                ? "Memuat..."
                : "Pilih kota/kabupaten"
          }
          searchPlaceholder="Cari kota/kabupaten..."
          onValueChange={(code) => {
            const item = wilayah.regencies.find((r) => r.code === code)
            wilayah.selectRegency(code || null)
            onChange({
              city: item?.name ?? "",
              district: "",
              subdistrict: "",
            })
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Kecamatan</Label>
        <Combobox
          options={districtOptions}
          value={wilayah.districtCode ?? ""}
          disabled={disabled || !wilayah.regencyCode || wilayah.loading.districts}
          placeholder={
            !wilayah.regencyCode
              ? "Pilih kota/kabupaten dulu"
              : wilayah.loading.districts
                ? "Memuat..."
                : "Pilih kecamatan"
          }
          searchPlaceholder="Cari kecamatan..."
          onValueChange={(code) => {
            const item = wilayah.districts.find((d) => d.code === code)
            wilayah.selectDistrict(code || null)
            onChange({ district: item?.name ?? "", subdistrict: "" })
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Kelurahan / Desa</Label>
        <Combobox
          options={villageOptions}
          value={wilayah.villageCode ?? ""}
          disabled={disabled || !wilayah.districtCode || wilayah.loading.villages}
          placeholder={
            !wilayah.districtCode
              ? "Pilih kecamatan dulu"
              : wilayah.loading.villages
                ? "Memuat..."
                : "Pilih kelurahan/desa"
          }
          searchPlaceholder="Cari kelurahan/desa..."
          onValueChange={(code) => {
            const item = wilayah.villages.find((v) => v.code === code)
            wilayah.selectVillage(code || null)
            onChange({ subdistrict: item?.name ?? "" })
          }}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-postal`}>Kode Pos</Label>
        <Input
          id={`${idPrefix}-postal`}
          value={value.postal_code ?? ""}
          disabled={disabled}
          onChange={(e) => onChange({ postal_code: e.target.value })}
          placeholder="12345"
          inputMode="numeric"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Koordinat</Label>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start gap-2"
          size="sm"
          disabled={disabled}
          onClick={onOpenMap}
        >
          <Map className="h-4 w-4" />
          Pilih dari Peta
        </Button>
        {value.latitude != null && value.longitude != null ? (
          <p className="text-xs text-muted-foreground">
            Koordinat: {value.latitude}, {value.longitude}
          </p>
        ) : (
          <p className="text-xs text-amber-600">Lokasi wajib dipilih dari peta</p>
        )}
      </div>

      {variant === "user" && (
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor={`${idPrefix}-note`}>Catatan (opsional)</Label>
          <Input
            id={`${idPrefix}-note`}
            value={value.note ?? ""}
            disabled={disabled}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Patokan, catatan pengiriman, dll"
          />
        </div>
      )}
    </div>
  )
}
