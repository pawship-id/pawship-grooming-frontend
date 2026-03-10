"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { getStores, getStoreById } from "@/lib/api/stores"
import type { ApiStore } from "@/lib/api/stores"
import { getUsers, getUser } from "@/lib/api/users"
import type { ApiUser } from "@/lib/api/users"
import { getAdminServices } from "@/lib/api/services"
import type { AdminService } from "@/lib/api/services"
import { getServiceTypes } from "@/lib/api/service-types"
import type { ApiServiceType } from "@/lib/api/service-types"
import { createAdminBooking } from "@/lib/api/bookings"

interface PetOption {
  _id: string
  name: string
}

const DEFAULT_FORM = {
  store_id: "",
  service_type_id: "",
  customer_id: "",
  pet_id: "",
  service_id: "",
  date: "",
  time_range: "",
  travel_fee: "",
  referal_code: "",
  payment_method: "",
  note: "",
}

export default function NewBookingPage() {
  const router = useRouter()
  const [form, setForm] = useState(DEFAULT_FORM)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const [stores, setStores] = useState<ApiStore[]>([])
  const [serviceTypes, setServiceTypes] = useState<ApiServiceType[]>([])
  const [customers, setCustomers] = useState<ApiUser[]>([])
  const [sessions, setSessions] = useState<string[]>([])
  const [services, setServices] = useState<AdminService[]>([])
  const [pets, setPets] = useState<PetOption[]>([])

  const [loadingInit, setLoadingInit] = useState(true)
  const [loadingStore, setLoadingStore] = useState(false)
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingPets, setLoadingPets] = useState(false)

  useEffect(() => {
    Promise.all([
      getStores({ page: 1, limit: 100, is_active: "true" }),
      getServiceTypes({ is_active: "true" }),
      getUsers({ page: 1, limit: 200, role: "customer" }),
    ])
      .then(([storesRes, typesRes, usersRes]) => {
        setStores(storesRes.stores)
        setServiceTypes(typesRes.serviceTypes)
        setCustomers(usersRes.users)
      })
      .catch(() => toast.error("Gagal memuat data awal"))
      .finally(() => setLoadingInit(false))
  }, [])

  const fetchServices = async (storeId: string, typeId: string) => {
    setLoadingServices(true)
    try {
      const res = await getAdminServices({
        store_id: storeId,
        service_type_id: typeId,
        is_active: "true",
        limit: 100,
      })
      setServices(res.services)
    } catch {
      toast.error("Gagal memuat layanan")
    } finally {
      setLoadingServices(false)
    }
  }

  const handleStoreChange = async (storeId: string) => {
    setForm((p) => ({ ...p, store_id: storeId, time_range: "", service_id: "" }))
    setSelectedAddonIds([])
    setSessions([])
    setServices([])
    if (!storeId) return
    setLoadingStore(true)
    try {
      const res = await getStoreById(storeId)
      setSessions(res.store.sessions ?? [])
      if (form.service_type_id) await fetchServices(storeId, form.service_type_id)
    } catch {
      toast.error("Gagal memuat data store")
    } finally {
      setLoadingStore(false)
    }
  }

  const handleServiceTypeChange = async (typeId: string) => {
    setForm((p) => ({ ...p, service_type_id: typeId, service_id: "" }))
    setSelectedAddonIds([])
    setServices([])
    if (form.store_id && typeId) await fetchServices(form.store_id, typeId)
  }

  const handleCustomerChange = async (customerId: string) => {
    setForm((p) => ({ ...p, customer_id: customerId, pet_id: "" }))
    setPets([])
    if (!customerId) return
    setLoadingPets(true)
    try {
      const res = await getUser(customerId)
      setPets((res.user.pets ?? []).map((p) => ({ _id: p._id, name: p.name })))
    } catch {
      toast.error("Gagal memuat data hewan customer")
    } finally {
      setLoadingPets(false)
    }
  }

  const selectedService = services.find((s) => s._id === form.service_id)
  const addons = selectedService?.addons ?? []

  const toggleAddon = (id: string) =>
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.store_id) { toast.error("Pilih store terlebih dahulu"); return }
    if (!form.service_type_id) { toast.error("Pilih tipe layanan terlebih dahulu"); return }
    if (!form.customer_id) { toast.error("Pilih customer terlebih dahulu"); return }
    if (!form.pet_id) { toast.error("Pilih hewan peliharaan terlebih dahulu"); return }
    if (!form.service_id) { toast.error("Pilih layanan terlebih dahulu"); return }
    if (!form.date) { toast.error("Pilih tanggal terlebih dahulu"); return }
    if (!form.time_range) { toast.error("Pilih sesi waktu terlebih dahulu"); return }

    setSubmitting(true)
    try {
      await createAdminBooking({
        service_type_id: form.service_type_id,
        customer_id: form.customer_id,
        pet_id: form.pet_id,
        store_id: form.store_id,
        service_id: form.service_id,
        date: form.date,
        time_range: form.time_range,
        service_addon_ids: selectedAddonIds.length > 0 ? selectedAddonIds : undefined,
        travel_fee: form.travel_fee ? Number(form.travel_fee) : undefined,
        referal_code: form.referal_code || undefined,
        payment_method: form.payment_method || undefined,
        note: form.note || undefined,
      })
      toast.success("Booking berhasil dibuat")
      router.push("/admin/bookings")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat booking")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/bookings"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">New Booking</h1>
          <p className="text-sm text-muted-foreground">Buat jadwal grooming baru</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-2">
        {/* Store & Schedule */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Store &amp; Jadwal</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Store</Label>
              <Select value={form.store_id} onValueChange={handleStoreChange} disabled={loadingInit}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingInit ? "Memuat..." : "Pilih store"} />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Sesi Waktu</Label>
              <Select
                value={form.time_range}
                onValueChange={(v) => setForm((p) => ({ ...p, time_range: v }))}
                disabled={sessions.length === 0 || loadingStore}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingStore ? "Memuat..." : sessions.length === 0 ? "Pilih store dulu" : "Pilih sesi"} />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="travel_fee">Biaya Perjalanan (IDR, opsional)</Label>
              <Input
                id="travel_fee"
                type="number"
                min={0}
                placeholder="0"
                value={form.travel_fee}
                onChange={(e) => setForm((p) => ({ ...p, travel_fee: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Customer & Pet */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Customer &amp; Hewan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Customer</Label>
              <Select value={form.customer_id} onValueChange={handleCustomerChange} disabled={loadingInit}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingInit ? "Memuat..." : "Pilih customer"} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.username} — {c.phone_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Hewan Peliharaan</Label>
              <Select
                value={form.pet_id}
                onValueChange={(v) => setForm((p) => ({ ...p, pet_id: v }))}
                disabled={!form.customer_id || loadingPets}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingPets ? "Memuat..." : !form.customer_id ? "Pilih customer dulu" : pets.length === 0 ? "Tidak ada hewan" : "Pilih hewan"} />
                </SelectTrigger>
                <SelectContent>
                  {pets.map((p) => (
                    <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Service & Add-ons */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Layanan &amp; Add-ons</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Tipe Layanan</Label>
              <Select value={form.service_type_id} onValueChange={handleServiceTypeChange} disabled={loadingInit}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingInit ? "Memuat..." : "Pilih tipe layanan"} />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((t) => (
                    <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Layanan Utama</Label>
              <Select
                value={form.service_id}
                onValueChange={(v) => { setForm((p) => ({ ...p, service_id: v })); setSelectedAddonIds([]) }}
                disabled={services.length === 0 || loadingServices}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingServices ? "Memuat..." : services.length === 0 ? "Pilih store & tipe layanan dulu" : "Pilih layanan"} />
                </SelectTrigger>
                <SelectContent>
                  {services.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {addons.length > 0 && (
              <div className="flex flex-col gap-3">
                <Label>Add-ons</Label>
                {addons.map((addon) => (
                  <div key={addon._id} className="flex items-center gap-3">
                    <Checkbox
                      id={addon._id}
                      checked={selectedAddonIds.includes(addon._id)}
                      onCheckedChange={() => toggleAddon(addon._id)}
                    />
                    <label htmlFor={addon._id} className="cursor-pointer text-sm text-foreground">
                      {addon.name}
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes & Optional */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">Catatan &amp; Info Tambahan</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="note">Catatan (opsional)</Label>
              <Textarea
                id="note"
                placeholder="Permintaan khusus atau catatan mengenai hewan..."
                rows={3}
                value={form.note}
                onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="payment_method">Metode Pembayaran (opsional)</Label>
              <Select
                value={form.payment_method}
                onValueChange={(v) => setForm((p) => ({ ...p, payment_method: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih metode pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="qris">QRIS</SelectItem>
                  <SelectItem value="card">Kartu Debit/Kredit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="referal_code">Referral Code (opsional)</Label>
              <Input
                id="referal_code"
                placeholder="FRIEND20"
                value={form.referal_code}
                onChange={(e) => setForm((p) => ({ ...p, referal_code: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-3 lg:col-span-2">
          <Button type="submit" className="font-display font-bold" disabled={submitting}>
            {submitting ? "Menyimpan..." : "Buat Booking"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/bookings">Batal</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
