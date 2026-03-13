"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { type ApiPet, type ApiCurrentUser, getUser } from "@/lib/api/users"
import { type CreatePetPayload, type UpdatePetPayload, createPet, deletePet, updatePet } from "@/lib/api/pets"
import { getOptions, type ApiOption } from "@/lib/api/options"
import { toast } from "sonner"

// ── Form types ─────────────────────────────────────────────────────────────
type PetForm = {
  name: string
  description: string
  internal_note: string
  pet_type_id: string
  hair_category_id: string
  size_category_id: string
  breed_category_id: string
  member_category_id: string
  birthday: string
  weight: string
  tags: string[]
  is_active: boolean
}

const DEFAULT_FORM: PetForm = {
  name: "",
  description: "",
  internal_note: "",
  pet_type_id: "",
  hair_category_id: "",
  size_category_id: "",
  breed_category_id: "",
  member_category_id: "",
  birthday: "",
  weight: "",
  tags: [],
  is_active: true,
}

function petToForm(pet: ApiPet): PetForm {
  return {
    name: pet.name,
    description: pet.description ?? "",
    internal_note: pet.internal_note ?? "",
    pet_type_id: pet.pet_type?._id ?? "",
    hair_category_id: pet.hair?._id ?? "",
    size_category_id: pet.size?._id ?? "",
    breed_category_id: pet.breed?._id ?? "",
    member_category_id: pet.member_category?._id ?? "",
    birthday: pet.birthday ? pet.birthday.slice(0, 10) : "",
    weight: pet.weight != null ? String(pet.weight) : "",
    tags: pet.tags ?? [],
    is_active: pet.is_active,
  }
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
    member_category_id: form.member_category_id || undefined,
    birthday: form.birthday || undefined,
    weight: form.weight ? Number(form.weight) : undefined,
    tags: form.tags.length > 0 ? form.tags : undefined,
    is_active: form.is_active,
    customer_id: customerId,
  }
}

// ── Options store ─────────────────────────────────────────────────────────
interface OptionGroups {
  petTypes: ApiOption[]
  hairCategories: ApiOption[]
  sizeCategories: ApiOption[]
  breedCategories: ApiOption[]
  memberCategories: ApiOption[]
}

