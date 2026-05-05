"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Mail, Phone, Shield, Calendar, User, Weight, Tag, Pencil, Plus, Trash2, MapPin, Map, Eye, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
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
} from "@/lib/api/users";
import { getOptions, type ApiOption } from "@/lib/api/options";
import { uploadFile } from "@/lib/api/upload";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Edit Profile Dialog ──────────────────────────────────────────────────────

import type { UserAddress } from "@/lib/api/users";

import { MapPickerModal } from "@/components/map-picker-modal";
import { AddressFormFields } from "@/components/address-form-fields";
import type { GeocodedAddress } from "@/lib/google-geocode";

type ProfileFormState = {
  full_name: string;
  gender: string;
  addresses: UserAddress[];
  existingImageUrl?: string;
};

function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: ApiCurrentUser;
  onSaved: (updated: ApiCurrentUser) => void;
}) {
  const [form, setForm] = useState<ProfileFormState>({
    full_name: profile.profile?.full_name ?? "",
    gender: profile.profile?.gender ?? "",
    addresses: profile.profile?.addresses?.length ? profile.profile.addresses : [],
  });
  const [saving, setSaving] = useState(false);
  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [pendingGeocode, setPendingGeocode] = useState<Record<number, GeocodedAddress | null>>({});
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const profileImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setForm({
        full_name: profile.profile?.full_name ?? "",
        gender: profile.profile?.gender ?? "",
        addresses: profile.profile?.addresses?.length
          ? profile.profile.addresses
          : [],
        existingImageUrl: profile.profile?.image_url ?? undefined,
      });
      setImageFile(null);
      setImagePreview(null);
      setEditingAddressIdx(null);
      setMapOpen(false);
    }
  }, [open, profile]);

  useEffect(() => {
    setMapOpen(false);
  }, [editingAddressIdx]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      let image_url: string | undefined = undefined;
      let public_id: string | undefined = undefined;
      if (imageFile) {
        const uploaded = await uploadFile(imageFile, "profiles");
        image_url = uploaded.image_url;
        public_id = uploaded.public_id;
      }
      const addresses = form.addresses.map((a) => ({
        ...a,
        is_main_address: !!a.is_main_address,
        created_by: a.created_by ?? "customer",
      }));
      const payload: UpdateMyProfilePayload = {
        full_name: form.full_name || undefined,
        gender: (form.gender as "Male" | "Female") || undefined,
        addresses,
        ...(image_url ? { image_url, public_id } : {}),
      };
      const res = await updateMyProfile(payload);
      toast.success("Profil berhasil diperbarui");
      onSaved(res.user);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui profil",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Profil</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1"
          >
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => profileImageRef.current?.click()}
                className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-[#e8c9a0] shadow-md focus:outline-none"
                style={{
                  background: "linear-gradient(135deg, #c97b3a, #e05a3a)",
                }}
              >
                {imagePreview || form.existingImageUrl ? (
                  <img
                    src={imagePreview ?? form.existingImageUrl}
                    alt="Foto profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-2xl font-bold text-white">
                    {(form.full_name || profile.username)
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Ganti</span>
                </div>
              </button>
              <span className="text-xs text-muted-foreground">
                Klik foto untuk mengganti
              </span>
              <input
                ref={profileImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImageFile(file);
                  const reader = new FileReader();
                  reader.onload = (ev) =>
                    setImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Nama Lengkap</Label>
              <Input
                id="full_name"
                value={form.full_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, full_name: e.target.value }))
                }
                placeholder="Masukkan nama lengkap"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
              >
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
                <div className="text-xs text-muted-foreground mb-2">
                  Belum ada alamat. Tambahkan alamat utama Anda.
                </div>
              )}
              {form.addresses.map((addr, idx) => (
                <div
                  key={addr._id || idx}
                  className="border rounded-md mb-2 relative bg-muted/30"
                >
                  {editingAddressIdx === idx ? (
                    <div className="p-3">
                      <div className="flex gap-2 items-center mb-2">
                        <input
                          type="radio"
                          id={`main_address_${idx}`}
                          name="main_address"
                          checked={!!addr.is_main_address}
                          onChange={() =>
                            setForm((f) => ({
                              ...f,
                              addresses: f.addresses.map((a, i) => ({
                                ...a,
                                is_main_address: i === idx,
                              })),
                            }))
                          }
                        />
                        <Label
                          htmlFor={`main_address_${idx}`}
                          className="text-xs font-medium cursor-pointer"
                        >
                          Alamat Utama
                        </Label>
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
                      <div className="grid gap-2">
                        <AddressFormFields
                          variant="user"
                          idPrefix={`address-${idx}`}
                          value={addr}
                          pendingGeocode={pendingGeocode[idx] ?? null}
                          onGeocodeConsumed={() => setPendingGeocode((prev) => ({ ...prev, [idx]: null }))}
                          onChange={(patch) => setForm((f) => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => i === idx ? { ...a, ...patch } : a),
                          }))}
                          onOpenMap={() => setMapOpen(true)}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <input
                        type="radio"
                        id={`main_address_collapsed_${idx}`}
                        name="main_address"
                        checked={!!addr.is_main_address}
                        onChange={() =>
                          setForm((f) => ({
                            ...f,
                            addresses: f.addresses.map((a, i) => ({
                              ...a,
                              is_main_address: i === idx,
                            })),
                          }))
                        }
                        className="shrink-0 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`main_address_collapsed_${idx}`}
                          className="flex items-center gap-1.5 mb-0.5 cursor-pointer"
                        >
                          {addr.is_main_address && (
                            <span className="text-xs text-primary font-semibold">
                              Utama
                            </span>
                          )}
                          <span className="text-xs font-medium">
                            {addr.label || "Alamat"}
                          </span>
                          {addr.created_by === "admin" && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 h-4 font-normal"
                            >
                              Admin
                            </Badge>
                          )}
                        </label>
                        <p className="text-xs text-muted-foreground truncate">
                          {[
                            addr.street,
                            addr.district,
                            addr.city,
                            addr.province,
                          ]
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
                      {form.addresses.length > 1 &&
                        addr.created_by !== "admin" && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                              setForm((f) => ({
                                ...f,
                                addresses: f.addresses.filter(
                                  (_, i) => i !== idx,
                                ),
                              }));
                              if (editingAddressIdx === idx)
                                setEditingAddressIdx(null);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                    </div>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newIdx = form.addresses.length;
                  setForm((f) => ({
                    ...f,
                    addresses: [
                      ...f.addresses.map((a) => ({
                        ...a,
                        is_main_address: false,
                      })),
                      {
                        is_main_address: f.addresses.length === 0,
                        label: "",
                        street: "",
                        city: "",
                        created_by: "customer" as const,
                      },
                    ],
                  }));
                  setEditingAddressIdx(newIdx);
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Tambah Alamat
              </Button>
            </div>
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    <MapPickerModal
      open={mapOpen}
      onOpenChange={setMapOpen}
      selectedLat={editingAddressIdx !== null ? form.addresses[editingAddressIdx]?.latitude ?? null : null}
      selectedLng={editingAddressIdx !== null ? form.addresses[editingAddressIdx]?.longitude ?? null : null}
      onSelect={(lat, lng, components) => {
        if (editingAddressIdx === null) return;
        const targetIdx = editingAddressIdx;
        setForm((f) => ({
          ...f,
          addresses: f.addresses.map((a, i) => i === targetIdx ? { ...a, latitude: lat, longitude: lng } : a),
        }));
        if (components) {
          setPendingGeocode((prev) => ({ ...prev, [targetIdx]: components }));
        }
      }}
    />
    </>
  );
}

// ── Pet Form Dialog ──────────────────────────────────────────────────────────

type PetFormState = {
  name: string;
  description: string;
  pet_type_id: string;
  size_category_id: string;
  breed_category_id: string;
  hair_category_id: string;
  weight: string;
  birthday: string;
  is_active: boolean;
};

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
};

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
  };
}

