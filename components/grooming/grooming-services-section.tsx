"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, CheckCircle2, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllPublicServices, type HomepageService } from "@/lib/api/stores";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

function getLowestPrice(service: HomepageService): number {
  if (service.price_type === "single" && service.price) return service.price;
  if (service.prices && service.prices.length > 0) {
    return Math.min(...service.prices.map((p) => p.price));
  }
  return service.price ?? 0;
}

// ─── Service Card ─────────────────────────────────────────────────────────────
function ServiceCard({ service }: { service: HomepageService }) {
  const lowestPrice = getLowestPrice(service);

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-md">
      {/* Image */}
      <div className="relative h-48 w-full overflow-hidden bg-muted">
        {service.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={service.image_url}
            alt={service.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Scissors className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-base font-bold text-foreground">
          {service.name}
        </h3>

        {service.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {service.description}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-2">
          {/* Duration */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>±{service.duration} menit</span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Mulai dari</span>
            <span className="font-display text-base font-bold text-primary">
              {formatPrice(lowestPrice)}
            </span>
          </div>

          {/* Includes */}
          {service.include && service.include.length > 0 && (
            <ul className="flex flex-col gap-1">
              {service.include.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 text-xs text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="flex-1 rounded-full">
              <Link href="/booking">Booking</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────
export function GroomingServicesSection() {
  const [services, setServices] = useState<HomepageService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllPublicServices()
      .then((res) => {
        const all = res.services ?? [];
        // Keep only services whose service type title contains "grooming"
        setServices(
          all.filter((s) =>
            s.service_type?.title.toLowerCase().includes("grooming"),
          ),
        );
      })
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section id="services" className="bg-muted/30 px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Layanan <span className="text-primary">Grooming</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Pilih layanan yang paling sesuai untuk Pawfriends kamu.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-80 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : services.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground">
            Layanan sedang dimuat. Silakan coba lagi nanti.
          </p>
        )}
      </div>
    </section>
  );
}
