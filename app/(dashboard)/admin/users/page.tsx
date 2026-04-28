"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Search,
  Mail,
  Phone,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Plus,
  Pencil,
  Trash2,
  MoreVertical,
  KeyRound,
  Eye,
  EyeOff,
  PawPrint,
  User,
  MapPin,
  LocateFixed,
  ChevronDown,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  type ApiRole,
  type ApiUser,
  type UserAddress,
  type CreateUserPayload,
  type UpdateUserPayload,
  adminUpdateUserProfile,
  createUser,
  clearUserEmail,
  deleteUser as deleteUserRequest,
  getUsers,
  getUser,
  toggleUserStatus,
  updateUser,
  updateUserPassword,
} from "@/lib/api/users";
import { uploadFile } from "@/lib/api/upload";
import { getStores, type ApiStore } from "@/lib/api/stores";
import { getOptions, type ApiOption, createOption } from "@/lib/api/options";
import { toast } from "sonner";

const LocationMap = dynamic(
  () =>
    import("@/components/location-map").then((mod) => ({
      default: mod.LocationMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[380px] w-full rounded-md border border-border bg-muted/40 animate-pulse" />
    ),
  },
);

// ── Form types ─────────────────────────────────────────────────────────────
type CreateUserForm = CreateUserPayload;
type EditUserForm = UpdateUserPayload & {
  full_name?: string;
  gender?: "Male" | "Female";
  placement?: string;
  groomer_skills?: string[];
  groomer_rating?: number;
  addresses: UserAddress[];
};

const ROLE_OPTIONS: ApiRole[] = ["admin", "ops", "groomer", "customer"];

const DEFAULT_CREATE: CreateUserForm = {
  username: "",
  email: "",
  phone_number: "",
  password: "",
  role: "customer",
  is_active: true,
};

// ── Helpers ────────────────────────────────────────────────────────────────
const ROLES: { value: ApiRole | "all"; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "admin", label: "Admin" },
  { value: "ops", label: "Ops" },
  { value: "groomer", label: "Groomer" },
  { value: "customer", label: "Customer" },
];

const roleBadgeClass: Record<ApiRole, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  ops: "bg-blue-100 text-blue-700 border-blue-200",
  groomer: "bg-violet-100 text-violet-700 border-violet-200",
  customer: "bg-green-100 text-green-700 border-green-200",
};

const LIMIT = 12;
type IsActiveFilter = "all" | "true" | "false";
type ViewMode = "card" | "list";

