"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Mail, Phone, ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Pencil, Trash2, MoreVertical, KeyRound, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import {
  type ApiRole,
  type ApiUser,
  type CreateUserPayload,
  type UpdateUserPayload,
  createUser,
  deleteUser as deleteUserRequest,
  getUsers,
  toggleUserStatus,
  updateUser,
  updateUserPassword,
} from "@/lib/api/users"
import { toast } from "sonner"

// ── Form types ─────────────────────────────────────────────────────────────
type CreateUserForm = CreateUserPayload
type EditUserForm = UpdateUserPayload

const ROLE_OPTIONS: ApiRole[] = ["admin", "ops", "groomer", "customer"]

const DEFAULT_CREATE: CreateUserForm = {
  username: "",
  email: "",
  phone_number: "",
  password: "",
  role: "customer",
  is_active: true,
}

// ── Helpers ────────────────────────────────────────────────────────────────
const ROLES: { value: ApiRole | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "admin", label: "Admin" },
  { value: "ops", label: "Ops" },
  { value: "groomer", label: "Groomer" },
  { value: "customer", label: "Customer" },
]

const roleBadgeClass: Record<ApiRole, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  ops: "bg-blue-100 text-blue-700 border-blue-200",
  groomer: "bg-violet-100 text-violet-700 border-violet-200",
  customer: "bg-green-100 text-green-700 border-green-200",
}

