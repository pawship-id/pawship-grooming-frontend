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
  };
}

function formToPayload(form: PromotionForm): PromotionPayload {
  const needsService =
    form.applies_to === "service" || form.applies_to === "addon";
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

  // Sheet (create / edit)
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );
  const [form, setForm] = useState<PromotionForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

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
    setSheetOpen(true);
  }

  function openEdit(p: Promotion) {
    setEditingPromotion(p);
    setForm(promotionToForm(p));
    setSheetOpen(true);
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
      setSheetOpen(false);
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
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promotions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola kode promosi dan diskon
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
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
                <TableRow key={p._id}>
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
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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

      {/* Create / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>
              {editingPromotion ? "Edit Promosi" : "Tambah Promosi"}
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Code */}
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="applies_to">
                Berlaku Untuk <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.applies_to}
                onValueChange={(v) => {
                  setField("applies_to", v as AppliesTo);
                  // Clear service_id when switching scope (different services apply)
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="service_id">
                  Layanan Spesifik{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (kosongkan = berlaku untuk semua)
                  </span>
                </Label>
                <Select
                  value={form.service_id || "__all__"}
                  onValueChange={(v) =>
                    setField("service_id", v === "__all__" ? "" : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih layanan..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Semua Layanan</SelectItem>
                    {filteredServices.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Discount Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
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

              <div className="flex flex-col gap-1.5">
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
              <div className="flex flex-col gap-1.5">
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

              <div className="flex flex-col gap-1.5">
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

            {/* Submit */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting
                  ? "Menyimpan..."
                  : editingPromotion
                    ? "Simpan Perubahan"
                    : "Buat Promosi"}
              </Button>
            </div>
          </form>
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
