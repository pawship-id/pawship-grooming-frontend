"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  PawPrint,
  CalendarClock,
  ShieldCheck,
  Star,
  Building2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ApiError } from "@/lib/api/client";
import { formatDateTime } from "@/lib/format";
import { getUser, type ApiCurrentUser } from "@/lib/api/users";
import { getAdminBookings, type AdminBooking } from "@/lib/api/bookings";
import { getOptions } from "@/lib/api/options";
import { getStoreById } from "@/lib/api/stores";
import { getStatusConfig } from "@/lib/booking-status";
import { formatPrice } from "@/lib/format";

const EMPTY = "-";
const BOOKINGS_PAGE_SIZE = 10;

/**
 * Render a primitive value, falling back to `-` for null/undefined/empty/NaN.
 * Use this for every displayed value so empty state is consistent.
 */
function renderValue(value: unknown): string {
  if (value === null || value === undefined) return EMPTY;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : EMPTY;
  if (typeof value === "string") return value.trim() === "" ? EMPTY : value;
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  return EMPTY;
}

function renderDateTime(value?: string | null): string {
  if (!value) return EMPTY;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? EMPTY : formatDateTime(value);
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="break-words text-sm text-foreground">
        {value === undefined || value === null || value === "" ? EMPTY : value}
      </span>
    </div>
  );
}

function SectionEmpty({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground">{label}</p>
  );
}

