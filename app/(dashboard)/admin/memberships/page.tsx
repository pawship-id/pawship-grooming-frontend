"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Search,
  X,
  CreditCard,
  Eye,
  Tag,
  CalendarDays,
  Check,
  Trash,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Combobox } from "@/components/ui/combobox";
import { toast } from "sonner";

import {
  type MembershipPlan,
  type MembershipPayload,
  type BenefitPayload,
  type BenefitType,
  type BenefitAppliesTo,
  type BenefitPeriod,
  type BenefitDiscountType,
  type BenefitVariantMode,
  type BenefitVariantDiscount,
  getMemberships,
  getMembershipById,
  createMembership,
  updateMembership,
  deleteMembership,
  getPetMembershipsExport,
} from "@/lib/api/memberships";
import { exportMembershipPurchasesToExcel } from "@/lib/export-membership";
import { getOptions, type ApiOption } from "@/lib/api/options";
import {
  getAdminServices,
  getAdminServiceById,
  type AdminService,
  type AdminServicePrice,
} from "@/lib/api/services";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Benefit form ───────────────────────────────────────────────────────────

interface BenefitForm extends BenefitPayload {
  _localId: string;
  label: string;
  discount_type?: BenefitDiscountType;
  variant_mode?: BenefitVariantMode;
  variant_discounts?: BenefitVariantDiscount[];
}

const DEFAULT_BENEFIT_FORM: Omit<BenefitForm, "_localId"> = {
  type: "quota",
  applies_to: "service",
  period: "monthly",
  label: "",
  value: undefined,
  service_id: "",
  limit: undefined,
  discount_type: "percentage",
  variant_mode: "all",
  variant_discounts: [],
};

const BENEFIT_TYPE_LABEL: Record<BenefitType, string> = {
  discount: "Diskon",
  quota: "Kuota Sesi",
};

function formatBenefitDiscount(b: Omit<BenefitForm, "_localId">): string {
  if (b.type !== "discount") return "";
  if (b.variant_mode === "per_variant") {
    return ` — Per varian (${b.variant_discounts?.length ?? 0} varian)`;
  }
  if (b.discount_type === "fixed") {
    return ` — Rp${(b.value ?? 0).toLocaleString("id-ID")} off`;
  }
  return b.value !== undefined ? ` — ${b.value}%` : "";
}

const PERIOD_LABEL: Record<BenefitPeriod, string> = {
  weekly: "Mingguan",
  monthly: "Bulanan",
  unlimited: "Tidak terbatas",
  once: "Hanya Sekali",
};

const APPLIES_TO_LABEL: Record<BenefitAppliesTo, string> = {
  service: "Layanan",
  addon: "Addon",
  pickup: "Pickup",
};

// ── Membership Plan form ───────────────────────────────────────────────────

interface MembershipForm {
  name: string;
  description: string;
  duration_months: string;
  price: string;
  note: string;
  pet_type_ids: string[];
  is_active: boolean;
  benefits: BenefitForm[];
  code: string;
  // public display fields
  show_on_website: boolean;
  display_order: string;
  badge_label: string;
  badge_variant: "best" | "premium" | "";
  featured: boolean;
  original_price: string;
  display_benefits: string[];
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
  code: "",
  show_on_website: false,
  display_order: "0",
  badge_label: "",
  badge_variant: "",
  featured: false,
  original_price: "",
  display_benefits: [],
};

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
      discount_type: b.discount_type ?? "percentage",
      variant_mode: b.variant_mode ?? "all",
      variant_discounts: b.variant_discounts ?? [],
    })),
    code: m.code ?? "",
    show_on_website: m.show_on_website ?? false,
    display_order: String(m.display_order ?? 0),
    badge_label: m.badge_label ?? "",
    badge_variant: (m.badge_variant as "best" | "premium") ?? "",
    featured: m.featured ?? false,
    original_price: m.original_price != null ? String(m.original_price) : "",
    display_benefits: m.display_benefits ?? [],
  };
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
      value:
        b.type === "discount" && b.variant_mode !== "per_variant" && b.value !== undefined
          ? Number(b.value)
          : undefined,
      service_id: b.service_id || undefined,
      limit: b.limit !== undefined ? Number(b.limit) : null,
      discount_type: b.discount_type,
      variant_mode: b.variant_mode,
      variant_discounts:
        b.type === "discount" && b.variant_mode === "per_variant"
          ? b.variant_discounts
          : undefined,
    })),
    show_on_website: form.show_on_website,
    display_order: Number(form.display_order) || 0,
    badge_label: form.badge_label || undefined,
    badge_variant: (form.badge_variant as "best" | "premium") || null,
    featured: form.featured,
    original_price: form.original_price ? Number(form.original_price) : null,
    display_benefits: form.display_benefits,
  };
}

