"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, ImageIcon, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  type Banner,
  type BannerPage,
  type BannerPayload,
  createBanner,
  deleteBanner,
  getAdminBanners,
  updateBanner,
} from "@/lib/api/banners";
import { uploadFile } from "@/lib/api/upload";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface BannerForm {
  // Desktop image
  image_url: string;
  public_id: string;
  imageFile: File | null;
  imagePreview: string | null;
  // Desktop text overlay
  title: string;
  subtitle: string;
  text_align: "left" | "center" | "right";
  text_color: string;
  // Desktop CTA
  hasCta: boolean;
  cta_label: string;
  cta_link: string;
  cta_background_color: string;
  cta_text_color: string;
  cta_vertical_position: "top" | "center" | "bottom";
  cta_horizontal_position: "left" | "center" | "right";
  // Mobile banner
  hasMobileBanner: boolean;
  mobile_image_url: string;
  mobile_public_id: string;
  mobile_imageFile: File | null;
  mobile_imagePreview: string | null;
  // Mobile text overlay
  title_mobile: string;
  subtitle_mobile: string;
  text_align_mobile: "left" | "center" | "right";
  text_color_mobile: string;
  // Mobile CTA
  hasMobileCta: boolean;
  cta_mobile_label: string;
  cta_mobile_link: string;
  cta_mobile_background_color: string;
  cta_mobile_text_color: string;
  cta_mobile_vertical_position: "top" | "center" | "bottom";
  cta_mobile_horizontal_position: "left" | "center" | "right";
  // Meta
  page: BannerPage;
  order: string;
  is_active: boolean;
}

const DEFAULT_FORM: BannerForm = {
  image_url: "",
  public_id: "",
  imageFile: null,
  imagePreview: null,
  title: "",
  subtitle: "",
  text_align: "center",
  text_color: "#ffffff",
  hasCta: false,
  cta_label: "",
  cta_link: "",
  cta_background_color: "#FF6B35",
  cta_text_color: "#ffffff",
  cta_vertical_position: "bottom",
  cta_horizontal_position: "center",
  hasMobileBanner: false,
  mobile_image_url: "",
  mobile_public_id: "",
  mobile_imageFile: null,
  mobile_imagePreview: null,
  title_mobile: "",
  subtitle_mobile: "",
  text_align_mobile: "center",
  text_color_mobile: "#ffffff",
  hasMobileCta: false,
  cta_mobile_label: "",
  cta_mobile_link: "",
  cta_mobile_background_color: "#FF6B35",
  cta_mobile_text_color: "#ffffff",
  cta_mobile_vertical_position: "bottom",
  cta_mobile_horizontal_position: "center",
  page: "home",
  order: "0",
  is_active: false,
};

const PAGE_LABELS: Record<BannerPage, string> = {
  home: "Home",
  grooming: "Grooming",
  membership: "Membership",
};