function roleVariant(
  role?: string,
): "default" | "secondary" | "outline" | "destructive" {
  if (role === "admin" || role === "ops") return "default";
  if (role === "groomer") return "secondary";
  return "outline";
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params?.id as string;

  const [user, setUser] = useState<ApiCurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [totalBookings, setTotalBookings] = useState<number | null>(null);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingPage, setBookingPage] = useState(1);
  const [customerCategoryName, setCustomerCategoryName] = useState<
    string | null
  >(null);
  const [placementStoreNames, setPlacementStoreNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) return;
      try {
        setLoading(true);
        setNotFound(false);
        setError(null);
        const res = await getUser(userId);
        if (cancelled) return;
        setUser(res.user);

        const catId = res.user?.profile?.customer_category_id;
        if (catId && res.user?.role === "customer") {
          try {
            const opts = await getOptions("customer category");
            if (!cancelled) {
              const match = opts.options?.find((o) => o._id === catId);
              setCustomerCategoryName(match?.name ?? null);
            }
          } catch {
            if (!cancelled) setCustomerCategoryName(null);
          }
        } else if (!cancelled) {
          setCustomerCategoryName(null);
        }

        // Resolve placement store names. Prefer `placements` (array). Falls
        // back to legacy single `placement` for old documents.
        const profile = res.user?.profile;
        const placementIds: string[] =
          Array.isArray(profile?.placements) && profile.placements.length > 0
            ? profile.placements
            : profile?.placement
              ? [profile.placement]
              : [];
        if (placementIds.length > 0 && res.user?.role !== "customer") {
          try {
            const stores = await Promise.all(
              placementIds.map((id) =>
                getStoreById(id)
                  .then((r) => r.store?.name ?? null)
                  .catch(() => null),
              ),
            );
            if (!cancelled) {
              setPlacementStoreNames(
                stores.filter((n): n is string => Boolean(n)),
              );
            }
          } catch {
            if (!cancelled) setPlacementStoreNames([]);
          }
        } else if (!cancelled) {
          setPlacementStoreNames([]);
        }

        if (res.user?.role === "customer") {
          if (!cancelled) setBookingsLoading(true);
          try {
            const bookingsRes = await getAdminBookings({
              customer_id: userId,
              limit: 100,
              page: 1,
            });
            if (!cancelled) {
              setBookings(bookingsRes.bookings ?? []);
              setTotalBookings(bookingsRes.total ?? 0);
            }
          } catch {
            if (!cancelled) {
              setBookings([]);
              setTotalBookings(null);
            }
          } finally {
            if (!cancelled) setBookingsLoading(false);
          }
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat detail pengguna",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">Pengguna tidak ditemukan</p>
        <Button asChild variant="outline">
          <Link href="/admin/users">Kembali ke Pengguna</Link>
        </Button>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-muted-foreground">{error || "Data tidak tersedia"}</p>
        <Button asChild variant="outline">
          <Link href="/admin/users">Kembali ke Pengguna</Link>
        </Button>
      </div>
    );
  }

  const profile = user.profile;
  const addresses = profile?.addresses ?? [];
  const tags = profile?.tags ?? [];
  const groomerSkills = profile?.groomer_skills ?? [];
  const initials = (user.username || "?").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/users"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Kembali ke daftar pengguna"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {profile?.image_url ? (
                <AvatarImage src={profile.image_url} alt={user.username} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-foreground">
                {renderValue(user.username)}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={roleVariant(user.role)} className="capitalize">
                  {renderValue(user.role)}
                </Badge>
                <Badge
                  variant={user.is_active ? "default" : "outline"}
                  className={
                    user.is_active
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : ""
                  }
                >
                  {user.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
                {user.is_idle && <Badge variant="outline">Idle</Badge>}
                {user.code && (
                  <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                    {user.code}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/users?edit=${user._id}`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
          {user.role === "customer" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/users/${user._id}/pets`}>
                <PawPrint className="mr-2 h-4 w-4" />
                Kelola Pet
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card className="border-border/50 lg:row-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <UserIcon className="h-5 w-5 text-primary" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Username" value={renderValue(user.username)} />
            <Field label="Nama Lengkap" value={renderValue(profile?.full_name)} />
            <Field label="Kode Pengguna" value={renderValue(user.code)} />
            <Field label="Role" value={renderValue(user.role)} />
            <Field label="Gender" value={renderValue(profile?.gender)} />
            {user.role === "customer" && (
              <Field
                label="Customer Category"
                value={renderValue(
                  customerCategoryName ?? profile?.customer_category_id,
                )}
              />
            )}
            <Field
              label="Status"
              value={user.is_active ? "Aktif" : "Nonaktif"}
            />
            <Field label="Idle" value={renderValue(user.is_idle)} />
            <div className="sm:col-span-2">
              <Field
                label="Tags"
                value={
                  tags.length === 0 ? (
                    EMPTY
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <Badge key={t} variant="secondary">
                          <Tag className="mr-1 h-3 w-3" />
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )
                }
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Email"
              value={
                user.email ? (
                  <a
                    href={`mailto:${user.email}`}
                    className="text-primary hover:underline"
                  >
                    {user.email}
                  </a>
                ) : (
                  EMPTY
                )
              }
            />
            <Field
              label="Nomor Telepon"
              value={
                user.phone_number ? (
                  <a
                    href={`tel:${user.phone_number}`}
                    className="text-primary hover:underline"
                  >
                    <Phone className="mr-1 inline h-3.5 w-3.5 align-text-bottom" />
                    {user.phone_number}
                  </a>
                ) : (
                  EMPTY
                )
              }
            />
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CalendarClock className="h-5 w-5 text-primary" />
              Riwayat
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Dibuat" value={renderDateTime(user.createdAt)} />
            <Field label="Diperbarui" value={renderDateTime(user.updatedAt)} />
            <Field
              label="Dihapus"
              value={user.isDeleted ? "Ya" : "Tidak"}
            />
          </CardContent>
        </Card>

        {/* Addresses */}
        {user.role === "customer" && (
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Alamat
            </CardTitle>
          </CardHeader>
          <CardContent>
            {addresses.length === 0 ? (
              <SectionEmpty label={EMPTY} />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {addresses.map((addr, idx) => (
                <div
                  key={addr._id ?? idx}
                  className="rounded-lg border border-border/40 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {renderValue(addr.label) === EMPTY
                        ? `Alamat ${idx + 1}`
                        : addr.label}
                    </span>
                    {addr.is_main_address && (
                      <Badge variant="default">Utama</Badge>
                    )}
                    {addr.created_by && (
                      <Badge variant="outline" className="capitalize">
                        Dibuat oleh {addr.created_by}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Jalan" value={renderValue(addr.street)} />
                    <Field label="Kelurahan" value={renderValue(addr.subdistrict)} />
                    <Field label="Kecamatan" value={renderValue(addr.district)} />
                    <Field label="Kota" value={renderValue(addr.city)} />
                    <Field label="Provinsi" value={renderValue(addr.province)} />
                    <Field label="Kode Pos" value={renderValue(addr.postal_code)} />
                    <Field label="Latitude" value={renderValue(addr.latitude)} />
                    <Field label="Longitude" value={renderValue(addr.longitude)} />
                    <div className="sm:col-span-2">
                      <Field label="Catatan" value={renderValue(addr.note)} />
                    </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Placement / Groomer info (non-customer) */}
        {user.role !== "customer" && (
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Building2 className="h-5 w-5 text-primary" />
                {user.role === "groomer" ? "Penempatan & Skill" : "Penempatan"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Lokasi Penempatan"
                value={
                  placementStoreNames.length > 0 ? (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {placementStoreNames.map((name) => (
                        <Badge key={name} variant="secondary">
                          {name}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    renderValue(profile?.placement_store?.name)
                  )
                }
              />
              {user.role === "groomer" && (
                <>
                  <Field
                    label="Groomer Rating"
                    value={
                      typeof profile?.groomer_rating === "number"
                        ? (
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3.5 w-3.5 text-amber-500" />
                              {profile.groomer_rating}
                            </span>
                          )
                        : EMPTY
                    }
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Groomer Skills"
                      value={
                        groomerSkills.length === 0 ? (
                          EMPTY
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {groomerSkills.map((s) => (
                              <Badge key={s} variant="secondary">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )
                      }
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Booking Information */}
        {user.role === "customer" && (
          <Card className="border-border/50 lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Booking Information
                {totalBookings !== null && (
                  <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {totalBookings}
                  </span>
                )}
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/bookings?customer_id=${user._id}`}>
                  Lihat Semua
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {bookingsLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : !bookings || bookings.length === 0 ? (
                <SectionEmpty label={EMPTY} />
              ) : (
                (() => {
                  const totalPages = Math.max(
                    1,
                    Math.ceil(bookings.length / BOOKINGS_PAGE_SIZE),
                  );
                  const safePage = Math.min(bookingPage, totalPages);
                  const start = (safePage - 1) * BOOKINGS_PAGE_SIZE;
                  const pageItems = bookings.slice(
                    start,
                    start + BOOKINGS_PAGE_SIZE,
                  );
                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2">
                        {pageItems.map((b) => (
                          <BookingRow key={b._id} booking={b} />
                        ))}
                      </div>
                      {bookings.length > BOOKINGS_PAGE_SIZE && (
                        <div className="flex items-center justify-between gap-3 pt-1">
                          <span className="text-xs text-muted-foreground">
                            Halaman {safePage} dari {totalPages} ·{" "}
                            {bookings.length} booking
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setBookingPage((p) => Math.max(1, p - 1))
                              }
                              disabled={safePage <= 1}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setBookingPage((p) =>
                                  Math.min(totalPages, p + 1),
                                )
                              }
                              disabled={safePage >= totalPages}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}

function BookingRow({ booking }: { booking: AdminBooking }) {
  const cfg = getStatusConfig(booking.booking_status);
  const petName = booking.pet_snapshot?.name;
  const serviceName = booking.service_snapshot?.name;
  const storeName = booking.store?.name;
  return (
    <Link
      href={`/admin/bookings/${booking._id}`}
      className="flex flex-col gap-2 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">
            {renderValue(petName)}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-sm text-foreground">
            {renderValue(serviceName)}
          </span>
          {booking.code && (
            <span className="font-mono text-xs text-muted-foreground">
              {booking.code}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{renderDateTime(booking.date)}</span>
          {booking.time_range && <span>· {booking.time_range}</span>}
          {storeName && <span>· {storeName}</span>}
          <span className="capitalize">· {renderValue(booking.type)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
        <Badge
          variant="outline"
          className={`capitalize ${cfg.className}`}
        >
          {cfg.label || booking.booking_status}
        </Badge>
        <span className="text-sm font-medium text-foreground">
          {formatPrice(booking.final_total_price ?? 0)}
        </span>
      </div>
    </Link>
  );
}