// ── Email validation helper ──────────────────────────────────────────────
function isValidEmail(email: string): boolean {
  if (!email || email.trim() === "") return false; // Empty is invalid for password input
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// ── Phone validation helper ───────────────────────────────────────────────
function isValidPhone(phone: string): boolean {
  return /^0\d+$/.test(phone.trim());
}

// ── Highlight helper ──────────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const regex = new RegExp(
    `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
    "gi",
  );
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 text-yellow-900 rounded-[2px] px-[1px]"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [activeRole, setActiveRole] = useState<ApiRole | "all">("all");
  const [isActiveFilter, setIsActiveFilter] = useState<IsActiveFilter>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const [users, setUsers] = useState<ApiUser[]>([]);
  const [stores, setStores] = useState<ApiStore[]>([]);
  const [sessionSkills, setSessionSkills] = useState<ApiOption[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: LIMIT,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>(DEFAULT_CREATE);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [editForm, setEditForm] = useState<EditUserForm>({
    username: "",
    email: "",
    phone_number: "",
    role: "customer",
    full_name: "",
    groomer_skills: [],
    groomer_rating: 0,
    addresses: [],
  });
  const [isEditing, setIsEditing] = useState(false);
  const [deleteUser, setDeleteUser] = useState<ApiUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [passwordUser, setPasswordUser] = useState<ApiUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [showClearEmailConfirm, setShowClearEmailConfirm] = useState(false);

  const [editingAddressIdx, setEditingAddressIdx] = useState<number | null>(
    null,
  );
  const [coordInputMode, setCoordInputMode] = useState<"manual" | "map">(
    "manual",
  );
  const [mapOpen, setMapOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  function handleDetectLocation() {
    if (editingAddressIdx === null) return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation tidak didukung oleh browser ini");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setEditForm((f) => ({
          ...f,
          addresses: f.addresses.map((a, i) =>
            i === editingAddressIdx
              ? { ...a, latitude: lat, longitude: lng }
              : a,
          ),
        }));
        setIsDetectingLocation(false);
      },
      () => {
        toast.error(
          "Gagal mendeteksi lokasi. Pastikan akses lokasi diizinkan.",
        );
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(
    null,
  );
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const createImageRef = useRef<HTMLInputElement>(null);
  const editImageRef = useRef<HTMLInputElement>(null);

  const handleDelete = async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      await deleteUserRequest(deleteUser._id);
      toast.success(`User ${deleteUser.username} berhasil dihapus`);
      setDeleteUser(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus user.");
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = async (user: ApiUser) => {
    setEditUser(user);
    // Convert skill names to option IDs for the form
    const skillIds = (user.profile?.groomer_skills || [])
      .map((skillName) => {
        const option = sessionSkills.find((opt) => opt.name === skillName);
        return option?._id;
      })
      .filter((id): id is string => id !== undefined);

    setEditForm({
      username: user.username,
      email: user.email || "",
      phone_number: user.phone_number,
      role: user.role,
      full_name: user.profile?.full_name ?? "",
      gender: user.profile?.gender,
      placement: user.profile?.placement,
      groomer_skills: skillIds,
      groomer_rating: user.profile?.groomer_rating || 0,
      addresses: user.profile?.addresses ?? [],
    });
    setEditImageFile(null);
    setEditImagePreview(user.profile?.image_url ?? null);
    setSkillInput("");
    setEditingAddressIdx(null);
    setCoordInputMode("manual");
    setMapOpen(false);

    // Fetch full user detail to get addresses with _id
    try {
      const detail = await getUser(user._id);
      if (detail.user?.profile?.addresses) {
        setEditForm((f) => ({
          ...f,
          addresses: detail.user.profile?.addresses ?? f.addresses,
        }));
      }
    } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      // Validate phone number
      if (!isValidPhone(createForm.phone_number)) {
        toast.error(
          "Nomor telepon harus diawali 0 dan hanya boleh berisi angka (contoh: 08xxx)",
        );
        setIsCreating(false);
        return;
      }

      // Validate: non-customer roles require email and password
      if (createForm.role !== "customer") {
        if (!createForm.email || createForm.email.trim() === "") {
          toast.error("Email wajib diisi untuk role selain customer");
          setIsCreating(false);
          return;
        }
        if (!createForm.password || createForm.password.trim() === "") {
          toast.error("Password wajib diisi untuk role selain customer");
          setIsCreating(false);
          return;
        }
      }

      // Remove email and password from payload if empty
      const { email, password, ...rest } = createForm;
      const payload: CreateUserPayload = {
        ...rest,
        ...(email && email.trim() !== "" && { email }),
        ...(password && password.trim() !== "" && { password }),
      };

      const res = await createUser(payload);
      if (createImageFile && res.user?._id) {
        const uploaded = await uploadFile(createImageFile, "profiles");
        await adminUpdateUserProfile(res.user._id, {
          image_url: uploaded.image_url,
          public_id: uploaded.public_id,
        });
      }
      toast.success("User berhasil dibuat");
      setAddOpen(false);
      setCreateForm(DEFAULT_CREATE);
      setCreateImageFile(null);
      setCreateImagePreview(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat user.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    // For customer: if email is being cleared, show confirm dialog first
    if (
      editUser.role === "customer" &&
      editUser.email &&
      (!editForm.email || editForm.email.trim() === "")
    ) {
      setShowClearEmailConfirm(true);
      return;
    }

    await _doHandleEdit();
  };

  const _doHandleEdit = async () => {
    if (!editUser) return;
    setIsEditing(true);
    try {
      // Validate phone number
      if (!isValidPhone(editForm.phone_number)) {
        toast.error(
          "Nomor telepon harus diawali 0 dan hanya boleh berisi angka (contoh: 08xxx)",
        );
        setIsEditing(false);
        return;
      }

      // Update user basic fields only
      const payload: UpdateUserPayload = {
        username: editForm.username,
        phone_number: editForm.phone_number,
        role: editForm.role,
      };

      // Only include email if not empty
      if (editForm.email && editForm.email.trim() !== "") {
        payload.email = editForm.email;
      }

      await updateUser(editUser._id, payload);

      // If customer email was cleared, also clear password via dedicated endpoint
      if (
        editUser.role === "customer" &&
        editUser.email &&
        (!editForm.email || editForm.email.trim() === "")
      ) {
        await clearUserEmail(editUser._id);
      }

      // Update profile fields
      const profilePayload: any = {};
      if (editForm.full_name) profilePayload.full_name = editForm.full_name;
      if (editForm.gender) profilePayload.gender = editForm.gender;
      if (editForm.placement) profilePayload.placement = editForm.placement;
      // Convert option IDs back to skill names
      if (editForm.groomer_skills) {
        profilePayload.groomer_skills = editForm.groomer_skills
          .map((id) => {
            const option = sessionSkills.find((opt) => opt._id === id);
            return option?.name;
          })
          .filter((name): name is string => name !== undefined);
      }
      if (editForm.groomer_rating !== undefined)
        profilePayload.groomer_rating = editForm.groomer_rating;

      // Include addresses with created_by
      profilePayload.addresses = editForm.addresses.map((a) => ({
        ...a,
        is_main_address: !!a.is_main_address,
        created_by: a.created_by ?? "admin",
      }));

      if (editImageFile) {
        const uploaded = await uploadFile(editImageFile, "profiles");
        profilePayload.image_url = uploaded.image_url;
        profilePayload.public_id = uploaded.public_id;
      }

      await adminUpdateUserProfile(editUser._id, profilePayload);

      toast.success("User berhasil diperbarui");
      setEditUser(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      setSkillInput("");
      setEditingAddressIdx(null);
      fetchUsers();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui user.",
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordUser) return;
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }
    setIsUpdatingPassword(true);
    try {
      await updateUserPassword(passwordUser._id, newPassword);
      toast.success("Password berhasil diperbarui");
      setPasswordUser(null);
      setNewPassword("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui password.",
      );
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const toggleStatus = useCallback(async (user: ApiUser) => {
    setTogglingId(user._id);
    const newStatus = !user.is_active;
    // Optimistic update
    setUsers((prev) =>
      prev.map((u) =>
        u._id === user._id ? { ...u, is_active: newStatus } : u,
      ),
    );
    try {
      await toggleUserStatus(user._id, newStatus);
      toast.success(
        newStatus
          ? `${user.username} diaktifkan`
          : `${user.username} dinonaktifkan`,
      );
    } catch (err) {
      // Revert on failure
      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, is_active: user.is_active } : u,
        ),
      );
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah status pengguna.",
      );
    } finally {
      setTogglingId(null);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [activeRole, isActiveFilter]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await getUsers({
        page,
        limit: LIMIT,
        search: debouncedSearch || undefined,
        role: activeRole === "all" ? undefined : activeRole,
        is_active: isActiveFilter === "all" ? undefined : isActiveFilter,
      });
      setUsers(data.users ?? []);
      setPagination(data.pagination);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Gagal memuat data pengguna.",
      );
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, activeRole, isActiveFilter]);

  const fetchStores = useCallback(async () => {
    try {
      const data = await getStores({ page: 1, limit: 1000 });
      setStores(data.stores ?? []);
    } catch (err) {
      console.error("Failed to fetch stores:", err);
    }
  }, []);

  const fetchSessionSkills = useCallback(async () => {
    setIsLoadingSkills(true);
    try {
      const data = await getOptions("session - skill");
      // Filter hanya yang aktif
      setSessionSkills((data.options ?? []).filter((opt) => opt.is_active));
    } catch (err) {
      console.error("Failed to fetch session skills:", err);
    } finally {
      setIsLoadingSkills(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  useEffect(() => {
    fetchSessionSkills();
  }, [fetchSessionSkills]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helper function to highlight matching text
  // ─────────────────────────────────────────────────────────────────────────────
  function highlightText(text: string, search: string) {
    if (!search.trim()) return text;

    const regex = new RegExp(
      `(${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-foreground font-medium">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MultiSelect Component for Skills with Search & Create
  // ─────────────────────────────────────────────────────────────────────────────
  function SkillMultiSelect({
    items,
    selected,
    onChange,
    placeholder = "Pilih skill...",
    loading = false,
    onRefresh,
  }: {
    items: { _id: string; name: string }[];
    selected: string[];
    onChange: (ids: string[]) => void;
    placeholder?: string;
    loading?: boolean;
    onRefresh?: () => void;
  }) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreating, setIsCreating] = useState(false);

    if (loading) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Memuat data skill...
        </div>
      );
    }

    const selectedItems = items.filter((item) => selected.includes(item._id));
    const displayText =
      selectedItems.length > 0
        ? `${selectedItems.length} skill dipilih`
        : placeholder;

    // Filter items by search query (case insensitive)
    const filteredItems = items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const hasExactMatch = items.some(
      (item) => item.name.toLowerCase() === searchQuery.toLowerCase(),
    );

    const handleRemove = (id: string) => {
      onChange(selected.filter((selectedId) => selectedId !== id));
    };

    const handleCreateNew = async () => {
      if (!searchQuery.trim() || hasExactMatch) return;

      setIsCreating(true);
      try {
        const result = await createOption({
          name: searchQuery.trim(),
          category_options: "session - skill",
          is_active: true,
        });

        toast.success(
          `Skill "${searchQuery.trim()}" berhasil dibuat dan dipilih`,
        );
        setSearchQuery("");

        // Auto-select the newly created skill
        if (result.option && result.option._id) {
          onChange([...selected, result.option._id]);
        }

        // Refresh the list to show the new option
        if (onRefresh) {
          onRefresh();
        }

        // Close the dropdown
        setOpen(false);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal membuat skill baru",
        );
      } finally {
        setIsCreating(false);
      }
    };

    return (
      <div className="flex flex-col gap-2">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="w-full justify-between font-normal"
            >
              <span className="truncate">{displayText}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-full min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] p-0">
            {/* Search Input */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari atau buat skill baru..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery && !hasExactMatch) {
                      e.preventDefault();
                      handleCreateNew();
                    }
                  }}
                />
              </div>
            </div>

            {/* Items List */}
            <div className="max-h-[200px] overflow-y-auto">
              {filteredItems.length === 0 && !searchQuery && (
                <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Belum ada skill di master data
                </div>
              )}

              {filteredItems.length === 0 && searchQuery && (
                <div className="px-2 py-2">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm font-normal"
                    onClick={handleCreateNew}
                    disabled={isCreating}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {isCreating ? "Membuat..." : `Buat "${searchQuery}"`}
                  </Button>
                </div>
              )}

              {filteredItems.map((item) => (
                <DropdownMenuCheckboxItem
                  key={item._id}
                  checked={selected.includes(item._id)}
                  onCheckedChange={(checked) => {
                    onChange(
                      checked
                        ? [...selected, item._id]
                        : selected.filter((id) => id !== item._id),
                    );
                  }}
                >
                  <span>{highlightText(item.name, searchQuery)}</span>
                </DropdownMenuCheckboxItem>
              ))}

              {/* Create option when there are results but no exact match */}
              {filteredItems.length > 0 && searchQuery && !hasExactMatch && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm font-normal"
                      onClick={handleCreateNew}
                      disabled={isCreating}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {isCreating ? "Membuat..." : `Buat "${searchQuery}"`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Selected Items as Badges */}
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedItems.map((item) => (
              <Badge
                key={item._id}
                variant="secondary"
                className="px-2 py-1 text-xs"
              >
                {item.name}
                <button
                  type="button"
                  onClick={() => handleRemove(item._id)}
                  className="ml-1.5 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Users
            </h1>
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
        <Tabs
          value={activeRole}
          onValueChange={(v) => setActiveRole(v as ApiRole | "all")}
        >
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
            <Select
              value={isActiveFilter}
              onValueChange={(v) => setIsActiveFilter(v as IsActiveFilter)}
            >
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
                            {user.profile?.image_url && (
                              <AvatarImage
                                src={user.profile.image_url}
                                alt={user.username}
                                className="object-cover"
                              />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary font-display font-bold">
                              {user.username.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-1">
                            <h3 className="font-display font-bold text-foreground leading-tight">
                              <Highlight
                                text={user.username}
                                query={debouncedSearch}
                              />
                            </h3>
                            <div className="flex items-center gap-1 flex-wrap">
                              <Badge
                                variant="outline"
                                className={`capitalize text-xs w-fit ${roleBadgeClass[user.role]}`}
                              >
                                {user.role}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`text-xs w-fit ${user.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                              >
                                {user.is_active ? "Aktif" : "Nonaktif"}
                              </Badge>
                              {user.role === "customer" &&
                                (user.is_idle === true ||
                                  user.is_idle === null) && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs w-fit bg-amber-50 text-amber-700 border-amber-200"
                                  >
                                    Idle
                                  </Badge>
                                )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                            >
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
                            <DropdownMenuItem
                              onClick={() => {
                                setPasswordUser(user);
                                setNewPassword("");
                              }}
                            >
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
                        <span className="truncate">
                          {user.email ? (
                            <Highlight
                              text={user.email}
                              query={debouncedSearch}
                            />
                          ) : (
                            <span className="italic text-muted-foreground">
                              Tidak ada email
                            </span>
                          )}
                        </span>
                      </div>
                      {user.phone_number && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            <Highlight
                              text={user.phone_number}
                              query={debouncedSearch}
                            />
                          </span>
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
                      {user.role === "customer" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          asChild
                        >
                          <Link href={`/admin/users/${user._id}/pets`}>
                            <PawPrint className="mr-2 h-4 w-4" />
                            Lihat Pet
                            {user.pet_count !== undefined && (
                              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                                {user.pet_count}
                              </span>
                            )}
                          </Link>
                        </Button>
                      )}
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
                      <TableHead></TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading
                      ? Array.from({ length: 8 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              <Skeleton className="h-4 w-28" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-40" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-28" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-16" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-4 w-24" />
                            </TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-14" />
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                              <Skeleton className="h-5 w-10 ml-auto" />
                            </TableCell>
                          </TableRow>
                        ))
                      : users.map((user) => (
                          <TableRow key={user._id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7 shrink-0">
                                  {user.profile?.image_url && (
                                    <AvatarImage
                                      src={user.profile.image_url}
                                      alt={user.username}
                                      className="object-cover"
                                    />
                                  )}
                                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                    {user.username.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">
                                  <Highlight
                                    text={user.username}
                                    query={debouncedSearch}
                                  />
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.email ? (
                                <Highlight
                                  text={user.email}
                                  query={debouncedSearch}
                                />
                              ) : (
                                <span className="italic text-muted-foreground/60">
                                  Tidak ada email
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {user.phone_number ? (
                                <Highlight
                                  text={user.phone_number}
                                  query={debouncedSearch}
                                />
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`capitalize text-xs ${roleBadgeClass[user.role]}`}
                              >
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(user.createdAt).toLocaleDateString(
                                "id-ID",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${user.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                                >
                                  {user.is_active ? "Aktif" : "Nonaktif"}
                                </Badge>
                                {user.role === "customer" &&
                                  (user.is_idle === true ||
                                    user.is_idle === null) && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-amber-50 text-amber-700 border-amber-200"
                                    >
                                      Idle
                                    </Badge>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.role === "customer" && (
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/admin/users/${user._id}/pets`}>
                                    <PawPrint className="mr-1.5 h-3.5 w-3.5" />
                                    Lihat Pet
                                    {user.pet_count !== undefined && (
                                      <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                                        {user.pet_count}
                                      </span>
                                    )}
                                  </Link>
                                </Button>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                  >
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
                                    {user.is_active
                                      ? "Nonaktifkan"
                                      : "Aktifkan"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openEdit(user)}
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit User
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setPasswordUser(user);
                                      setNewPassword("");
                                    }}
                                  >
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
                        <TableCell
                          colSpan={8}
                          className="py-12 text-center text-muted-foreground"
                        >
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
              Menampilkan {(page - 1) * LIMIT + 1}–
              {Math.min(page * LIMIT, pagination.total)} dari {pagination.total}{" "}
              pengguna
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
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) {
            setCreateForm(DEFAULT_CREATE);
            setCreateImageFile(null);
            setCreateImagePreview(null);
            setShowCreatePassword(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah User Baru</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => createImageRef.current?.click()}
                className="relative group w-16 h-16 rounded-full overflow-hidden border-2 border-border focus:outline-none"
              >
                {createImagePreview ? (
                  <img
                    src={createImagePreview}
                    alt="Foto profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Upload</span>
                </div>
              </button>
              <span className="text-xs text-muted-foreground">
                Foto Profil (opsional)
              </span>
              <input
                ref={createImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setCreateImageFile(file);
                  const reader = new FileReader();
                  reader.onload = (ev) =>
                    setCreateImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-username">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="c-username"
                placeholder="johndoe"
                required
                value={createForm.username}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, username: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-phone">
                Nomor Telepon <span className="text-red-500">*</span>
              </Label>
              <Input
                id="c-phone"
                placeholder="08xxxxxxxxxx"
                required
                inputMode="numeric"
                value={createForm.phone_number}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, phone_number: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Harus diawali 0, hanya angka. Tanpa +62 atau tanda baca.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-email">
                Email
                {createForm.role !== "customer" && (
                  <span className="text-red-500"> *</span>
                )}
              </Label>
              <Input
                id="c-email"
                type="email"
                placeholder={
                  createForm.role !== "customer"
                    ? "user@pawship.com (wajib)"
                    : "user@pawship.com (opsional)"
                }
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-password">
                Password
                {createForm.role !== "customer" && (
                  <span className="text-red-500"> *</span>
                )}
              </Label>
              <div className="relative">
                <Input
                  id="c-password"
                  type={showCreatePassword ? "text" : "password"}
                  placeholder={
                    createForm.role !== "customer"
                      ? "Minimal 6 karakter (wajib)"
                      : "Minimal 6 karakter (opsional)"
                  }
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, password: e.target.value }))
                  }
                  disabled={!isValidEmail(createForm.email ?? "")}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCreatePassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showCreatePassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {createForm.email?.trim() && !isValidEmail(createForm.email) && (
                <p className="text-xs text-amber-600">
                  Masukkan email dengan format yang benar untuk mengisi password
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-role">Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) =>
                  setCreateForm((p) => ({ ...p, role: v as ApiRole }))
                }
              >
                <SelectTrigger id="c-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="c-active"
                checked={createForm.is_active}
                onCheckedChange={(v) =>
                  setCreateForm((p) => ({ ...p, is_active: v }))
                }
              />
              <Label htmlFor="c-active">Aktif</Label>
            </div>
            <Button type="submit" className="mt-2 w-full" disabled={isCreating}>
              {isCreating ? "Menyimpan..." : "Tambah User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={!!editUser}
        onOpenChange={(o) => {
          if (!o) {
            setEditUser(null);
            setEditImageFile(null);
            setEditImagePreview(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col gap-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => editImageRef.current?.click()}
                className="relative group w-20 h-20 rounded-full overflow-hidden border-2 border-border focus:outline-none"
              >
                {editImagePreview ? (
                  <img
                    src={editImagePreview}
                    alt="Foto profil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-medium">Ganti</span>
                </div>
              </button>
              <span className="text-xs text-muted-foreground">
                Klik foto untuk mengganti
              </span>
              <input
                ref={editImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setEditImageFile(file);
                  const reader = new FileReader();
                  reader.onload = (ev) =>
                    setEditImagePreview(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }}
              />
            </div>

            <Separator />

            {/* Informasi Akun Section */}
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Informasi Akun
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-username">
                    Username <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="e-username"
                    placeholder="johndoe"
                    required
                    value={editForm.username}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, username: e.target.value }))
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-phone">
                    Nomor Telepon <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="e-phone"
                    placeholder="08xxxxxxxxxx"
                    required
                    inputMode="numeric"
                    value={editForm.phone_number}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        phone_number: e.target.value,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Harus diawali 0, hanya angka. Tanpa +62 atau tanda baca.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-email">Email</Label>
                  <Input
                    id="e-email"
                    type="email"
                    placeholder="user@pawship.com"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                  {editUser?.role === "customer" &&
                    editUser?.email &&
                    (!editForm.email || editForm.email.trim() === "") && (
                      <p className="text-xs text-amber-600 leading-snug">
                        ⚠️ Email dikosongkan — password juga akan dihapus.
                        Customer harus aktivasi ulang dengan input email &
                        password baru.
                      </p>
                    )}
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-role">Role</Label>
                  <Select
                    value={editForm.role}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, role: v as ApiRole }))
                    }
                  >
                    <SelectTrigger id="e-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Informasi Profil Section */}
            <div className="flex flex-col gap-4">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Informasi Profil
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Gender Select */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-gender">Gender (opsional)</Label>
                  <Select
                    value={editForm.gender || undefined}
                    onValueChange={(v) =>
                      setEditForm((p) => ({
                        ...p,
                        gender: v as "Male" | "Female",
                      }))
                    }
                  >
                    <SelectTrigger id="e-gender">
                      <SelectValue placeholder="Pilih gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Placement Store (visible for admin/ops/groomer) */}
                {["admin", "ops", "groomer"].includes(editForm.role) && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="e-placement">
                      Placement Store (opsional)
                    </Label>
                    <Select
                      value={editForm.placement || undefined}
                      onValueChange={(v) =>
                        setEditForm((p) => ({ ...p, placement: v }))
                      }
                    >
                      <SelectTrigger id="e-placement">
                        <SelectValue placeholder="Pilih store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.map((store) => (
                          <SelectItem key={store._id} value={store._id}>
                            {store.name}
                            {!store.is_active && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Inactive
                              </Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Groomer Skills (visible only for groomer) */}
              {editForm.role === "groomer" && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="e-skills">Skills</Label>
                  <SkillMultiSelect
                    items={sessionSkills}
                    selected={editForm.groomer_skills || []}
                    onChange={(ids) =>
                      setEditForm((p) => ({ ...p, groomer_skills: ids }))
                    }
                    placeholder="Pilih skill dari master data..."
                    loading={isLoadingSkills}
                    onRefresh={fetchSessionSkills}
                  />
                </div>
              )}

              {/* Groomer Rating (visible only for groomer) */}
              {editForm.role === "groomer" && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="e-rating">Rating (0-5)</Label>
                    <Input
                      id="e-rating"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      placeholder="0.0"
                      value={editForm.groomer_rating || 0}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          groomer_rating: parseFloat(e.target.value) || 0,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              {/* Full Name */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="e-fullname">Nama Lengkap (opsional)</Label>
                <Input
                  id="e-fullname"
                  placeholder="Nama lengkap"
                  value={editForm.full_name || ""}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, full_name: e.target.value }))
                  }
                />
              </div>
            </div>

            <Separator />

            {/* Daftar Alamat Section */}
            {editForm.role === "customer" && (
              <div className="flex flex-col gap-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  Daftar Alamat
                </h3>
                {editForm.addresses.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    Belum ada alamat.
                  </div>
                )}
                {editForm.addresses.map((addr, idx) => (
                  <div
                    key={addr._id || idx}
                    className="border rounded-md relative bg-muted/30"
                  >
                    {editingAddressIdx === idx ? (
                      <div className="p-3">
                        <div className="flex gap-2 items-center mb-2">
                          <input
                            type="radio"
                            id={`admin_main_address_${idx}`}
                            name="admin_main_address"
                            checked={!!addr.is_main_address}
                            onChange={() =>
                              setEditForm((f) => ({
                                ...f,
                                addresses: f.addresses.map((a, i) => ({
                                  ...a,
                                  is_main_address: i === idx,
                                })),
                              }))
                            }
                          />
                          <Label
                            htmlFor={`admin_main_address_${idx}`}
                            className="text-xs font-medium cursor-pointer"
                          >
                            Alamat Utama
                          </Label>
                          {addr.created_by && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1 py-0 h-4 font-normal ${addr.created_by === "admin" ? "border-blue-200 text-blue-700" : "border-green-200 text-green-700"}`}
                            >
                              {addr.created_by === "admin"
                                ? "Admin"
                                : "Customer"}
                            </Badge>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="ml-auto text-xs h-7"
                            onClick={() => setEditingAddressIdx(null)}
                          >
                            Selesai
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`admin-addr-label-${idx}`}>
                              Label
                            </Label>
                            <Input
                              id={`admin-addr-label-${idx}`}
                              value={addr.label || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  addresses: f.addresses.map((a, i) =>
                                    i === idx
                                      ? { ...a, label: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Label (Rumah, Kantor, dll)"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`admin-addr-street-${idx}`}>
                              Jalan / Alamat
                            </Label>
                            <Input
                              id={`admin-addr-street-${idx}`}
                              value={addr.street || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  addresses: f.addresses.map((a, i) =>
                                    i === idx
                                      ? { ...a, street: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Jalan / Alamat"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`admin-addr-subdistrict-${idx}`}>
                              Kelurahan / Desa
                            </Label>
                            <Input
                              id={`admin-addr-subdistrict-${idx}`}
                              value={addr.subdistrict || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  addresses: f.addresses.map((a, i) =>
                                    i === idx
                                      ? { ...a, subdistrict: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Kelurahan / Desa"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`admin-addr-district-${idx}`}>
                              Kecamatan
                            </Label>
                            <Input
                              id={`admin-addr-district-${idx}`}
                              value={addr.district || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  addresses: f.addresses.map((a, i) =>
                                    i === idx
                                      ? { ...a, district: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Kecamatan"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`admin-addr-city-${idx}`}>
                              Kota / Kabupaten
                            </Label>
                            <Input
                              id={`admin-addr-city-${idx}`}
                              value={addr.city || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  addresses: f.addresses.map((a, i) =>
                                    i === idx
                                      ? { ...a, city: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Kota / Kabupaten"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`admin-addr-province-${idx}`}>
                              Provinsi
                            </Label>
                            <Input
                              id={`admin-addr-province-${idx}`}
                              value={addr.province || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  addresses: f.addresses.map((a, i) =>
                                    i === idx
                                      ? { ...a, province: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Provinsi"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor={`admin-addr-postal-${idx}`}>
                              Kode Pos
                            </Label>
                            <Input
                              id={`admin-addr-postal-${idx}`}
                              value={addr.postal_code || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  addresses: f.addresses.map((a, i) =>
                                    i === idx
                                      ? { ...a, postal_code: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Kode Pos"
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label>Koordinat</Label>
                            <div className="flex rounded-md border border-border w-fit">
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  coordInputMode === "manual"
                                    ? "secondary"
                                    : "ghost"
                                }
                                className="rounded-none rounded-l-md"
                                onClick={() => setCoordInputMode("manual")}
                              >
                                Manual
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  coordInputMode === "map"
                                    ? "secondary"
                                    : "ghost"
                                }
                                className="rounded-none rounded-r-md border-l border-border"
                                onClick={() => setCoordInputMode("map")}
                              >
                                Dari Peta
                              </Button>
                            </div>
                          </div>
                          {coordInputMode === "manual" ? (
                            <>
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor={`admin-addr-lat-${idx}`}>
                                  Latitude
                                </Label>
                                <Input
                                  id={`admin-addr-lat-${idx}`}
                                  type="number"
                                  step="any"
                                  value={addr.latitude ?? ""}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      addresses: f.addresses.map((a, i) =>
                                        i === idx
                                          ? {
                                              ...a,
                                              latitude: e.target.value
                                                ? parseFloat(e.target.value)
                                                : undefined,
                                            }
                                          : a,
                                      ),
                                    }))
                                  }
                                  placeholder="-6.208"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <Label htmlFor={`admin-addr-lng-${idx}`}>
                                  Longitude
                                </Label>
                                <Input
                                  id={`admin-addr-lng-${idx}`}
                                  type="number"
                                  step="any"
                                  value={addr.longitude ?? ""}
                                  onChange={(e) =>
                                    setEditForm((f) => ({
                                      ...f,
                                      addresses: f.addresses.map((a, i) =>
                                        i === idx
                                          ? {
                                              ...a,
                                              longitude: e.target.value
                                                ? parseFloat(e.target.value)
                                                : undefined,
                                            }
                                          : a,
                                      ),
                                    }))
                                  }
                                  placeholder="106.845"
                                />
                              </div>
                            </>
                          ) : (
                            <div className="flex flex-col gap-2 sm:col-span-2">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setMapOpen(true)}
                                >
                                  <MapPin className="h-3.5 w-3.5 mr-1" />
                                  Pilih dari Peta
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={isDetectingLocation}
                                  onClick={handleDetectLocation}
                                >
                                  <LocateFixed className="h-3.5 w-3.5 mr-1" />
                                  {isDetectingLocation
                                    ? "Mendeteksi..."
                                    : "Lokasi Saat Ini"}
                                </Button>
                              </div>
                              {addr.latitude != null &&
                                addr.longitude != null && (
                                  <p className="text-xs text-muted-foreground">
                                    Koordinat terpilih: {addr.latitude},{" "}
                                    {addr.longitude}
                                  </p>
                                )}
                            </div>
                          )}
                          <div className="flex flex-col gap-1.5 sm:col-span-2">
                            <Label htmlFor={`admin-addr-note-${idx}`}>
                              Catatan (opsional)
                            </Label>
                            <Input
                              id={`admin-addr-note-${idx}`}
                              value={addr.note || ""}
                              onChange={(e) =>
                                setEditForm((f) => ({
                                  ...f,
                                  addresses: f.addresses.map((a, i) =>
                                    i === idx
                                      ? { ...a, note: e.target.value }
                                      : a,
                                  ),
                                }))
                              }
                              placeholder="Catatan (opsional)"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2">
                        <input
                          type="radio"
                          id={`admin_main_addr_collapsed_${idx}`}
                          name="admin_main_address"
                          checked={!!addr.is_main_address}
                          onChange={() =>
                            setEditForm((f) => ({
                              ...f,
                              addresses: f.addresses.map((a, i) => ({
                                ...a,
                                is_main_address: i === idx,
                              })),
                            }))
                          }
                          className="shrink-0 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <label
                            htmlFor={`admin_main_addr_collapsed_${idx}`}
                            className="flex items-center gap-1.5 mb-0.5 cursor-pointer"
                          >
                            {addr.is_main_address && (
                              <span className="text-xs text-primary font-semibold">
                                Utama
                              </span>
                            )}
                            <span className="text-xs font-medium">
                              {addr.label || "Alamat"}
                            </span>
                            {addr.created_by && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1 py-0 h-4 font-normal ${addr.created_by === "admin" ? "border-blue-200 text-blue-700" : "border-green-200 text-green-700"}`}
                              >
                                {addr.created_by === "admin"
                                  ? "Admin"
                                  : "Customer"}
                              </Badge>
                            )}
                          </label>
                          <p className="text-xs text-muted-foreground truncate">
                            {[
                              addr.street,
                              addr.district,
                              addr.city,
                              addr.province,
                            ]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => setEditingAddressIdx(idx)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {addr.created_by !== "customer" && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                              setEditForm((f) => ({
                                ...f,
                                addresses: f.addresses.filter(
                                  (_, i) => i !== idx,
                                ),
                              }));
                              if (editingAddressIdx === idx)
                                setEditingAddressIdx(null);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newIdx = editForm.addresses.length;
                    setEditForm((f) => ({
                      ...f,
                      addresses: [
                        ...f.addresses.map((a) => ({
                          ...a,
                          is_main_address: false,
                        })),
                        {
                          is_main_address: f.addresses.length === 0,
                          label: "",
                          street: "",
                          city: "",
                          created_by: "admin" as const,
                        },
                      ],
                    }));
                    setEditingAddressIdx(newIdx);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Tambah Alamat
                </Button>
              </div>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={isEditing}>
              {isEditing ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Map Dialog for Address Editing */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pilih Lokasi di Peta</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Klik titik pada peta untuk mengisi koordinat alamat secara otomatis.
          </p>
          {mapOpen && editingAddressIdx !== null && (
            <LocationMap
              selectedLat={
                editForm.addresses[editingAddressIdx]?.latitude ?? null
              }
              selectedLng={
                editForm.addresses[editingAddressIdx]?.longitude ?? null
              }
              onSelect={(lat, lng) => {
                setEditForm((f) => ({
                  ...f,
                  addresses: f.addresses.map((a, i) =>
                    i === editingAddressIdx
                      ? { ...a, latitude: lat, longitude: lng }
                      : a,
                  ),
                }));
              }}
            />
          )}
          <div className="flex justify-end">
            <Button type="button" onClick={() => setMapOpen(false)}>
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Update Password Dialog */}
      <Dialog
        open={!!passwordUser}
        onOpenChange={(o) => {
          if (!o) {
            setPasswordUser(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Update Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Mengubah password untuk{" "}
            <span className="font-semibold text-foreground">
              {passwordUser?.username}
            </span>
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
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isUpdatingPassword}
            >
              {isUpdatingPassword ? "Menyimpan..." : "Update Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Clear Email Confirmation Dialog */}
      <AlertDialog
        open={showClearEmailConfirm}
        onOpenChange={(o) => {
          if (!o) {
            setShowClearEmailConfirm(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Email &amp; Password</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2 text-sm">
                <p>
                  Kamu akan menghapus email dari customer{" "}
                  <span className="font-semibold text-foreground">
                    {editUser?.username}
                  </span>
                  .
                </p>
                <p>
                  Setelah disimpan, <strong>password juga akan dihapus</strong>{" "}
                  dan customer tidak bisa login menggunakan email & password.
                </p>
                <p className="text-amber-700 font-medium">
                  Customer harus aktivasi ulang akun dengan mendaftarkan email
                  dan password baru melalui halaman set-password atau
                  registrasi.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowClearEmailConfirm(false);
              }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setShowClearEmailConfirm(false);
                await _doHandleEdit();
              }}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Ya, Hapus Email &amp; Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteUser}
        onOpenChange={(o) => {
          if (!o) setDeleteUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah kamu yakin ingin menghapus user{" "}
              <span className="font-semibold text-foreground">
                {deleteUser?.username}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
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
  );
}