// ─────────────────────────────────────────────────────────────────────────────
// Image picker sub-component
// ─────────────────────────────────────────────────────────────────────────────
function ImagePicker({
  preview,
  existingUrl,
  onFile,
  onClear,
}: {
  preview: string | null;
  existingUrl?: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const displayUrl = preview ?? existingUrl ?? null;

  return (
    <div className="flex flex-col gap-2">
      <div
        className="relative flex h-36 w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-border bg-muted/30 hover:bg-muted/50 transition-colors overflow-hidden"
        onClick={() => ref.current?.click()}
      >
        {displayUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayUrl}
              alt="preview"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-xs text-white font-medium">
                Ganti Gambar
              </span>
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
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="self-start text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          <X className="mr-1 h-3.5 w-3.5" /> Hapus Gambar
        </Button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA fields sub-component (reused for desktop & mobile)
// ─────────────────────────────────────────────────────────────────────────────
function CtaFields({
  prefix,
  label,
  link,
  bgColor,
  textColor,
  verticalPos,
  horizontalPos,
  onChange,
}: {
  prefix: string;
  label: string;
  link: string;
  bgColor: string;
  textColor: string;
  verticalPos: "top" | "center" | "bottom";
  horizontalPos: "left" | "center" | "right";
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 pt-2 border-t">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefix}-label`}>Label *</Label>
          <Input
            id={`${prefix}-label`}
            placeholder="Pesan Sekarang"
            value={label}
            onChange={(e) => onChange("label", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefix}-link`}>Link *</Label>
          <Input
            id={`${prefix}-link`}
            placeholder="/bookings"
            value={link}
            onChange={(e) => onChange("link", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefix}-bg`}>Warna Tombol</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              id={`${prefix}-bg`}
              value={bgColor}
              onChange={(e) => onChange("bgColor", e.target.value)}
              className="h-9 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
            />
            <Input
              value={bgColor}
              onChange={(e) => onChange("bgColor", e.target.value)}
              placeholder="#FF6B35"
              className="flex-1"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${prefix}-text-color`}>Warna Teks Tombol</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              id={`${prefix}-text-color`}
              value={textColor}
              onChange={(e) => onChange("textColor", e.target.value)}
              className="h-9 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
            />
            <Input
              value={textColor}
              onChange={(e) => onChange("textColor", e.target.value)}
              placeholder="#ffffff"
              className="flex-1"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Posisi Vertikal</Label>
          <Select
            value={verticalPos}
            onValueChange={(v) => onChange("verticalPos", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top">Atas</SelectItem>
              <SelectItem value="center">Tengah</SelectItem>
              <SelectItem value="bottom">Bawah</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Posisi Horizontal</Label>
          <Select
            value={horizontalPos}
            onValueChange={(v) => onChange("horizontalPos", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Kiri</SelectItem>
              <SelectItem value="center">Tengah</SelectItem>
              <SelectItem value="right">Kanan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(DEFAULT_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [isMobileUploading, setIsMobileUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchBanners = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await getAdminBanners({ page, limit: pagination.limit });
        setBanners(res.banners);
        setPagination(res.pagination);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Gagal memuat banner");
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit],
  );

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  // ── Open dialog ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingBanner(null);
    setForm(DEFAULT_FORM);
    setDialogOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingBanner(banner);
    const hasMobile = !!banner.banner_mobile?.image_url;
    setForm({
      image_url: banner.banner_desktop?.image_url ?? "",
      public_id: banner.banner_desktop?.public_id ?? "",
      imageFile: null,
      imagePreview: null,
      title: banner.title ?? "",
      subtitle: banner.subtitle ?? "",
      text_align: banner.text_align ?? "center",
      text_color: banner.text_color ?? "#ffffff",
      hasCta: !!banner.cta,
      cta_label: banner.cta?.label ?? "",
      cta_link: banner.cta?.link ?? "",
      cta_background_color: banner.cta?.background_color ?? "#FF6B35",
      cta_text_color: banner.cta?.text_color ?? "#ffffff",
      cta_vertical_position: banner.cta?.vertical_position ?? "bottom",
      cta_horizontal_position: banner.cta?.horizontal_position ?? "center",
      hasMobileBanner: hasMobile,
      mobile_image_url: banner.banner_mobile?.image_url ?? "",
      mobile_public_id: banner.banner_mobile?.public_id ?? "",
      mobile_imageFile: null,
      mobile_imagePreview: null,
      title_mobile: banner.title_mobile ?? "",
      subtitle_mobile: banner.subtitle_mobile ?? "",
      text_align_mobile: banner.text_align_mobile ?? "center",
      text_color_mobile: banner.text_color_mobile ?? "#ffffff",
      hasMobileCta: !!banner.cta_mobile,
      cta_mobile_label: banner.cta_mobile?.label ?? "",
      cta_mobile_link: banner.cta_mobile?.link ?? "",
      cta_mobile_background_color:
        banner.cta_mobile?.background_color ?? "#FF6B35",
      cta_mobile_text_color: banner.cta_mobile?.text_color ?? "#ffffff",
      cta_mobile_vertical_position:
        banner.cta_mobile?.vertical_position ?? "bottom",
      cta_mobile_horizontal_position:
        banner.cta_mobile?.horizontal_position ?? "center",
      page: banner.page ?? "home",
      order: String(banner.order),
      is_active: banner.is_active,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    if (form.mobile_imagePreview) URL.revokeObjectURL(form.mobile_imagePreview);
    setDialogOpen(false);
    setEditingBanner(null);
    setForm(DEFAULT_FORM);
  };

  // ── Desktop image upload ───────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setForm((p) => ({ ...p, imageFile: file, imagePreview: previewUrl }));
    setIsUploading(true);
    try {
      const res = await uploadFile(file, "banners");
      setForm((p) => ({
        ...p,
        image_url: res.image_url,
        public_id: res.public_id,
      }));
      toast.success("Gambar berhasil diupload");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal upload gambar");
      setForm((p) => ({ ...p, imageFile: null, imagePreview: null }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearImage = () => {
    if (form.imagePreview) URL.revokeObjectURL(form.imagePreview);
    setForm((p) => ({
      ...p,
      imageFile: null,
      imagePreview: null,
      image_url: "",
      public_id: "",
    }));
  };

  // ── Mobile image upload ────────────────────────────────────────────────────
  const handleMobileFile = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setForm((p) => ({
      ...p,
      mobile_imageFile: file,
      mobile_imagePreview: previewUrl,
    }));
    setIsMobileUploading(true);
    try {
      const res = await uploadFile(file, "banners");
      setForm((p) => ({
        ...p,
        mobile_image_url: res.image_url,
        mobile_public_id: res.public_id,
      }));
      toast.success("Gambar mobile berhasil diupload");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal upload gambar mobile",
      );
      setForm((p) => ({
        ...p,
        mobile_imageFile: null,
        mobile_imagePreview: null,
      }));
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    } finally {
      setIsMobileUploading(false);
    }
  };

  const handleClearMobileImage = () => {
    if (form.mobile_imagePreview) URL.revokeObjectURL(form.mobile_imagePreview);
    setForm((p) => ({
      ...p,
      mobile_imageFile: null,
      mobile_imagePreview: null,
      mobile_image_url: "",
      mobile_public_id: "",
    }));
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.image_url || !form.public_id) {
      toast.error("Gambar banner desktop wajib diupload");
      return;
    }
    if (form.hasCta && (!form.cta_label.trim() || !form.cta_link.trim())) {
      toast.error("Label dan link CTA desktop wajib diisi jika CTA diaktifkan");
      return;
    }
    if (
      form.hasMobileBanner &&
      (!form.mobile_image_url || !form.mobile_public_id)
    ) {
      toast.error(
        "Gambar banner mobile wajib diupload jika banner mobile diaktifkan",
      );
      return;
    }
    if (
      form.hasMobileBanner &&
      form.hasMobileCta &&
      (!form.cta_mobile_label.trim() || !form.cta_mobile_link.trim())
    ) {
      toast.error(
        "Label dan link CTA mobile wajib diisi jika CTA mobile diaktifkan",
      );
      return;
    }

    const payload: BannerPayload = {
      banner_desktop: { image_url: form.image_url, public_id: form.public_id },
      banner_mobile:
        form.hasMobileBanner && form.mobile_image_url
          ? {
              image_url: form.mobile_image_url,
              public_id: form.mobile_public_id,
            }
          : null,
      title: form.title || undefined,
      subtitle: form.subtitle || undefined,
      text_align: form.text_align,
      text_color: form.text_color,
      cta: form.hasCta
        ? {
            label: form.cta_label,
            link: form.cta_link,
            background_color: form.cta_background_color || undefined,
            text_color: form.cta_text_color || undefined,
            vertical_position: form.cta_vertical_position,
            horizontal_position: form.cta_horizontal_position,
          }
        : null,
      // Mobile text overlay — only include when mobile banner is enabled
      ...(form.hasMobileBanner && {
        title_mobile: form.title_mobile || undefined,
        subtitle_mobile: form.subtitle_mobile || undefined,
        text_align_mobile: form.text_align_mobile,
        text_color_mobile: form.text_color_mobile,
        cta_mobile: form.hasMobileCta
          ? {
              label: form.cta_mobile_label,
              link: form.cta_mobile_link,
              background_color: form.cta_mobile_background_color || undefined,
              text_color: form.cta_mobile_text_color || undefined,
              vertical_position: form.cta_mobile_vertical_position,
              horizontal_position: form.cta_mobile_horizontal_position,
            }
          : null,
      }),
      page: form.page,
      order: Number(form.order) || 0,
      is_active: form.is_active,
    };

    setIsSaving(true);
    try {
      if (editingBanner) {
        await updateBanner(editingBanner._id, payload);
        toast.success("Banner berhasil diperbarui");
      } else {
        await createBanner(payload);
        toast.success("Banner berhasil dibuat");
      }
      closeDialog();
      fetchBanners(pagination.page);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan banner",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ── Active toggle ──────────────────────────────────────────────────────────
  const handleToggleActive = async (banner: Banner) => {
    const optimistic = banners.map((b) =>
      b._id === banner._id ? { ...b, is_active: !b.is_active } : b,
    );
    setBanners(optimistic);
    try {
      await updateBanner(banner._id, { is_active: !banner.is_active });
      toast.success(
        `Banner ${!banner.is_active ? "diaktifkan" : "dinonaktifkan"}`,
      );
    } catch (err) {
      setBanners(banners); // rollback
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah status banner",
      );
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBanner(deleteTarget._id);
      toast.success("Banner berhasil dihapus");
      setDeleteTarget(null);
      fetchBanners(pagination.page);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus banner",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Banner</h1>
          <p className="text-sm text-muted-foreground">
            Kelola banner promosi yang ditampilkan di aplikasi
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Banner
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Gambar</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead className="w-28">Halaman</TableHead>
              <TableHead className="w-16 text-center">Urutan</TableHead>
              <TableHead className="w-24 text-center">Aktif</TableHead>
              <TableHead className="w-24 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-14 w-20 rounded" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-10 mx-auto rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-16 ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : banners.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  Belum ada banner. Klik &quot;Tambah Banner&quot; untuk membuat
                  yang baru.
                </TableCell>
              </TableRow>
            ) : (
              banners.map((banner) => (
                <TableRow key={banner._id}>
                  <TableCell>
                    <div className="h-14 w-20 overflow-hidden rounded border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={banner.banner_desktop?.image_url}
                        alt={banner.title ?? "Banner"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {banner.title ?? (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {PAGE_LABELS[banner.page] ?? banner.page}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {banner.order}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={banner.is_active}
                      onCheckedChange={() => handleToggleActive(banner)}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => openEdit(banner)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(banner)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Total {pagination.total} banner — Halaman {pagination.page} dari{" "}
            {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => fetchBanners(pagination.page - 1)}
            >
              Sebelumnya
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => fetchBanners(pagination.page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle>
              {editingBanner ? "Edit Banner" : "Tambah Banner"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-5">
              {/* ── Page assignment ─────────────────────────────────────────── */}
              <div className="flex flex-col gap-1.5">
                <Label>Halaman</Label>
                <Select
                  value={form.page}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, page: v as BannerPage }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="grooming">Grooming</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Banner ini akan ditampilkan di halaman yang dipilih.
                </p>
              </div>

              {/* ── Desktop Image ────────────────────────────────────────────── */}
              <div className="flex flex-col gap-1.5">
                <Label>Gambar Banner Desktop *</Label>
                <ImagePicker
                  preview={form.imagePreview}
                  existingUrl={editingBanner ? form.image_url : null}
                  onFile={handleFile}
                  onClear={handleClearImage}
                />
                {isUploading && (
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Mengupload gambar desktop...
                  </p>
                )}
              </div>

              {/* ── Desktop text overlay ─────────────────────────────────────── */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-title">Judul</Label>
                <Input
                  id="b-title"
                  placeholder="Promo Maret!"
                  value={form.title}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: e.target.value }))
                  }
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-subtitle">Subjudul</Label>
                <Textarea
                  id="b-subtitle"
                  placeholder="Diskon 20% untuk semua layanan grooming"
                  rows={2}
                  value={form.subtitle}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, subtitle: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Teks Rata</Label>
                  <Select
                    value={form.text_align}
                    onValueChange={(v) =>
                      setForm((p) => ({
                        ...p,
                        text_align: v as BannerForm["text_align"],
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Kiri</SelectItem>
                      <SelectItem value="center">Tengah</SelectItem>
                      <SelectItem value="right">Kanan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="b-text-color">Warna Teks</Label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="color"
                      id="b-text-color"
                      value={form.text_color}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, text_color: e.target.value }))
                      }
                      className="h-9 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
                    />
                    <Input
                      value={form.text_color}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, text_color: e.target.value }))
                      }
                      placeholder="#ffffff"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* ── Desktop CTA ──────────────────────────────────────────────── */}
              <div className="flex flex-col gap-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Tombol CTA Desktop</p>
                    <p className="text-xs text-muted-foreground">
                      Tombol aksi yang muncul di banner desktop
                    </p>
                  </div>
                  <Switch
                    checked={form.hasCta}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, hasCta: v }))
                    }
                  />
                </div>
                {form.hasCta && (
                  <CtaFields
                    prefix="cta-desktop"
                    label={form.cta_label}
                    link={form.cta_link}
                    bgColor={form.cta_background_color}
                    textColor={form.cta_text_color}
                    verticalPos={form.cta_vertical_position}
                    horizontalPos={form.cta_horizontal_position}
                    onChange={(key, value) => {
                      const map: Record<string, keyof BannerForm> = {
                        label: "cta_label",
                        link: "cta_link",
                        bgColor: "cta_background_color",
                        textColor: "cta_text_color",
                        verticalPos: "cta_vertical_position",
                        horizontalPos: "cta_horizontal_position",
                      };
                      setForm((p) => ({ ...p, [map[key]]: value }));
                    }}
                  />
                )}
              </div>

              {/* ── Mobile Banner section ────────────────────────────────────── */}
              <div className="flex flex-col gap-3 rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Banner Mobile</p>
                      <p className="text-xs text-muted-foreground">
                        Versi banner khusus untuk tampilan mobile (opsional)
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.hasMobileBanner}
                    onCheckedChange={(v) =>
                      setForm((p) => ({ ...p, hasMobileBanner: v }))
                    }
                  />
                </div>

                {form.hasMobileBanner && (
                  <div className="flex flex-col gap-4 pt-2 border-t">
                    {/* Mobile image */}
                    <div className="flex flex-col gap-1.5">
                      <Label>Gambar Mobile *</Label>
                      <ImagePicker
                        preview={form.mobile_imagePreview}
                        existingUrl={
                          editingBanner && form.mobile_image_url
                            ? form.mobile_image_url
                            : null
                        }
                        onFile={handleMobileFile}
                        onClear={handleClearMobileImage}
                      />
                      {isMobileUploading && (
                        <p className="text-xs text-muted-foreground animate-pulse">
                          Mengupload gambar mobile...
                        </p>
                      )}
                    </div>

                    {/* Mobile title */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="b-title-mobile">Judul Mobile</Label>
                      <Input
                        id="b-title-mobile"
                        placeholder="Sama seperti desktop jika kosong"
                        value={form.title_mobile}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            title_mobile: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Mobile subtitle */}
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="b-subtitle-mobile">Subjudul Mobile</Label>
                      <Textarea
                        id="b-subtitle-mobile"
                        placeholder="Sama seperti desktop jika kosong"
                        rows={2}
                        value={form.subtitle_mobile}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            subtitle_mobile: e.target.value,
                          }))
                        }
                      />
                    </div>

                    {/* Mobile text align + text color */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label>Teks Rata Mobile</Label>
                        <Select
                          value={form.text_align_mobile}
                          onValueChange={(v) =>
                            setForm((p) => ({
                              ...p,
                              text_align_mobile:
                                v as BannerForm["text_align_mobile"],
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="left">Kiri</SelectItem>
                            <SelectItem value="center">Tengah</SelectItem>
                            <SelectItem value="right">Kanan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="b-text-color-mobile">
                          Warna Teks Mobile
                        </Label>
                        <div className="flex gap-2 items-center">
                          <input
                            type="color"
                            id="b-text-color-mobile"
                            value={form.text_color_mobile}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                text_color_mobile: e.target.value,
                              }))
                            }
                            className="h-9 w-10 cursor-pointer rounded border border-input bg-transparent p-0.5"
                          />
                          <Input
                            value={form.text_color_mobile}
                            onChange={(e) =>
                              setForm((p) => ({
                                ...p,
                                text_color_mobile: e.target.value,
                              }))
                            }
                            placeholder="#ffffff"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Mobile CTA */}
                    <div className="flex flex-col gap-3 rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">
                            Tombol CTA Mobile
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Tombol aksi untuk banner mobile
                          </p>
                        </div>
                        <Switch
                          checked={form.hasMobileCta}
                          onCheckedChange={(v) =>
                            setForm((p) => ({ ...p, hasMobileCta: v }))
                          }
                        />
                      </div>
                      {form.hasMobileCta && (
                        <CtaFields
                          prefix="cta-mobile"
                          label={form.cta_mobile_label}
                          link={form.cta_mobile_link}
                          bgColor={form.cta_mobile_background_color}
                          textColor={form.cta_mobile_text_color}
                          verticalPos={form.cta_mobile_vertical_position}
                          horizontalPos={form.cta_mobile_horizontal_position}
                          onChange={(key, value) => {
                            const map: Record<string, keyof BannerForm> = {
                              label: "cta_mobile_label",
                              link: "cta_mobile_link",
                              bgColor: "cta_mobile_background_color",
                              textColor: "cta_mobile_text_color",
                              verticalPos: "cta_mobile_vertical_position",
                              horizontalPos: "cta_mobile_horizontal_position",
                            };
                            setForm((p) => ({ ...p, [map[key]]: value }));
                          }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Order + is_active ────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="b-order">Urutan</Label>
                  <Input
                    id="b-order"
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, order: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Status Aktif</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) =>
                        setForm((p) => ({ ...p, is_active: v }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {form.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={isSaving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isUploading || isMobileUploading}
              >
                {isSaving
                  ? "Menyimpan..."
                  : editingBanner
                    ? "Simpan Perubahan"
                    : "Buat Banner"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Banner</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus banner{" "}
              <strong>{deleteTarget?.title ?? "ini"}</strong>? Tindakan ini
              tidak dapat dibatalkan.
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
    </div>
  );
}
