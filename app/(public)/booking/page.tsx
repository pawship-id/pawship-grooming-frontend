"use client"

import { Suspense, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { MapPin, Clock, CheckCircle2, MessageCircle, Check, Plus, Minus, ChevronRight, Hash } from "lucide-react"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { products, mockStores } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import type { AvailableStore, Product } from "@/lib/types"

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

// ── Store Card ──────────────────────────────────────────────────────────────
function StoreCard({
  store,
  selected,
  onSelect,
}: {
  store: AvailableStore
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative w-full rounded-2xl border-2 p-5 text-left transition-all duration-200 ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {selected && (
        <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
          <Check className="h-3.5 w-3.5 text-primary-foreground" />
        </span>
      )}
      <p className={`font-display text-base font-bold ${selected ? "text-primary" : "text-foreground"}`}>
        {store.name}
      </p>
      <div className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{store.address}</span>
      </div>
      {store.whatsapp && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>WhatsApp tersedia</span>
        </div>
      )}
    </button>
  )
}

// ── Service Card (selectable) ───────────────────────────────────────────────
function SelectableServiceCard({
  product,
  selected,
  onSelect,
}: {
  product: Product
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative flex w-full flex-col overflow-hidden rounded-2xl border-2 text-left transition-all duration-200 ${
        selected
          ? "border-primary shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      {/* Image */}
      {product.image && !product.image.startsWith("/placeholder") && (
        <div className="relative h-36 w-full overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          {selected && (
            <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow">
              <Check className="h-4 w-4 text-primary-foreground" />
            </span>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.code && (
          <span className="flex w-fit items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
            <Hash className="h-2.5 w-2.5" />
            {product.code}
          </span>
        )}
        <p className={`font-display text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>
          {product.name}
        </p>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{product.description}</p>

        {/* Includes */}
        {product.includes && product.includes.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1">
            {product.includes.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/70">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-display text-sm font-bold text-primary">{formatPrice(product.price)}</span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {product.duration} min
          </div>
        </div>
      </div>
    </button>
  )
}

// ── Add-on Card (multi-selectable) ─────────────────────────────────────────
function SelectableAddonCard({
  product,
  selected,
  onToggle,
}: {
  product: Product
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative flex w-full flex-col rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`font-display text-sm font-bold ${selected ? "text-primary" : "text-foreground"}`}>
          {product.name}
        </p>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            selected ? "border-primary bg-primary" : "border-border"
          }`}
        >
          {selected ? (
            <Minus className="h-3 w-3 text-primary-foreground" />
          ) : (
            <Plus className="h-3 w-3 text-muted-foreground" />
          )}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{product.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="font-display text-sm font-bold text-primary">{formatPrice(product.price)}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {product.duration} min
        </div>
      </div>
    </button>
  )
}

// ── Step Header ─────────────────────────────────────────────────────────────
function StepHeader({ step, title, done }: { step: number; title: string; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {done ? <Check className="h-4 w-4" /> : step}
      </span>
      <h2 className="font-display text-lg font-bold text-foreground">{title}</h2>
    </div>
  )
}

// ── Main Booking Content ─────────────────────────────────────────────────────
function BookingContent() {
  const searchParams = useSearchParams()
  const serviceIdFromQuery = searchParams.get("serviceId")

  const mainServices = useMemo(
    () => products.filter((p) => p.isActive && p.category !== "addon"),
    []
  )
  const addOns = useMemo(
    () => products.filter((p) => p.isActive && p.category === "addon"),
    []
  )

  const initialService = mainServices.find((p) => p.id === serviceIdFromQuery)

  const [selectedStoreId, setSelectedStoreId] = useState("")
  const [selectedServiceId, setSelectedServiceId] = useState(initialService?.id ?? "")
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [bookingCreated, setBookingCreated] = useState(false)

  const selectedStore = mockStores.find((s) => s.id === selectedStoreId)
  const selectedService = mainServices.find((s) => s.id === selectedServiceId)
  const selectedAddons = addOns.filter((a) => selectedAddonIds.includes(a.id))

  const totalPrice =
    (selectedService?.price ?? 0) + selectedAddons.reduce((sum, a) => sum + a.price, 0)

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setBookingCreated(false)
  }

  return (
    <main className="flex-1 bg-muted/20 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-foreground">Book a Service</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih store, layanan, dan add-on yang kamu inginkan.
          </p>
        </div>

        {/* ── Step 1: Store ── */}
        <section className="flex flex-col gap-4">
          <StepHeader step={1} title="Pilih Store" done={!!selectedStore} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mockStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                selected={selectedStoreId === store.id}
                onSelect={() => {
                  setSelectedStoreId(store.id)
                  setSelectedServiceId("")
                  setSelectedAddonIds([])
                  setBookingCreated(false)
                }}
              />
            ))}
          </div>
        </section>

        {/* ── Step 2: Service ── */}
        {selectedStore && (
          <section className="flex flex-col gap-4">
            <StepHeader step={2} title="Pilih Layanan Grooming" done={!!selectedService} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
              {mainServices.map((svc) => (
                <SelectableServiceCard
                  key={svc.id}
                  product={svc}
                  selected={selectedServiceId === svc.id}
                  onSelect={() => {
                    setSelectedServiceId(svc.id)
                    setSelectedAddonIds([])
                    setBookingCreated(false)
                  }}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Step 3: Add-ons ── */}
        {selectedService && (
          <section className="flex flex-col gap-4">
            <StepHeader
              step={3}
              title="Tambah Add-On (opsional)"
              done={selectedAddonIds.length > 0}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {addOns.map((addon) => (
                <SelectableAddonCard
                  key={addon.id}
                  product={addon}
                  selected={selectedAddonIds.includes(addon.id)}
                  onToggle={() => toggleAddon(addon.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Summary & Confirm ── */}
        {selectedService && selectedStore && (
          <section className="flex flex-col gap-4">
            <StepHeader step={4} title="Ringkasan Booking" done={bookingCreated} />
            <Card className="border-border/60">
              <CardContent className="flex flex-col gap-4 p-6">
                {/* Store */}
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Store</p>
                    <p className="text-sm font-semibold text-foreground">{selectedStore.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedStore.address}</p>
                  </div>
                </div>

                <Separator />

                {/* Service */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Layanan</p>
                    <p className="text-sm font-semibold text-foreground">{selectedService.name}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {selectedService.duration} min
                    </div>
                  </div>
                  <span className="font-display text-sm font-bold text-primary">
                    {formatPrice(selectedService.price)}
                  </span>
                </div>

                {/* Add-ons */}
                {selectedAddons.length > 0 && (
                  <>
                    <Separator />
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">Add-On</p>
                      {selectedAddons.map((addon) => (
                        <div key={addon.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="bg-accent/20 text-accent-foreground border-accent/30 text-[10px]">
                              add-on
                            </Badge>
                            <span className="text-sm text-foreground">{addon.name}</span>
                          </div>
                          <span className="text-sm font-medium text-primary">{formatPrice(addon.price)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between">
                  <p className="font-display text-base font-bold text-foreground">Total</p>
                  <p className="font-display text-xl font-extrabold text-primary">{formatPrice(totalPrice)}</p>
                </div>

                {!bookingCreated ? (
                  <Button
                    size="lg"
                    className="w-full font-display font-bold"
                    onClick={() => setBookingCreated(true)}
                  >
                    Konfirmasi Booking
                  </Button>
                ) : (
                  <div className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm text-primary font-medium">
                      Booking berhasil dibuat! Tim kami akan menghubungi kamu segera.
                    </p>
                  </div>
                )}

                {selectedStore.whatsapp && (
                  <a
                    href={`https://wa.me/${selectedStore.whatsapp}?text=Halo! Saya ingin booking ${selectedService.name} di ${selectedStore.name}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="lg" className="w-full gap-2 font-display font-bold">
                      <MessageCircle className="h-4 w-4" />
                      Chat via WhatsApp
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </main>
  )
}

export default function BookingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <Suspense fallback={<main className="flex-1 bg-muted/20 py-12" />}>
        <BookingContent />
      </Suspense>
      <PublicFooter />
    </div>
  )
}
