"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArrowLeft, MapPin, Phone, Mail, Clock, Building2, Hash, CalendarDays, Scissors, Compass, MessageCircle, Globe, Timer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { getStoreById, type ApiStore } from "@/lib/api/stores"

const DAY_LABELS: Record<string, string> = {
  Monday: "Sen", Tuesday: "Sel", Wednesday: "Rab",
  Thursday: "Kam", Friday: "Jum", Saturday: "Sab", Sunday: "Min",
}

export default function StoreDetailPage() {
  const params = useParams<{ id: string }>()
  const storeId = params?.id

  const [store, setStore] = useState<ApiStore | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchStore = useCallback(async () => {
    if (!storeId) return

    setIsLoading(true)
    setError("")
    try {
      const data = await getStoreById(storeId)
      setStore(data.store)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat detail store.")
      setStore(null)
    } finally {
      setIsLoading(false)
    }
  }, [storeId])

  useEffect(() => {
    fetchStore()
  }, [fetchStore])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      </div>
    )
  }

  if (error || !store) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/admin/stores">
          <Button variant="outline" size="sm" className="w-fit">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Stores
          </Button>
        </Link>
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || "Store tidak ditemukan"}
        </div>
        <Button variant="outline" className="w-fit" onClick={fetchStore}>
          Coba Lagi
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Link href="/admin/stores">
            <Button variant="outline" size="sm" className="w-fit">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke Stores
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{store.name}</h1>
            <p className="text-sm text-muted-foreground">{store.description || "Detail store"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs">
            <Hash className="mr-1 h-3 w-3" />
            {store.code}
          </Badge>
          <Badge variant="outline" className={`text-xs ${store.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {store.is_active ? "Aktif" : "Nonaktif"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Lokasi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs px-4 pb-4">
            <div className="flex items-start gap-1.5 text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                <p>{store.location?.address || "-"}</p>
                <p>{[store.location?.city, store.location?.province].filter(Boolean).join(", ") || "-"}</p>
                <p>{store.location?.postal_code || "-"}</p>
              </div>
            </div>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <Compass className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium text-foreground/60">Koordinat</span>
              {store.location?.latitude ?? "-"}, {store.location?.longitude ?? "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Kontak</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-muted-foreground px-4 pb-4">
            <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 shrink-0" /><span className="font-medium text-foreground/60">Telepon:</span>{store.contact?.phone_number || "-"}</p>
            <p className="flex items-center gap-1.5"><MessageCircle className="h-3.5 w-3.5 shrink-0" /><span className="font-medium text-foreground/60">WhatsApp:</span>{store.contact?.whatsapp || "-"}</p>
            <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 shrink-0" /><span className="font-medium text-foreground/60">Email:</span>{store.contact?.email || "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Operasional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-muted-foreground px-4 pb-4">
            <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 shrink-0" /><span className="font-medium text-foreground/60">Jam:</span>{store.operational?.opening_time || "-"} - {store.operational?.closing_time || "-"}</p>
            <p className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 shrink-0" /><span className="font-medium text-foreground/60">Timezone:</span>{store.operational?.timezone || "-"}</p>
            <p className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 shrink-0" /><span className="font-medium text-foreground/60">Hari:</span>{store.operational?.operational_days?.length ? store.operational.operational_days.map((d) => DAY_LABELS[d] ?? d).join(", ") : "-"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm">Kapasitas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs text-muted-foreground px-4 pb-4">
            <p className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 shrink-0" /><span className="font-medium text-foreground/60">Kapasitas Harian:</span>{store.capacity?.default_daily_capacity_minutes ?? "-"} menit</p>
            <p className="flex items-center gap-1.5"><Timer className="h-3.5 w-3.5 shrink-0" /><span className="font-medium text-foreground/60">Batas Overbooking:</span>{store.capacity?.overbooking_limit_minutes ?? "-"} menit</p>
          </CardContent>
        </Card>
      </div>

      {store.services && store.services.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Scissors className="h-4 w-4" />
              Layanan Tersedia
              <Badge variant="secondary" className="ml-1 text-xs">{store.services.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {store.services.map((service) => (
              <div
                key={service._id}
                className="flex flex-col gap-3 rounded-lg border p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="font-medium leading-tight">{service.name}</p>
                    <span className="font-mono text-xs text-muted-foreground">{service.code}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-xs ${service.is_active ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}
                  >
                    {service.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </div>

                {service.description && (
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap">{service.description}</p>
                )}

                <Separator />

                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">Tipe</span>
                    <Badge variant="outline" className="text-xs">{service.service_type?.name ?? "-"}</Badge>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="w-20 shrink-0 text-xs text-muted-foreground">Durasi</span>
                    <span className="text-xs">{service.duration} menit</span>
                  </div>
                  {service.pet_types && service.pet_types.length > 0 && (
                    <div className="flex justify-between flex-wrap items-center gap-2">
                      <span className="w-20 shrink-0 text-xs text-muted-foreground">Hewan</span>
                      <div className="flex flex-wrap items-center gap-1">
                        {service.pet_types.map((pt) => (
                          <Badge key={pt._id} variant="secondary" className="text-xs">{pt.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {service.prices.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-1">
                      {service.prices.map((p) => (
                        <div key={p.size_id} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{p.name}</span>
                          <span className="font-medium">Rp {p.price.toLocaleString("id-ID")}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground flex items-center gap-4">
        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Dibuat: {new Date(store.createdAt).toLocaleString("id-ID")}</span>
        <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Diperbarui: {new Date(store.updatedAt).toLocaleString("id-ID")}</span>
      </div>
    </div>
  )
}
