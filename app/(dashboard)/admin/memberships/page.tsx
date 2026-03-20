"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Search,
  X,
  CreditCard,
  Ban,
  Eye,
  Tag,
  CalendarDays,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

import {
  type MembershipPlan,
  type MembershipPayload,
  type BenefitPayload,
  type BenefitType,
  type BenefitAppliesTo,
  type BenefitPeriod,
  type PetMembership,
  type PurchasePetMembershipPayload,
  getMemberships,
  getMembershipById,
  createMembership,
  updateMembership,
  deleteMembership,
  getPetMemberships,
  purchasePetMembership,
  cancelPetMembership,
} from "@/lib/api/memberships"
import { getOptions, type ApiOption } from "@/lib/api/options"
import { getAdminServices, type AdminService } from "@/lib/api/services"

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
}

// ── Benefit form ───────────────────────────────────────────────────────────

interface BenefitForm extends BenefitPayload {
  _localId: string
  label: string
}

const DEFAULT_BENEFIT_FORM: Omit<BenefitForm, "_localId"> = {
  type: "quota",
  applies_to: "service",
  period: "monthly",
  label: "",
  value: undefined,
  service_id: "",
  limit: undefined,
}

const BENEFIT_TYPE_LABEL: Record<BenefitType, string> = {
  discount: "Diskon (%)",
  quota: "Kuota Sesi",
}

const PERIOD_LABEL: Record<BenefitPeriod, string> = {
  weekly: "Mingguan",
  monthly: "Bulanan",
  unlimited: "Tidak terbatas",
}

const APPLIES_TO_LABEL: Record<BenefitAppliesTo, string> = {
  service: "Layanan",
  addon: "Addon",
  pickup: "Pickup",
}

// ── Membership Plan form ───────────────────────────────────────────────────

interface MembershipForm {
  name: string
  description: string
  duration_months: string
  price: string
  note: string
  pet_type_ids: string[]
  is_active: boolean
  benefits: BenefitForm[]
}

const DEFAULT_MEMBERSHIP_FORM: MembershipForm = {
  name: "",
  description: "",
  duration_months: "6",
  price: "",
  note: "",
  pet_type_ids: [],
  is_active: true,
  benefits: [],
}

function membershipToForm(m: MembershipPlan): MembershipForm {
  return {
    name: m.name,
    description: m.description ?? "",
    duration_months: String(m.duration_months),
    price: String(m.price),
    note: m.note ?? "",
    pet_type_ids: m.pet_type_ids?.length
      ? m.pet_type_ids
      : (m.pet_types?.map((pt) => pt._id) ?? []),
    is_active: m.is_active,
    benefits: m.benefits.map((b) => ({
      _localId: b._id,
      type: b.type,
      applies_to: b.applies_to,
      period: b.period ?? "unlimited",
      label: b.label ?? "",
      value: b.value ?? undefined,
      service_id: b.service?._id ?? "",
      limit: b.limit ?? undefined,
    })),
  }
}

function formToPayload(form: MembershipForm): MembershipPayload {
  return {
    name: form.name,
    description: form.description || undefined,
    duration_months: Number(form.duration_months),
    price: Number(form.price),
    note: form.note || undefined,
    pet_type_ids: form.pet_type_ids,
    is_active: form.is_active,
    benefits: form.benefits.map(({ _localId: _, label, ...b }) => ({
      ...b,
      label: !b.service_id && label ? label : undefined,
      value: b.type === "discount" && b.value !== undefined ? Number(b.value) : undefined,
      service_id: b.service_id || undefined,
      limit: b.limit !== undefined ? Number(b.limit) : null,
    })),
  }
}

function newLocalId() {
  return `_new_${Date.now()}_${Math.random()}`
}

// ── Benefit Form Fields (top-level to preserve focus) ─────────────────────

