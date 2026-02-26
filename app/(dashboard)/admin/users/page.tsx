"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Mail, Phone, ChevronLeft, ChevronRight, LayoutGrid, List, Plus, Pencil } from "lucide-react"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { apiAuthRequest } from "@/lib/api"
import { toast } from "sonner"

// ── Types ──────────────────────────────────────────────────────────────────
type ApiRole = "admin" | "ops" | "groomer" | "customer"

interface ApiUser {
  _id: string
  username: string
  email: string
  phone_number: string
  role: ApiRole
  is_active: boolean
  createdAt: string
  updatedAt: string
}

interface UsersResponse {
  message: string
  users: ApiUser[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

// ── Form types ─────────────────────────────────────────────────────────────
interface CreateUserForm {
  username: string
  email: string
  phone_number: string
  password: string
  role: ApiRole
  is_active: boolean
}

interface EditUserForm {
  username: string
  email: string
  phone_number: string
  role: ApiRole
}

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

  const openEdit = (user: ApiUser) => {
    setEditUser(user)
    setEditForm({ username: user.username, email: user.email, phone_number: user.phone_number, role: user.role })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await apiAuthRequest("/users", {
        method: "POST",
        body: JSON.stringify(createForm),
      })
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
      await apiAuthRequest(`/users/${editUser._id}`, {
        method: "PUT",
        body: JSON.stringify(editForm),
      })
      toast.success("User berhasil diperbarui")
      setEditUser(null)
      fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui user.")
    } finally {
      setIsEditing(false)
    }
  }

  const toggleStatus = useCallback(async (user: ApiUser) => {
    setTogglingId(user._id)
    const newStatus = !user.is_active
    // Optimistic update
    setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, is_active: newStatus } : u))
    try {
      await apiAuthRequest(`/users/toggle-status/${user._id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: newStatus }),
      })
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
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("limit", String(LIMIT))
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (activeRole !== "all") params.set("role", activeRole)
      if (isActiveFilter !== "all") params.set("is_active", isActiveFilter)

      const data = await apiAuthRequest<UsersResponse>(`/users?${params.toString()}`)
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
                            {user.username}
                          </h3>
                          <Badge variant="outline" className={`capitalize text-xs w-fit ${roleBadgeClass[user.role]}`}>
                            {user.role}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Switch
                          checked={user.is_active}
                          disabled={togglingId === user._id}
                          onCheckedChange={() => toggleStatus(user)}
                          aria-label={`Toggle status ${user.username}`}
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                    {user.phone_number && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5 shrink-0" />
                        <span>{user.phone_number}</span>
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
                    <TableHead className="text-right">Status</TableHead>
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
                              <span className="font-medium">{user.username}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell className="text-muted-foreground">{user.phone_number || "—"}</TableCell>
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
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(user)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Switch
                                checked={user.is_active}
                                disabled={togglingId === user._id}
                                onCheckedChange={() => toggleStatus(user)}
                                aria-label={`Toggle status ${user.username}`}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  {!isLoading && users.length === 0 && !error && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
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
    </>
  )
}
