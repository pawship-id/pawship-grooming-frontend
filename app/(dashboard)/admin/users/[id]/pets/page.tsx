"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Pencil,
  Plus,
  Trash2,
  Weight,
  PawPrint,
  Tag,
  X,
  CreditCard,
  Info,
  History,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Combobox } from "@/components/ui/combobox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type ApiPet, type ApiCurrentUser, getUser } from "@/lib/api/users";
import {
  type CreatePetPayload,
  type UpdatePetPayload,
  createPet,
  deletePet,
  updatePet,
} from "@/lib/api/pets";
import { uploadFile } from "@/lib/api/upload";
import { getOptions, type ApiOption } from "@/lib/api/options";
import { getAdminBookings, type AdminBooking } from "@/lib/api/bookings";
import { getStatusConfig } from "@/lib/booking-status";
import { formatPrice, formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import Link from "next/link";

// ── Form types ─────────────────────────────────────────────────────────────
type PetForm = {
  name: string;
  description: string;
  internal_note: string;
  pet_type_id: string;
  hair_category_id: string;
  size_category_id: string;
  breed_category_id: string;
  birthday: string;
  weight: string;
  tags: string[];
  is_active: boolean;
  code?: string;
};

const DEFAULT_FORM: PetForm = {
  name: "",
  description: "",
  internal_note: "",
  pet_type_id: "",
  hair_category_id: "",
  size_category_id: "",
  breed_category_id: "",
  birthday: "",
  weight: "",
  tags: [],
  is_active: true,
};

function petToForm(pet: ApiPet): PetForm {
  return {
    name: pet.name,
    description: pet.description ?? "",
    internal_note: pet.internal_note ?? "",
    pet_type_id: pet.pet_type?._id ?? "",
    hair_category_id: pet.hair?._id ?? "",
    size_category_id: pet.size?._id ?? "",
    breed_category_id: pet.breed?._id ?? "",
    birthday: pet.birthday ? pet.birthday.slice(0, 10) : "",
    weight: pet.weight != null ? String(pet.weight) : "",
    tags: pet.tags ?? [],
    is_active: pet.is_active,
    code: pet.code,
  };
}

function formToPayload(form: PetForm, customerId: string): CreatePetPayload {
  return {
    name: form.name,
    description: form.description || undefined,
    internal_note: form.internal_note || undefined,
    pet_type_id: form.pet_type_id,
    hair_category_id: form.hair_category_id,
    size_category_id: form.size_category_id,
    breed_category_id: form.breed_category_id,
    birthday: form.birthday || undefined,
    weight: form.weight ? Number(form.weight) : undefined,
    tags: form.tags.length > 0 ? form.tags : undefined,
    is_active: form.is_active,
    customer_id: customerId,
    code: form.code || undefined,
  };
}

function findMatchedSizeId(
  sizeOptions: ApiOption[],
  petTypeId: string,
  weightValue: string,
) {
  const weight = Number(weightValue);
  if (!petTypeId || !weightValue || Number.isNaN(weight) || weight <= 0) {
    return "";
  }

  const matchedSize = sizeOptions.find((sizeOption) =>
    sizeOption.pet_weight_rules?.some((rule) => {
      const rulePetTypeId =
        typeof rule.petTypeId === "string"
          ? rule.petTypeId
          : rule.petTypeId._id;
      return (
        rulePetTypeId === petTypeId &&
        weight > rule.minWeight &&
        weight <= rule.maxWeight
      );
    }),
  );

  return matchedSize?._id ?? "";
}

// ── Options store ─────────────────────────────────────────────────────────
interface OptionGroups {
  petTypes: ApiOption[];
  hairCategories: ApiOption[];
  sizeCategories: ApiOption[];
  breedCategories: ApiOption[];
}

// ── Pet Card ──────────────────────────────────────────────────────────────
function PetCard({
  pet,
  onEdit,
  onDelete,
  onMembership,
  onViewHistory,
}: {
  pet: ApiPet;
  onEdit: (pet: ApiPet) => void;
  onDelete: (pet: ApiPet) => void;
  onMembership: (pet: ApiPet) => void;
  onViewHistory: (pet: ApiPet) => void;
}) {
  const initials = pet.name.slice(0, 2).toUpperCase();
  const activeMemberships =
    pet.memberships?.filter((m) => m.status === "active") ?? [];

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {pet.profile_image?.secure_url && (
                <AvatarImage
                  src={pet.profile_image.secure_url}
                  alt={pet.name}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-display font-bold text-foreground leading-tight">
                {pet.name}
              </h3>
              {pet.code && (
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {pet.code}
                </p>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                {pet.pet_type && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-sky-50 text-sky-700 border-sky-200"
                  >
                    {pet.pet_type.name}
                  </Badge>
                )}
                {pet.breed && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-violet-50 text-violet-700 border-violet-200"
                  >
                    {pet.breed.name}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs ${pet.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                >
                  {pet.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                aria-label="Aksi pet"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onViewHistory(pet)}>
                <History className="mr-2 h-4 w-4" />
                Booking History
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMembership(pet)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Membership
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(pet)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Pet
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(pet)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus Pet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        {pet.description && (
          <p className="text-foreground/80 text-xs">{pet.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {pet.size && (
            <span className="flex items-center gap-1">
              <PawPrint className="h-3.5 w-3.5 shrink-0" />
              {pet.size.name}
            </span>
          )}
          {pet.weight != null && (
            <span className="flex items-center gap-1">
              <Weight className="h-3.5 w-3.5 shrink-0" />
              {pet.weight} kg
            </span>
          )}
          {pet.birthday && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              {new Date(pet.birthday).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
        {pet.hair && <span className="text-xs">Bulu: {pet.hair.name}</span>}
        {activeMemberships.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {activeMemberships.map((membership) => (
              <Badge
                key={membership.membership_id}
                variant="outline"
                className="text-xs gap-1 bg-amber-50 text-amber-700 border-amber-200"
              >
                <CreditCard className="h-3 w-3" />
                {membership.name ?? "Membership"}
              </Badge>
            ))}
          </div>
        )}
        {pet.tags && pet.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {pet.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs gap-1">
                <Tag className="h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Pet Form Dialog ───────────────────────────────────────────────────────
function PetFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  options,
  onSubmit,
  isLoading,
  mode,
  imagePreview,
  onImageChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: PetForm;
  setForm: React.Dispatch<React.SetStateAction<PetForm>>;
  options: OptionGroups;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  mode: "create" | "edit";
  imagePreview: string | null;
  onImageChange: (file: File | null, preview: string | null) => void;
}) {
  const [tagInput, setTagInput] = useState("");
  const petImageRef = useRef<HTMLInputElement>(null);
  const isWeightValid =
    !!form.weight &&
    !Number.isNaN(Number(form.weight)) &&
    Number(form.weight) > 0;
  const shouldShowSizeInfo =
    !form.size_category_id && (!form.pet_type_id || !isWeightValid);

  useEffect(() => {
    const nextSizeId = findMatchedSizeId(
      options.sizeCategories,
      form.pet_type_id,
      form.weight,
    );
    setForm((prev) =>
      prev.size_category_id === nextSizeId
        ? prev
        : { ...prev, size_category_id: nextSizeId },
    );
  }, [form.pet_type_id, form.weight, options.sizeCategories, setForm]);

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) {
      setForm((p) => ({ ...p, tags: [...p.tags, tag] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }));
  };

  return (
    <TooltipProvider delayDuration={100}>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {mode === "create" ? "Tambah Pet Baru" : "Edit Pet"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            {/* Pet Photo */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => petImageRef.current?.click()}
                className="relative group w-20 h-20 rounded-lg overflow-hidden border-2 border-border focus:outline-none"
              >
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Foto pet"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <PawPrint className="h-7 w-7 text-primary/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">
                    {imagePreview ? "Ganti" : "Upload"}
                  </span>
                </div>
              </button>
              <span className="text-xs text-muted-foreground">
                Foto Pet (opsional)
              </span>
              <input
                ref={petImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) =>
                    onImageChange(file, ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            {/* Pet Code — readonly in edit mode, hidden in create mode */}
            {mode === "edit" && form.code && (
              <div className="flex flex-col gap-1.5">
                <Label>Kode Pet</Label>
                <Input
                  readOnly
                  value={form.code}
                  className="bg-muted text-muted-foreground cursor-not-allowed"
                />
              </div>
            )}

            {/* Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-name">
                Nama Pet <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pet-name"
                placeholder="Buddy"
                required
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            {/* Pet Type & Breed */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-type">
                  Jenis Hewan <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  options={options.petTypes.map((o) => ({
                    value: o._id,
                    label: o.name,
                  }))}
                  value={form.pet_type_id}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, pet_type_id: v }))
                  }
                  placeholder="Pilih jenis hewan"
                  searchPlaceholder="Cari jenis hewan..."
                  emptyText="Jenis hewan tidak ditemukan."
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-breed">
                  Ras <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  options={options.breedCategories.map((o) => ({
                    value: o._id,
                    label: o.name,
                  }))}
                  value={form.breed_category_id}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, breed_category_id: v }))
                  }
                  placeholder="Pilih ras"
                  searchPlaceholder="Cari ras..."
                  emptyText="Ras tidak ditemukan."
                />
              </div>
            </div>

            {/* Size & Hair */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <Label htmlFor="pet-size">Ukuran</Label>
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
                        <PopoverContent
                          className="w-64 p-2 text-xs"
                          align="start"
                        >
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
                          <p>
                            Otomatis terisi setelah tipe hewan dan berat
                            diinput.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </>
                  )}
                </div>
                <Combobox
                  options={options.sizeCategories.map((o) => ({
                    value: o._id,
                    label: o.name,
                  }))}
                  value={form.size_category_id}
                  placeholder="Otomatis terisi"
                  searchPlaceholder="Cari ukuran..."
                  emptyText="Ukuran tidak ditemukan."
                  disabled
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-hair">
                  Jenis Bulu <span className="text-destructive">*</span>
                </Label>
                <Combobox
                  options={options.hairCategories.map((o) => ({
                    value: o._id,
                    label: o.name,
                  }))}
                  value={form.hair_category_id}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, hair_category_id: v }))
                  }
                  placeholder="Pilih jenis bulu"
                  searchPlaceholder="Cari jenis bulu..."
                  emptyText="Jenis bulu tidak ditemukan."
                />
              </div>
            </div>

            {/* Birthday & Weight */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-birthday">Tanggal Lahir</Label>
                <Input
                  id="pet-birthday"
                  type="date"
                  value={form.birthday}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, birthday: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="pet-weight">
                  Berat (kg) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pet-weight"
                  type="number"
                  min="0.1"
                  step="0.1"
                  placeholder="15"
                  value={form.weight}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, weight: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-desc">Deskripsi</Label>
              <Textarea
                id="pet-desc"
                placeholder="Deskripsi singkat tentang pet..."
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            {/* Internal Note */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-note">Catatan Internal</Label>
              <Textarea
                id="pet-note"
                placeholder="Catatan untuk groomer..."
                rows={2}
                value={form.internal_note}
                onChange={(e) =>
                  setForm((p) => ({ ...p, internal_note: e.target.value }))
                }
              />
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Tambah tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTag}
                >
                  Tambah
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Is Active */}
            <div className="flex items-center gap-3">
              <Switch
                id="pet-active"
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, is_active: v }))
                }
              />
              <Label htmlFor="pet-active">Aktif</Label>
            </div>

            <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
              {isLoading
                ? "Menyimpan..."
                : mode === "create"
                  ? "Tambah Pet"
                  : "Simpan Perubahan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function CustomerPetsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [user, setUser] = useState<ApiCurrentUser | null>(null);
  const [pets, setPets] = useState<ApiPet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [options, setOptions] = useState<OptionGroups>({
    petTypes: [],
    hairCategories: [],
    sizeCategories: [],
    breedCategories: [],
  });

  // Create dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [createForm, setCreateForm] = useState<PetForm>(DEFAULT_FORM);
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editPet, setEditPet] = useState<ApiPet | null>(null);
  const [editForm, setEditForm] = useState<PetForm>(DEFAULT_FORM);
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog state
  const [deletingPet, setDeletingPet] = useState<ApiPet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Booking history dialog state
  const [historyPet, setHistoryPet] = useState<ApiPet | null>(null);

  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(
    null,
  );
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const fetchUserWithPets = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getUser(userId);
      setUser(data.user);
      setPets(data.user.pets ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserWithPets();
  }, [fetchUserWithPets]);

  useEffect(() => {
    Promise.all([
      getOptions("pet type"),
      getOptions("hair category"),
      getOptions("size category"),
      getOptions("breed category"),
    ])
      .then(([petTypes, hair, size, breed]) => {
        setOptions({
          petTypes: petTypes.options,
          hairCategories: hair.options,
          sizeCategories: size.options.filter((option) => option.is_active),
          breedCategories: breed.options,
        });
      })
      .catch(() => {
        // Options failing silently is acceptable — user sees empty selects
      });
  }, []);

  const openEdit = (pet: ApiPet) => {
    setEditPet(pet);
    setEditForm(petToForm(pet));
    setEditImageFile(null);
    setEditImagePreview(pet.profile_image?.secure_url ?? null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !createForm.weight ||
      Number.isNaN(Number(createForm.weight)) ||
      Number(createForm.weight) <= 0
    ) {
      toast.error("Berat wajib diisi dan harus lebih dari 0");
      return;
    }
    setIsCreating(true);
    try {
      const payload = formToPayload(createForm, userId);
      if (createImageFile) {
        const uploaded = await uploadFile(createImageFile, "pets");
        payload.profile_image = {
          secure_url: uploaded.image_url,
          public_id: uploaded.public_id,
        };
      }
      await createPet(payload);
      toast.success("Pet berhasil ditambahkan");
      setAddOpen(false);
      setCreateForm(DEFAULT_FORM);
      setCreateImageFile(null);
      setCreateImagePreview(null);
      fetchUserWithPets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menambahkan pet.";
      if (msg.toLowerCase().includes("code already exists")) {
        toast.error("Kode sudah digunakan, silakan gunakan kode lain.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPet) return;
    if (
      !editForm.weight ||
      Number.isNaN(Number(editForm.weight)) ||
      Number(editForm.weight) <= 0
    ) {
      toast.error("Berat wajib diisi dan harus lebih dari 0");
      return;
    }
    setIsEditing(true);
    const payload: UpdatePetPayload = {
      name: editForm.name,
      description: editForm.description || undefined,
      internal_note: editForm.internal_note || undefined,
      pet_type_id: editForm.pet_type_id,
      hair_category_id: editForm.hair_category_id,
      size_category_id: editForm.size_category_id,
      breed_category_id: editForm.breed_category_id,
      birthday: editForm.birthday || undefined,
      weight: editForm.weight ? Number(editForm.weight) : undefined,
      tags: editForm.tags.length > 0 ? editForm.tags : undefined,
      is_active: editForm.is_active,
    };
    try {
      if (editImageFile) {
        const uploaded = await uploadFile(editImageFile, "pets");
        payload.profile_image = {
          secure_url: uploaded.image_url,
          public_id: uploaded.public_id,
        };
      }
      await updatePet(editPet._id, payload);
      toast.success("Pet berhasil diperbarui");
      setEditPet(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      fetchUserWithPets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui pet.";
      if (msg.toLowerCase().includes("code already exists")) {
        toast.error("Kode sudah digunakan, silakan gunakan kode lain.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingPet) return;
    setIsDeleting(true);
    try {
      await deletePet(deletingPet._id);
      toast.success(`Pet ${deletingPet.name} berhasil dihapus`);
      setDeletingPet(null);
      fetchUserWithPets();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pet.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
              {isLoading ? (
                <>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </>
              ) : (
                <>
                  <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                    <PawPrint className="h-6 w-6" />
                    Pet milik {user?.username}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {user?.email} &middot; {pets.length} pet terdaftar
                  </p>
                </>
              )}
            </div>
          </div>
          <Button
            onClick={() => {
              setCreateForm(DEFAULT_FORM);
              setAddOpen(true);
            }}
            className="shrink-0"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tambah Pet
          </Button>
        </div>

        <Separator />

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Pet Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </CardContent>
                </Card>
              ))
            : pets.map((pet) => (
                <PetCard
                  key={pet._id}
                  pet={pet}
                  onEdit={openEdit}
                  onDelete={setDeletingPet}
                  onMembership={(p) =>
                    router.push(
                      `/admin/users/${userId}/pets/${p._id}/memberships`,
                    )
                  }
                  onViewHistory={setHistoryPet}
                />
              ))}

          {!isLoading && pets.length === 0 && !error && (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <PawPrint className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>Belum ada pet terdaftar untuk customer ini</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setCreateForm(DEFAULT_FORM);
                  setAddOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pet Pertama
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Pet Dialog */}
      <PetFormDialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) {
            setCreateForm(DEFAULT_FORM);
            setCreateImageFile(null);
            setCreateImagePreview(null);
          }
        }}
        form={createForm}
        setForm={setCreateForm}
        options={options}
        onSubmit={handleCreate}
        isLoading={isCreating}
        mode="create"
        imagePreview={createImagePreview}
        onImageChange={(file, preview) => {
          setCreateImageFile(file);
          setCreateImagePreview(preview);
        }}
      />

      {/* Edit Pet Dialog */}
      <PetFormDialog
        open={!!editPet}
        onOpenChange={(o) => {
          if (!o) {
            setEditPet(null);
            setEditImageFile(null);
            setEditImagePreview(null);
          }
        }}
        form={editForm}
        setForm={setEditForm}
        options={options}
        onSubmit={handleEdit}
        isLoading={isEditing}
        mode="edit"
        imagePreview={editImagePreview}
        onImageChange={(file, preview) => {
          setEditImageFile(file);
          setEditImagePreview(preview);
        }}
      />

      {/* Booking History */}
      <BookingHistoryDialog
        pet={historyPet}
        onClose={() => setHistoryPet(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingPet}
        onOpenChange={(o) => {
          if (!o) setDeletingPet(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pet</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus pet{" "}
              <span className="font-semibold text-foreground">
                {deletingPet?.name}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Booking History Dialog ─────────────────────────────────────────────────
const HISTORY_PAGE_SIZE = 10;
const HISTORY_EMPTY = "-";

function renderHistoryValue(value: unknown): string {
  if (value === null || value === undefined) return HISTORY_EMPTY;
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : HISTORY_EMPTY;
  if (typeof value === "string")
    return value.trim() === "" ? HISTORY_EMPTY : value;
  return HISTORY_EMPTY;
}

function BookingHistoryDialog({
  pet,
  onClose,
}: {
  pet: ApiPet | null;
  onClose: () => void;
}) {
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const petId = pet?._id;

  useEffect(() => {
    if (!petId) {
      setBookings(null);
      setError(null);
      setPage(1);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setPage(1);
      try {
        const res = await getAdminBookings({
          pet_id: petId,
          limit: 200,
          page: 1,
        });
        if (cancelled) return;
        const sorted = [...(res.bookings ?? [])].sort((a, b) => {
          const da = new Date(a.date || a.createdAt).getTime();
          const db = new Date(b.date || b.createdAt).getTime();
          if (db !== da) return db - da;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        setBookings(sorted);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Gagal memuat riwayat booking",
        );
        setBookings([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [petId]);

  const totalPages = bookings
    ? Math.max(1, Math.ceil(bookings.length / HISTORY_PAGE_SIZE))
    : 1;
  const safePage = Math.min(page, totalPages);
  const pageItems = bookings
    ? bookings.slice(
        (safePage - 1) * HISTORY_PAGE_SIZE,
        safePage * HISTORY_PAGE_SIZE,
      )
    : [];

  return (
    <Dialog
      open={!!pet}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Riwayat Booking{pet ? ` · ${pet.name}` : ""}
            {bookings && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {bookings.length}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-destructive">
              {error}
            </div>
          ) : !bookings || bookings.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <History className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p className="text-sm">
                Belum ada riwayat booking untuk pet ini
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {pageItems.map((b) => (
                <BookingHistoryRow key={b._id} booking={b} />
              ))}
            </div>
          )}
        </div>

        {bookings && bookings.length > HISTORY_PAGE_SIZE && (
          <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-3">
            <span className="text-xs text-muted-foreground">
              Halaman {safePage} dari {totalPages} · {bookings.length} booking
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BookingHistoryRow({ booking }: { booking: AdminBooking }) {
  const cfg = getStatusConfig(booking.booking_status);
  const serviceName = booking.service_snapshot?.name;
  const storeName = booking.store?.name;
  const groomerName =
    booking.sessions?.[0]?.groomer_detail?.username ?? null;

  return (
    <Link
      href={`/admin/bookings/${booking._id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-2 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {renderHistoryValue(serviceName)}
          </span>
          {booking.code && (
            <span className="font-mono text-xs text-muted-foreground">
              {booking.code}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{renderHistoryValue(formatDateTime(booking.date))}</span>
          {booking.time_range && <span>· {booking.time_range}</span>}
          {storeName && <span>· {storeName}</span>}
          <span>· Groomer: {renderHistoryValue(groomerName)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
        <Badge variant="outline" className={`capitalize ${cfg.className}`}>
          {cfg.label || booking.booking_status}
        </Badge>
        <span className="text-sm font-medium text-foreground">
          {typeof booking.final_total_price === "number"
            ? formatPrice(booking.final_total_price)
            : HISTORY_EMPTY}
        </span>
      </div>
    </Link>
  );
}
