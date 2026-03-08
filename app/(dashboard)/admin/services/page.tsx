"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Search,
  ImageIcon,
  X,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { toast } from "sonner"

import {
  type ApiServiceType,
  createServiceType,
  deleteServiceType,
  getServiceTypes,
  updateServiceType,
} from "@/lib/api/service-types"
import {
  type AdminService,
  createAdminService,
  deleteAdminService,
  getAdminServices,
  updateAdminService,
} from "@/lib/api/services"
import { getOptions, type ApiOption } from "@/lib/api/options"
import { getStores, type ApiStore } from "@/lib/api/stores"
import { uploadFile } from "@/lib/api/upload"

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface StypeForm {
  title: string
  description: string
  is_active: boolean
  show_in_homepage: boolean
  store_ids: string[]
  imageFile: File | null
  imagePreview: string | null
  image_url: string | null
  public_id: string | null
}

interface PriceRow {
  pet_type_id: string
  size_id: string
  hair_id: string
  price: string
}

interface ServiceForm {
  code: string
  name: string
  description: string
  duration: string
  available_for_unlimited: boolean
  pet_type_ids: string[]
  size_category_ids: string[]
  hair_category_ids: string[]
  price_type: "single" | "multiple"
  price: string
  prices: PriceRow[]
  available_store_ids: string[]
  addon_ids: string[]
  include: string[]
  show_in_homepage: boolean
  order: string
  service_location_type: string
  is_active: boolean
  imageFile: File | null
  imagePreview: string | null
  image_url: string | null
  public_id: string | null
}

const DEFAULT_STYPE_FORM: StypeForm = {
  title: "",
  description: "",
  is_active: true,
  show_in_homepage: false,
  store_ids: [],
  imageFile: null,
  imagePreview: null,
  image_url: null,
  public_id: null,
}

const DEFAULT_SERVICE_FORM: ServiceForm = {
  code: "",
  name: "",
  description: "",
  duration: "60",
  available_for_unlimited: false,
  pet_type_ids: [],
  size_category_ids: [],
  hair_category_ids: [],
  price_type: "multiple",
  price: "",
  prices: [],
  available_store_ids: [],
  addon_ids: [],
  include: [],
  show_in_homepage: false,
  order: "0",
  service_location_type: "in store",
  is_active: true,
  imageFile: null,
  imagePreview: null,
  image_url: null,
  public_id: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatRupiah(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n)
}

// Format raw digit string with thousand-separator dots for display (e.g. "20000" → "20.000")
function formatThousands(val: string): string {
  const digits = val.replace(/\D/g, "")
  if (!digits) return ""
  return Number(digits).toLocaleString("id-ID")
}

// Strip thousand-separator dots so only raw digits remain (e.g. "20.000" → "20000")
function parseThousands(val: string): string {
  return val.replace(/\./g, "").replace(/\D/g, "")
}

