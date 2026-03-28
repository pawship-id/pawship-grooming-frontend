"use client"

import { useEffect, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { Mail, Phone, Shield, Calendar, User, Weight, Tag, Pencil, Plus, Trash2, MapPin, LocateFixed } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  getCurrentUser,
  updateMyProfile,
  createMyPet,
  updateMyPet,
  deleteMyPet,
  type ApiCurrentUser,
  type ApiPet,
  type UpdateMyProfilePayload,
  type CreateMyPetPayload,
} from "@/lib/api/users"
import { getOptions, type ApiOption } from "@/lib/api/options"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// ── Edit Profile Dialog ──────────────────────────────────────────────────────

import type { UserAddress } from "@/lib/api/users"

const LocationMap = dynamic(
  () => import("@/app/(dashboard)/admin/stores/store-location-map").then((mod) => ({ default: mod.StoreLocationMap })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full rounded-md border border-border bg-muted/40 animate-pulse" />
    ),
  }
)

type ProfileFormState = {
  full_name: string
  gender: string
  addresses: UserAddress[]
}

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  profile: ApiCurrentUser
  onSaved: (updated: ApiCurrentUser) => void
}) {
  const [form, setForm] = useState<ProfileFormState>({
    full_name: profile.profile?.full_name ?? "",
    gender: profile.profile?.gender ?? "",
    addresses: profile.profile?.addresses?.length ? profile.profile.addresses : [],
  })
  const [saving, setSaving] = useState(false)
  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null)
  const [coordInputMode, setCoordInputMode] = useState<"manual" | "map">("manual")
  const [mapOpen, setMapOpen] = useState(false)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false)

  useEffect(() => {
    if (open) {
      setForm({
        full_name: profile.profile?.full_name ?? "",
        gender: profile.profile?.gender ?? "",
        addresses: profile.profile?.addresses?.length ? profile.profile.addresses : [],
      })
      setEditingAddressIdx(null)
      setCoordInputMode("manual")
      setMapOpen(false)
    }
  }, [open, profile])

  useEffect(() => {
    setCoordInputMode("manual")
    setMapOpen(false)
  }, [editingAddressIdx])

  function handleDetectLocation() {
    if (editingAddressIdx === null) return
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser ini")
      return
    }
    setIsDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6))
        const lng = Number(position.coords.longitude.toFixed(6))
        setForm(f => ({
          ...f,
          addresses: f.addresses.map((a, i) => i === editingAddressIdx ? { ...a, latitude: lat, longitude: lng } : a)
        }))
        setIsDetectingLocation(false)
      },
      () => {
        toast.error("Gagal mendeteksi lokasi. Pastikan akses lokasi diizinkan.")
        setIsDetectingLocation(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const addresses = form.addresses.map((a, i) => ({ ...a, is_main_address: !!a.is_main_address }))
      const payload: UpdateMyProfilePayload = {
        full_name: form.full_name || undefined,
        gender: (form.gender as "Male" | "Female") || undefined,
        addresses,
      }
      const res = await updateMyProfile(payload)
      toast.success("Profil berhasil diperbarui")
      onSaved(res.user)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui profil")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Profil</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Nama Lengkap</Label>
            <Input
              id="full_name"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Masukkan nama lengkap"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="gender">Gender</Label>
            <Select value={form.gender} onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}>
              <SelectTrigger id="gender">
                <SelectValue placeholder="Pilih gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Daftar Alamat</Label>
            {form.addresses.length === 0 && (
              <div className="text-xs text-muted-foreground mb-2">Belum ada alamat. Tambahkan alamat utama Anda.</div>
            )}
            {form.addresses.map((addr, idx) => (
              <div key={addr._id || idx} className="border rounded-md mb-2 relative bg-muted/30">
                {editingAddressIdx === idx ? (
                  <div className="p-3">
                    <div className="flex gap-2 items-center mb-2">
                      <input
                        type="radio"
                        id={`main_address_${idx}`}
                        name="main_address"
                        checked={!!addr.is_main_address}
                        onChange={() => setForm(f => ({
                          ...f,
                          addresses: f.addresses.map((a, i) => ({ ...a, is_main_address: i === idx }))
                        }))}
                      />
                      <Label htmlFor={`main_address_${idx}`} className="text-xs font-medium cursor-pointer">Alamat Utama</Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="ml-auto text-xs h-7"
                        onClick={() => setEditingAddressIdx(null)}
                      >
                        Selesai
                      </Button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`address-label-${idx}`}>Label</Label>
                        <Input
                          id={`address-label-${idx}`}
                          value={addr.label || ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, label: e.target.value } : a)
                          }))}
                          placeholder="Label (Rumah, Kantor, dll)"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`address-street-${idx}`}>Jalan / Alamat</Label>
                        <Input
                          id={`address-street-${idx}`}
                          value={addr.street || ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, street: e.target.value } : a)
                          }))}
                          placeholder="Jalan / Alamat"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`address-subdistrict-${idx}`}>Kelurahan / Desa</Label>
                        <Input
                          id={`address-subdistrict-${idx}`}
                          value={addr.subdistrict || ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, subdistrict: e.target.value } : a)
                          }))}
                          placeholder="Kelurahan / Desa"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`address-district-${idx}`}>Kecamatan</Label>
                        <Input
                          id={`address-district-${idx}`}
                          value={addr.district || ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, district: e.target.value } : a)
                          }))}
                          placeholder="Kecamatan"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`address-city-${idx}`}>Kota / Kabupaten</Label>
                        <Input
                          id={`address-city-${idx}`}
                          value={addr.city || ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, city: e.target.value } : a)
                          }))}
                          placeholder="Kota / Kabupaten"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`address-province-${idx}`}>Provinsi</Label>
                        <Input
                          id={`address-province-${idx}`}
                          value={addr.province || ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, province: e.target.value } : a)
                          }))}
                          placeholder="Provinsi"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`address-postal-code-${idx}`}>Kode Pos</Label>
                        <Input
                          id={`address-postal-code-${idx}`}
                          value={addr.postal_code || ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, postal_code: e.target.value } : a)
                          }))}
                          placeholder="Kode Pos"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Koordinat</Label>
                        <div className="flex rounded-md border border-border w-fit">
                          <Button
                            type="button"
                            size="sm"
                            variant={coordInputMode === "manual" ? "secondary" : "ghost"}
                            className="rounded-none rounded-l-md"
                            onClick={() => setCoordInputMode("manual")}
                          >
                            Manual
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={coordInputMode === "map" ? "secondary" : "ghost"}
                            className="rounded-none rounded-r-md border-l border-border"
                            onClick={() => setCoordInputMode("map")}
                          >
                            Dari Peta
                          </Button>
                        </div>
                      </div>
                      {coordInputMode === "manual" ? (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`address-latitude-${idx}`}>Latitude</Label>
                            <Input
                              id={`address-latitude-${idx}`}
                              type="number"
                              step="any"
                              value={addr.latitude ?? ""}
                              onChange={e => setForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) => i === idx ? { ...a, latitude: e.target.value ? parseFloat(e.target.value) : undefined } : a)
                              }))}
                              placeholder="-6.208"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`address-longitude-${idx}`}>Longitude</Label>
                            <Input
                              id={`address-longitude-${idx}`}
                              type="number"
                              step="any"
                              value={addr.longitude ?? ""}
                              onChange={e => setForm(f => ({
                                ...f,
                                addresses: f.addresses.map((a, i) => i === idx ? { ...a, longitude: e.target.value ? parseFloat(e.target.value) : undefined } : a)
                              }))}
                              placeholder="106.845"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-2 sm:col-span-2">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setMapOpen(true)}
                            >
                              <MapPin className="h-3.5 w-3.5 mr-1" />
                              Pilih dari Peta
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isDetectingLocation}
                              onClick={handleDetectLocation}
                            >
                              <LocateFixed className="h-3.5 w-3.5 mr-1" />
                              {isDetectingLocation ? "Mendeteksi..." : "Lokasi Saat Ini"}
                            </Button>
                          </div>
                          {addr.latitude != null && addr.longitude != null && (
                            <p className="text-xs text-muted-foreground">
                              Koordinat terpilih: {addr.latitude}, {addr.longitude}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex flex-col gap-1.5 sm:col-span-2">
                        <Label htmlFor={`address-note-${idx}`}>Catatan (opsional)</Label>
                        <Input
                          id={`address-note-${idx}`}
                          value={addr.note || ""}
                          onChange={e => setForm(f => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, note: e.target.value } : a)
                          }))}
                          placeholder="Catatan (opsional)"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input
                      type="radio"
                      id={`main_address_collapsed_${idx}`}
                      name="main_address"
                      checked={!!addr.is_main_address}
                      onChange={() => setForm(f => ({
                        ...f,
                        addresses: f.addresses.map((a, i) => ({ ...a, is_main_address: i === idx }))
                      }))}
                      className="shrink-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <label htmlFor={`main_address_collapsed_${idx}`} className="flex items-center gap-1.5 mb-0.5 cursor-pointer">
                        {addr.is_main_address && (
                          <span className="text-xs text-primary font-semibold">Utama</span>
                        )}
                        <span className="text-xs font-medium">{addr.label || "Alamat"}</span>
                      </label>
                      <p className="text-xs text-muted-foreground truncate">
                        {[addr.street, addr.district, addr.city, addr.province]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={() => setEditingAddressIdx(idx)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {form.addresses.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          setForm(f => ({
                            ...f,
                            addresses: f.addresses.filter((_, i) => i !== idx)
                          }))
                          if (editingAddressIdx === idx) setEditingAddressIdx(null)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => {
              const newIdx = form.addresses.length
              setForm(f => ({
                ...f,
                addresses: [
                  ...f.addresses.map(a => ({ ...a, is_main_address: false })),
                  { is_main_address: f.addresses.length === 0, label: "", street: "", city: "" }
                ]
              }))
              setEditingAddressIdx(newIdx)
            }}>
              <Plus className="h-4 w-4 mr-1" /> Tambah Alamat
            </Button>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <Dialog open={mapOpen} onOpenChange={setMapOpen}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pilih Lokasi di Peta</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Klik titik pada peta untuk mengisi koordinat alamat secara otomatis.
        </p>
        {mapOpen && editingAddressIdx !== null && (
          <LocationMap
            selectedLat={form.addresses[editingAddressIdx]?.latitude ?? null}
            selectedLng={form.addresses[editingAddressIdx]?.longitude ?? null}
            onSelect={(lat, lng) => {
              setForm(f => ({
                ...f,
                addresses: f.addresses.map((a, i) => i === editingAddressIdx ? { ...a, latitude: lat, longitude: lng } : a)
              }))
            }}
          />
        )}
        <div className="flex justify-end">
          <Button type="button" onClick={() => setMapOpen(false)}>Selesai</Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}

// ── Pet Form Dialog ──────────────────────────────────────────────────────────

type PetFormState = {
  name: string
  description: string
  pet_type_id: string
  size_category_id: string
  breed_category_id: string
  hair_category_id: string
  weight: string
  birthday: string
  is_active: boolean
}

const EMPTY_PET_FORM: PetFormState = {
  name: "",
  description: "",
  pet_type_id: "",
  size_category_id: "",
  breed_category_id: "",
  hair_category_id: "__none__",
  weight: "",
  birthday: "",
  is_active: true,
}

function petToForm(pet: ApiPet): PetFormState {
  return {
    name: pet.name,
    description: pet.description ?? "",
    pet_type_id: pet.pet_type?._id ?? "",
    size_category_id: pet.size?._id ?? "",
    breed_category_id: pet.breed?._id ?? "",
    hair_category_id: pet.hair?._id ?? "__none__",
    weight: pet.weight != null ? String(pet.weight) : "",
    birthday: pet.birthday ? pet.birthday.substring(0, 10) : "",
    is_active: pet.is_active,
  }
}

function PetFormDialog({
  open,
  onOpenChange,
  editingPet,
  onSaved,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingPet: ApiPet | null
  onSaved: () => void
}) {
  const [form, setForm] = useState<PetFormState>(EMPTY_PET_FORM)
  const [saving, setSaving] = useState(false)
  const [petTypes, setPetTypes] = useState<ApiOption[]>([])
  const [sizes, setSizes] = useState<ApiOption[]>([])
  const [breeds, setBreeds] = useState<ApiOption[]>([])
  const [hairs, setHairs] = useState<ApiOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(editingPet ? petToForm(editingPet) : EMPTY_PET_FORM)
    setLoadingOptions(true)
    Promise.all([
      getOptions("pet type"),
      getOptions("size category"),
      getOptions("breed category"),
      getOptions("hair category"),
    ])
      .then(([pt, sz, br, hr]) => {
        setPetTypes(pt.options.filter((o) => o.is_active))
        setSizes(sz.options.filter((o) => o.is_active))
        setBreeds(br.options.filter((o) => o.is_active))
        setHairs(hr.options.filter((o) => o.is_active))
      })
      .catch(() => toast.error("Gagal memuat opsi"))
      .finally(() => setLoadingOptions(false))
  }, [open, editingPet])

  function set(field: keyof PetFormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return toast.error("Nama pet wajib diisi")
    if (!form.pet_type_id) return toast.error("Tipe pet wajib dipilih")
    if (!form.size_category_id) return toast.error("Ukuran wajib dipilih")
    if (!form.breed_category_id) return toast.error("Ras wajib dipilih")

    setSaving(true)
    try {
      const payload: CreateMyPetPayload = {
        name: form.name.trim(),
        description: form.description || undefined,
        pet_type_id: form.pet_type_id,
        size_category_id: form.size_category_id,
        breed_category_id: form.breed_category_id,
        hair_category_id: form.hair_category_id === "__none__" ? undefined : form.hair_category_id || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        birthday: form.birthday || undefined,
        is_active: form.is_active,
      }

      if (editingPet) {
        await updateMyPet(editingPet._id, payload)
        toast.success(`${form.name} berhasil diperbarui`)
      } else {
        await createMyPet(payload)
        toast.success(`${form.name} berhasil ditambahkan`)
      }

      onSaved()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pet")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingPet ? "Edit Pet" : "Tambah Pet"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pet-name">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pet-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Nama pet"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>
                Tipe Pet <span className="text-destructive">*</span>
              </Label>
              <Select value={form.pet_type_id} onValueChange={(v) => set("pet_type_id", v)} disabled={loadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  {petTypes.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Ukuran <span className="text-destructive">*</span>
              </Label>
              <Select value={form.size_category_id} onValueChange={(v) => set("size_category_id", v)} disabled={loadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih ukuran" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Ras <span className="text-destructive">*</span>
              </Label>
              <Select value={form.breed_category_id} onValueChange={(v) => set("breed_category_id", v)} disabled={loadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih ras" />
                </SelectTrigger>
                <SelectContent>
                  {breeds.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Jenis Rambut</Label>
              <Select value={form.hair_category_id} onValueChange={(v) => set("hair_category_id", v)} disabled={loadingOptions}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis rambut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Tidak dipilih —</SelectItem>
                  {hairs.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pet-weight">Berat (kg)</Label>
              <Input
                id="pet-weight"
                type="number"
                min="0"
                step="0.1"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
                placeholder="Contoh: 4.5"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pet-birthday">Tanggal Lahir</Label>
              <Input
                id="pet-birthday"
                type="date"
                value={form.birthday}
                onChange={(e) => set("birthday", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pet-desc">Deskripsi</Label>
            <Textarea
              id="pet-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Catatan atau deskripsi singkat (opsional)"
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="pet-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="pet-active" className="cursor-pointer">
              Aktif
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Batal
            </Button>
            <Button type="submit" disabled={saving || loadingOptions}>
              {saving ? "Menyimpan..." : editingPet ? "Perbarui" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Pet Card ─────────────────────────────────────────────────────────────────

function PetCard({
  pet,
  onEdit,
  onDelete,
}: {
  pet: ApiPet
  onEdit: (pet: ApiPet) => void
  onDelete: (pet: ApiPet) => void
}) {
  const activeMembership = pet.memberships?.find((m) => m.status === "active")

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{pet.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={pet.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500"}
            >
              {pet.is_active ? "Active" : "Inactive"}
            </Badge>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(pet)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(pet)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {pet.pet_type && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground">Tipe</span>
              <span className="text-xs font-medium">{pet.pet_type.name}</span>
            </div>
          )}
          {pet.breed && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground">Ras</span>
              <span className="text-xs font-medium">{pet.breed.name}</span>
            </div>
          )}
          {pet.size && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground">Ukuran</span>
              <span className="text-xs font-medium">{pet.size.name}</span>
            </div>
          )}
          {pet.weight != null && (
            <div className="flex items-start gap-2">
              <Weight className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-xs font-medium">{pet.weight} kg</span>
            </div>
          )}
          {pet.member_category && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <Tag className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-xs font-medium">{pet.member_category.name}</span>
            </div>
          )}
        </div>
        {/* {pet.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {pet.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )} */}
        {activeMembership && (
          <div className="mt-3 rounded-md bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary mb-1">Active Membership</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(activeMembership.start_date)} – {formatDate(activeMembership.end_date)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<ApiCurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [petDialogOpen, setPetDialogOpen] = useState(false)
  const [editingPet, setEditingPet] = useState<ApiPet | null>(null)
  const [deletingPet, setDeletingPet] = useState<ApiPet | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProfile = useCallback(() => {
    setLoading(true)
    getCurrentUser()
      .then((res) => setProfile(res.user))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat profil"))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  function openAddPet() {
    setEditingPet(null)
    setPetDialogOpen(true)
  }

  function openEditPet(pet: ApiPet) {
    setEditingPet(pet)
    setPetDialogOpen(true)
  }

  async function handleDeletePet() {
    if (!deletingPet) return
    setDeleting(true)
    try {
      await deleteMyPet(deletingPet._id)
      toast.success(`${deletingPet.name} berhasil dihapus`)
      setDeletingPet(null)
      fetchProfile()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pet")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-16 w-16 rounded-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-56" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error ?? "Profil tidak ditemukan."}
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = profile.username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Informasi akun dan hewan peliharaan Anda</p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1">
                <CardTitle className="text-xl">
                  {profile.profile?.full_name || profile.username}
                </CardTitle>
                <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200">
                  Customer
                </Badge>
              </div>
            </div>
            <Button variant="default" size="sm" onClick={() => setEditProfileOpen(true)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit Profil
            </Button>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm font-medium">{profile.username}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="text-sm font-medium">{profile.phone_number || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium">{profile.is_active ? "Active" : "Inactive"}</p>
              </div>
            </div>
            {profile.profile?.gender && (
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Gender</p>
                  <p className="text-sm font-medium">{profile.profile.gender}</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">{formatDate(profile.createdAt)}</p>
              </div>
            </div>
          </div>
          {profile.profile?.addresses && profile.profile.addresses.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Alamat</span>
              </div>
              {profile.profile.addresses.map((addr, idx) => (
                <div key={addr._id || idx} className={`rounded border px-3 py-2 text-xs ${addr.is_main_address ? "border-green-700 bg-green-50" : "border-border bg-muted/30"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {addr.is_main_address && <span className="text-green-700 font-semibold mr-1`">Utama</span>}
                    <span className="font-medium text-gray-700">{addr.label || "Alamat"}</span>
                  </div>
                  <div className="text-gray-700">
                    {[addr.street, addr.subdistrict, addr.district, addr.city, addr.province, addr.postal_code]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                  {addr.note && <div className="text-muted-foreground mt-1">{addr.note}</div>}
                  {/* Optionally: show lat/lng if present */}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pets Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          My Pets {profile.pets && profile.pets.length > 0 ? `(${profile.pets.length})` : ""}
        </h2>
        <Button size="sm" onClick={openAddPet}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pet
        </Button>
      </div>

      {profile.pets && profile.pets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {profile.pets.map((pet) => (
            <PetCard key={pet._id} pet={pet} onEdit={openEditPet} onDelete={setDeletingPet} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Belum ada hewan peliharaan yang terdaftar.
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {profile && (
        <EditProfileDialog
          open={editProfileOpen}
          onOpenChange={setEditProfileOpen}
          profile={profile}
          onSaved={(updated) => setProfile(prev => ({ ...updated, pets: prev?.pets ?? updated.pets }))}
        />
      )}

      <PetFormDialog
        open={petDialogOpen}
        onOpenChange={setPetDialogOpen}
        editingPet={editingPet}
        onSaved={fetchProfile}
      />

      <AlertDialog open={!!deletingPet} onOpenChange={(v) => { if (!v) setDeletingPet(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pet</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong>{deletingPet?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePet} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