// ── Pet Card ──────────────────────────────────────────────────────────────
function PetCard({
  pet,
  onEdit,
  onDelete,
}: {
  pet: ApiPet
  onEdit: (pet: ApiPet) => void
  onDelete: (pet: ApiPet) => void
}) {
  const initials = pet.name.slice(0, 2).toUpperCase()

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-display font-bold text-foreground leading-tight">{pet.name}</h3>
              <div className="flex flex-wrap gap-1 mt-1">
                {pet.pet_type && (
                  <Badge variant="outline" className="text-xs bg-sky-50 text-sky-700 border-sky-200">
                    {pet.pet_type.name}
                  </Badge>
                )}
                {pet.breed && (
                  <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-200">
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
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(pet)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(pet)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        {pet.description && <p className="text-foreground/80 text-xs">{pet.description}</p>}
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
        {pet.hair && (
          <span className="text-xs">Bulu: {pet.hair.name}</span>
        )}
        {pet.member_category && (
          <span className="text-xs">Member: {pet.member_category.name}</span>
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
  )
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
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: PetForm
  setForm: React.Dispatch<React.SetStateAction<PetForm>>
  options: OptionGroups
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  mode: "create" | "edit"
}) {
  const [tagInput, setTagInput] = useState("")

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !form.tags.includes(tag)) {
      setForm((p) => ({ ...p, tags: [...p.tags, tag] }))
    }
    setTagInput("")
  }

  const removeTag = (tag: string) => {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Tambah Pet Baru" : "Edit Pet"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="pet-name">Nama Pet <span className="text-destructive">*</span></Label>
            <Input
              id="pet-name"
              placeholder="Buddy"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Pet Type & Breed */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-type">Jenis Hewan <span className="text-destructive">*</span></Label>
              <Select
                value={form.pet_type_id}
                onValueChange={(v) => setForm((p) => ({ ...p, pet_type_id: v }))}
                required
              >
                <SelectTrigger id="pet-type">
                  <SelectValue placeholder="Pilih jenis" />
                </SelectTrigger>
                <SelectContent>
                  {options.petTypes.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-breed">Ras <span className="text-destructive">*</span></Label>
              <Select
                value={form.breed_category_id}
                onValueChange={(v) => setForm((p) => ({ ...p, breed_category_id: v }))}
                required
              >
                <SelectTrigger id="pet-breed">
                  <SelectValue placeholder="Pilih ras" />
                </SelectTrigger>
                <SelectContent>
                  {options.breedCategories.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Size & Hair */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-size">Ukuran <span className="text-destructive">*</span></Label>
              <Select
                value={form.size_category_id}
                onValueChange={(v) => setForm((p) => ({ ...p, size_category_id: v }))}
                required
              >
                <SelectTrigger id="pet-size">
                  <SelectValue placeholder="Pilih ukuran" />
                </SelectTrigger>
                <SelectContent>
                  {options.sizeCategories.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-hair">Jenis Bulu <span className="text-destructive">*</span></Label>
              <Select
                value={form.hair_category_id}
                onValueChange={(v) => setForm((p) => ({ ...p, hair_category_id: v }))}
                required
              >
                <SelectTrigger id="pet-hair">
                  <SelectValue placeholder="Pilih bulu" />
                </SelectTrigger>
                <SelectContent>
                  {options.hairCategories.map((o) => (
                    <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                onChange={(e) => setForm((p) => ({ ...p, birthday: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pet-weight">Berat (kg)</Label>
              <Input
                id="pet-weight"
                type="number"
                min="0"
                step="0.1"
                placeholder="15"
                value={form.weight}
                onChange={(e) => setForm((p) => ({ ...p, weight: e.target.value }))}
              />
            </div>
          </div>

          {/* Member Category */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="pet-member">Kategori Member</Label>
            <Select
              value={form.member_category_id || "none"}
              onValueChange={(v) => setForm((p) => ({ ...p, member_category_id: v === "none" ? "" : v }))}
            >
              <SelectTrigger id="pet-member">
                <SelectValue placeholder="Pilih kategori member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Tidak ada —</SelectItem>
                {options.memberCategories.map((o) => (
                  <SelectItem key={o._id} value={o._id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="pet-desc">Deskripsi</Label>
            <Textarea
              id="pet-desc"
              placeholder="Deskripsi singkat tentang pet..."
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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
              onChange={(e) => setForm((p) => ({ ...p, internal_note: e.target.value }))}
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
                    e.preventDefault()
                    addTag()
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
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
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            />
            <Label htmlFor="pet-active">Aktif</Label>
          </div>

          <Button type="submit" className="mt-2 w-full" disabled={isLoading}>
            {isLoading ? "Menyimpan..." : mode === "create" ? "Tambah Pet" : "Simpan Perubahan"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function CustomerPetsPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string

  const [user, setUser] = useState<ApiCurrentUser | null>(null)
  const [pets, setPets] = useState<ApiPet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const [options, setOptions] = useState<OptionGroups>({
    petTypes: [],
    hairCategories: [],
    sizeCategories: [],
    breedCategories: [],
    memberCategories: [],
  })

  // Create dialog state
  const [addOpen, setAddOpen] = useState(false)
  const [createForm, setCreateForm] = useState<PetForm>(DEFAULT_FORM)
  const [isCreating, setIsCreating] = useState(false)

  // Edit dialog state
  const [editPet, setEditPet] = useState<ApiPet | null>(null)
  const [editForm, setEditForm] = useState<PetForm>(DEFAULT_FORM)
  const [isEditing, setIsEditing] = useState(false)

  // Delete dialog state
  const [deletingPet, setDeletingPet] = useState<ApiPet | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchUserWithPets = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getUser(userId)
      setUser(data.user)
      setPets(data.user.pets ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data.")
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchUserWithPets()
  }, [fetchUserWithPets])

  useEffect(() => {
    Promise.all([
      getOptions("pet type"),
      getOptions("hair category"),
      getOptions("size category"),
      getOptions("breed category"),
      getOptions("member category"),
    ]).then(([petTypes, hair, size, breed, member]) => {
      setOptions({
        petTypes: petTypes.options,
        hairCategories: hair.options,
        sizeCategories: size.options,
        breedCategories: breed.options,
        memberCategories: member.options,
      })
    }).catch(() => {
      // Options failing silently is acceptable — user sees empty selects
    })
  }, [])

  const openEdit = (pet: ApiPet) => {
    setEditPet(pet)
    setEditForm(petToForm(pet))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await createPet(formToPayload(createForm, userId))
      toast.success("Pet berhasil ditambahkan")
      setAddOpen(false)
      setCreateForm(DEFAULT_FORM)
      fetchUserWithPets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan pet.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editPet) return
    setIsEditing(true)
    const payload: UpdatePetPayload = {
      name: editForm.name,
      description: editForm.description || undefined,
      internal_note: editForm.internal_note || undefined,
      pet_type_id: editForm.pet_type_id,
      hair_category_id: editForm.hair_category_id,
      size_category_id: editForm.size_category_id,
      breed_category_id: editForm.breed_category_id,
      member_category_id: editForm.member_category_id || undefined,
      birthday: editForm.birthday || undefined,
      weight: editForm.weight ? Number(editForm.weight) : undefined,
      tags: editForm.tags.length > 0 ? editForm.tags : undefined,
      is_active: editForm.is_active,
    }
    try {
      await updatePet(editPet._id, payload)
      toast.success("Pet berhasil diperbarui")
      setEditPet(null)
      fetchUserWithPets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui pet.")
    } finally {
      setIsEditing(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingPet) return
    setIsDeleting(true)
    try {
      await deletePet(deletingPet._id)
      toast.success(`Pet ${deletingPet.name} berhasil dihapus`)
      setDeletingPet(null)
      fetchUserWithPets()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus pet.")
    } finally {
      setIsDeleting(false)
    }
  }

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
            onClick={() => { setCreateForm(DEFAULT_FORM); setAddOpen(true) }}
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
                />
              ))}

          {!isLoading && pets.length === 0 && !error && (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              <PawPrint className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p>Belum ada pet terdaftar untuk customer ini</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setCreateForm(DEFAULT_FORM); setAddOpen(true) }}
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
        onOpenChange={(o) => { setAddOpen(o); if (!o) setCreateForm(DEFAULT_FORM) }}
        form={createForm}
        setForm={setCreateForm}
        options={options}
        onSubmit={handleCreate}
        isLoading={isCreating}
        mode="create"
      />

      {/* Edit Pet Dialog */}
      <PetFormDialog
        open={!!editPet}
        onOpenChange={(o) => { if (!o) setEditPet(null) }}
        form={editForm}
        setForm={setEditForm}
        options={options}
        onSubmit={handleEdit}
        isLoading={isEditing}
        mode="edit"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPet} onOpenChange={(o) => { if (!o) setDeletingPet(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pet</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus pet{" "}
              <span className="font-semibold text-foreground">{deletingPet?.name}</span>?
              Tindakan ini tidak dapat dibatalkan.
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
  )
}
