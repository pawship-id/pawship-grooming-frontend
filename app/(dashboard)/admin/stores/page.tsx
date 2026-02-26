"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Plus, Pencil, Trash2, MoreVertical, MapPin, Phone, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { apiAuthRequest } from "@/lib/api"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────
interface StoreLocation {
  address?: string
  city?: string
  province?: string
  postal_code?: string
  latitude?: number | null
  longitude?: number | null
}

interface StoreContact {
  phone_number?: string
  whatsapp?: string
  email?: string
}

interface StoreOperational {
  opening_time?: string
  closing_time?: string
  operational_days?: string[]
  timezone?: string
}

interface StoreCapacity {
  default_daily_capacity_minutes?: number | null
  overbooking_limit_minutes?: number | null
}

interface ApiStore {
  _id: string
  code: string
  name: string
  description?: string
  location?: StoreLocation
  contact?: StoreContact
  operational?: StoreOperational
  capacity?: StoreCapacity
  is_active: boolean
  createdAt: string
  updatedAt: string
}

interface StoresResponse {
  message: string
  stores: ApiStore[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

interface StoreForm {
  code: string
  name: string
  description: string
  is_active: boolean
  location: Required<StoreLocation>
  contact: Required<StoreContact>
  operational: {
    opening_time: string
    closing_time: string
    operational_days: string[]
    timezone: string
  }
  capacity: {
    default_daily_capacity_minutes: string
    overbooking_limit_minutes: string
  }
}

// ── Constants ──────────────────────────────────────────────────────────────
const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
const DAY_LABELS: Record<string, string> = {
  Monday: "Sen", Tuesday: "Sel", Wednesday: "Rab",
  Thursday: "Kam", Friday: "Jum", Saturday: "Sab", Sunday: "Min",
}
const LIMIT = 10

const DEFAULT_FORM: StoreForm = {
  code: "",
  name: "",
  description: "",
  is_active: true,
  location: { address: "", city: "", province: "", postal_code: "", latitude: null, longitude: null },
  contact: { phone_number: "", whatsapp: "", email: "" },
  operational: { opening_time: "09:00", closing_time: "18:00", operational_days: ["Monday","Tuesday","Wednesday","Thursday","Friday"], timezone: "Asia/Jakarta" },
  capacity: { default_daily_capacity_minutes: "", overbooking_limit_minutes: "" },
}

// ── Highlight helper ──────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-[2px] px-[1px]">{part}</mark>
        ) : part
      )}
    </>
  )
}