const LIMIT = 12
type IsActiveFilter = "all" | "true" | "false"
type ViewMode = "card" | "list"

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
export default function UsersPage() {
  const [activeRole, setActiveRole] = useState<ApiRole | "all">("all")
  const [isActiveFilter, setIsActiveFilter] = useState<IsActiveFilter>("all")
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<ViewMode>("card")

  const [users, setUsers] = useState<ApiUser[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: LIMIT, totalPages: 1 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserForm>(DEFAULT_CREATE)
  const [isCreating, setIsCreating] = useState(false)
  const [editUser, setEditUser] = useState<ApiUser | null>(null)
  const [editForm, setEditForm] = useState<EditUserForm>({ username: "", email: "", phone_number: "", role: "customer" })
  const [isEditing, setIsEditing] = useState(false)
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [passwordUser, setPasswordUser] = useState<ApiUser | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const handleDelete = async () => {
    if (!deleteUser) return
    setIsDeleting(true)
    try {
      await deleteUserRequest(deleteUser._id)
      toast.success(`User ${deleteUser.username} berhasil dihapus`)
      setDeleteUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus user.")
    } finally {
      setIsDeleting(false)
    }
  }

  const openEdit = (user: ApiUser) => {
    setEditUser(user)
    setEditForm({ username: user.username, email: user.email, phone_number: user.phone_number, role: user.role })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await createUser(createForm)
      toast.success("User berhasil dibuat")
      setAddOpen(false)
      setCreateForm(DEFAULT_CREATE)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat user.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setIsEditing(true)
    try {
      await updateUser(editUser._id, editForm)
      toast.success("User berhasil diperbarui")
      setEditUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui user.")
    } finally {
      setIsEditing(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordUser) return
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter")
      return
    }
    setIsUpdatingPassword(true)
    try {
      await updateUserPassword(passwordUser._id, newPassword)
      toast.success("Password berhasil diperbarui")
      setPasswordUser(null)
      setNewPassword("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui password.")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const toggleStatus = useCallback(async (user: ApiUser) => {
    setTogglingId(user._id)
    const newStatus = !user.is_active
    // Optimistic update
    setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, is_active: newStatus } : u))
    try {
      await toggleUserStatus(user._id, newStatus)
      toast.success(newStatus ? `${user.username} diaktifkan` : `${user.username} dinonaktifkan`)
    } catch (err) {
      // Revert on failure
      setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, is_active: user.is_active } : u))
      toast.error(err instanceof Error ? err.message : "Gagal mengubah status pengguna.")
    } finally {
      setTogglingId(null)
    }
  }, [])

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [search])

  // Reset page on filter change
  useEffect(() => {
    setPage(1)
  }, [activeRole, isActiveFilter])

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      const data = await getUsers({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
        role: activeRole === "all" ? undefined : activeRole,
        is_active: isActiveFilter === "all" ? undefined : isActiveFilter,
      })
      setUsers(data.users ?? [])
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data pengguna.")
      setUsers([])
    } finally {
      setIsLoading(false)
    }
  }, [page, debouncedSearch, activeRole, isActiveFilter])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-muted-foreground">
            Kelola semua pengguna berdasarkan peran mereka
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah User
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as ApiRole | "all")}>
        <TabsList className="flex-wrap h-auto gap-1">
          {ROLES.map((r) => (
            <TabsTrigger key={r.value} value={r.value}>
              {r.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Search + Filters + View toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari username, email, atau nomor telepon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={isActiveFilter} onValueChange={(v) => setIsActiveFilter(v as IsActiveFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="true">Aktif</SelectItem>
              <SelectItem value="false">Nonaktif</SelectItem>
            </SelectContent>
          </Select>
          <Separator orientation="vertical" className="h-8" />
          <div className="flex rounded-md border border-border">
            <Button
              variant={viewMode === "card" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none rounded-l-md"
              onClick={() => setViewMode("card")}
              aria-label="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none rounded-r-md border-l border-border"
              onClick={() => setViewMode("list")}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </CardContent>
                </Card>
              ))
            : users.map((user) => (
                <Card key={user._id} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-display font-bold">
                            {user.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1">
                          <h3 className="font-display font-bold text-foreground leading-tight">
                            <Highlight text={user.username} query={debouncedSearch} />
                          </h3>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Badge variant="outline" className={`capitalize text-xs w-fit ${roleBadgeClass[user.role]}`}>
                              {user.role}
                            </Badge>
                            <Badge variant="outline" className={`text-xs w-fit ${user.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {user.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            disabled={togglingId === user._id}
                            onClick={() => toggleStatus(user)}
                          >
                            <Switch
                              checked={user.is_active}
                              className="mr-2 scale-75 pointer-events-none"
                              aria-hidden
                            />
                            {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(user)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setPasswordUser(user); setNewPassword("") }}>
                            <KeyRound className="mr-2 h-4 w-4" />
                            Update Password
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteUser(user)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate"><Highlight text={user.email} query={debouncedSearch} /></span>
                    </div>
                    {user.phone_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span><Highlight text={user.phone_number} query={debouncedSearch} /></span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Bergabung{" "}
                      {new Date(user.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </CardContent>
                </Card>
              ))}

          {!isLoading && users.length === 0 && !error && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              Tidak ada pengguna ditemukan
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telepon</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Bergabung</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                          <TableCell><Skeleton className="h-5 w-10 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    : users.map((user) => (
                        <TableRow key={user._id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-7 w-7 shrink-0">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                  {user.username.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium"><Highlight text={user.username} query={debouncedSearch} /></span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground"><Highlight text={user.email} query={debouncedSearch} /></TableCell>
                          <TableCell className="text-muted-foreground">{user.phone_number ? <Highlight text={user.phone_number} query={debouncedSearch} /> : "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`capitalize text-xs ${roleBadgeClass[user.role]}`}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(user.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${user.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                              {user.is_active ? "Aktif" : "Nonaktif"}
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
                                <DropdownMenuItem
                                  disabled={togglingId === user._id}
                                  onClick={() => toggleStatus(user)}
                                >
                                  <Switch
                                    checked={user.is_active}
                                    className="mr-2 scale-75 pointer-events-none"
                                    aria-hidden
                                  />
                                  {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openEdit(user)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit User
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => { setPasswordUser(user); setNewPassword("") }}>
                                  <KeyRound className="mr-2 h-4 w-4" />
                                  Update Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => setDeleteUser(user)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Hapus User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && users.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                        Tidak ada pengguna ditemukan
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <p className="text-sm text-muted-foreground">
            Menampilkan {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, pagination.total)} dari{" "}
            {pagination.total} pengguna
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setCreateForm(DEFAULT_CREATE) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah User Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-username">Username</Label>
              <Input id="c-username" placeholder="johndoe" required value={createForm.username} onChange={(e) => setCreateForm((p) => ({ ...p, username: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" type="email" placeholder="user@pawship.com" required value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-phone">Nomor Telepon</Label>
              <Input id="c-phone" placeholder="08xxxxxxxxxx" required value={createForm.phone_number} onChange={(e) => setCreateForm((p) => ({ ...p, phone_number: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-password">Password</Label>
              <Input id="c-password" type="password" placeholder="Minimal 6 karakter" required minLength={6} value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-role">Role</Label>
              <Select value={createForm.role} onValueChange={(v) => setCreateForm((p) => ({ ...p, role: v as ApiRole }))}>
                <SelectTrigger id="c-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="c-active" checked={createForm.is_active} onCheckedChange={(v) => setCreateForm((p) => ({ ...p, is_active: v }))} />
              <Label htmlFor="c-active">Aktif</Label>
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={isCreating}>
              {isCreating ? "Menyimpan..." : "Tambah User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) setEditUser(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="e-username">Username</Label>
              <Input id="e-username" placeholder="johndoe" required value={editForm.username} onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="e-email">Email</Label>
              <Input id="e-email" type="email" placeholder="user@pawship.com" required value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="e-phone">Nomor Telepon</Label>
              <Input id="e-phone" placeholder="08xxxxxxxxxx" required value={editForm.phone_number} onChange={(e) => setEditForm((p) => ({ ...p, phone_number: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="e-role">Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm((p) => ({ ...p, role: v as ApiRole }))}>
                <SelectTrigger id="e-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={isEditing}>
              {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Update Password Dialog */}
      <Dialog open={!!passwordUser} onOpenChange={(o) => { if (!o) { setPasswordUser(null); setNewPassword("") } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Update Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mengubah password untuk{" "}
            <span className="font-semibold text-foreground">{passwordUser?.username}</span>
          </p>
          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="up-password">Password Baru</Label>
              <div className="relative">
                <Input
                  id="up-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNewPassword((v) => !v)}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isUpdatingPassword}>
              {isUpdatingPassword ? "Menyimpan..." : "Update Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={(o) => { if (!o) setDeleteUser(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus user{" "}
              <span className="font-semibold text-foreground">{deleteUser?.username}</span>?
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