// ─────────────────────────────────────────────────────────────────────────────
// Image picker sub-component
// ─────────────────────────────────────────────────────────────────────────────
function ImagePicker({
  preview,
  existingUrl,
  onFile,
  onClear,
}: {
  preview: string | null
  existingUrl?: string | null
  onFile: (file: File) => void
  onClear: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const displayUrl = preview ?? existingUrl ?? null

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative flex h-32 w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden"
        onClick={() => ref.current?.click()}
      >
        {displayUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={displayUrl} alt="preview" className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-xs text-white font-medium">Ganti Gambar</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Klik untuk upload gambar</span>
          </div>
        )}
      </div>
      {displayUrl && (
        <Button type="button" size="sm" variant="ghost" className="self-start text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onClear() }}>
          <X className="mr-1 h-3.5 w-3.5" /> Hapus Gambar
        </Button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = "" }} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag input sub-component (for include[])
// ─────────────────────────────────────────────────────────────────────────────
function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("")

  const add = () => {
    const trimmed = input.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInput("")
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          placeholder="Tambah item (tekan Enter)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add() } }}
        />
        <Button type="button" size="sm" variant="outline" onClick={add} disabled={!input.trim()}>
          Tambah
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={i} className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
              {tag}
              <button type="button" onClick={() => onChange(tags.filter((_, idx) => idx !== i))} className="ml-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
//  Multi-checkbox helper
// ─────────────────────────────────────────────────────────────────────────────
function MultiCheck({
  items,
  selected,
  labelKey,
  onChange,
}: {
  items: { _id: string; name: string }[]
  selected: string[]
  labelKey?: string
  onChange: (ids: string[]) => void
}) {
  if (!items.length) return <p className="text-xs text-muted-foreground">Tidak ada data</p>
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {items.map((item) => (
        <label key={item._id} className="flex items-center gap-1.5 cursor-pointer">
          <Checkbox
            checked={selected.includes(item._id)}
            onCheckedChange={(v) =>
              onChange(v ? [...selected, item._id] : selected.filter((id) => id !== item._id))
            }
          />
          <span className="text-sm">{item.name}</span>
        </label>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Type Form
// ─────────────────────────────────────────────────────────────────────────────
function StypeFormFields({
  form,
  setForm,
  stores,
}: {
  form: StypeForm
  setForm: React.Dispatch<React.SetStateAction<StypeForm>>
  stores: ApiStore[]
}) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFile = async (file: File) => {
    const url = URL.createObjectURL(file)
    setForm((p) => ({ ...p, imageFile: file, imagePreview: url }))
    setIsUploading(true)
    try {
      const res = await uploadFile(file, "service-types")
      setForm((p) => ({ ...p, image_url: res.image_url, public_id: res.public_id }))
      toast.success("Gambar berhasil diupload")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal upload gambar")
      setForm((p) => ({ ...p, imageFile: null, imagePreview: null }))
    } finally {
      setIsUploading(false)
    }
  }
  const handleClear = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview)
    setForm((p) => ({ ...p, imageFile: null, imagePreview: null, image_url: null, public_id: null }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="st-title">Nama Tipe Layanan *</Label>
        <Input id="st-title" placeholder="Grooming" required value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="st-desc">Deskripsi</Label>
        <Textarea id="st-desc" rows={2} placeholder="Deskripsi tipe layanan..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Gambar</Label>
        <ImagePicker
          preview={form.imagePreview}
          existingUrl={form.image_url}
          onFile={handleFile}
          onClear={handleClear}
        />
        {isUploading && <p className="text-xs text-muted-foreground">Mengupload gambar...</p>}
      </div>
      <div className="flex items-center gap-3">
        <Switch id="st-active" checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
        <Label htmlFor="st-active">Aktif</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch id="st-hp" checked={form.show_in_homepage} onCheckedChange={(v) => setForm((p) => ({ ...p, show_in_homepage: v }))} />
        <Label htmlFor="st-hp">Tampil di Homepage</Label>
      </div>
      {stores.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>Toko yang Tersedia</Label>
          <MultiCheck
            items={stores.map((s) => ({ _id: s._id, name: s.name }))}
            selected={form.store_ids}
            onChange={(ids) => setForm((p) => ({ ...p, store_ids: ids }))}
          />
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Form (complex)
// ─────────────────────────────────────────────────────────────────────────────
function ServiceFormFields({
  form,
  setForm,
  selectedTypeName,
  petTypes,
  sizeCategories,
  hairCategories,
  stores,
  allServices,
  editingServiceId,
}: {
  form: ServiceForm
  setForm: React.Dispatch<React.SetStateAction<ServiceForm>>
  selectedTypeName: string
  petTypes: ApiOption[]
  sizeCategories: ApiOption[]
  hairCategories: ApiOption[]
  stores: ApiStore[]
  allServices: AdminService[]
  editingServiceId: string | null
}) {
  const [isUploading, setIsUploading] = useState(false)

  const handleImageFile = async (file: File) => {
    const preview = URL.createObjectURL(file)
    setForm((p) => ({ ...p, imageFile: file, imagePreview: preview }))
    setIsUploading(true)
    try {
      const res = await uploadFile(file, "services")
      setForm((p) => ({ ...p, image_url: res.image_url, public_id: res.public_id }))
      toast.success("Gambar berhasil diupload")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal upload gambar")
      setForm((p) => ({ ...p, imageFile: null, imagePreview: null }))
    } finally {
      setIsUploading(false)
    }
  }

  const handleImageClear = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview)
    setForm((p) => ({ ...p, imageFile: null, imagePreview: null, image_url: null, public_id: null }))
  }

  // Auto-generate price rows when ALL three dimensions are selected (multiple only)
  useEffect(() => {
    setForm((p) => {
      if (p.price_type !== "multiple") {
        return { ...p, prices: [] }
      }
      if (!p.pet_type_ids.length || !p.size_category_ids.length || !p.hair_category_ids.length) {
        return { ...p, prices: [] }
      }
      const combinations: PriceRow[] = []
      for (const pet of p.pet_type_ids) {
        for (const size of p.size_category_ids) {
          for (const hair of p.hair_category_ids) {
            const existing = p.prices.find(
              (r) => r.pet_type_id === pet && r.size_id === size && r.hair_id === hair
            )
            combinations.push({ pet_type_id: pet, size_id: size, hair_id: hair, price: existing?.price ?? "" })
          }
        }
      }
      return { ...p, prices: combinations }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pet_type_ids, form.size_category_ids, form.hair_category_ids, form.price_type])

  const updatePriceRow = (idx: number, value: string) => {
    setForm((p) => {
      const next = [...p.prices]
      next[idx] = { ...next[idx], price: value }
      return { ...p, prices: next }
    })
  }

  const addonOptions = allServices.filter((s) =>
    s.service_type?.title?.toLowerCase().includes("addon")
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Basic */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informasi Dasar</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sv-code">Kode Layanan *</Label>
            <Input id="sv-code" placeholder="SVC001" required value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sv-name">Nama Layanan *</Label>
            <Input id="sv-name" placeholder="Basic Grooming" required value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sv-desc">Deskripsi</Label>
          <Textarea id="sv-desc" rows={2} placeholder="Deskripsi layanan..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Tipe Layanan:</span>
          <Badge variant="secondary">{selectedTypeName}</Badge>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sv-dur">Durasi (menit) *</Label>
          <Input id="sv-dur" type="number" min={1} required placeholder="60" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} />
        </div>
      </div>

      <Separator />

      {/* Image */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Gambar</p>
        <ImagePicker
          preview={form.imagePreview}
          existingUrl={form.image_url}
          onFile={handleImageFile}
          onClear={handleImageClear}
        />
        {isUploading && <p className="text-xs text-muted-foreground">Mengupload gambar...</p>}
      </div>

      <Separator />

      {/* Pet Types & Size Categories */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hewan & Ukuran</p>
        <div className="flex flex-col gap-1.5">
          <Label>Tipe Hewan</Label>
          <MultiCheck
            items={petTypes.map((o) => ({ _id: o._id, name: o.name }))}
            selected={form.pet_type_ids}
            onChange={(ids) => setForm((p) => ({ ...p, pet_type_ids: ids }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Kategori Ukuran</Label>
          <MultiCheck
            items={sizeCategories.map((o) => ({ _id: o._id, name: o.name }))}
            selected={form.size_category_ids}
            onChange={(ids) => setForm((p) => ({ ...p, size_category_ids: ids }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Kategori Bulu</Label>
          <MultiCheck
            items={hairCategories.map((o) => ({ _id: o._id, name: o.name }))}
            selected={form.hair_category_ids}
            onChange={(ids) => setForm((p) => ({ ...p, hair_category_ids: ids }))}
          />
        </div>
      </div>

      <Separator />

      {/* Prices */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Harga</p>
        {/* Price Type Toggle */}
        <div className="flex flex-col gap-1.5">
          <Label>Tipe Harga</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={form.price_type === "multiple" ? "default" : "outline"}
              onClick={() => setForm((p) => ({ ...p, price_type: "multiple" }))}
            >
              Multiple (Per Kombinasi)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={form.price_type === "single" ? "default" : "outline"}
              onClick={() => setForm((p) => ({ ...p, price_type: "single" }))}
            >
              Single (Harga Tetap)
            </Button>
          </div>
        </div>
        {form.price_type === "single" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sv-price">Harga (Rp) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <Input
                id="sv-price"
                type="text"
                inputMode="numeric"
                placeholder="0"
                className="pl-9"
                value={formatThousands(form.price)}
                onChange={(e) => setForm((p) => ({ ...p, price: parseThousands(e.target.value) }))}
              />
            </div>
          </div>
        ) : (
          <>
            {!form.pet_type_ids.length || !form.size_category_ids.length || !form.hair_category_ids.length ? (
              <p className="text-sm text-muted-foreground">Pilih minimal satu hewan, ukuran, <em>dan</em> bulu untuk mengisi harga.</p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      {form.pet_type_ids.length > 0 && <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Hewan</th>}
                      {form.size_category_ids.length > 0 && <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Ukuran</th>}
                      {form.hair_category_ids.length > 0 && <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Bulu</th>}
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Harga (Rp)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.prices.map((row, idx) => (
                      <tr key={idx} className="border-b border-border last:border-0 hover:bg-muted/30">
                        {form.pet_type_ids.length > 0 && (
                          <td className="px-3 py-2 text-xs">{petTypes.find((p) => p._id === row.pet_type_id)?.name ?? "—"}</td>
                        )}
                        {form.size_category_ids.length > 0 && (
                          <td className="px-3 py-2 text-xs">{sizeCategories.find((s) => s._id === row.size_id)?.name ?? "—"}</td>
                        )}
                        {form.hair_category_ids.length > 0 && (
                          <td className="px-3 py-2 text-xs">{hairCategories.find((h) => h._id === row.hair_id)?.name ?? "—"}</td>
                        )}
                        <td className="px-3 py-2">
                          <Input
                            className="h-7 text-xs w-36"
                            type="text"
                            inputMode="numeric"
                            placeholder="0"
                            value={formatThousands(row.price)}
                            onChange={(e) => updatePriceRow(idx, parseThousands(e.target.value))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <Separator />

      {/* Stores */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Toko Tersedia</p>
        <MultiCheck
          items={stores.map((s) => ({ _id: s._id, name: s.name }))}
          selected={form.available_store_ids}
          onChange={(ids) => setForm((p) => ({ ...p, available_store_ids: ids }))}
        />
      </div>

      <Separator />

      {/* Addons */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Addon</p>
        {addonOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada layanan tersedia sebagai addon.</p>
        ) : (
          <MultiCheck
            items={addonOptions.map((s) => ({ _id: s._id, name: s.name }))}
            selected={form.addon_ids}
            onChange={(ids) => setForm((p) => ({ ...p, addon_ids: ids }))}
          />
        )}
      </div>

      <Separator />

      {/* Include */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Termasuk</p>
        <TagInput
          tags={form.include}
          onChange={(tags) => setForm((p) => ({ ...p, include: tags }))}
        />
      </div>

      <Separator />

      {/* Settings */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pengaturan Lainnya</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sv-loctype">Lokasi Layanan</Label>
          <Select value={form.service_location_type} onValueChange={(v) => setForm((p) => ({ ...p, service_location_type: v }))}>
            <SelectTrigger id="sv-loctype"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="in store">Di Toko (In Store)</SelectItem>
              <SelectItem value="in home">Di Rumah (In Home)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="sv-unlimited" checked={form.available_for_unlimited} onCheckedChange={(v) => setForm((p) => ({ ...p, available_for_unlimited: v }))} />
          <Label htmlFor="sv-unlimited">Tersedia untuk Unlimited Member</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="sv-hp" checked={form.show_in_homepage} onCheckedChange={(v) => setForm((p) => ({ ...p, show_in_homepage: v }))} />
          <Label htmlFor="sv-hp">Tampil di Homepage</Label>
        </div>
        {form.show_in_homepage && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sv-order">Urutan Tampil</Label>
            <Input id="sv-order" type="number" min={0} placeholder="0" value={form.order} onChange={(e) => setForm((p) => ({ ...p, order: e.target.value }))} />
          </div>
        )}
        <div className="flex items-center gap-3">
          <Switch id="sv-active" checked={form.is_active} onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))} />
          <Label htmlFor="sv-active">Aktif</Label>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function ServicesPage() {
  // ── Reference options ────────────────────────────────────────────────────
  const [petTypes, setPetTypes] = useState<ApiOption[]>([])
  const [sizeCategories, setSizeCategories] = useState<ApiOption[]>([])
  const [hairCategories, setHairCategories] = useState<ApiOption[]>([])
  const [stores, setStores] = useState<ApiStore[]>([])
  const [allServices, setAllServices] = useState<AdminService[]>([])

  // ── Service Types ────────────────────────────────────────────────────────
  const [serviceTypes, setServiceTypes] = useState<ApiServiceType[]>([])
  const [stypeSearch, setStypeSearch] = useState("")
  const [stypeLoading, setStypeLoading] = useState(true)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)

  const [stypeAddOpen, setStypeAddOpen] = useState(false)
  const [stypeForm, setStypeForm] = useState<StypeForm>(DEFAULT_STYPE_FORM)
  const [isCreatingStype, setIsCreatingStype] = useState(false)

  const [editStype, setEditStype] = useState<ApiServiceType | null>(null)
  const [editStypeForm, setEditStypeForm] = useState<StypeForm>(DEFAULT_STYPE_FORM)
  const [isEditingStype, setIsEditingStype] = useState(false)

  const [deleteStype, setDeleteStype] = useState<ApiServiceType | null>(null)
  const [isDeletingStype, setIsDeletingStype] = useState(false)

  // ── Services ─────────────────────────────────────────────────────────────
  const [services, setServices] = useState<AdminService[]>([])
  const [serviceSearch, setServiceSearch] = useState("")
  const [serviceActiveFilter, setServiceActiveFilter] = useState<"all" | "true" | "false">("all")
  const [serviceLoading, setServiceLoading] = useState(false)
  const [serviceError, setServiceError] = useState("")

  const [serviceAddOpen, setServiceAddOpen] = useState(false)
  const [serviceForm, setServiceForm] = useState<ServiceForm>(DEFAULT_SERVICE_FORM)
  const [isCreatingService, setIsCreatingService] = useState(false)

  const [editService, setEditService] = useState<AdminService | null>(null)
  const [editServiceForm, setEditServiceForm] = useState<ServiceForm>(DEFAULT_SERVICE_FORM)
  const [isEditingService, setIsEditingService] = useState(false)

  const [deleteService, setDeleteService] = useState<AdminService | null>(null)
  const [isDeletingService, setIsDeletingService] = useState(false)

  const [viewService, setViewService] = useState<AdminService | null>(null)

  const selectedType = serviceTypes.find((t) => t._id === selectedTypeId) ?? null

  // ── Fetch reference data ─────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      getOptions("pet type"),
      getOptions("size category"),
      getOptions("hair category"),
      getStores({ page: 1, limit: 100 }),
    ]).then(([petRes, sizeRes, hairRes, storeRes]) => {
      setPetTypes(petRes.options ?? [])
      setSizeCategories(sizeRes.options ?? [])
      setHairCategories(hairRes.options ?? [])
      setStores(storeRes.stores ?? [])
    }).catch(() => {})
  }, [])

  // ── Fetch service types ──────────────────────────────────────────────────
  const fetchServiceTypes = useCallback(async () => {
    setStypeLoading(true)
    try {
      const res = await getServiceTypes({ page: 1, limit: 100 })
      setServiceTypes(res.serviceTypes ?? [])
    } catch {
      setServiceTypes([])
    } finally {
      setStypeLoading(false)
    }
  }, [])

  useEffect(() => { fetchServiceTypes() }, [fetchServiceTypes])

  // ── Fetch services for selected type ────────────────────────────────────
  const fetchServices = useCallback(async () => {
    if (!selectedTypeId) { setServices([]); return }
    setServiceLoading(true)
    setServiceError("")
    try {
      const res = await getAdminServices({
        page: 1,
        limit: 100,
        service_type_id: selectedTypeId,
        search: serviceSearch || undefined,
        is_active: serviceActiveFilter === "all" ? undefined : serviceActiveFilter,
      })
      setServices(res.services ?? [])
    } catch (err) {
      setServiceError(err instanceof Error ? err.message : "Gagal memuat layanan.")
      setServices([])
    } finally {
      setServiceLoading(false)
    }
  }, [selectedTypeId, serviceSearch, serviceActiveFilter])

  useEffect(() => { fetchServices() }, [fetchServices])

  // Fetch all services for addon selection (without type filter)
  useEffect(() => {
    getAdminServices({ page: 1, limit: 200 }).then((res) => setAllServices(res.services ?? [])).catch(() => {})
  }, [])

  // ── Service Type Handlers ────────────────────────────────────────────────
  const buildStypePayload = (form: StypeForm, storeIds: string[]) => ({
    title: form.title,
    ...(form.description ? { description: form.description } : {}),
    ...(form.image_url ? { image_url: form.image_url } : {}),
    ...(form.public_id ? { public_id: form.public_id } : {}),
    is_active: form.is_active,
    show_in_homepage: form.show_in_homepage,
    store_ids: storeIds,
  })

  const handleCreateStype = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingStype(true)
    try {
      await createServiceType(buildStypePayload(stypeForm, stypeForm.store_ids))
      toast.success("Tipe layanan berhasil dibuat")
      setStypeAddOpen(false)
      setStypeForm(DEFAULT_STYPE_FORM)
      fetchServiceTypes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat tipe layanan.")
    } finally {
      setIsCreatingStype(false)
    }
  }

  const openEditStype = (st: ApiServiceType) => {
    setEditStype(st)
    setEditStypeForm({
      title: st.title,
      description: st.description ?? "",
      is_active: st.is_active,
      show_in_homepage: st.show_in_homepage,
      store_ids: st.stores?.map((s) => s._id) ?? [],
      imageFile: null,
      imagePreview: null,
      image_url: st.image_url ?? null,
      public_id: st.public_id ?? null,
    })
  }

  const handleEditStype = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editStype) return
    setIsEditingStype(true)
    try {
      await updateServiceType(editStype._id, buildStypePayload(editStypeForm, editStypeForm.store_ids))
      toast.success("Tipe layanan berhasil diperbarui")
      setEditStype(null)
      fetchServiceTypes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui tipe layanan.")
    } finally {
      setIsEditingStype(false)
    }
  }

  const handleDeleteStype = async () => {
    if (!deleteStype) return
    setIsDeletingStype(true)
    try {
      await deleteServiceType(deleteStype._id)
      toast.success(`"${deleteStype.title}" berhasil dihapus`)
      if (selectedTypeId === deleteStype._id) setSelectedTypeId(null)
      setDeleteStype(null)
      fetchServiceTypes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus tipe layanan.")
    } finally {
      setIsDeletingStype(false)
    }
  }

  // ── Service Handlers ─────────────────────────────────────────────────────
  const buildServicePayload = (form: ServiceForm, serviceTypeId: string) => ({
    code: form.code,
    name: form.name,
    description: form.description || undefined,
    service_type_id: serviceTypeId,
    pet_type_ids: form.pet_type_ids,
    size_category_ids: form.size_category_ids,
    hair_category_ids: form.hair_category_ids,
    price_type: form.price_type,
    ...(form.price_type === "single"
      ? { price: Number(form.price) }
      : {
          prices: form.prices
            .filter((r) => r.price !== "" && r.pet_type_id && r.size_id && r.hair_id)
            .map((r) => ({
              pet_type_id: r.pet_type_id,
              size_id: r.size_id,
              hair_id: r.hair_id,
              price: Number(r.price),
            })),
        }),
    duration: Number(form.duration),
    available_for_unlimited: form.available_for_unlimited,
    available_store_ids: form.available_store_ids.length ? form.available_store_ids : undefined,
    addon_ids: form.addon_ids.length ? form.addon_ids : undefined,
    include: form.include.length ? form.include : undefined,
    image_url: form.image_url ?? undefined,
    public_id: form.public_id ?? undefined,
    show_in_homepage: form.show_in_homepage,
    order: Number(form.order),
    service_location_type: form.service_location_type,
    is_active: form.is_active,
  })

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTypeId) return
    setIsCreatingService(true)
    try {
      await createAdminService(buildServicePayload(serviceForm, selectedTypeId))
      toast.success("Layanan berhasil dibuat")
      setServiceAddOpen(false)
      setServiceForm(DEFAULT_SERVICE_FORM)
      fetchServices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat layanan.")
    } finally {
      setIsCreatingService(false)
    }
  }

  const openEditService = (svc: AdminService) => {
    setEditService(svc)

    const petIds = svc.pet_types?.map((p) => p._id) ?? []
    const sizeIds = svc.size_categories?.map((s) => s._id) ?? []
    const hairIds = svc.hair_categories?.map((h) => h._id) ?? []

    // Build a lookup map from loaded prices: "petId|sizeId|hairId" → price string
    const priceMap = new Map<string, string>(
      (svc.prices ?? []).map((pr) => [
        `${pr.pet_type_id ?? ""}|${pr.size_id ?? ""}|${pr.hair_id ?? ""}`,
        String(pr.price),
      ])
    )

    // Pre-compute full combination table so the form opens with correct prices
    const prices: PriceRow[] =
      petIds.length && sizeIds.length && hairIds.length
        ? petIds.flatMap((pet) =>
            sizeIds.flatMap((size) =>
              hairIds.map((hair) => ({
                pet_type_id: pet,
                size_id: size,
                hair_id: hair,
                price: priceMap.get(`${pet}|${size}|${hair}`) ?? "",
              }))
            )
          )
        : []

    setEditServiceForm({
      code: svc.code,
      name: svc.name,
      description: svc.description ?? "",
      duration: String(svc.duration),
      available_for_unlimited: svc.available_for_unlimited,
      pet_type_ids: petIds,
      size_category_ids: sizeIds,
      hair_category_ids: hairIds,
      price_type: svc.price_type ?? "multiple",
      price: String(svc.price ?? ""),
      prices,
      available_store_ids: svc.avaiable_store?.map((s) => s._id) ?? [],
      addon_ids: svc.addons?.map((a) => a._id) ?? [],
      include: svc.include ?? [],
      show_in_homepage: svc.show_in_homepage,
      order: String(svc.order),
      service_location_type: svc.service_location_type ?? "in store",
      is_active: svc.is_active,
      imageFile: null,
      imagePreview: null,
      image_url: svc.image_url ?? null,
      public_id: svc.public_id ?? null,
    })
  }

  const handleEditService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editService || !selectedTypeId) return
    setIsEditingService(true)
    try {
      await updateAdminService(editService._id, buildServicePayload(editServiceForm, selectedTypeId))
      toast.success("Layanan berhasil diperbarui")
      setEditService(null)
      fetchServices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui layanan.")
    } finally {
      setIsEditingService(false)
    }
  }

  const toggleServiceStatus = async (svc: AdminService) => {
    const next = !svc.is_active
    setServices((prev) => prev.map((s) => s._id === svc._id ? { ...s, is_active: next } : s))
    try {
      await updateAdminService(svc._id, { is_active: next })
      toast.success(next ? `${svc.name} diaktifkan` : `${svc.name} dinonaktifkan`)
    } catch (err) {
      setServices((prev) => prev.map((s) => s._id === svc._id ? { ...s, is_active: svc.is_active } : s))
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status.")
    }
  }

  const handleDeleteService = async () => {
    if (!deleteService) return
    setIsDeletingService(true)
    try {
      await deleteAdminService(deleteService._id)
      toast.success(`"${deleteService.name}" berhasil dihapus`)
      setDeleteService(null)
      fetchServices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus layanan.")
    } finally {
      setIsDeletingService(false)
    }
  }

  // ── Filtered service types (client search) ───────────────────────────────
  const filteredTypes = serviceTypes.filter((t) =>
    !stypeSearch.trim() || t.title.toLowerCase().includes(stypeSearch.toLowerCase())
  )

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Page header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Services</h1>
          <p className="text-sm text-muted-foreground">Kelola tipe layanan dan layanan Pawship</p>
        </div>

        {/* Two-panel layout */}
        <div className="flex gap-4 min-h-[calc(100vh-200px)]">
          {/* ── Left panel: Service Types ───────────────────────────────── */}
          <div className="w-72 shrink-0 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Tipe Layanan</p>
              <Button size="sm" onClick={() => { setStypeForm(DEFAULT_STYPE_FORM); setStypeAddOpen(true) }}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Tambah
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari tipe..."
                value={stypeSearch}
                onChange={(e) => setStypeSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {stypeLoading
                ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-md" />)
                : filteredTypes.length === 0
                ? <p className="text-sm text-muted-foreground text-center py-6">Tidak ada tipe layanan</p>
                : filteredTypes.map((st) => {
                    const isActive = selectedTypeId === st._id
                    return (
                      <div
                        key={st._id}
                        className={`group rounded-md border transition-colors ${
                          isActive
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        {/* ── Row ── */}
                        <div
                          className="flex items-center justify-between gap-2 px-3 py-2.5 cursor-pointer"
                          onClick={() => setSelectedTypeId(st._id)}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {/* thumbnail */}
                            {st.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={st.image_url} alt={st.title} className="h-8 w-8 rounded object-cover shrink-0" />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium truncate">{st.title}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] w-fit px-1.5 py-0 ${st.is_active ? "text-emerald-700 border-emerald-300 bg-emerald-50" : "text-gray-500 border-gray-300 bg-gray-50"}`}
                              >
                                {st.is_active ? "Aktif" : "Nonaktif"}
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-muted"
                                onClick={(e) => { e.stopPropagation(); openEditStype(st) }}
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); setDeleteStype(st) }}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </button>
                            </div>
                            <ChevronRight className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${isActive ? "rotate-90 text-primary" : "text-muted-foreground/40"}`} />
                          </div>
                        </div>

                        {/* ── Expanded detail ── */}
                        {isActive && (
                          <div className="border-t border-primary/20 px-3 py-2.5 flex flex-col gap-2">
                            {st.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed">{st.description}</p>
                            )}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                              <span className={st.show_in_homepage ? "text-primary font-medium" : ""}>
                                {st.show_in_homepage ? "✓ Tampil di homepage" : "Tidak di homepage"}
                              </span>
                            </div>
                            {(st.stores?.length ?? 0) > 0 && (
                              <div className="flex flex-col gap-1">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Toko</p>
                                <div className="flex flex-col gap-0.5">
                                  {st.stores!.map((s) => (
                                    <span key={s._id} className="text-xs text-foreground/80 truncate">• {s.name}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })
              }
            </div>
          </div>

          {/* ── Right panel: Services ───────────────────────────────────── */}
          <div className="flex-1 flex flex-col gap-3 min-w-0">
            {!selectedType ? (
              <div className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border">
                <div className="text-center text-muted-foreground">
                  <ChevronRight className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  <p className="text-sm">Pilih tipe layanan di sebelah kiri</p>
                  <p className="text-xs">untuk melihat dan mengelola layanan</p>
                </div>
              </div>
            ) : (
              <>
                {/* Right header */}
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Layanan — <span className="text-primary">{selectedType.title}</span>
                    </p>
                  </div>
                  <Button size="sm" onClick={() => { setServiceForm(DEFAULT_SERVICE_FORM); setServiceAddOpen(true) }}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Tambah Layanan
                  </Button>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama, kode..."
                      value={serviceSearch}
                      onChange={(e) => setServiceSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <Select value={serviceActiveFilter} onValueChange={(v) => setServiceActiveFilter(v as "all" | "true" | "false")}>
                    <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="true">Aktif</SelectItem>
                      <SelectItem value="false">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {serviceError && (
                  <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{serviceError}</div>
                )}

                {/* Table */}
                <Card className="border-border/50 flex-1">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Layanan</TableHead>
                            <TableHead>Kode</TableHead>
                            <TableHead>Durasi</TableHead>
                            <TableHead>Harga</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {serviceLoading
                            ? Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                                  <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                                  <TableCell><Skeleton className="h-7 w-7 ml-auto rounded-md" /></TableCell>
                                </TableRow>
                              ))
                            : services.map((svc) => (
                                <TableRow
                                  key={svc._id}
                                  className="cursor-pointer hover:bg-muted/50"
                                  onClick={() => setViewService(svc)}
                                >
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {svc.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={svc.image_url} alt={svc.name} className="h-8 w-8 rounded object-cover shrink-0" />
                                      ) : (
                                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                        </div>
                                      )}
                                        <span className="font-medium text-sm">{svc.name}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline" className="font-mono text-xs">{svc.code}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm">{svc.duration} menit</span>
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-sm text-muted-foreground">
                                      {svc.price_type === "single" && svc.price != null
                                        ? formatRupiah(svc.price)
                                        : (svc.prices?.length ?? 0) > 0
                                        ? `${svc.prices!.length} varian`
                                        : "—"}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${svc.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                                    >
                                      {svc.is_active ? "Aktif" : "Nonaktif"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7">
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => toggleServiceStatus(svc)}>
                                          <Switch checked={svc.is_active} className="mr-2 scale-75 pointer-events-none" aria-hidden />
                                          {svc.is_active ? "Nonaktifkan" : "Aktifkan"}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => openEditService(svc)}>
                                          <Pencil className="mr-2 h-4 w-4" />
                                          Edit Layanan
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive focus:text-destructive"
                                          onClick={() => setDeleteService(svc)}
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Hapus Layanan
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))
                          }
                          {!serviceLoading && services.length === 0 && !serviceError && (
                            <TableRow>
                              <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                                Belum ada layanan untuk tipe ini
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Create Service Type Dialog ─────────────────────────────────────── */}
      <Dialog open={stypeAddOpen} onOpenChange={(o) => { setStypeAddOpen(o); if (!o) setStypeForm(DEFAULT_STYPE_FORM) }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Tipe Layanan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStype} className="flex flex-col flex-1 min-h-0 gap-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 py-1">
              <StypeFormFields form={stypeForm} setForm={setStypeForm} stores={stores} />
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Button type="submit" className="w-full" disabled={isCreatingStype}>
                {isCreatingStype ? "Menyimpan..." : "Tambah Tipe Layanan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Service Type Dialog ───────────────────────────────────────── */}
      <Dialog open={!!editStype} onOpenChange={(o) => { if (!o) setEditStype(null) }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Tipe Layanan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditStype} className="flex flex-col flex-1 min-h-0 gap-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 py-1">
              <StypeFormFields form={editStypeForm} setForm={setEditStypeForm} stores={stores} />
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Button type="submit" className="w-full" disabled={isEditingStype}>
                {isEditingStype ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Service Type ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteStype} onOpenChange={(o) => { if (!o) setDeleteStype(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tipe Layanan</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus tipe layanan{" "}
              <span className="font-semibold text-foreground">"{deleteStype?.title}"</span>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingStype}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStype}
              disabled={isDeletingStype}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingStype ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Create Service Dialog ──────────────────────────────────────────── */}
      <Dialog open={serviceAddOpen} onOpenChange={(o) => { setServiceAddOpen(o); if (!o) setServiceForm(DEFAULT_SERVICE_FORM) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Layanan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateService} className="flex flex-col flex-1 min-h-0 gap-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-4 -mr-4">
              <div className="pb-4">
                <ServiceFormFields
                  form={serviceForm}
                  setForm={setServiceForm}
                  selectedTypeName={selectedType?.title ?? ""}
                  petTypes={petTypes}
                  sizeCategories={sizeCategories}
                  hairCategories={hairCategories}
                  stores={stores}
                  allServices={allServices}
                  editingServiceId={null}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Button type="submit" className="w-full" disabled={isCreatingService}>
                {isCreatingService ? "Menyimpan..." : "Tambah Layanan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Service Dialog ────────────────────────────────────────────── */}
      <Dialog open={!!editService} onOpenChange={(o) => { if (!o) setEditService(null) }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Layanan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditService} className="flex flex-col flex-1 min-h-0 gap-0">
            <div className="flex-1 min-h-0 overflow-y-auto pr-4 -mr-4">
              <div className="pb-4">
                <ServiceFormFields
                  form={editServiceForm}
                  setForm={setEditServiceForm}
                  selectedTypeName={selectedType?.title ?? ""}
                  petTypes={petTypes}
                  sizeCategories={sizeCategories}
                  hairCategories={hairCategories}
                  stores={stores}
                  allServices={allServices}
                  editingServiceId={editService?._id ?? null}
                />
              </div>
            </div>
            <div className="pt-4 border-t border-border mt-4">
              <Button type="submit" className="w-full" disabled={isEditingService}>
                {isEditingService ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Service ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteService} onOpenChange={(o) => { if (!o) setDeleteService(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Layanan</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus layanan{" "}
              <span className="font-semibold text-foreground">"{deleteService?.name}"</span>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingService}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteService}
              disabled={isDeletingService}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletingService ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Service Detail Sheet */}
      <Sheet open={!!viewService} onOpenChange={(o) => { if (!o) setViewService(null) }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-display">{viewService?.name}</SheetTitle>
          </SheetHeader>
          {viewService && (
            <div className="mt-4 flex flex-col gap-5">
              {/* Image */}
              {viewService.image_url && (
                <div className="overflow-hidden rounded-lg border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewService.image_url} alt={viewService.name} className="w-full h-48 object-cover" />
                </div>
              )}

              {/* Basic info */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informasi Dasar</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Kode</span>
                  <span className="font-mono font-medium">{viewService.code}</span>
                  <span className="text-muted-foreground">Tipe</span>
                  <span>{viewService.service_type?.title ?? "—"}</span>
                  <span className="text-muted-foreground">Durasi</span>
                  <span>{viewService.duration} menit</span>
                  <span className="text-muted-foreground">Lokasi</span>
                  <span className="capitalize">{viewService.service_location_type ?? "—"}</span>
                  <span className="text-muted-foreground">Tipe Harga</span>
                  <Badge variant="outline" className="w-fit text-xs">
                    {viewService.price_type === "single" ? "Single" : "Multiple"}
                  </Badge>
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={`w-fit text-xs ${viewService.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                    {viewService.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                  {viewService.show_in_homepage && (
                    <>
                      <span className="text-muted-foreground">Urutan</span>
                      <span>{viewService.order}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Unlimited Member</span>
                  <span>{viewService.available_for_unlimited ? "Ya" : "Tidak"}</span>
                  <span className="text-muted-foreground">Homepage</span>
                  <span>{viewService.show_in_homepage ? "Ya" : "Tidak"}</span>
                </div>
                {viewService.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{viewService.description}</p>
                )}
              </div>

              <Separator />

              {/* Pet, Size, Hair */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hewan & Ukuran</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <span className="text-muted-foreground">Tipe Hewan</span>
                  <div className="flex flex-wrap gap-1">
                    {viewService.pet_types?.length ? viewService.pet_types.map((p) => <Badge key={p._id} variant="secondary" className="text-xs">{p.name}</Badge>) : <span className="text-muted-foreground">—</span>}
                  </div>
                  <span className="text-muted-foreground">Ukuran</span>
                  <div className="flex flex-wrap gap-1">
                    {viewService.size_categories?.length ? viewService.size_categories.map((s) => <Badge key={s._id} variant="secondary" className="text-xs">{s.name}</Badge>) : <span className="text-muted-foreground">—</span>}
                  </div>
                  <span className="text-muted-foreground">Bulu</span>
                  <div className="flex flex-wrap gap-1">
                    {viewService.hair_categories?.length ? viewService.hair_categories.map((h) => <Badge key={h._id} variant="secondary" className="text-xs">{h.name}</Badge>) : <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>

              {/* Prices */}
              {viewService.price_type === "single" ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Harga</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <span className="text-muted-foreground">Harga</span>
                      <span className="font-medium">{formatRupiah(viewService.price ?? 0)}</span>
                    </div>
                  </div>
                </>
              ) : (viewService.prices?.length ?? 0) > 0 ? (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Harga</p>
                    <div className="overflow-x-auto rounded-md border border-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            {viewService.prices!.some((p) => p.pet_name) && <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Hewan</th>}
                            {viewService.prices!.some((p) => p.size_name) && <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Ukuran</th>}
                            {viewService.prices!.some((p) => p.hair_name) && <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Bulu</th>}
                            <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Harga</th>
                          </tr>
                        </thead>
                        <tbody>
                          {viewService.prices!.map((pr, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              {viewService.prices!.some((p) => p.pet_name) && <td className="px-3 py-2 text-xs">{pr.pet_name ?? "—"}</td>}
                              {viewService.prices!.some((p) => p.size_name) && <td className="px-3 py-2 text-xs">{pr.size_name ?? "—"}</td>}
                              {viewService.prices!.some((p) => p.hair_name) && <td className="px-3 py-2 text-xs">{pr.hair_name ?? "—"}</td>}
                              <td className="px-3 py-2 text-xs text-right font-medium">
                                {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(pr.price)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}

              {/* Stores */}
              {(viewService.avaiable_store?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Toko Tersedia</p>
                    <div className="flex flex-wrap gap-1">
                      {viewService.avaiable_store!.map((s) => <Badge key={s._id} variant="outline" className="text-xs">{s.name}</Badge>)}
                    </div>
                  </div>
                </>
              )}

              {/* Addons */}
              {(viewService.addons?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Addon</p>
                    <div className="flex flex-wrap gap-1">
                      {viewService.addons!.map((a) => <Badge key={a._id} variant="outline" className="text-xs">{a.name}</Badge>)}
                    </div>
                  </div>
                </>
              )}

              {/* Include */}
              {(viewService.include?.length ?? 0) > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Termasuk</p>
                    <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-0.5">
                      {viewService.include!.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                </>
              )}

              <Separator />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() => { setViewService(null); openEditService(viewService) }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Layanan
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