// ── Store Form Component ───────────────────────────────────────────────────
function StoreFormFields({
  form,
  setForm,
}: {
  form: StoreForm
  setForm: React.Dispatch<React.SetStateAction<StoreForm>>
}) {
  const toggleDay = (day: string) => {
    setForm((p) => ({
      ...p,
      operational: {
        ...p.operational,
        operational_days: p.operational.operational_days.includes(day)
          ? p.operational.operational_days.filter((d) => d !== day)
          : [...p.operational.operational_days, day],
      },
    }))
  }

  return (
    <div className="flex flex-col gap-5 px-1">
      {/* Basic Info */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informasi Dasar</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-code">Kode Toko *</Label>
            <Input id="f-code" placeholder="STR001" required value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-name">Nama Toko *</Label>
            <Input id="f-name" placeholder="Pawship Store Jakarta" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-desc">Deskripsi</Label>
          <Textarea id="f-desc" placeholder="Deskripsi singkat toko..." rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="flex items-center gap-3">
          <Switch id="f-active" checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
          <Label htmlFor="f-active">Aktif</Label>
        </div>
      </div>

      <Separator />

      {/* Capacity */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kapasitas</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-default-capacity">Kapasitas Harian Default (menit) *</Label>
            <Input
              id="f-default-capacity"
              type="number"
              min={1}
              required
              placeholder="600"
              value={form.capacity.default_daily_capacity_minutes}
              onChange={(e) => setForm((p) => ({ ...p, capacity: { ...p.capacity, default_daily_capacity_minutes: e.target.value } }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-overbooking-limit">Batas Overbooking (menit) *</Label>
            <Input
              id="f-overbooking-limit"
              type="number"
              min={0}
              required
              placeholder="120"
              value={form.capacity.overbooking_limit_minutes}
              onChange={(e) => setForm((p) => ({ ...p, capacity: { ...p.capacity, overbooking_limit_minutes: e.target.value } }))}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Location */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lokasi</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-address">Alamat</Label>
          <Input id="f-address" placeholder="Jl. Sudirman No. 123" value={form.location.address ?? ""} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, address: e.target.value } }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-city">Kota</Label>
            <Input id="f-city" placeholder="Jakarta" value={form.location.city ?? ""} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, city: e.target.value } }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-province">Provinsi</Label>
            <Input id="f-province" placeholder="DKI Jakarta" value={form.location.province ?? ""} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, province: e.target.value } }))} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-postal">Kode Pos</Label>
            <Input id="f-postal" placeholder="12345" value={form.location.postal_code ?? ""} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, postal_code: e.target.value } }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-lat">Latitude</Label>
            <Input id="f-lat" type="number" step="any" placeholder="-6.208" value={form.location.latitude ?? ""} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, latitude: e.target.value ? parseFloat(e.target.value) : null } }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-lng">Longitude</Label>
            <Input id="f-lng" type="number" step="any" placeholder="106.845" value={form.location.longitude ?? ""} onChange={(e) => setForm((p) => ({ ...p, location: { ...p.location, longitude: e.target.value ? parseFloat(e.target.value) : null } }))} />
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Kontak</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-phone">Nomor Telepon</Label>
            <Input id="f-phone" placeholder="+628123456789" value={form.contact.phone_number ?? ""} onChange={(e) => setForm((p) => ({ ...p, contact: { ...p.contact, phone_number: e.target.value } }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-wa">WhatsApp</Label>
            <Input id="f-wa" placeholder="+628123456789" value={form.contact.whatsapp ?? ""} onChange={(e) => setForm((p) => ({ ...p, contact: { ...p.contact, whatsapp: e.target.value } }))} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-email">Email</Label>
          <Input id="f-email" type="email" placeholder="store@pawship.com" value={form.contact.email ?? ""} onChange={(e) => setForm((p) => ({ ...p, contact: { ...p.contact, email: e.target.value } }))} />
        </div>
      </div>

      <Separator />

      {/* Operational */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operasional</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-open">Jam Buka</Label>
            <Input id="f-open" type="time" value={form.operational.opening_time} onChange={(e) => setForm((p) => ({ ...p, operational: { ...p.operational, opening_time: e.target.value } }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="f-close">Jam Tutup</Label>
            <Input id="f-close" type="time" value={form.operational.closing_time} onChange={(e) => setForm((p) => ({ ...p, operational: { ...p.operational, closing_time: e.target.value } }))} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-tz">Timezone</Label>
          <Input id="f-tz" placeholder="Asia/Jakarta" value={form.operational.timezone} onChange={(e) => setForm((p) => ({ ...p, operational: { ...p.operational, timezone: e.target.value } }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Hari Operasional</Label>
          <div className="flex flex-wrap gap-2 pt-1">
            {DAYS_OF_WEEK.map((day) => (
              <label key={day} className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  checked={form.operational.operational_days.includes(day)}
                  onCheckedChange={() => toggleDay(day)}
                />
                <span className="text-sm">{DAY_LABELS[day]}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Util: form → API payload ───────────────────────────────────────────────
function formToPayload(form: StoreForm) {
  return {
    code: form.code,
    name: form.name,
    description: form.description || undefined,
    is_active: form.is_active,
    location: {
      address: form.location.address || undefined,
      city: form.location.city || undefined,
      province: form.location.province || undefined,
      postal_code: form.location.postal_code || undefined,
      latitude: form.location.latitude ?? undefined,
      longitude: form.location.longitude ?? undefined,
    },
    contact: {
      phone_number: form.contact.phone_number || undefined,
      whatsapp: form.contact.whatsapp || undefined,
      email: form.contact.email || undefined,
    },
    operational: {
      opening_time: form.operational.opening_time || undefined,
      closing_time: form.operational.closing_time || undefined,
      operational_days: form.operational.operational_days,
      timezone: form.operational.timezone || undefined,
    },
    capacity: {
      default_daily_capacity_minutes: Number(form.capacity.default_daily_capacity_minutes),
      overbooking_limit_minutes: Number(form.capacity.overbooking_limit_minutes),
    },
  }
}

// ── Util: ApiStore → form ─────────────────────────────────────────────────
function storeToForm(store: ApiStore): StoreForm {
  return {
    code: store.code,
    name: store.name,
    description: store.description ?? "",
    is_active: store.is_active,
    location: {
      address: store.location?.address ?? "",
      city: store.location?.city ?? "",
      province: store.location?.province ?? "",
      postal_code: store.location?.postal_code ?? "",
      latitude: store.location?.latitude ?? null,
      longitude: store.location?.longitude ?? null,
    },
    contact: {
      phone_number: store.contact?.phone_number ?? "",
      whatsapp: store.contact?.whatsapp ?? "",
      email: store.contact?.email ?? "",
    },
    operational: {
      opening_time: store.operational?.opening_time ?? "09:00",
      closing_time: store.operational?.closing_time ?? "18:00",
      operational_days: store.operational?.operational_days ?? [],
      timezone: store.operational?.timezone ?? "Asia/Jakarta",
    },
    capacity: {
      default_daily_capacity_minutes: store.capacity?.default_daily_capacity_minutes != null ? String(store.capacity.default_daily_capacity_minutes) : "",
      overbooking_limit_minutes: store.capacity?.overbooking_limit_minutes != null ? String(store.capacity.overbooking_limit_minutes) : "",
    },
  }
}

// ── Component ──────────────────────────────────────────────────────────────
export default function StoresPage() {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [isActiveFilter, setIsActiveFilter] = useState<"all" | "true" | "false">("all")
  const [page, setPage] = useState(1)

  const [stores, setStores] = useState<ApiStore[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: LIMIT, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Create
  const [addOpen, setAddOpen] = useState(false)
  const [createForm, setCreateForm] = useState<StoreForm>(DEFAULT_FORM)
  const [isCreating, setIsCreating] = useState(false)

  // Edit
  const [editStore, setEditStore] = useState<ApiStore | null>(null)
  const [editForm, setEditForm] = useState<StoreForm>(DEFAULT_FORM)
  const [isEditing, setIsEditing] = useState(false)

  // Delete
  const [deleteStore, setDeleteStore] = useState<ApiStore | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [isActiveFilter])

  const fetchStores = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(LIMIT))
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (isActiveFilter !== "all") params.set("is_active", isActiveFilter)
      const data = await apiAuthRequest<StoresResponse>(`/stores?${params.toString()}`)
      setStores(data.stores ?? [])
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data stores.")
      setStores([])
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, isActiveFilter])

  useEffect(() => { fetchStores() }, [fetchStores])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await apiAuthRequest("/stores", { method: "POST", body: JSON.stringify(formToPayload(createForm)) })
      toast.success("Store berhasil dibuat")
      setAddOpen(false)
      setCreateForm(DEFAULT_FORM)
      fetchStores()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat store.")
    } finally {
      setIsCreating(false)
    }
  }

  const openEdit = (store: ApiStore) => {
    setEditStore(store)
    setEditForm(storeToForm(store))
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editStore) return
    setIsEditing(true)
    try {
      await apiAuthRequest(`/stores/${editStore._id}`, { method: "PUT", body: JSON.stringify(formToPayload(editForm)) })
      toast.success("Store berhasil diperbarui")
      setEditStore(null)
      fetchStores()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui store.")
    } finally {
      setIsEditing(false)
    }
  }

  const toggleStatus = async (store: ApiStore) => {
    const newStatus = !store.is_active
    setStores((prev) => prev.map((s) => s._id === store._id ? { ...s, is_active: newStatus } : s))
    try {
      await apiAuthRequest(`/stores/${store._id}`, { method: "PUT", body: JSON.stringify({ is_active: newStatus }) })
      toast.success(newStatus ? `${store.name} diaktifkan` : `${store.name} dinonaktifkan`)
    } catch (err) {
      setStores((prev) => prev.map((s) => s._id === store._id ? { ...s, is_active: store.is_active } : s))
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status store.")
    }
  }

  const handleDelete = async () => {
    if (!deleteStore) return
    setIsDeleting(true)
    try {
      await apiAuthRequest(`/stores/${deleteStore._id}`, { method: "DELETE" })
      toast.success(`"${deleteStore.name}" berhasil dihapus`)
      setDeleteStore(null)
      fetchStores()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus store.")
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Stores</h1>
            <p className="text-sm text-muted-foreground">Kelola semua cabang toko Pawship</p>
          </div>
          <Button onClick={() => { setCreateForm(DEFAULT_FORM); setAddOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Store
          </Button>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, kode, deskripsi, atau alamat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={isActiveFilter} onValueChange={(v) => setIsActiveFilter(v as "all" | "true" | "false")}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="true">Aktif</SelectItem>
              <SelectItem value="false">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        {/* Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Toko</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead>Operasional</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><div className="flex flex-col gap-1"><Skeleton className="h-4 w-36" /><Skeleton className="h-3 w-48" /></div></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-7 w-7 ml-auto rounded-md" /></TableCell>
                        </TableRow>
                      ))
                    : stores.map((store) => (
                        <TableRow key={store._id}>
                          <TableCell>
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">
                                <Highlight text={store.name} query={debouncedSearch} />
                              </span>
                              {store.description && (
                                <span className="text-xs text-muted-foreground line-clamp-1">
                                  <Highlight text={store.description} query={debouncedSearch} />
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {store.code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {store.location?.city ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span>
                                  <Highlight text={`${store.location.city}${store.location.province ? `, ${store.location.province}` : ""}`} query={debouncedSearch} />
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {store.contact?.phone_number ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5 shrink-0" />
                                <span>{store.contact.phone_number}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {store.operational?.opening_time ? (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 shrink-0" />
                                <span>{store.operational.opening_time}–{store.operational.closing_time}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/50 text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${store.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {store.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => toggleStatus(store)}>
                                  <Switch checked={store.is_active} className="mr-2 scale-75 pointer-events-none" aria-hidden />
                                  {store.is_active ? "Nonaktifkan" : "Aktifkan"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(store)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Store
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteStore(store)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Hapus Store
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && stores.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                        Tidak ada store ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/50 pt-4">
            <p className="text-sm text-muted-foreground">
              Menampilkan {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, pagination.total)} dari {pagination.total} store
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                ←
              </Button>
              <span className="text-sm font-medium">{page} / {pagination.totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page >= pagination.totalPages}>
                →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setCreateForm(DEFAULT_FORM) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Store Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-0 flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-4 -mr-4">
              <div className="pb-4">
                <StoreFormFields form={createForm} setForm={setCreateForm} />
              </div>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Button type="submit" className="w-full" disabled={isCreating}>
                {isCreating ? "Menyimpan..." : "Tambah Store"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStore} onOpenChange={(o) => { if (!o) setEditStore(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Store</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-0 flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-4 -mr-4">
              <div className="pb-4">
                <StoreFormFields form={editForm} setForm={setEditForm} />
              </div>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Button type="submit" className="w-full" disabled={isEditing}>
                {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteStore} onOpenChange={(o) => { if (!o) setDeleteStore(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Store</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus store{" "}
              <span className="font-semibold text-foreground">"{deleteStore?.name}"</span>?
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