function newLocalId() {
  return `_new_${Date.now()}_${Math.random()}`;
}

// ── Display Benefits Editor ────────────────────────────────────────────────

function DisplayBenefitsEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  const update = (i: number, text: string) => {
    onChange(value.map((v, idx) => (idx === i ? text : v)));
  };

  return (
    <div className="flex flex-col gap-2">
      {value.map((v, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <Input
            className="h-8 text-xs flex-1"
            value={v}
            onChange={(e) => update(i, e.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
            onClick={() => remove(i)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <Input
          className="h-8 text-xs flex-1"
          placeholder="Tambah benefit teks marketing..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={add}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Benefit Form Fields (top-level to preserve focus) ─────────────────────

function VariantDiscountTable({
  serviceId,
  discountType,
  variantDiscounts,
  onChange,
}: {
  serviceId?: string;
  discountType: BenefitDiscountType;
  variantDiscounts: BenefitVariantDiscount[];
  onChange: (vd: BenefitVariantDiscount[]) => void;
}) {
  const [prices, setPrices] = useState<AdminServicePrice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!serviceId) {
      setPrices([]);
      return;
    }
    setLoading(true);
    getAdminServiceById(serviceId)
      .then((res) => {
        const svc = res.service;
        if (svc?.price_type === "multiple" && svc.prices?.length) {
          setPrices(svc.prices);
          // Init missing rows with value 0
          onChange(
            svc.prices.map((p: AdminServicePrice) => {
              const existing = variantDiscounts.find(
                (vd) =>
                  (vd.pet_type_id ?? "") === (p.pet_type_id ?? "") &&
                  (vd.size_id ?? "") === (p.size_id ?? "") &&
                  (vd.hair_id ?? "") === (p.hair_id ?? ""),
              );
              return {
                pet_type_id: p.pet_type_id,
                size_id: p.size_id,
                hair_id: p.hair_id,
                value: existing?.value ?? 0,
              };
            }),
          );
        } else {
          setPrices([]);
        }
      })
      .catch(() => setPrices([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId]);

  if (!serviceId) {
    return (
      <p className="text-xs text-muted-foreground">
        Pilih layanan terlebih dahulu untuk mengatur diskon per varian.
      </p>
    );
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground">Memuat varian...</p>;
  }

  if (prices.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Layanan ini tidak memiliki harga per varian.
      </p>
    );
  }

  const updateRow = (
    idx: number,
    rawVal: string,
  ) => {
    const num = rawVal === "" ? 0 : Number(rawVal);
    const updated = variantDiscounts.map((vd, i) =>
      i === idx ? { ...vd, value: num } : vd,
    );
    onChange(updated);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">
        Diskon Per Varian {discountType === "fixed" ? "(Rp)" : "(%)"}
      </Label>
      <div className="border rounded-md overflow-hidden text-xs">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="text-left px-2 py-1.5 font-medium text-muted-foreground">Varian</th>
              <th className="text-right px-2 py-1.5 font-medium text-muted-foreground w-24">
                {discountType === "fixed" ? "Rp" : "%"}
              </th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p, idx) => {
              const label = [p.pet_name, p.size_name, p.hair_name]
                .filter(Boolean)
                .join(" · ");
              const currentVal = variantDiscounts[idx]?.value ?? 0;
              return (
                <tr key={idx} className="border-t">
                  <td className="px-2 py-1.5 text-foreground">{label}</td>
                  <td className="px-2 py-1 text-right">
                    <input
                      type="number"
                      min={0}
                      max={discountType === "percentage" ? 100 : undefined}
                      className="w-20 text-right border rounded px-1.5 py-0.5 text-xs h-7 bg-background"
                      value={currentVal === 0 ? "" : currentVal}
                      placeholder="0"
                      onChange={(e) => updateRow(idx, e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BenefitFormFields({
  value,
  onChange: onFieldChange,
  services,
  sourceTab,
  onSourceTabChange,
}: {
  value: Omit<BenefitForm, "_localId">;
  onChange: React.Dispatch<React.SetStateAction<Omit<BenefitForm, "_localId">>>;
  services: AdminService[];
  sourceTab: "layanan" | "label";
  onSourceTabChange: (src: "layanan" | "label") => void;
}) {
  // value-derived source takes priority when a value is already set
  const benefitSource: "layanan" | "label" = value.service_id
    ? "layanan"
    : value.label
      ? "label"
      : sourceTab;

  const switchSource = (src: "layanan" | "label") => {
    onSourceTabChange(src);
    if (src === "layanan") {
      onFieldChange((p) => ({ ...p, label: "", service_id: "" }));
    } else {
      onFieldChange((p) => ({ ...p, service_id: "", label: "" }));
    }
  };

  return (
    <>
      {/* 1. Berlaku Untuk */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Berlaku Untuk</Label>
        <Select
          value={value.applies_to}
          onValueChange={(v) =>
            onFieldChange((p) => ({ ...p, applies_to: v as BenefitAppliesTo }))
          }
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

        {/* Layanan tab — service dropdown (optional) */}
        {benefitSource === "layanan" && (
          <div className="flex gap-1.5 mt-0.5">
            <Combobox
              options={services.map((s) => ({ value: s._id, label: s.name }))}
              value={value.service_id ?? ""}
              onValueChange={(v) => {
                const svc = services.find((s) => s._id === v);
                onFieldChange((p) => ({
                  ...p,
                  service_id: v,
                  label: svc?.name ?? p.label,
                }));
              }}
              placeholder="Pilih layanan..."
              searchPlaceholder="Cari layanan..."
              emptyText="Layanan tidak ditemukan."
              className="flex-1 h-8 text-xs"
            />
            {/* {value.service_id && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={() => onFieldChange((p) => ({ ...p, service_id: "" }))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )} */}
          </div>
        )}

        {/* Label tab — free text input */}
        {benefitSource === "label" && (
          <Input
            className="h-8 text-xs mt-0.5"
            placeholder="cth. Grooming gratis"
            value={value.label ?? ""}
            onChange={(e) =>
              onFieldChange((p) => ({ ...p, label: e.target.value }))
            }
          />
        )}
      </div>

      {/* 4. Tipe — always shown */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Tipe</Label>
        <Select
          value={value.type}
          onValueChange={(v) => {
            const t = v as BenefitType;
            onFieldChange((p) => ({ ...p, type: t }));
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="quota">Kuota Sesi</SelectItem>
            <SelectItem value="discount">Diskon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Discount-specific fields */}
      {value.type === "discount" && (
        <>
          {/* Tipe Diskon */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Tipe Diskon</Label>
            <Select
              value={value.discount_type ?? "percentage"}
              onValueChange={(v) =>
                onFieldChange((p) => ({
                  ...p,
                  discount_type: v as BenefitDiscountType,
                }))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Persentase (%)</SelectItem>
                <SelectItem value="fixed">Fixed (Rp)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Cakupan Varian */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Cakupan Varian</Label>
            <Select
              value={value.variant_mode ?? "all"}
              onValueChange={(v) =>
                onFieldChange((p) => ({
                  ...p,
                  variant_mode: v as BenefitVariantMode,
                  variant_discounts: v === "all" ? [] : p.variant_discounts,
                }))
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Varian</SelectItem>
                <SelectItem value="per_variant">Per Varian</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nilai Diskon — shown when variant_mode = all */}
          {(value.variant_mode ?? "all") === "all" && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">
                Nilai Diskon{" "}
                {value.discount_type === "fixed" ? "(Rp)" : "(%)"}
              </Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={0}
                max={value.discount_type === "fixed" ? undefined : 100}
                placeholder={value.discount_type === "fixed" ? "50000" : "10"}
                value={value.value ?? ""}
                onChange={(e) =>
                  onFieldChange((p) => ({
                    ...p,
                    value:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  }))
                }
              />
            </div>
          )}

          {/* Variant Discount Table — shown when variant_mode = per_variant */}
          {value.variant_mode === "per_variant" && (
            <VariantDiscountTable
              serviceId={value.service_id}
              discountType={value.discount_type ?? "percentage"}
              variantDiscounts={value.variant_discounts ?? []}
              onChange={(vd) =>
                onFieldChange((p) => ({ ...p, variant_discounts: vd }))
              }
            />
          )}
        </>
      )}

      {/* 5. Periode */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs">Periode Reset</Label>
        <Select
          value={value.period ?? "monthly"}
          onValueChange={(v) =>
            onFieldChange((p) => ({
              ...p,
              period: v as BenefitPeriod,
              limit: v === "once" ? 1 : v === "unlimited" ? undefined : p.limit,
            }))
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="monthly">Bulanan</SelectItem>
            <SelectItem value="weekly">Mingguan</SelectItem>
            <SelectItem value="unlimited">Tidak terbatas</SelectItem>
            <SelectItem value="once">Hanya Sekali</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 7. Batas Penggunaan — for non-unlimited, non-once period */}
      {value.period !== "unlimited" && value.period !== "once" && (
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Batas Penggunaan</Label>
          <Input
            className="h-8 text-xs"
            type="number"
            min={1}
            placeholder="1"
            value={value.limit ?? ""}
            onChange={(e) =>
              onFieldChange((p) => ({
                ...p,
                limit:
                  e.target.value === "" ? undefined : Number(e.target.value),
              }))
            }
          />
        </div>
      )}
    </>
  );
}

// ── Benefit validation ─────────────────────────────────────────────────────

function validateBenefit(
  b: Omit<BenefitForm, "_localId">,
  sourceTab: "layanan" | "label",
): string | null {
  const effectiveSource: "layanan" | "label" = b.service_id
    ? "layanan"
    : b.label
      ? "label"
      : sourceTab;
  if (effectiveSource === "layanan" && !b.service_id)
    return "Layanan harus dipilih";
  if (effectiveSource === "label" && !b.label)
    return "Label benefit harus diisi";
  if (b.type === "discount") {
    if (b.variant_mode === "per_variant") {
      if (!b.variant_discounts || b.variant_discounts.length === 0)
        return "Minimal 1 varian diskon harus diisi";
    } else {
      if (b.value === undefined || b.value === null)
        return "Nilai diskon harus diisi";
    }
  }
  if (b.period !== "unlimited" && b.period !== "once" && (b.limit === undefined || b.limit === null))
    return "Batas penggunaan harus diisi";
  return null;
}

// ── Benefit Editor Sub-Component ──────────────────────────────────────────

function BenefitEditor({
  benefits,
  onChange,
  services,
  onPendingChange,
}: {
  benefits: BenefitForm[];
  onChange: (benefits: BenefitForm[]) => void;
  services: AdminService[];
  onPendingChange?: (hasPending: boolean) => void;
}) {
  const [newBenefit, setNewBenefit] = useState<Omit<BenefitForm, "_localId">>({
    ...DEFAULT_BENEFIT_FORM,
  });
  const [newSourceTab, setNewSourceTab] = useState<"layanan" | "label">(
    "layanan",
  );
  const [newError, setNewError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocalId, setEditingLocalId] = useState<string | null>(null);

  useEffect(() => {
    onPendingChange?.(showAddForm || editingLocalId !== null);
  }, [showAddForm, editingLocalId, onPendingChange]);
  const [editBenefit, setEditBenefit] = useState<Omit<BenefitForm, "_localId">>(
    { ...DEFAULT_BENEFIT_FORM },
  );
  const [editSourceTab, setEditSourceTab] = useState<"layanan" | "label">(
    "layanan",
  );
  const [editError, setEditError] = useState<string | null>(null);

  const addBenefit = () => {
    const err = validateBenefit(newBenefit, newSourceTab);
    if (err) {
      setNewError(err);
      return;
    }
    onChange([...benefits, { ...newBenefit, _localId: newLocalId() }]);
    setNewBenefit({ ...DEFAULT_BENEFIT_FORM });
    setNewSourceTab("layanan");
    setNewError(null);
    setShowAddForm(false);
  };

  const removeBenefit = (localId: string) => {
    onChange(benefits.filter((b) => b._localId !== localId));
    if (editingLocalId === localId) setEditingLocalId(null);
  };

  const startEdit = (b: BenefitForm) => {
    const { _localId: _, ...rest } = b;
    setEditBenefit(rest);
    setEditSourceTab(b.label && !b.service_id ? "label" : "layanan");
    setEditError(null);
    setEditingLocalId(b._localId);
  };

  const saveEdit = () => {
    if (!editingLocalId) return;
    const err = validateBenefit(editBenefit, editSourceTab);
    if (err) {
      setEditError(err);
      return;
    }
    onChange(
      benefits.map((b) =>
        b._localId === editingLocalId
          ? { ...editBenefit, _localId: editingLocalId }
          : b,
      ),
    );
    setEditingLocalId(null);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingLocalId(null);
    setEditError(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Existing benefits list */}
      {benefits.length > 0 && (
        <div className="flex flex-col gap-2">
          {benefits.map((b) => (
            <div
              key={b._localId}
              className="rounded-md border border-border/50 bg-muted/30 text-sm"
            >
              {editingLocalId === b._localId ? (
                /* Inline edit form */
                <div className="flex flex-col gap-3 p-3">
                  <BenefitFormFields
                    value={editBenefit}
                    onChange={(v) => {
                      setEditBenefit(v);
                      setEditError(null);
                    }}
                    services={services}
                    sourceTab={editSourceTab}
                    onSourceTabChange={setEditSourceTab}
                  />
                  {editError && (
                    <p className="text-xs text-destructive">{editError}</p>
                  )}
                  <div className="flex items-center w-full justify-end gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={saveEdit}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
                      onClick={cancelEdit}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display row */
                <div className="flex items-start justify-between gap-2 p-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">
                      {b.service_id ? (
                        <span>
                          {services.find((s) => s._id === b.service_id)?.name ??
                            b.service_id}
                        </span>
                      ) : b.label ? (
                        <span>{b.label}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {BENEFIT_TYPE_LABEL[b.type]}
                      {formatBenefitDiscount(b)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {APPLIES_TO_LABEL[b.applies_to]} ·{" "}
                      {PERIOD_LABEL[b.period ?? "unlimited"]}
                      {b.limit != null && ` · Maks ${b.limit}x`}
                      {b.limit == null &&
                        b.period === "unlimited" &&
                        " · Tidak terbatas"}
                    </span>
                    {b.service_id ? (
                      <span className="text-xs text-muted-foreground">
                        Layanan:{" "}
                        {services.find((s) => s._id === b.service_id)?.name ??
                          b.service_id}
                      </span>
                    ) : b.label ? (
                      <span className="text-xs text-muted-foreground">
                        Label: {b.label}
                      </span>
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
                      <Trash className="h-3.5 w-3.5" />
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
            <CardTitle className="text-sm font-medium">
              Tambah Benefit
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-3 pb-3">
            <BenefitFormFields
              value={newBenefit}
              onChange={(v) => {
                setNewBenefit(v);
                setNewError(null);
              }}
              services={services}
              sourceTab={newSourceTab}
              onSourceTabChange={setNewSourceTab}
            />
            {newError && <p className="text-xs text-destructive">{newError}</p>}
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={addBenefit}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Simpan
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setShowAddForm(false);
                  setNewBenefit({ ...DEFAULT_BENEFIT_FORM });
                  setNewSourceTab("layanan");
                  setNewError(null);
                }}
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
  );
}

// ── Membership Detail Sheet ───────────────────────────────────────────────

function MembershipDetailSheet({
  open,
  onOpenChange,
  membership,
  petTypes,
  services,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membership: MembershipPlan | null;
  petTypes: ApiOption[];
  services: AdminService[];
}) {
  if (!membership) return null;
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
          {/* Membership Code */}
          {membership.code && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium tracking-wide">
                Kode Membership
              </span>
              <span className="font-mono text-sm font-semibold">
                {membership.code}
              </span>
            </div>
          )}

          {/* Status + basic info */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className={
                membership.is_active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }
            >
              {membership.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
            {(membership.pet_types?.length
              ? membership.pet_types
              : petTypes.filter((pt) =>
                  (membership.pet_type_ids ?? []).includes(pt._id),
                )
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
              <span className="font-medium">
                {formatRupiah(membership.price)}
              </span>
              {membership.original_price != null &&
                membership.original_price > membership.price && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatRupiah(membership.original_price)}
                  </span>
                )}
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
              <span className="text-xs text-muted-foreground font-medium">
                Deskripsi
              </span>
              <p className="text-sm text-foreground">
                {membership.description}
              </p>
            </div>
          )}

          {membership.note && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground font-medium">
                Catatan
              </span>
              <p className="text-sm text-foreground">{membership.note}</p>
            </div>
          )}

          {/* Public display info */}
          <div className="flex flex-col gap-2 rounded-lg border border-border/50 bg-muted/20 p-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Tampilan Publik
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Website</span>
                <p className="font-medium">
                  {membership.show_on_website ? "Tampil" : "Disembunyikan"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Urutan</span>
                <p className="font-medium">{membership.display_order ?? 0}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Featured</span>
                <p className="font-medium">
                  {membership.featured ? "Ya" : "Tidak"}
                </p>
              </div>
              {membership.badge_label && (
                <div>
                  <span className="text-muted-foreground">Badge</span>
                  <p className="font-medium">
                    {membership.badge_label}
                    {membership.badge_variant &&
                      ` (${membership.badge_variant})`}
                  </p>
                </div>
              )}
            </div>
            {membership.display_benefits &&
              membership.display_benefits.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">
                    List Benefit Marketing
                  </span>
                  <ul className="flex flex-col gap-0.5">
                    {membership.display_benefits.map((b, i) => (
                      <li
                        key={i}
                        className="text-xs text-foreground flex items-start gap-1.5"
                      >
                        <span className="text-primary mt-0.5">•</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>

          <Separator />

          {/* Benefits */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">
              Benefits ({membership.benefits.length})
            </span>
            {membership.benefits.length === 0 ? (
              <p className="text-xs text-muted-foreground">Tidak ada benefit</p>
            ) : (
              <div className="flex flex-col gap-2">
                {membership.benefits.map((b) => {
                  const serviceName = b.service
                    ? (services.find((s) => s._id === b.service!._id)?.name ??
                      b.service.name ??
                      b.service._id)
                    : null;
                  const title =
                    serviceName ?? b.label ?? BENEFIT_TYPE_LABEL[b.type];
                  const appliesToColor: Record<BenefitAppliesTo, string> = {
                    service: "bg-blue-50 text-blue-700 border-blue-200",
                    addon: "bg-violet-50 text-violet-700 border-violet-200",
                    pickup: "bg-amber-50 text-amber-700 border-amber-200",
                  };
                  return (
                    <div
                      key={b._id}
                      className="rounded-md border border-border/50 bg-muted/20 p-3 text-sm flex flex-col gap-2"
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-foreground leading-tight">
                          {title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${appliesToColor[b.applies_to]}`}
                        >
                          {APPLIES_TO_LABEL[b.applies_to]}
                        </Badge>
                      </div>
                      {/* Detail grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Tipe</span>
                          <span className="font-medium text-foreground">
                            {BENEFIT_TYPE_LABEL[b.type]}
                            {formatBenefitDiscount(b as Omit<BenefitForm, "_localId">)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Periode</span>
                          <span className="font-medium text-foreground">
                            {PERIOD_LABEL[b.period]}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-muted-foreground">Batas</span>
                          <span className="font-medium text-foreground">
                            {b.limit != null ? `${b.limit}x` : "Tidak terbatas"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
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
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: MembershipForm;
  setForm: React.Dispatch<React.SetStateAction<MembershipForm>>;
  petTypes: ApiOption[];
  services: AdminService[];
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  mode: "create" | "edit";
}) {
  const [hasPendingBenefit, setHasPendingBenefit] = useState(false);

  useEffect(() => {
    if (!open) setHasPendingBenefit(false);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {mode === "create"
              ? "Tambah Paket Membership"
              : "Edit Paket Membership"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {/* Membership Code — readonly in edit mode, hidden in create mode */}
          {mode === "edit" && form.code && (
            <div className="flex flex-col gap-2">
              <Label>Kode Membership</Label>
              <Input
                readOnly
                value={form.code}
                className="bg-muted text-muted-foreground cursor-not-allowed"
              />
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="mem-name">
              Nama Paket <span className="text-destructive">*</span>
            </Label>
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
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Duration */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mem-duration">
                Durasi (bulan) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mem-duration"
                type="number"
                min={1}
                required
                placeholder="12"
                value={form.duration_months}
                onChange={(e) =>
                  setForm((p) => ({ ...p, duration_months: e.target.value }))
                }
              />
            </div>
            {/* Price */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="mem-price">
                Harga (Rp) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="mem-price"
                type="text"
                inputMode="numeric"
                required
                placeholder="1.200.000"
                value={
                  form.price ? Number(form.price).toLocaleString("id-ID") : ""
                }
                onChange={(e) => {
                  const raw = e.target.value
                    .replace(/\./g, "")
                    .replace(/\D/g, "");
                  setForm((p) => ({ ...p, price: raw }));
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
            <Label>
              Jenis Hewan <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-3">
              {petTypes.map((pt) => (
                <label
                  key={pt._id}
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={(form.pet_type_ids ?? []).includes(pt._id)}
                    onCheckedChange={(checked) => {
                      setForm((p) => ({
                        ...p,
                        pet_type_ids: checked
                          ? [...p.pet_type_ids, pt._id]
                          : p.pet_type_ids.filter((id) => id !== pt._id),
                      }));
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

          {/* Public Display */}
          <div className="flex flex-col gap-3">
            <Label className="font-medium">Tampilan Publik</Label>

            <div className="flex items-center gap-3">
              <Switch
                id="mem-show-web"
                checked={form.show_on_website}
                onCheckedChange={(v) =>
                  setForm((p) => ({ ...p, show_on_website: v }))
                }
              />
              <Label htmlFor="mem-show-web" className="text-sm">
                Tampil di halaman /membership
              </Label>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="mem-featured"
                checked={form.featured}
                onCheckedChange={(v) => setForm((p) => ({ ...p, featured: v }))}
              />
              <Label htmlFor="mem-featured" className="text-sm">
                Featured (kartu disorot)
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="mem-order" className="text-xs">
                  Urutan Tampil
                </Label>
                <Input
                  id="mem-order"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, display_order: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="mem-orig-price" className="text-xs">
                  Harga Coret (Rp)
                </Label>
                <Input
                  id="mem-orig-price"
                  type="text"
                  inputMode="numeric"
                  placeholder="1.500.000"
                  value={
                    form.original_price
                      ? Number(form.original_price).toLocaleString("id-ID")
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value
                      .replace(/\./g, "")
                      .replace(/\D/g, "");
                    setForm((p) => ({ ...p, original_price: raw }));
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="mem-badge-label" className="text-xs">
                  Label Badge
                </Label>
                <Input
                  id="mem-badge-label"
                  placeholder="Best Value"
                  maxLength={50}
                  value={form.badge_label}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, badge_label: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Varian Badge</Label>
                <Select
                  value={form.badge_variant || "_none"}
                  onValueChange={(v) =>
                    setForm((p) => ({
                      ...p,
                      badge_variant:
                        v === "_none" ? "" : (v as "best" | "premium"),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih varian..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— Tidak ada —</SelectItem>
                    <SelectItem value="best">Best (⭐)</SelectItem>
                    <SelectItem value="premium">Premium (👑)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Display Benefits */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs">List Benefit (teks marketing)</Label>
              <DisplayBenefitsEditor
                value={form.display_benefits}
                onChange={(v) =>
                  setForm((p) => ({ ...p, display_benefits: v }))
                }
              />
            </div>
          </div>

          <Separator />

          {/* Benefits */}
          <div className="flex flex-col gap-2">
            <Label className="font-medium">Benefits (Teknis)</Label>
            <BenefitEditor
              benefits={form.benefits}
              onChange={(benefits) => setForm((p) => ({ ...p, benefits }))}
              services={services}
              onPendingChange={setHasPendingBenefit}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading || hasPendingBenefit} title={hasPendingBenefit ? "Konfirmasi benefit yang sedang diedit terlebih dahulu" : undefined}>
              {isLoading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Memberships Tab ────────────────────────────────────────────────────────

function MembershipsTab() {
  const [memberships, setMemberships] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [petTypes, setPetTypes] = useState<ApiOption[]>([]);
  const [services, setServices] = useState<AdminService[]>([]);

  const [form, setForm] = useState<MembershipForm>(DEFAULT_MEMBERSHIP_FORM);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MembershipPlan | null>(null);
  const [viewTarget, setViewTarget] = useState<MembershipPlan | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Retroactive confirmation
  const [retroConfirmOpen, setRetroConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<MembershipPayload | null>(null);
  // Store original benefits when opening edit mode, to detect changes
  const [originalBenefits, setOriginalBenefits] = useState<
    MembershipForm["benefits"]
  >([]);

  const loadMemberships = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMemberships();
      setMemberships(res.data);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memuat data membership",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMemberships();
    getOptions("pet type")
      .then((res) => setPetTypes(res.options))
      .catch(() => {});
    getAdminServices({ limit: 200 })
      .then((res) => setServices(res.services))
      .catch(() => {});
  }, [loadMemberships]);

  const filtered = memberships.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    const matchActive =
      filterActive === "all" ||
      (filterActive === "active" && m.is_active) ||
      (filterActive === "inactive" && !m.is_active);
    return matchSearch && matchActive;
  });

  const openCreate = () => {
    setForm(DEFAULT_MEMBERSHIP_FORM);
    setDialogMode("create");
    setEditingId(null);
    setDialogOpen(true);
  };

  const openDetail = (m: MembershipPlan) => {
    setViewTarget(m);
    setDetailOpen(true);
  };

  const openEdit = async (m: MembershipPlan) => {
    let formData: MembershipForm;
    try {
      const res = await getMembershipById(m._id);
      formData = membershipToForm(res.data);
    } catch {
      formData = membershipToForm(m);
    }
    setForm(formData);
    setOriginalBenefits(JSON.parse(JSON.stringify(formData.benefits)));
    setDialogMode("edit");
    setEditingId(m._id);
    setDialogOpen(true);
  };

  // Check if benefits have changed compared to original
  const hasBenefitsChanged = (current: MembershipForm["benefits"]): boolean => {
    if (current.length !== originalBenefits.length) return true;
    const serialize = (b: MembershipForm["benefits"]) =>
      JSON.stringify(
        b
          .map(({ _localId, ...rest }) => rest)
          .sort((a, b2) => JSON.stringify(a).localeCompare(JSON.stringify(b2))),
      );
    return serialize(current) !== serialize(originalBenefits);
  };

  const doSubmit = async (payload: MembershipPayload) => {
    setIsSaving(true);
    try {
      if (dialogMode === "create") {
        await createMembership(payload);
        toast.success("Paket membership berhasil ditambahkan");
      } else if (editingId) {
        await updateMembership(editingId, payload);
        toast.success("Paket membership berhasil diperbarui");
      }
      setDialogOpen(false);
      loadMemberships();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      if (msg.toLowerCase().includes("code already exists")) {
        toast.error("Kode sudah digunakan, silakan gunakan kode lain.");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.pet_type_ids.length === 0) {
      toast.error("Pilih minimal satu jenis hewan");
      return;
    }
    const payload = formToPayload(form);

    // For edit mode: if benefits changed, ask about retroactive
    if (
      dialogMode === "edit" &&
      editingId &&
      hasBenefitsChanged(form.benefits)
    ) {
      setPendingPayload(payload);
      setRetroConfirmOpen(true);
      return;
    }

    await doSubmit(payload);
  };

  const handleRetroConfirm = async (retroactive: boolean) => {
    setRetroConfirmOpen(false);
    if (!pendingPayload) return;
    await doSubmit({ ...pendingPayload, apply_retroactive: retroactive });
    setPendingPayload(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMembership(deleteTarget._id);
      toast.success("Paket membership berhasil dihapus");
      setDeleteTarget(null);
      loadMemberships();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari paket membership..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Select
            value={filterActive}
            onValueChange={(v) => setFilterActive(v as typeof filterActive)}
          >
            <SelectTrigger className="flex-1 sm:flex-none sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="inactive">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate} className="shrink-0">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Tambah Paket</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="flex flex-col gap-2 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            {search || filterActive !== "all"
              ? "Tidak ada hasil yang sesuai"
              : "Belum ada paket membership"}
          </div>
        ) : (
          filtered.map((m) => (
            <div
              key={m._id}
              className="rounded-lg border border-border bg-card p-3 active:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => openDetail(m)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {m.code && (
                      <span className="font-mono text-[10px] font-medium text-muted-foreground">
                        {m.code}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        m.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {m.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                    {m.show_on_website && (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] px-1.5 py-0"
                      >
                        Tampil
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 font-medium text-sm leading-tight">
                    {m.name}
                  </p>
                  {m.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {m.description}
                    </p>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mt-1 -mr-1 shrink-0"
                      >
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
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  <span className="text-foreground/60">Durasi: </span>
                  {m.duration_months} bulan
                </span>
                <span>
                  <span className="text-foreground/60">Harga: </span>
                  <span className="font-medium text-foreground">
                    {formatRupiah(m.price)}
                  </span>
                </span>
                <span>
                  <span className="text-foreground/60">Benefit: </span>
                  {m.benefits.length}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: table */}
      <Card className="border-border/50 hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Benefits</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Website</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center text-muted-foreground py-8"
                >
                  {search || filterActive !== "all"
                    ? "Tidak ada hasil yang sesuai"
                    : "Belum ada paket membership"}
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
                    {m.code ? (
                      <span className="font-mono text-xs font-medium">
                        {m.code}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{m.name}</div>
                    {m.description && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {m.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {m.duration_months} bulan
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatRupiah(m.price)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {m.benefits.length} benefit
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        m.is_active
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }
                    >
                      {m.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {m.show_on_website ? (
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                      >
                        Tampil
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Paket Membership</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin ingin menghapus paket <strong>{deleteTarget?.name}</strong>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retroactive Confirmation */}
      <AlertDialog
        open={retroConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRetroConfirmOpen(false);
            setPendingPayload(null);
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Terapkan Perubahan Benefit</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              Benefit pada paket membership ini telah diubah. Pilih bagaimana
              perubahan ini diterapkan:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">
                Hanya untuk pembelian baru
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Perubahan benefit hanya berlaku untuk membership yang dibeli
                setelah ini. Membership yang sudah berjalan tetap menggunakan
                benefit lama.
              </p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">
                Terapkan ke semua membership yang AKTIF dan PENDING
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Selain berlaku untuk pembelian baru, perubahan benefit juga akan
                di-update ke semua membership yang masih aktif dan yang menunggu
                (pending). Riwayat penggunaan benefit yang sudah ada akan
                dipertahankan.
              </p>
            </div>
          </div>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel
              onClick={() => {
                setRetroConfirmOpen(false);
                setPendingPayload(null);
              }}
            >
              Batal
            </AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleRetroConfirm(false)}
              disabled={isSaving}
            >
              Hanya Pembelian Baru
            </Button>
            <Button
              onClick={() => handleRetroConfirm(true)}
              disabled={isSaving}
            >
              {isSaving ? "Menyimpan..." : "Terapkan ke Aktif & Pending"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function MembershipsPage() {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const res = await getPetMembershipsExport();
      exportMembershipPurchasesToExcel(res.data);
    } catch (err) {
      const { toast } = await import("sonner");
      toast.error(
        err instanceof Error ? err.message : "Gagal mengekspor data membership",
      );
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CreditCard className="h-6 w-6 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">
              Memberships
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Kelola paket membership
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting}
          className="shrink-0 h-9 px-3 sm:h-10 sm:px-4"
          aria-label="Export Pembelian"
        >
          <FileDown className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">
            {isExporting ? "Mengekspor..." : "Export Pembelian"}
          </span>
        </Button>
      </div>
      <MembershipsTab />
    </div>
  );
}