function PetFormDialog({
  open,
  onOpenChange,
  editingPet,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editingPet: ApiPet | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<PetFormState>(EMPTY_PET_FORM);
  const [saving, setSaving] = useState(false);
  const [petTypes, setPetTypes] = useState<ApiOption[]>([]);
  const [sizes, setSizes] = useState<ApiOption[]>([]);
  const [breeds, setBreeds] = useState<ApiOption[]>([]);
  const [hairs, setHairs] = useState<ApiOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isWeightValid =
    !!form.weight && !isNaN(Number(form.weight)) && Number(form.weight) > 0;
  const shouldShowSizeInfo =
    !form.size_category_id && (!form.pet_type_id || !isWeightValid);

  useEffect(() => {
    if (!open) {
      setImageFile(null);
      setImagePreview(null);
      return;
    }
    setForm(editingPet ? petToForm(editingPet) : EMPTY_PET_FORM);
    setImageFile(null);
    setImagePreview(editingPet?.profile_image?.secure_url ?? null);
    setLoadingOptions(true);
    Promise.all([
      getOptions("pet type"),
      getOptions("size category"),
      getOptions("breed category"),
      getOptions("hair category"),
    ])
      .then(([pt, sz, br, hr]) => {
        setPetTypes(pt.options.filter((o) => o.is_active));
        setSizes(sz.options.filter((o) => o.is_active));
        setBreeds(br.options.filter((o) => o.is_active));
        setHairs(hr.options.filter((o) => o.is_active));
      })
      .catch(() => toast.error("Gagal memuat opsi"))
      .finally(() => setLoadingOptions(false));
  }, [open, editingPet]);

  function set(field: keyof PetFormState, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function calculateSize() {
    if (!form.pet_type_id || !form.weight || isNaN(Number(form.weight)) || Number(form.weight) <= 0) {
      set("size_category_id", "");
      return;
    }
    const weight = Number(form.weight);
    const selectedPetTypeId = form.pet_type_id;
    const matchedSize = sizes.find((size) =>
      size.pet_weight_rules?.some(
        (rule) =>
          (typeof rule.petTypeId === "string"
            ? rule.petTypeId
            : rule.petTypeId._id) === selectedPetTypeId &&
          weight > rule.minWeight &&
          weight <= rule.maxWeight
      )
    );
    set("size_category_id", matchedSize?._id || "");
  }

  useEffect(() => {
    calculateSize();
  }, [form.pet_type_id, form.weight, sizes]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return toast.error("Nama pet wajib diisi");
    if (!form.pet_type_id) return toast.error("Tipe pet wajib dipilih");
    if (!form.weight || isNaN(Number(form.weight)) || Number(form.weight) <= 0) return toast.error("Berat wajib diisi dan harus lebih dari 0");
    if (!form.breed_category_id) return toast.error("Ras wajib dipilih");

    setSaving(true);
    try {
      let profileImage = editingPet?.profile_image
        ? {
            secure_url: editingPet.profile_image.secure_url!,
            public_id: editingPet.profile_image.public_id!,
          }
        : undefined;

      if (imageFile) {
        const uploaded = await uploadFile(imageFile, "pets");
        profileImage = {
          secure_url: uploaded.image_url,
          public_id: uploaded.public_id,
        };
      }

      const payload: CreateMyPetPayload = {
        name: form.name.trim(),
        description: form.description || undefined,
        pet_type_id: form.pet_type_id,
        size_category_id: form.size_category_id,
        breed_category_id: form.breed_category_id,
        hair_category_id:
          form.hair_category_id === "__none__"
            ? undefined
            : form.hair_category_id || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        birthday: form.birthday || undefined,
        is_active: form.is_active,
        profile_image: profileImage,
      };

      if (editingPet) {
        await updateMyPet(editingPet._id, payload);
        toast.success(`${form.name} berhasil diperbarui`);
      } else {
        await createMyPet(payload);
        toast.success(`${form.name} berhasil ditambahkan`);
      }

      onSaved();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pet");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPet ? "Edit Pet" : "Tambah Pet"}</DialogTitle>
          </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Image Upload */}
          <div className="flex flex-col gap-1.5">
            <Label>Foto Pet</Label>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer shrink-0"
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl select-none">🐾</span>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? "Ganti Foto" : "Upload Foto"}
                </Button>
                {imageFile && (
                  <p className="text-xs text-muted-foreground">
                    {imageFile.name}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Maks. 2 MB (JPG/PNG)
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

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
              <Select
                value={form.pet_type_id}
                onValueChange={(v) => set("pet_type_id", v)}
                disabled={loadingOptions}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tipe" />
                </SelectTrigger>
                <SelectContent>
                  {petTypes.map((o) => (
                    <SelectItem key={o._id} value={o._id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <Label>Ukuran</Label>
                {shouldShowSizeInfo && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex md:hidden items-center text-muted-foreground hover:text-foreground"
                          aria-label="Info ukuran otomatis"
                        >
                          <Info className="h-3 w-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2 text-xs" align="start">
                        Otomatis terisi setelah tipe hewan dan berat diinput.
                      </PopoverContent>
                    </Popover>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="hidden md:inline-flex items-center text-muted-foreground hover:text-foreground"
                          aria-label="Info ukuran otomatis"
                        >
                          <Info className="h-3 w-3 cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Otomatis terisi setelah tipe hewan dan berat diinput.</p>
                      </TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
              <Select
                value={form.size_category_id}
                disabled
              >
                <SelectTrigger>
                  <SelectValue placeholder="Otomatis terisi" />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((o) => (
                    <SelectItem key={o._id} value={o._id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>
                Ras <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.breed_category_id}
                onValueChange={(v) => set("breed_category_id", v)}
                disabled={loadingOptions}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih ras" />
                </SelectTrigger>
                <SelectContent>
                  {breeds.map((o) => (
                    <SelectItem key={o._id} value={o._id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Jenis Rambut</Label>
              <Select
                value={form.hair_category_id}
                onValueChange={(v) => set("hair_category_id", v)}
                disabled={loadingOptions}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih jenis rambut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Tidak dipilih —</SelectItem>
                  {hairs.map((o) => (
                    <SelectItem key={o._id} value={o._id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pet-weight">
                Berat (kg) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pet-weight"
                type="number"
                min="0.1"
                step="0.1"
                value={form.weight}
                onChange={(e) => set("weight", e.target.value)}
                placeholder="Contoh: 4.5"
                required
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
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Batal
            </Button>
            <Button type="submit" disabled={saving || loadingOptions}>
              {saving ? "Menyimpan..." : editingPet ? "Perbarui" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}

// ── Pet Detail Dialog ────────────────────────────────────────────────────────

function PetDetailDialog({
  pet,
  open,
  onOpenChange,
}: {
  pet: ApiPet;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const activeMembership = pet.memberships?.find((m) => m.status === "active");

  function InfoChip({
    label,
    value,
  }: {
    label: string;
    value?: string | null;
  }) {
    if (!value) return null;
    return (
      <div className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-3 py-2">
        <span className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase">
          {label}
        </span>
        <span className="text-xs font-semibold leading-tight">{value}</span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Header — warm gradient matching card accent palette */}
        <div className="relative bg-gradient-to-br from-[#c97b3a] via-[#d9683a] to-[#e05a3a]">
          {/* Decorative dot pattern */}
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />

          {/* Text area — leaves room on right for photo */}
          <p className="text-[8px] font-extrabold tracking-[0.22em] text-white/60 uppercase mb-1 relative px-5 pt-5">
            Pawssport by Pawship
          </p>
          <div className="relative px-5 pb-7 pl-[150px]">
            <h2 className="text-xl font-black text-white uppercase leading-tight line-clamp-2">
              {pet.name}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className={
                  pet.is_active
                    ? "border-white/40 text-white bg-white/15 text-[10px]"
                    : "border-white/20 text-white/50 bg-white/5 text-[10px]"
                }
              >
                {pet.is_active ? "Aktif" : "Tidak Aktif"}
              </Badge>
            </div>
          </div>

          {/* Photo — anchored to right, overflowing downward for 3D effect */}
          <div
            className="absolute left-5 bottom-0 translate-y-[45%] z-10"
            style={{ width: "110px", aspectRatio: "117/143" }}
          >
            <div className="w-full h-full border-[3px] border-[#fde8c8] dark:border-[#8a5a30] rounded-xl overflow-hidden bg-[#ede0cc] dark:bg-[#3a2510] shadow-2xl flex items-center justify-center">
              {pet.profile_image?.secure_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.profile_image.secure_url}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-5xl select-none">🐾</span>
              )}
            </div>
          </div>
        </div>

        {/* Body — padding-top clears the overflowing photo (110 * 143/117 * 0.45 ≈ 61px + 16px gap) */}
        <div
          className="px-5 pb-4 flex flex-col gap-4 max-h-[55vh] overflow-y-auto"
          style={{ paddingTop: "77px" }}
        >
          {/* Primary info grid */}
          <div className="grid grid-cols-3 gap-2">
            <InfoChip label="Type" value={pet.pet_type?.name} />
            <InfoChip label="Breed" value={pet.breed?.name} />
            <InfoChip
              label="Weight"
              value={pet.weight != null ? `${pet.weight} kg` : null}
            />
            <InfoChip label="Size" value={pet.size?.name} />
            <InfoChip label="Hair Type" value={pet.hair?.name} />
            <InfoChip
              label="Date of Birth"
              value={pet.birthday ? formatDate(pet.birthday) : null}
            />
          </div>

          {/* Description */}
          {pet.description && (
            <div className="rounded-lg bg-muted/60 px-3 py-2">
              <p className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase mb-1">
                Deskripsi
              </p>
              <p className="text-xs leading-relaxed">{pet.description}</p>
            </div>
          )}

          {/* Tags */}
          {/* {pet.tags && pet.tags.length > 0 && (
            <div>
              <p className="text-[9px] font-extrabold tracking-widest text-muted-foreground uppercase mb-1.5">Tags</p>
              <div className="flex flex-wrap gap-1">
                {pet.tags.map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )} */}

          {/* Membership */}
          {activeMembership && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col gap-1">
              <p className="text-[9px] font-extrabold tracking-widest text-primary uppercase">
                Membership Aktif
              </p>
              <p className="text-sm font-semibold">
                {formatDate(activeMembership.start_date)} –{" "}
                {formatDate(activeMembership.end_date)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex-1 h-1.5 rounded-full bg-primary/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width:
                        activeMembership.max_usage > 0
                          ? `${Math.min(100, (activeMembership.usage_count / activeMembership.max_usage) * 100)}%`
                          : "0%",
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {activeMembership.usage_count}/{activeMembership.max_usage}{" "}
                  sesi
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom stripe */}
        <div
          className="h-1.5"
          style={{
            background:
              "repeating-linear-gradient(45deg, #e05a3a 0px, #e05a3a 4px, #f09060 4px, #f09060 8px)",
            opacity: 0.75,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ── Pet Card ─────────────────────────────────────────────────────────────────

function PetCard({
  pet,
  ownerName,
  ownerPhone,
  onEdit,
  onDelete,
}: {
  pet: ApiPet;
  ownerName: string;
  ownerPhone: string;
  onEdit: (pet: ApiPet) => void;
  onDelete: (pet: ApiPet) => void;
}) {
  const activeMembership = pet.memberships?.find((m) => m.status === "active");
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <>
      <div className="relative rounded-xl overflow-hidden border border-[#e8c9a0] dark:border-[#5a3a1a] bg-[#fdf6ed] dark:bg-[#1e1208] shadow-sm">
        {/* Header */}
        <div className="px-4 pt-3 pb-2 text-center border-b border-[#e8c9a0] dark:border-[#5a3a1a]">
          <p className="text-[11px] font-black tracking-[0.25em] text-[#1a2b4a] dark:text-[#e8d5b8] uppercase">
            Pawssport by Pawship
          </p>
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 right-2 flex gap-0.5 z-10">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#1a2b4a]/50 hover:text-[#1a2b4a] hover:bg-[#e8c9a0]/40 dark:text-[#e8d5b8]/50 dark:hover:text-[#e8d5b8] dark:hover:bg-[#5a3a1a]/40"
            onClick={() => onEdit(pet)}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#1a2b4a]/50 hover:text-[#1a2b4a] hover:bg-[#e8c9a0]/40 dark:text-[#e8d5b8]/50 dark:hover:text-[#e8d5b8] dark:hover:bg-[#5a3a1a]/40"
            onClick={() => setDetailOpen(true)}
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive/50 hover:text-destructive hover:bg-[#e8c9a0]/40 dark:hover:bg-[#5a3a1a]/40"
            onClick={() => onDelete(pet)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex align-middle gap-4 px-6 py-4">
          {/* Photo */}
          <div className="shrink-0">
            <div className="w-[117px] h-[143px] border-2 border-[#c8a880] dark:border-[#8a5a30] rounded overflow-hidden bg-[#ede0cc] dark:bg-[#3a2510] flex items-center justify-center">
              {pet.profile_image?.secure_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pet.profile_image.secure_url}
                  alt={pet.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl select-none">🐾</span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            {/* Type / Breed / Weight row */}
            <div className="grid grid-cols-3 gap-1 pb-1.5 border-b border-[#e8c9a0] dark:border-[#5a3a1a]">
              <div>
                <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                  Type
                </p>
                <p className="text-[9px] font-bold text-[#c97b3a] uppercase leading-tight">
                  {pet.pet_type?.name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                  Breed
                </p>
                <p className="text-[9px] font-bold text-[#c97b3a] uppercase leading-tight">
                  {pet.breed?.name ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                  Weight
                </p>
                <p className="text-[9px] font-bold text-[#c97b3a] uppercase leading-tight">
                  {pet.weight != null ? `${pet.weight} KG` : "—"}
                </p>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-1">
              <div>
                <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                  Pawfriends Name
                </p>
                <p className="text-[10px] font-bold text-[#c97b3a] uppercase leading-tight">
                  {pet.name}
                </p>
              </div>

              <div>
                <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                  Date of Birth
                </p>
                <p className="text-[9px] font-bold text-[#c97b3a] uppercase leading-tight">
                  {pet.birthday ? formatDate(pet.birthday) : "—"}
                </p>
              </div>

              <div>
                <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                  Pawrents Name
                </p>
                <p className="text-[9px] font-bold text-[#c97b3a] leading-tight">
                  {ownerName}
                </p>
              </div>

              <div>
                <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                  Pawrents Phone Number
                </p>
                <p className="text-[9px] font-bold text-[#c97b3a] leading-tight">
                  {ownerPhone}
                </p>
              </div>

              {activeMembership && (
                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  <div>
                    <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                      Start Date
                    </p>
                    <p className="text-[9px] font-bold text-[#c97b3a] uppercase leading-tight">
                      {formatDate(activeMembership.start_date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-extrabold tracking-widest text-[#1a2b4a] dark:text-[#c8b89a] uppercase">
                      End Date
                    </p>
                    <p className="text-[9px] font-bold text-[#c97b3a] uppercase leading-tight">
                      {formatDate(activeMembership.end_date)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer text */}
        <div className="px-3 py-1.5 border-t border-[#e8c9a0] dark:border-[#5a3a1a]">
          <p className="text-[7px] text-center tracking-[0.18em] text-[#1a2b4a]/50 dark:text-[#c8b89a]/50 uppercase leading-relaxed">
            &lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt; YOUR
            &lt;&lt;&lt;&lt;&lt; PAWFRIENDS &lt;&lt;&lt;&lt;&lt; DESERVE
            &gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;
          </p>
          <p className="text-[7px] text-center tracking-[0.18em] text-[#1a2b4a]/50 dark:text-[#c8b89a]/50 uppercase leading-relaxed">
            &lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&gt;&gt;&gt;&gt;&gt;THE
            BEST&gt;&gt;&gt;&gt;&gt;&lt;&lt;&lt;&gt;&gt;&gt;&gt;&gt;&gt;&gt;
          </p>
        </div>

        {/* Bottom stripe */}
        <div
          className="h-2"
          style={{
            background:
              "repeating-linear-gradient(45deg, #e05a3a 0px, #e05a3a 4px, #f09060 4px, #f09060 8px)",
            opacity: 0.75,
          }}
        />
      </div>
      <PetDetailDialog
        pet={pet}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<ApiCurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [petDialogOpen, setPetDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<ApiPet | null>(null);
  const [deletingPet, setDeletingPet] = useState<ApiPet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchProfile = useCallback(() => {
    setLoading(true);
    getCurrentUser()
      .then((res) => setProfile(res.user))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Gagal memuat profil"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  function openAddPet() {
    setEditingPet(null);
    setPetDialogOpen(true);
  }

  function openEditPet(pet: ApiPet) {
    setEditingPet(pet);
    setPetDialogOpen(true);
  }

  async function handleDeletePet() {
    if (!deletingPet) return;
    setDeleting(true);
    try {
      await deleteMyPet(deletingPet._id);
      toast.success(`${deletingPet.name} berhasil dihapus`);
      setDeletingPet(null);
      fetchProfile();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pet");
    } finally {
      setDeleting(false);
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
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-foreground">
          My Profile
        </h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error ?? "Profil tidak ditemukan."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const initials = profile.username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          My Profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Informasi akun dan hewan peliharaan Anda
        </p>
      </div>

      {/* Profile Section */}
      <div className="rounded-2xl shadow-md border border-[#e8c9a0] dark:border-[#5a3a1a]">
        {/* Warm gradient banner */}
        <div className="relative bg-gradient-to-br from-[#c97b3a] via-[#d9683a] to-[#e05a3a] px-6 pt-5 pb-20 rounded-t-2xl overflow-visible">
          <div
            className="absolute inset-0 opacity-10 rounded-t-2xl"
            style={{
              backgroundImage:
                "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "16px 16px",
            }}
          />
          <button
            type="button"
            onClick={() => setEditProfileOpen(true)}
            className="absolute top-4 right-4 z-30 flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 text-white text-xs font-semibold backdrop-blur-sm"
          >
            <Pencil className="h-3 w-3" />
            Edit Profil
          </button>
          {/* Profile photo — left side, overflows into body */}
          <div className="absolute left-6 bottom-0 translate-y-1/2 z-20">
            {profile.profile?.image_url ? (
              <img
                src={profile.profile.image_url}
                alt="Foto profil"
                className="rounded-full object-cover border-[3px] border-[#fde8c8] shadow-2xl"
                style={{ width: 120, height: 120 }}
              />
            ) : (
              <div
                className="rounded-full border-[3px] border-[#fde8c8] shadow-2xl flex items-center justify-center"
                style={{
                  width: 120,
                  height: 120,
                  background: "linear-gradient(135deg, #f0a060, #c97b3a)",
                }}
              >
                <span className="text-xl font-bold text-white">{initials}</span>
              </div>
            )}
          </div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold tracking-[0.35em] text-white/70 uppercase mb-1">
              Profile by Pawship
            </p>
            <h2 className="text-white text-xl font-bold uppercase tracking-wide leading-tight">
              {profile.profile?.full_name || profile.username}
            </h2>
            <span className="inline-block mt-1.5 rounded-full bg-white/25 px-2.5 py-0.5 text-[10px] font-bold tracking-widest text-white uppercase">
              Customer
            </span>
          </div>
        </div>

        {/* Info body */}
        <div className="bg-[#fdf6ed] dark:bg-[#1e1208] px-6 pb-5 pt-20">
          <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold tracking-widest text-[#c97b3a] uppercase">
                Username
              </span>
              <span className="text-sm font-semibold text-[#5a3a1a] dark:text-[#e8d5b8]">
                {profile.username}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold tracking-widest text-[#c97b3a] uppercase">
                Email
              </span>
              <span className="text-sm font-semibold text-[#5a3a1a] dark:text-[#e8d5b8] break-all">
                {profile.email}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold tracking-widest text-[#c97b3a] uppercase">
                Phone Number
              </span>
              <span className="text-sm font-semibold text-[#5a3a1a] dark:text-[#e8d5b8]">
                {profile.phone_number || "—"}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold tracking-widest text-[#c97b3a] uppercase">
                Status
              </span>
              <span
                className={`text-sm font-semibold ${profile.is_active ? "text-emerald-600" : "text-rose-500"}`}
              >
                {profile.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {profile.profile?.gender && (
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold tracking-widest text-[#c97b3a] uppercase">
                  Gender
                </span>
                <span className="text-sm font-semibold text-[#5a3a1a] dark:text-[#e8d5b8]">
                  {profile.profile.gender}
                </span>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-bold tracking-widest text-[#c97b3a] uppercase">
                Joined Since
              </span>
              <span className="text-sm font-semibold text-[#5a3a1a] dark:text-[#e8d5b8]">
                {formatDate(profile.createdAt)}
              </span>
            </div>
          </div>

          {profile.profile?.addresses &&
            profile.profile.addresses.length > 0 && (
              <div className="mt-5 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-[#c97b3a]" />
                  <span className="text-[10px] font-bold tracking-widest text-[#c97b3a] uppercase">
                    Alamat
                  </span>
                </div>
                {profile.profile.addresses.map((addr, idx) => (
                  <div
                    key={addr._id || idx}
                    className={`rounded-xl border px-3 py-2.5 text-xs ${addr.is_main_address ? "border-[#c97b3a] bg-[#fde8c8]/60 dark:bg-[#7a3a1a]/25" : "border-[#e8c9a0] dark:border-[#5a3a1a] bg-[#fdf6ed] dark:bg-[#1e1208]"}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {addr.is_main_address && (
                        <span className="text-[#c97b3a] font-bold text-[10px] tracking-widest uppercase">
                          Utama
                        </span>
                      )}
                      <span className="font-semibold text-[#5a3a1a] dark:text-[#e8d5b8]">
                        {addr.label || "Alamat"}
                      </span>
                    </div>
                    <div className="text-[#8a6040] dark:text-[#c8a87a]">
                      {[
                        addr.street,
                        addr.subdistrict,
                        addr.district,
                        addr.city,
                        addr.province,
                        addr.postal_code,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                    {addr.note && (
                      <div className="text-[#a07850] dark:text-[#b8986a] mt-1">
                        {addr.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Bottom stripe */}
        <div
          className="h-3 rounded-b-2xl"
          style={{
            background:
              "repeating-linear-gradient(45deg, #e05a3a 0px, #e05a3a 4px, #f09060 4px, #f09060 8px)",
            opacity: 0.75,
          }}
        />
      </div>

      {/* Pets Section */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          My Pets{" "}
          {profile.pets && profile.pets.length > 0
            ? `(${profile.pets.length})`
            : ""}
        </h2>
        <Button size="sm" onClick={openAddPet}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pet
        </Button>
      </div>

      {profile.pets && profile.pets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {profile.pets.map((pet) => (
            <PetCard
              key={pet._id}
              pet={pet}
              ownerName={profile.profile?.full_name || profile.username}
              ownerPhone={profile.phone_number}
              onEdit={openEditPet}
              onDelete={setDeletingPet}
            />
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
          onSaved={(updated) =>
            setProfile((prev) => ({
              ...updated,
              pets: prev?.pets ?? updated.pets,
            }))
          }
        />
      )}

      <PetFormDialog
        open={petDialogOpen}
        onOpenChange={setPetDialogOpen}
        editingPet={editingPet}
        onSaved={fetchProfile}
      />

      <AlertDialog
        open={!!deletingPet}
        onOpenChange={(v) => {
          if (!v) setDeletingPet(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pet</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus <strong>{deletingPet?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePet}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
