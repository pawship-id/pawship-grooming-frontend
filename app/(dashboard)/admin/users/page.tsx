"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Mail, Phone, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { apiAuthRequest } from "@/lib/api"

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Users</h1>
        <p className="text-sm text-muted-foreground">
          Kelola semua pengguna berdasarkan peran mereka
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeRole} onValueChange={(v) => setActiveRole(v as ApiRole | "all")}>
        <TabsList className="flex-wrap h-auto gap-1">
          {ROLES.map((r) => (
            <TabsTrigger key={r.value} value={r.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
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
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className={`capitalize text-xs ${roleBadgeClass[user.role]}`}>
                              {user.role}
                            </Badge>
                            <Badge
                              variant={user.is_active ? "default" : "secondary"}
                              className={`text-xs ${user.is_active ? "bg-emerald-500 hover:bg-emerald-500" : ""}`}
                            >
                              {user.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </div>
                        </div>
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
                    <TableHead>Status</TableHead>
                    <TableHead>Bergabung</TableHead>
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
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
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
                          <TableCell>
                            <Badge
                              variant={user.is_active ? "default" : "secondary"}
                              className={`text-xs ${user.is_active ? "bg-emerald-500 hover:bg-emerald-500" : ""}`}
                            >
                              {user.is_active ? "Aktif" : "Nonaktif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(user.createdAt).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
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
  )
}