function BenefitFormFields({
  value,
  onChange: onFieldChange,
  services,
}: {
  value: Omit<BenefitForm, "_localId">
  onChange: React.Dispatch<React.SetStateAction<Omit<BenefitForm, "_localId">>>
  services: AdminService[]
}) {
  // "layanan" = pilih dari daftar layanan; "label" = ketik manual (discount only)
  // sourceTab tracks explicit user selection; value-derived state takes priority when value is set
  const [sourceTab, setSourceTab] = useState<"layanan" | "label">(() =>
    value.label ? "label" : "layanan"
  )
  const benefitSource: "layanan" | "label" = value.service_id ? "layanan" : (value.label ? "label" : sourceTab)

  const switchSource = (src: "layanan" | "label") => {
    setSourceTab(src)
    if (src === "layanan") {
      // clear label, keep type as-is
      onFieldChange((p) => ({ ...p, label: "", service_id: "" }))
    } else {
      // clear service, lock type to discount
      onFieldChange((p) => ({ ...p, service_id: "", label: "", type: "discount" as BenefitType, period: "unlimited" as BenefitPeriod }))
    }
  }

  return (
    <>
      {/* 1. Berlaku Untuk */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Berlaku Untuk</Label>
        <Select
          value={value.applies_to}
          onValueChange={(v) => onFieldChange((p) => ({ ...p, applies_to: v as BenefitAppliesTo }))}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="service">Layanan</SelectItem>
            <SelectItem value="addon">Addon</SelectItem>
            <SelectItem value="pickup">Pickup</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 2 & 3. Sumber Benefit — tab toggle between layanan/label */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Sumber Benefit</Label>
        {/* Tab toggle */}
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          <button
            type="button"
            className={`flex-1 px-3 py-1.5 transition-colors ${benefitSource === "layanan" ? "bg-primary text-primary-foreground font-medium" : "bg-background text-muted-foreground hover:text-foreground"}`}
            onClick={() => switchSource("layanan")}
          >
            Pilih Layanan
          </button>
          <button
            type="button"
            className={`flex-1 px-3 py-1.5 transition-colors border-l border-border ${benefitSource === "label" ? "bg-primary text-primary-foreground font-medium" : "bg-background text-muted-foreground hover:text-foreground"}`}
            onClick={() => switchSource("label")}
          >
            Label Manual
          </button>
        </div>

        {/* Layanan tab content */}
        {benefitSource === "layanan" && (
          <div className="flex gap-1.5 mt-0.5">
            <Select
              value={value.service_id ?? ""}
              onValueChange={(v) => {
                const svc = services.find((s) => s._id === v)
                onFieldChange((p) => ({ ...p, service_id: v, label: svc?.name ?? p.label }))
              }}
            >
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue placeholder="Pilih layanan (opsional)..." />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {value.service_id && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => onFieldChange((p) => ({ ...p, service_id: "" }))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}

        {/* Label tab content — type locked to discount */}
        {benefitSource === "label" && (
          <div className="flex flex-col gap-1 mt-0.5">
            <Input
              className="h-8 text-xs"
              placeholder="cth. Grooming gratis"
              value={value.label ?? ""}
              onChange={(e) => onFieldChange((p) => ({ ...p, label: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Tipe otomatis: Diskon (%)</p>
          </div>
        )}
      </div>

      {/* 4. Tipe — hidden for label mode (locked to discount) */}
      {benefitSource === "layanan" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Tipe</Label>
          <Select
            value={value.type}
            onValueChange={(v) => {
              const t = v as BenefitType
              onFieldChange((p) => ({ ...p, type: t, ...(t === "discount" ? { period: "unlimited" } : {}) }))
            }}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quota">Kuota Sesi</SelectItem>
              <SelectItem value="discount">Diskon (%)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 5. Periode — hidden for discount (locked to unlimited) */}
      {value.type === "quota" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Periode Reset</Label>
          <Select
            value={value.period ?? "monthly"}
            onValueChange={(v) => onFieldChange((p) => ({ ...p, period: v as BenefitPeriod }))}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Bulanan</SelectItem>
              <SelectItem value="weekly">Mingguan</SelectItem>
              <SelectItem value="unlimited">Tidak terbatas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 6. Value — only for discount */}
      {value.type === "discount" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Nilai Diskon (%)</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={0}
            max={100}
            placeholder="10"
            value={value.value ?? ""}
            onChange={(e) => onFieldChange((p) => ({ ...p, value: e.target.value === "" ? undefined : Number(e.target.value) }))}
          />
        </div>
      )}

      {/* 7. Limit — only for quota with non-unlimited period */}
      {value.type === "quota" && value.period !== "unlimited" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Batas Penggunaan</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={1}
            placeholder="1"
            value={value.limit ?? ""}
            onChange={(e) => onFieldChange((p) => ({ ...p, limit: e.target.value === "" ? undefined : Number(e.target.value) }))}
          />
        </div>
      )}
    </>
  )
}

// ── Benefit Editor Sub-Component ──────────────────────────────────────────

function BenefitEditor({
  benefits,
  onChange,
  services,
}: {
  benefits: BenefitForm[]
  onChange: (benefits: BenefitForm[]) => void
  services: AdminService[]
}) {
  const [newBenefit, setNewBenefit] = useState<Omit<BenefitForm, "_localId">>({ ...DEFAULT_BENEFIT_FORM })
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null)
  const [editBenefit, setEditBenefit] = useState<Omit<BenefitForm, "_localId">>({ ...DEFAULT_BENEFIT_FORM })

  const addBenefit = () => {
    onChange([...benefits, { ...newBenefit, _localId: newLocalId() }])
    setNewBenefit({ ...DEFAULT_BENEFIT_FORM })
    setShowAddForm(false)
  }

  const removeBenefit = (localId: string) => {
    onChange(benefits.filter((b) => b._localId !== localId))
    if (editingLocalId === localId) setEditingLocalId(null)
  }

  const startEdit = (b: BenefitForm) => {
    const { _localId: _, ...rest } = b
    setEditBenefit(rest)
    setEditingLocalId(b._localId)
  }

  const saveEdit = () => {
    if (!editingLocalId) return
    onChange(benefits.map((b) => b._localId === editingLocalId ? { ...editBenefit, _localId: editingLocalId } : b))
    setEditingLocalId(null)
  }

  const cancelEdit = () => setEditingLocalId(null)

  return (
    <div className="flex flex-col gap-3">
      {/* Existing benefits list */}
      {benefits.length > 0 && (
        <div className="flex flex-col gap-2">
          {benefits.map((b) => (
            <div key={b._localId} className="rounded-md border border-border/50 bg-muted/30 text-sm">
              {editingLocalId === b._localId ? (
                /* Inline edit form */
                <div className="flex flex-col gap-3 p-3">
                  <BenefitFormFields value={editBenefit} onChange={setEditBenefit} services={services} />
                  <div className="flex gap-2">
                    <Button type="button" size="sm" className="h-7 text-xs flex-1" onClick={saveEdit}>
                      <Check className="h-3.5 w-3.5 mr-1" />
                      Simpan
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={cancelEdit}>
                      Batal
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      {BENEFIT_TYPE_LABEL[b.type]}
                      {b.type === "discount" && b.value !== undefined && ` — ${b.value}%`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {APPLIES_TO_LABEL[b.applies_to]} · {PERIOD_LABEL[b.period ?? "unlimited"]}
                      {b.limit != null && ` · Maks ${b.limit}x`}
                      {b.limit == null && " · Tidak terbatas"}
                    </span>
                    {b.service_id ? (
                      <span className="text-xs text-muted-foreground">
                        Layanan: {services.find((s) => s._id === b.service_id)?.name ?? b.service_id}
                      </span>
                    ) : b.label ? (
                      <span className="text-xs text-muted-foreground">Label: {b.label}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => startEdit(b)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={() => removeBenefit(b._localId)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add new benefit */}
      {showAddForm ? (
        <Card className="border-dashed border-border/50">
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm font-medium">Tambah Benefit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-3 pb-3">
            <BenefitFormFields value={newBenefit} onChange={setNewBenefit} services={services} />
            <div className="flex gap-2">
              <Button type="button" size="sm" className="h-7 text-xs flex-1" onClick={addBenefit}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Simpan
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => { setShowAddForm(false); setNewBenefit({ ...DEFAULT_BENEFIT_FORM }) }}
              >
                Batal
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full text-xs border-dashed"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Tambah Benefit
        </Button>
      )}
    </div>
  )
}

// ── Membership Detail Sheet ───────────────────────────────────────────────

function MembershipDetailSheet({
  open,
  onOpenChange,
  membership,
  petTypes,
  services,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  membership: MembershipPlan | null
  petTypes: ApiOption[]
  services: AdminService[]
}) {
  if (!membership) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {membership.name}
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 mt-4">
          {/* Status + basic info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={membership.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}>
              {membership.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
            {(membership.pet_types?.length
              ? membership.pet_types
              : petTypes.filter((pt) => (membership.pet_type_ids ?? []).includes(pt._id))
            ).map((pt) => (
                <Badge key={pt._id} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {pt.name}
                </Badge>
              ))}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Harga</span>
              <span className="font-medium">{formatRupiah(membership.price)}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">Durasi</span>
              <span className="font-medium flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {membership.duration_months} bulan
              </span>
            </div>
          </div>

          {membership.description && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">Deskripsi</span>
              <p className="text-sm text-foreground">{membership.description}</p>
            </div>
          )}

          {membership.note && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">Catatan</span>
              <p className="text-sm text-foreground">{membership.note}</p>
            </div>
          )}

          <Separator />

          {/* Benefits */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Benefits ({membership.benefits.length})</span>
            {membership.benefits.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada benefit</p>
            ) : (
              <div className="flex flex-col gap-2">
                {membership.benefits.map((b) => {
                  const serviceName = b.service
                    ? (services.find((s) => s._id === b.service!._id)?.name ?? b.service.name ?? b.service._id)
                    : null
                  const title = serviceName ?? b.label ?? BENEFIT_TYPE_LABEL[b.type]
                  const appliesToColor: Record<BenefitAppliesTo, string> = {
                    service: "bg-blue-50 text-blue-700 border-blue-200",
                    addon: "bg-violet-50 text-violet-700 border-violet-200",
                    pickup: "bg-amber-50 text-amber-700 border-amber-200",
                  }
                  return (
                    <div key={b._id} className="rounded-md border border-border/50 bg-muted/20 p-3 text-sm flex flex-col gap-2">
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-foreground leading-tight">{title}</span>
                        <Badge variant="outline" className={`text-xs shrink-0 ${appliesToColor[b.applies_to]}`}>
                          {APPLIES_TO_LABEL[b.applies_to]}
                        </Badge>
                      </div>
                      {/* Detail grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Tipe</span>
                          <span className="font-medium text-foreground">
                            {BENEFIT_TYPE_LABEL[b.type]}
                            {b.type === "discount" && b.value != null && ` — ${b.value}%`}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Periode</span>
                          <span className="font-medium text-foreground">{PERIOD_LABEL[b.period]}</span>
                        </div>
                        {b.type === "quota" && (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-muted-foreground">Batas</span>
                            <span className="font-medium text-foreground">
                              {b.limit != null ? `${b.limit}x` : "Tidak terbatas"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ── Membership Form Dialog ─────────────────────────────────────────────────

function MembershipFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  petTypes,
  services,
  onSubmit,
  isLoading,
  mode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: MembershipForm
  setForm: React.Dispatch<React.SetStateAction<MembershipForm>>
  petTypes: ApiOption[]
  services: AdminService[]
  onSubmit: (e: React.FormEvent) => void
  isLoading: boolean
  mode: "create" | "edit"
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create" ? "Tambah Paket Membership" : "Edit Paket Membership"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="mem-name">Nama Paket <span className="text-destructive">*</span></Label>
            <Input
              id="mem-name"
              placeholder="Gold Membership"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="mem-desc">Deskripsi</Label>
            <Textarea
              id="mem-desc"
              placeholder="Deskripsi paket..."
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Duration */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mem-duration">Durasi (bulan) <span className="text-destructive">*</span></Label>
              <Input
                id="mem-duration"
                type="number"
                min={1}
                required
                placeholder="12"
                value={form.duration_months}
                onChange={(e) => setForm((p) => ({ ...p, duration_months: e.target.value }))}
              />
            </div>
            {/* Price */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mem-price">Harga (Rp) <span className="text-destructive">*</span></Label>
              <Input
                id="mem-price"
                type="text"
                inputMode="numeric"
                required
                placeholder="1.200.000"
                value={form.price ? Number(form.price).toLocaleString("id-ID") : ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\./g, "").replace(/\D/g, "")
                  setForm((p) => ({ ...p, price: raw }))
                }}
              />
            </div>
          </div>

          {/* Note */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="mem-note">Catatan</Label>
            <Textarea
              id="mem-note"
              placeholder="Catatan tambahan..."
              rows={2}
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
            />
          </div>

          {/* Pet Types */}
          <div className="flex flex-col gap-2">
            <Label>Jenis Hewan <span className="text-destructive">*</span></Label>
            <div className="flex flex-wrap gap-3">
              {petTypes.map((pt) => (
                <label key={pt._id} className="flex items-center gap-2 cursor-pointer text-sm">
                  <Checkbox
                    checked={(form.pet_type_ids ?? []).includes(pt._id)}
                    onCheckedChange={(checked) => {
                      setForm((p) => ({
                        ...p,
                        pet_type_ids: checked
                          ? [...p.pet_type_ids, pt._id]
                          : p.pet_type_ids.filter((id) => id !== pt._id),
                      }))
                    }}
                  />
                  {pt.name}
                </label>
              ))}
            </div>
          </div>

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <Switch
              id="mem-active"
              checked={form.is_active}
              onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
            />
            <Label htmlFor="mem-active">Aktif</Label>
          </div>

          <Separator />

          {/* Benefits */}
          <div className="flex flex-col gap-2">
            <Label className="font-medium">Benefits</Label>
            <BenefitEditor
              benefits={form.benefits}
              onChange={(benefits) => setForm((p) => ({ ...p, benefits }))}
              services={services}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Memberships Tab ────────────────────────────────────────────────────────

function MembershipsTab() {
  const [memberships, setMemberships] = useState<MembershipPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")
  const [petTypes, setPetTypes] = useState<ApiOption[]>([])
  const [services, setServices] = useState<AdminService[]>([])

  const [form, setForm] = useState<MembershipForm>(DEFAULT_MEMBERSHIP_FORM)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<MembershipPlan | null>(null)
  const [viewTarget, setViewTarget] = useState<MembershipPlan | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const loadMemberships = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getMemberships()
      setMemberships(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat data membership")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMemberships()
    getOptions("pet type").then((res) => setPetTypes(res.options)).catch(() => {})
    getAdminServices({ limit: 200 }).then((res) => setServices(res.services)).catch(() => {})
  }, [loadMemberships])

  const filtered = memberships.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase())
    const matchActive =
      filterActive === "all" ||
      (filterActive === "active" && m.is_active) ||
      (filterActive === "inactive" && !m.is_active)
    return matchSearch && matchActive
  })

  const openCreate = () => {
    setForm(DEFAULT_MEMBERSHIP_FORM)
    setDialogMode("create")
    setEditingId(null)
    setDialogOpen(true)
  }

  const openDetail = (m: MembershipPlan) => {
    setViewTarget(m)
    setDetailOpen(true)
  }

  const openEdit = async (m: MembershipPlan) => {
    try {
      const res = await getMembershipById(m._id)
      setForm(membershipToForm(res.data))
    } catch {
      setForm(membershipToForm(m))
    }
    setDialogMode("edit")
    setEditingId(m._id)
    setDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.pet_type_ids.length === 0) {
      toast.error("Pilih minimal satu jenis hewan")
      return
    }
    setIsSaving(true)
    try {
      const payload = formToPayload(form)
      if (dialogMode === "create") {
        await createMembership(payload)
        toast.success("Paket membership berhasil ditambahkan")
      } else if (editingId) {
        await updateMembership(editingId, payload)
        toast.success("Paket membership berhasil diperbarui")
      }
      setDialogOpen(false)
      loadMemberships()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMembership(deleteTarget._id)
      toast.success("Paket membership berhasil dihapus")
      setDeleteTarget(null)
      loadMemberships()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari paket membership..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterActive} onValueChange={(v) => setFilterActive(v as typeof filterActive)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Tambah Paket
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Benefits</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  {search || filterActive !== "all" ? "Tidak ada hasil yang sesuai" : "Belum ada paket membership"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => (
                <TableRow
                  key={m._id}
                  className="cursor-pointer"
                  onClick={() => openDetail(m)}
                >
                  <TableCell>
                    <div className="font-medium text-foreground">{m.name}</div>
                    {m.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{m.description}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{m.duration_months} bulan</TableCell>
                  <TableCell className="text-sm">{formatRupiah(m.price)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{m.benefits.length} benefit</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={m.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}
                    >
                      {m.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openDetail(m)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Lihat Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Hapus
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Form Dialog */}
      <MembershipFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        setForm={setForm}
        petTypes={petTypes}
        services={services}
        onSubmit={handleSubmit}
        isLoading={isSaving}
        mode={dialogMode}
      />

      {/* Detail Sheet */}
      <MembershipDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        membership={viewTarget}
        petTypes={petTypes}
        services={services}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Paket Membership</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus paket <strong>{deleteTarget?.name}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Pet Memberships Tab ────────────────────────────────────────────────────

interface PurchaseForm {
  pet_id: string
  membership_plan_id: string
}

const DEFAULT_PURCHASE_FORM: PurchaseForm = {
  pet_id: "",
  membership_plan_id: "",
}

function PetMembershipsTab() {
  const [petMemberships, setPetMemberships] = useState<PetMembership[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all")
  const [memberships, setMemberships] = useState<MembershipPlan[]>([])

  const [purchaseOpen, setPurchaseOpen] = useState(false)
  const [purchaseForm, setPurchaseForm] = useState<PurchaseForm>(DEFAULT_PURCHASE_FORM)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<PetMembership | null>(null)

  const loadPetMemberships = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = filterActive !== "all" ? { is_active: filterActive === "active" } : {}
      const res = await getPetMemberships(params)
      setPetMemberships(res.data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memuat pet memberships")
    } finally {
      setIsLoading(false)
    }
  }, [filterActive])

  useEffect(() => {
    loadPetMemberships()
  }, [loadPetMemberships])

  useEffect(() => {
    getMemberships({ is_active: true }).then((res) => setMemberships(res.data)).catch(() => {})
  }, [])

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!purchaseForm.pet_id || !purchaseForm.membership_plan_id) {
      toast.error("Isi semua field yang diperlukan")
      return
    }
    setIsPurchasing(true)
    try {
      await purchasePetMembership(purchaseForm as PurchasePetMembershipPayload)
      toast.success("Membership berhasil dibeli")
      setPurchaseOpen(false)
      setPurchaseForm(DEFAULT_PURCHASE_FORM)
      loadPetMemberships()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membeli membership")
    } finally {
      setIsPurchasing(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelTarget) return
    try {
      await cancelPetMembership(cancelTarget._id)
      toast.success("Membership berhasil dibatalkan")
      setCancelTarget(null)
      loadPetMemberships()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membatalkan membership")
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filterActive} onValueChange={(v) => setFilterActive(v as typeof filterActive)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="inactive">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setPurchaseForm(DEFAULT_PURCHASE_FORM); setPurchaseOpen(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Beli Membership
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pet</TableHead>
              <TableHead>Paket</TableHead>
              <TableHead>Mulai</TableHead>
              <TableHead>Berakhir</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : petMemberships.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Belum ada pet membership
                </TableCell>
              </TableRow>
            ) : (
              petMemberships.map((pm) => {                
                return (
                  <TableRow key={pm._id}>
                    <TableCell className="text-xs font-mono text-muted-foreground">{`${pm.pet.name} (${pm.pet.pet_type.name}) - ${pm.pet.owner.username}`}</TableCell>
                    <TableCell className="text-sm">{pm.membership.name}</TableCell>
                    <TableCell className="text-sm">{formatDate(pm.start_date)}</TableCell>
                    <TableCell className="text-sm">{formatDate(pm.end_date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={pm.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}
                      >
                        {pm.is_active ? "Aktif" : "Tidak aktif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pm.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => setCancelTarget(pm)}
                        >
                          <Ban className="h-3.5 w-3.5 mr-1" />
                          Batalkan
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Beli Membership untuk Pet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePurchase} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="purchase-pet-id">Pet ID <span className="text-destructive">*</span></Label>
              <Input
                id="purchase-pet-id"
                placeholder="MongoDB ObjectId"
                required
                value={purchaseForm.pet_id}
                onChange={(e) => setPurchaseForm((p) => ({ ...p, pet_id: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="purchase-plan">Paket Membership <span className="text-destructive">*</span></Label>
              <Select
                value={purchaseForm.membership_plan_id}
                onValueChange={(v) => setPurchaseForm((p) => ({ ...p, membership_plan_id: v }))}
                required
              >
                <SelectTrigger id="purchase-plan">
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  {memberships.map((m) => (
                    <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPurchaseOpen(false)}>Batal</Button>
              <Button type="submit" disabled={isPurchasing}>
                {isPurchasing ? "Memproses..." : "Beli"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Pet Membership</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin membatalkan membership ini? Semua benefit tidak akan lagi bisa digunakan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleCancel}>
              Batalkan Membership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MembershipsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <CreditCard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Memberships</h1>
          <p className="text-sm text-muted-foreground">Kelola paket membership dan langganan pet</p>
        </div>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Paket Membership</TabsTrigger>
          <TabsTrigger value="pet-memberships">Pet Memberships</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="mt-4">
          <MembershipsTab />
        </TabsContent>
        <TabsContent value="pet-memberships" className="mt-4">
          <PetMembershipsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
