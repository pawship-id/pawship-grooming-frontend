"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { Search, Plus, Pencil, Trash2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  createOption,
  deleteOption as deleteOptionRequest,
  getOptions,
  toggleOptionStatus,
  type ApiOption,
  type CategoryOption,
  type OptionPayload,
  updateOption,
} from "@/lib/api/options"
import { toast } from "sonner"

type OptionForm = OptionPayload

// ── Constants ──────────────────────────────────────────────────────────────
const TABS: { value: CategoryOption; label: string }[] = [
  { value: "service type", label: "Service Type" },
  { value: "pet type", label: "Pet Type" },
  { value: "breed category", label: "Breed" },
  { value: "size category", label: "Size" },
  { value: "feather category", label: "Feather" },
  { value: "member category", label: "Member" },
  { value: "customer category", label: "Customer" },
]

const categoryBadgeClass: Record<CategoryOption, string> = {
  "feather category": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "size category": "bg-blue-100 text-blue-700 border-blue-200",
  "breed category": "bg-violet-100 text-violet-700 border-violet-200",
  "member category": "bg-pink-100 text-pink-700 border-pink-200",
  "customer category": "bg-green-100 text-green-700 border-green-200",
  "pet type": "bg-orange-100 text-orange-700 border-orange-200",
  "service type": "bg-cyan-100 text-cyan-700 border-cyan-200",
}

const DEFAULT_FORM: OptionForm = {
  name: "",
  category_options: "size category",
  is_active: true,
}

// ── Highlight helper ──────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-[2px] px-[1px]">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

// ── Component ──────────────────────────────────────────────────────────────
export default function OptionsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryOption>("service type")
  const [search, setSearch] = useState("")
  const [options, setOptions] = useState<ApiOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  // Create
  const [addOpen, setAddOpen] = useState(false)
  const [createForm, setCreateForm] = useState<OptionForm>(DEFAULT_FORM)
  const [isCreating, setIsCreating] = useState(false)

  // Edit
  const [editOption, setEditOption] = useState<ApiOption | null>(null)
  const [editForm, setEditForm] = useState<OptionForm>(DEFAULT_FORM)
  const [isEditing, setIsEditing] = useState(false)

  // Delete
  const [deleteOption, setDeleteOption] = useState<ApiOption | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchOptions = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getOptions(activeCategory)
      setOptions(data.options ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data options.")
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [activeCategory])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  // ── Filtered (client-side search) ────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.category_options.toLowerCase().includes(q)
    )
  }, [options, search])

  // ── CRUD handlers ────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await createOption(createForm)
      toast.success("Option berhasil dibuat")
      setAddOpen(false)
      setCreateForm(DEFAULT_FORM)
      fetchOptions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat option.")
    } finally {
      setIsCreating(false)
    }
  }

  const openEdit = (opt: ApiOption) => {
    setEditOption(opt)
    setEditForm({ name: opt.name, category_options: activeCategory, is_active: opt.is_active })
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editOption) return
    setIsEditing(true)
    try {
      await updateOption(editOption._id, editForm)
      toast.success("Option berhasil diperbarui")
      setEditOption(null)
      fetchOptions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui option.")
    } finally {
      setIsEditing(false)
    }
  }

  const toggleStatus = async (opt: ApiOption) => {
    const newStatus = !opt.is_active
    // Optimistic update
    setOptions((prev) => prev.map((o) => o._id === opt._id ? { ...o, is_active: newStatus } : o))
    try {
      await toggleOptionStatus(opt._id, newStatus)
      toast.success(newStatus ? `"${opt.name}" diaktifkan` : `"${opt.name}" dinonaktifkan`)
    } catch (err) {
      // Revert
      setOptions((prev) => prev.map((o) => o._id === opt._id ? { ...o, is_active: opt.is_active } : o))
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status option.")
    }
  }

  const handleDelete = async () => {
    if (!deleteOption) return
    setIsDeleting(true)
    try {
      await deleteOptionRequest(deleteOption._id)
      toast.success(`"${deleteOption.name}" berhasil dihapus`)
      setDeleteOption(null)
      fetchOptions()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus option.")
    } finally {
      setIsDeleting(false)
    }
  }

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Options</h1>
            <p className="text-sm text-muted-foreground">
              Kelola master data kategori seperti tipe hewan, ukuran, ras, dan lainnya
            </p>
          </div>
          <Button onClick={() => { setCreateForm({ ...DEFAULT_FORM, category_options: activeCategory }); setAddOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Option
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as CategoryOption)}>
          <TabsList className="flex-wrap h-auto gap-1">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nama option..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Table */}
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-7 w-7 ml-auto rounded-md" /></TableCell>
                        </TableRow>
                      ))
                    : filtered.map((opt) => (
                        <TableRow key={opt._id}>
                          <TableCell className="font-medium">
                            <Highlight text={opt.name} query={search} />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize ${categoryBadgeClass[opt.category_options]}`}
                            >
                              {opt.category_options}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${opt.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                            >
                              {opt.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(opt.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
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
                                <DropdownMenuItem onClick={() => toggleStatus(opt)}>
                                  <Switch
                                    checked={opt.is_active}
                                    className="mr-2 scale-75 pointer-events-none"
                                    aria-hidden
                                  />
                                  {opt.is_active ? "Nonaktifkan" : "Aktifkan"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(opt)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit Option
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteOption(opt)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Hapus Option
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}

                  {!isLoading && filtered.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                        Tidak ada option ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Count info */}
        {!isLoading && filtered.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Menampilkan {filtered.length} option{filtered.length !== options.length && ` dari ${options.length}`}
          </p>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setCreateForm(DEFAULT_FORM) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Option Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-name">Nama</Label>
              <Input
                id="c-name"
                placeholder="cth: Small, Kucing, Premium..."
                required
                value={createForm.name}
                onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="c-active"
                checked={createForm.is_active}
                onCheckedChange={(v) => setCreateForm((p) => ({ ...p, is_active: v }))}
              />
              <Label htmlFor="c-active">Aktif</Label>
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={isCreating}>
              {isCreating ? "Menyimpan..." : "Tambah Option"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editOption} onOpenChange={(o) => { if (!o) setEditOption(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Option</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="e-name">Nama</Label>
              <Input
                id="e-name"
                placeholder="cth: Small, Kucing, Premium..."
                required
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="e-active"
                checked={editForm.is_active}
                onCheckedChange={(v) => setEditForm((p) => ({ ...p, is_active: v }))}
              />
              <Label htmlFor="e-active">Aktif</Label>
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={isEditing}>
              {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteOption} onOpenChange={(o) => { if (!o) setDeleteOption(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Option</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus option{" "}
              <span className="font-semibold text-foreground">"{deleteOption?.name}"</span>?
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
