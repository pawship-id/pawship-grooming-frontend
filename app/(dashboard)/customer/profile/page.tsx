"use client"

import { useEffect, useState } from "react"
import { Mail, Phone, Shield, Calendar, User, Weight, Tag } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { getCurrentUser, type ApiCurrentUser, type ApiPet } from "@/lib/api/users"

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function PetCard({ pet }: { pet: ApiPet }) {
  const activeMembership = pet.memberships.find((m) => m.status === "active")

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{pet.name}</CardTitle>
          <Badge
            variant="outline"
            className={pet.is_active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-100 text-gray-500"}
          >
            {pet.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <div className="grid gap-3 sm:grid-cols-2">
          {pet.pet_type && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground">Type</span>
              <span className="text-xs font-medium">{pet.pet_type.name}</span>
            </div>
          )}
          {pet.breed && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground">Breed</span>
              <span className="text-xs font-medium">{pet.breed.name}</span>
            </div>
          )}
          {pet.size && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground">Size</span>
              <span className="text-xs font-medium">{pet.size.name}</span>
            </div>
          )}
          {pet.weight != null && (
            <div className="flex items-start gap-2">
              <Weight className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-xs font-medium">{pet.weight} kg</span>
            </div>
          )}
          {pet.member_category && (
            <div className="flex items-start gap-2 sm:col-span-2">
              <Tag className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-xs font-medium">{pet.member_category.name}</span>
            </div>
          )}
        </div>
        {pet.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {pet.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        {activeMembership && (
          <div className="mt-3 rounded-md bg-primary/5 p-3">
            <p className="text-xs font-medium text-primary mb-1">Active Membership</p>
            <p className="text-xs text-muted-foreground">
              {formatDate(activeMembership.start_date)} – {formatDate(activeMembership.end_date)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<ApiCurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCurrentUser()
      .then((res) => setProfile(res.user))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat profil"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-16 w-16 rounded-full" />
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-56" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {error ?? "Profil tidak ditemukan."}
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = profile.username
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">Informasi akun dan hewan peliharaan Anda</p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl">{profile.username}</CardTitle>
              <Badge variant="outline" className="w-fit bg-green-50 text-green-700 border-green-200">
                Customer
              </Badge>
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Username</p>
                <p className="text-sm font-medium">{profile.username}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Phone Number</p>
                <p className="text-sm font-medium">{profile.phone_number || "-"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="text-sm font-medium">{profile.is_active ? "Active" : "Inactive"}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-sm font-medium">{formatDate(profile.createdAt)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {profile.pets && profile.pets.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-foreground">My Pets ({profile.pets.length})</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.pets.map((pet) => (
              <PetCard key={pet._id} pet={pet} />
            ))}
          </div>
        </div>
      )}

      {profile.pets && profile.pets.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Belum ada hewan peliharaan yang terdaftar.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
