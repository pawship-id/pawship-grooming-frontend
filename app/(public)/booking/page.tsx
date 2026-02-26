"use client"

import { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { products } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const stores = [
  {
    id: "store-jakarta-selatan",
    name: "Paswhip Kemang",
    address: "Jl. Kemang Raya No. 88, Jakarta Selatan",
  },
  {
    id: "store-jakarta-pusat",
    name: "Paswhip Sudirman",
    address: "Jl. Sudirman No. 45, Jakarta Pusat",
  },
  {
    id: "store-jakarta-barat",
    name: "Paswhip Puri",
    address: "Jl. Puri Indah No. 12, Jakarta Barat",
  },
]

export default function BookingPage() {
  const searchParams = useSearchParams()
  const serviceIdFromQuery = searchParams.get("serviceId")

  const activeServices = useMemo(() => products.filter((item) => item.isActive), [])
  const initialService = activeServices.find((item) => item.id === serviceIdFromQuery)

  const [selectedStoreId, setSelectedStoreId] = useState("")
  const [selectedServiceId, setSelectedServiceId] = useState(initialService?.id ?? "")
  const [bookingCreated, setBookingCreated] = useState(false)

  const selectedStore = stores.find((store) => store.id === selectedStoreId)
  const selectedService = activeServices.find((service) => service.id === selectedServiceId)
  const canCreateBooking = Boolean(selectedStore && selectedService)

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1 bg-muted/20 py-12">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-bold text-foreground">Lanjut Booking</h1>
            <p className="text-sm text-muted-foreground">
              Pilih store terlebih dahulu, lalu pilih service yang ingin dibooking.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pilih Store</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {stores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => {
                    setSelectedStoreId(store.id)
                    setBookingCreated(false)
                  }}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    selectedStoreId === store.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-foreground">{store.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{store.address}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pilih Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>Service</Label>
              <Select
                value={selectedServiceId}
                onValueChange={(value) => {
                  setSelectedServiceId(value)
                  setBookingCreated(false)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih service" />
                </SelectTrigger>
                <SelectContent>
                  {activeServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {canCreateBooking && (
            <Card>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="text-sm text-muted-foreground">
                  <p>
                    Store: <span className="font-semibold text-foreground">{selectedStore?.name}</span>
                  </p>
                  <p>
                    Service: <span className="font-semibold text-foreground">{selectedService?.name}</span>
                  </p>
                </div>

                <Button
                  size="lg"
                  className="w-fit"
                  onClick={() => {
                    setBookingCreated(true)
                  }}
                >
                  Create Booking
                </Button>

                {bookingCreated && (
                  <p className="text-sm text-primary">Booking berhasil dibuat. Tim kami akan menghubungi Anda segera.</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
