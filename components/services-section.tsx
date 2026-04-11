"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clock, ArrowRight, CheckCircle2, Tag } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getHomepageServiceTypes,
  getHomepageServices,
  type HomepageServiceType,
  type HomepageService,
} from "@/lib/api/stores"

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

function getLowestPrice(service: HomepageService): number {
  if (service.price_type === "single" && service.price) {
    return service.price
  }
  if (service.prices && service.prices.length > 0) {
    return Math.min(...service.prices.map((p) => p.price))
  }
  return service.price ?? 0
}

function ServiceTypeCard({ serviceType }: { serviceType: HomepageServiceType }) {
  const [detailOpen, setDetailOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setDetailOpen(true)}
        className="group relative flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted transition-all duration-200 hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {serviceType.image_url && (
          <img
            src={serviceType.image_url}
            alt={serviceType.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-black/50 transition-colors group-hover:bg-black/40" />
        <h3 className="relative z-10 font-display text-xl font-extrabold uppercase tracking-wider text-white drop-shadow-md sm:text-2xl">
          {serviceType.title}
        </h3>
      </button>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              {serviceType.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {serviceType.image_url && (
              <div className="relative h-48 w-full overflow-hidden rounded-lg">
                <img
                  src={serviceType.image_url}
                  alt={serviceType.title}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            {serviceType.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {serviceType.description}
              </p>
            )}
            <Button asChild className="w-full font-display font-bold">
              <Link href="/booking">Booking Sekarang</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function HomepageServiceCard({ service }: { service: HomepageService }) {
  const [includesModalOpen, setIncludesModalOpen] = useState(false)
  const lowestPrice = getLowestPrice(service)
  const hasMultiplePrices = service.price_type === "multiple" && service.prices && service.prices.length > 1

  return (
    <>
      <Card className="group flex h-full flex-col border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md overflow-hidden">
        <CardContent className="flex flex-1 flex-col gap-4 p-6">
          <div className="flex items-start justify-between gap-2">
            {service.service_type && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                {service.service_type.title}
              </Badge>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{service.duration} min</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {service.name}
            </h3>
            {service.description && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {service.description}
              </p>
            )}
          </div>

          {service.include && service.include.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setIncludesModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-primary transition-colors text-left group/btn"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>Termasuk ({service.include.length})</span>
                <ArrowRight className="h-3 w-3 transition-transform group-hover/btn:translate-x-0.5" />
              </button>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold text-primary">
                {hasMultiplePrices ? `Mulai ${formatPrice(lowestPrice)}` : formatPrice(lowestPrice)}
              </span>
              {service.pet_types && service.pet_types.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-end">
                  {service.pet_types.map((type) => (
                    <span
                      key={type._id}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground"
                    >
                      {type.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Button asChild className="font-display font-bold">
              <Link href="/booking">Booking Sekarang</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Includes modal */}
      <Dialog open={includesModalOpen} onOpenChange={setIncludesModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold">
              Yang Termasuk dalam {service.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2.5">
              {service.include?.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ServiceTypeSkeleton() {
  return <Skeleton className="h-32 w-full rounded-xl" />
}

function ServiceSkeleton() {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardContent className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="mt-auto pt-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ServicesSection() {
  const [serviceTypes, setServiceTypes] = useState<HomepageServiceType[]>([])
  const [services, setServices] = useState<HomepageService[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [stRes, svcRes] = await Promise.all([
          getHomepageServiceTypes(),
          getHomepageServices(),
        ])
        setServiceTypes(stRes.serviceTypes ?? [])
        setServices(svcRes.services ?? [])
      } catch (err) {
        console.error("Failed to fetch homepage services:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (!loading && serviceTypes.length === 0 && services.length === 0) {
    return null
  }

  return (
    <section id="services" className="bg-card py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Layanan Kami
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Semua yang Hewan Peliharaanmu Butuhkan
          </h2>
          <p className="mt-3 text-muted-foreground">
            Grooming, daycare, hotel, dan berbagai layanan profesional untuk hewan kesayanganmu
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)]"><ServiceTypeSkeleton /></div>)
            : serviceTypes.map((st) => <div key={st._id} className="w-[calc(50%-6px)] sm:w-[calc(33.333%-8px)] lg:w-[calc(25%-9px)]"><ServiceTypeCard serviceType={st} /></div>)
          }
        </div>

        {(loading || services.length > 0) && (
          <div className="mt-16">
            <div className="mb-8 text-center">
              <span className="mb-2 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground">
                Detail Layanan
              </span>
              <h3 className="font-display text-2xl font-bold text-foreground">
                Pilihan Layanan Unggulan
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Layanan terbaik yang kami tawarkan untuk hewan kesayanganmu
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(25%-12px)]"><ServiceSkeleton /></div>)
                : services.map((svc) => <div key={svc._id} className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-11px)] xl:w-[calc(25%-12px)]"><HomepageServiceCard service={svc} /></div>)
              }
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
