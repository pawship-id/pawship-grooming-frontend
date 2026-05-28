"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  Search,
  X,
  Percent,
  CalendarDays,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
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
import { toast } from "sonner";

import {
  type Promotion,
  type PromotionPayload,
  type AppliesTo,
  type DiscountType,
  type PromotionLimitType,
  type PromotionUsagePeriod,
  getPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
} from "@/lib/api/promotions";
import { getAdminServices, type AdminService } from "@/lib/api/services";

// ── Helpers ────────────────────────────────────────────────────────────────

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const APPLIES_TO_LABEL: Record<AppliesTo, string> = {
  service: "Layanan",
  addon: "Addon",
  pickup: "Pickup",
  booking: "Booking",
};

const APPLIES_TO_COLOR: Record<AppliesTo, string> = {
  service: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  addon:
    "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  pickup: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  booking: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

// ── Form interfaces & defaults ─────────────────────────────────────────────

interface PromotionForm {
  code: string;
  name: string;
  description: string;
  applies_to: AppliesTo;
  service_id: string;
  discount_type: DiscountType;
  value: string;
  start_date: string;
  end_date: string;
  is_available_to_membership: boolean;
  is_stackable: boolean;
  is_active: boolean;
  limit_type: PromotionLimitType;
  max_usage: string;
  usage_period: PromotionUsagePeriod;
}

const DEFAULT_FORM: PromotionForm = {
  code: "",
  name: "",
  description: "",
  applies_to: "service",
  service_id: "",
  discount_type: "percent",
  value: "",
  start_date: "",
  end_date: "",
  is_available_to_membership: false,
  is_stackable: false,
  is_active: true,
  limit_type: "none",
  max_usage: "",
  usage_period: "lifetime",
};

function promotionToForm(p: Promotion): PromotionForm {
  return {
    code: p.code,
    name: p.name,
    description: p.description ?? "",
    applies_to: p.applies_to,
    service_id: p.service_id ?? "",
    discount_type: p.discount_type,
    value: String(p.value),
    start_date: p.start_date ? p.start_date.slice(0, 10) : "",
    end_date: p.end_date ? p.end_date.slice(0, 10) : "",
    is_available_to_membership: p.is_available_to_membership,
    is_stackable: p.is_stackable,
    is_active: p.is_active,
    limit_type: p.limit_type ?? "none",
    max_usage: p.max_usage != null ? String(p.max_usage) : "",
    usage_period: p.usage_period ?? "lifetime",
  };
}

function formToPayload(form: PromotionForm): PromotionPayload {
  const needsService =
    form.applies_to === "service" || form.applies_to === "addon";
  const hasLimit = form.limit_type !== "none";
  return {
    code: form.code,
    name: form.name,
    description: form.description || undefined,
    applies_to: form.applies_to,
    service_id: needsService ? form.service_id || null : null,
    discount_type: form.discount_type,
    value: Number(form.value),
    start_date: form.start_date,
    end_date: form.end_date || null,
    is_available_to_membership: form.is_available_to_membership,
    is_stackable: form.is_stackable,
    is_active: form.is_active,
    limit_type: form.limit_type,
    max_usage: hasLimit && form.max_usage ? Number(form.max_usage) : null,
    usage_period: hasLimit ? form.usage_period : "lifetime",
  };
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<AdminService[]>([]);

  // Filters
  const [search, setSearch] = useState("");
  const [filterAppliesTo, setFilterAppliesTo] = useState<AppliesTo | "all">(
    "all",
  );
  const [filterDiscountType, setFilterDiscountType] = useState<
    DiscountType | "all"
  >("all");
  const [filterActive, setFilterActive] = useState<"all" | "true" | "false">(
    "all",
  );

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 10;

  // Dialog (create / edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );
  const [form, setForm] = useState<PromotionForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Detail Sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Promotion | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Promotion | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────

  const fetchPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPromotions({
        page,
        limit: LIMIT,
        search: search || undefined,
        applies_to: filterAppliesTo !== "all" ? filterAppliesTo : undefined,
        discount_type:
          filterDiscountType !== "all" ? filterDiscountType : undefined,
        is_active:
          filterActive === "true"
            ? true
            : filterActive === "false"
              ? false
              : undefined,
      });
      setPromotions(res.promotions);
      setTotalPages(res.pagination.totalPages);
      setTotal(res.pagination.total);
    } catch {
      toast.error("Gagal memuat data promosi");
    } finally {
      setLoading(false);
    }
  }, [page, search, filterAppliesTo, filterDiscountType, filterActive]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  useEffect(() => {
    getAdminServices({ limit: 200, is_active: "true" })
      .then((res) => setServices(res.services))
      .catch(() => {});
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterAppliesTo, filterDiscountType, filterActive]);

  // ── Sheet helpers ──────────────────────────────────────────────────────

  function openCreate() {
    setEditingPromotion(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  }

  function openEdit(p: Promotion) {
    setEditingPromotion(p);
    setForm(promotionToForm(p));
    setDialogOpen(true);
  }

  function openDetail(p: Promotion) {
    setViewTarget(p);
    setDetailOpen(true);
  }

  function setField<K extends keyof PromotionForm>(
    key: K,
    value: PromotionForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = formToPayload(form);
      if (editingPromotion) {
        await updatePromotion(editingPromotion._id, payload);
        toast.success("Promosi berhasil diperbarui");
      } else {
        await createPromotion(payload);
        toast.success("Promosi berhasil dibuat");
      }
      setDialogOpen(false);
      fetchPromotions();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePromotion(deleteTarget._id);
      toast.success("Promosi berhasil dihapus");
      setDeleteTarget(null);
      fetchPromotions();
    } catch {
      toast.error("Gagal menghapus promosi");
    } finally {
      setDeleting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  const needsService =
    form.applies_to === "service" || form.applies_to === "addon";

  // Filter services based on applies_to
  const filteredServices = services.filter((service) => {
    if (!service.service_type?.title) return true;
    const isAddonType = service.service_type.title
      .toLowerCase()
      .includes("addon");

    if (form.applies_to === "addon") {
      return isAddonType;
    } else if (form.applies_to === "service") {
      return !isAddonType;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Promotions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kelola kode promosi dan diskon
          </p>
        </div>
        <Button
          onClick={openCreate}
          size="sm"
          className="shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Tambah Promosi
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari kode atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={filterAppliesTo}
          onValueChange={(v) => setFilterAppliesTo(v as AppliesTo | "all")}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Berlaku untuk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Scope</SelectItem>
            <SelectItem value="service">Layanan</SelectItem>
            <SelectItem value="addon">Addon</SelectItem>
            <SelectItem value="pickup">Pickup</SelectItem>
            <SelectItem value="booking">Booking</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterDiscountType}
          onValueChange={(v) =>
            setFilterDiscountType(v as DiscountType | "all")
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipe diskon" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            <SelectItem value="percent">Persentase (%)</SelectItem>
            <SelectItem value="fixed">Fixed (Rp)</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterActive}
          onValueChange={(v) => setFilterActive(v as "all" | "true" | "false")}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="true">Aktif</SelectItem>
            <SelectItem value="false">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Kode</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead className="w-[100px]">Scope</TableHead>
              <TableHead className="w-[140px]">Layanan</TableHead>
              <TableHead className="w-[130px]">Diskon</TableHead>
              <TableHead className="w-[190px]">Periode</TableHead>
              <TableHead className="w-[80px] text-center">Member</TableHead>
              <TableHead className="w-[90px] text-center">Stackable</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : promotions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={10}
                  className="text-center py-12 text-muted-foreground"
                >
                  <Percent className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Tidak ada promosi ditemukan</p>
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((p) => (
                <TableRow
                  key={p._id}
                  className="cursor-pointer"
                  onClick={() => openDetail(p)}
                >
                  <TableCell className="font-mono text-xs font-semibold">
                    {p.code}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{p.name}</div>
                    {p.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {p.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${APPLIES_TO_COLOR[p.applies_to]}`}
                    >
                      {APPLIES_TO_LABEL[p.applies_to]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.service ? (
                      <span className="text-foreground font-medium">
                        {p.service.name}
                      </span>
                    ) : (
                      <span className="italic">
                        {p.applies_to === "service" || p.applies_to === "addon"
                          ? "Semua"
                          : "—"}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {p.discount_type === "percent"
                      ? `${p.value}%`
                      : formatRupiah(p.value)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3 shrink-0" />
                      <span>{formatDate(p.start_date)}</span>
                    </div>
                    <div className="text-xs">
                      {p.end_date
                        ? `s/d ${formatDate(p.end_date)}`
                        : "Tidak ada batas"}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {p.is_available_to_membership ? (
                      <span className="text-green-600 text-xs font-medium">
                        Ya
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Tidak
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.is_stackable ? (
                      <span className="text-green-600 text-xs font-medium">
                        Ya
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Tidak
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Aktif" : "Nonaktif"}
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
                        <DropdownMenuItem onClick={() => openDetail(p)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Lihat Detail
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(p)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {total} promosi &bull; Halaman {page} dari {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPromotion ? "Edit Promosi" : "Tambah Promosi"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Code */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">
                Kode Promo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                placeholder="Contoh: DISC10"
                required
              />
            </div>

            {/* Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">
                Nama <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Nama promosi"
                required
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Opsional"
                rows={2}
              />
            </div>

            {/* Applies To */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="applies_to">
                Berlaku Untuk <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.applies_to}
                onValueChange={(v) => {
                  setField("applies_to", v as AppliesTo);
                  setField("service_id", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">
                    Layanan — diskon pada harga layanan
                  </SelectItem>
                  <SelectItem value="addon">
                    Addon — diskon pada harga add-on
                  </SelectItem>
                  <SelectItem value="pickup">
                    Pickup — diskon pada biaya travel pickup
                  </SelectItem>
                  <SelectItem value="booking">
                    Booking — diskon dari total pembayaran
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Service (conditional) */}
            {needsService && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="service_id">
                  Layanan Spesifik{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (kosongkan = berlaku untuk semua)
                  </span>
                </Label>
                <Combobox
                  options={[
                    { value: "__all__", label: "Semua Layanan" },
                    ...filteredServices.map((s) => ({
                      value: s._id,
                      label: s.name,
                    })),
                  ]}
                  value={form.service_id || "__all__"}
                  onValueChange={(v) =>
                    setField("service_id", v === "__all__" ? "" : v)
                  }
                  placeholder="Pilih layanan..."
                  searchPlaceholder="Cari layanan..."
                  emptyText="Layanan tidak ditemukan."
                />
              </div>
            )}

            {/* Discount Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="discount_type">
                  Tipe Diskon <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) =>
                    setField("discount_type", v as DiscountType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Persentase (%)</SelectItem>
                    <SelectItem value="fixed">Fixed (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="value">
                  Nilai <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="value"
                  type="number"
                  min={0}
                  step={form.discount_type === "percent" ? 0.01 : 1}
                  value={form.value}
                  onChange={(e) => setField("value", e.target.value)}
                  placeholder={
                    form.discount_type === "percent" ? "10" : "20000"
                  }
                  required
                />
              </div>
            </div>

            {/* Start Date + End Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="start_date">
                  Mulai <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setField("start_date", e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="end_date">
                  Berakhir{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (opsional)
                  </span>
                </Label>
                <Input
                  id="end_date"
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setField("end_date", e.target.value)}
                />
              </div>
            </div>

            {/* Toggles */}
            <div className="flex flex-col gap-3 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tersedia untuk Member</p>
                  <p className="text-xs text-muted-foreground">
                    Aktifkan agar promo ini bisa digunakan oleh pemilik hewan
                    yang berlangganan membership
                  </p>
                </div>
                <Switch
                  checked={form.is_available_to_membership}
                  onCheckedChange={(v) =>
                    setField("is_available_to_membership", v)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Stackable</p>
                  <p className="text-xs text-muted-foreground">
                    Dapat digabung dengan promo lain
                  </p>
                </div>
                <Switch
                  checked={form.is_stackable}
                  onCheckedChange={(v) => setField("is_stackable", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Aktif</p>
                  <p className="text-xs text-muted-foreground">
                    Promosi dapat digunakan saat ini
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setField("is_active", v)}
                />
              </div>
            </div>

            {/* Usage Limits Section */}
            <div className="flex flex-col gap-3 rounded-lg border p-4 bg-muted/30">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold">Batasan Penggunaan</p>
                <p className="text-xs text-muted-foreground">
                  Atur limit maksimal berapa kali promo ini bisa digunakan
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="limit_type">Tipe Batasan</Label>
                <Select
                  value={form.limit_type}
                  onValueChange={(v) => {
                    setField("limit_type", v as PromotionLimitType);
                    if (v === "none") {
                      setField("max_usage", "");
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tidak ada batasan</SelectItem>
                    <SelectItem value="per_user">
                      Per User — limit per akun customer
                    </SelectItem>
                    <SelectItem value="per_pet">
                      Per Pet — limit per hewan peliharaan
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.limit_type !== "none" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="max_usage">
                        Maksimal Penggunaan{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="max_usage"
                        type="number"
                        min={1}
                        value={form.max_usage}
                        onChange={(e) => setField("max_usage", e.target.value)}
                        placeholder="Contoh: 3"
                        required={form.limit_type !== "none"}
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor="usage_period">
                        Periode Reset{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={form.usage_period}
                        onValueChange={(v) =>
                          setField("usage_period", v as PromotionUsagePeriod)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lifetime">
                            Lifetime — tidak reset
                          </SelectItem>
                          <SelectItem value="daily">
                            Daily — reset harian
                          </SelectItem>
                          <SelectItem value="weekly">
                            Weekly — reset mingguan
                          </SelectItem>
                          <SelectItem value="monthly">
                            Monthly — reset bulanan
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-0.5">
                    {form.limit_type === "per_user"
                      ? `Setiap user hanya dapat menggunakan promo ini ${form.max_usage || "X"} kali`
                      : `Setiap hewan peliharaan hanya dapat menggunakan promo ini ${form.max_usage || "X"} kali`}
                    {form.usage_period !== "lifetime" &&
                      ` per ${form.usage_period === "daily" ? "hari" : form.usage_period === "weekly" ? "minggu" : "bulan"}`}
                    .
                  </p>
                </>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? "Menyimpan..."
                  : editingPromotion
                    ? "Simpan Perubahan"
                    : "Buat Promosi"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          {viewTarget && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  {viewTarget.name}
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-5 mt-4">
                {/* Status badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className={
                      viewTarget.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }
                  >
                    {viewTarget.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${
                      {
                        service: "bg-blue-50 text-blue-700 border-blue-200",
                        addon: "bg-purple-50 text-purple-700 border-purple-200",
                        pickup: "bg-amber-50 text-amber-700 border-amber-200",
                        booking: "bg-green-50 text-green-700 border-green-200",
                      }[viewTarget.applies_to]
                    }`}
                  >
                    {APPLIES_TO_LABEL[viewTarget.applies_to]}
                  </span>
                  {viewTarget.is_stackable && (
                    <Badge variant="secondary" className="text-xs">
                      Stackable
                    </Badge>
                  )}
                  {viewTarget.is_available_to_membership && (
                    <Badge variant="secondary" className="text-xs">
                      Untuk Member
                    </Badge>
                  )}
                </div>

                {/* Code + Discount */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Kode</span>
                    <span className="font-mono font-semibold">
                      {viewTarget.code}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      Diskon
                    </span>
                    <span className="font-medium">
                      {viewTarget.discount_type === "percent"
                        ? `${viewTarget.value}%`
                        : formatRupiah(viewTarget.value)}
                    </span>
                  </div>
                </div>

                {/* Period */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">Mulai</span>
                    <span className="font-medium flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(viewTarget.start_date)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground">
                      Berakhir
                    </span>
                    <span className="font-medium">
                      {viewTarget.end_date
                        ? formatDate(viewTarget.end_date)
                        : "Tidak ada batas"}
                    </span>
                  </div>
                </div>

                {/* Service target */}
                {(viewTarget.applies_to === "service" ||
                  viewTarget.applies_to === "addon") && (
                  <div className="flex flex-col gap-0.5 text-sm">
                    <span className="text-xs text-muted-foreground">
                      Layanan
                    </span>
                    <span className="font-medium">
                      {viewTarget.service
                        ? viewTarget.service.name
                        : "Semua Layanan"}
                    </span>
                  </div>
                )}

                {viewTarget.description && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-muted-foreground font-medium">
                        Deskripsi
                      </span>
                      <p className="text-sm">{viewTarget.description}</p>
                    </div>
                  </>
                )}

                {/* Usage Limits Display */}
                {viewTarget.limit_type && viewTarget.limit_type !== "none" && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-medium">
                        Batasan Penggunaan
                      </span>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Tipe:</span>
                          <Badge variant="outline" className="text-xs">
                            {viewTarget.limit_type === "per_user"
                              ? "Per User"
                              : "Per Pet"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Maksimal:
                          </span>
                          <span className="font-medium">
                            {viewTarget.max_usage ?? "—"} kali
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            Periode:
                          </span>
                          <span className="font-medium capitalize">
                            {viewTarget.usage_period === "lifetime"
                              ? "Lifetime"
                              : viewTarget.usage_period === "daily"
                                ? "Harian"
                                : viewTarget.usage_period === "weekly"
                                  ? "Mingguan"
                                  : "Bulanan"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                {/* Edit button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setDetailOpen(false);
                    openEdit(viewTarget);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Promosi
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Promosi</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus promosi{" "}
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.code})?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
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
