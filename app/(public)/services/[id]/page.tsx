import { notFound } from "next/navigation"
import Link from "next/link"
import { Clock, ArrowLeft, Tag, CheckCircle2, Hash, MapPin, MessageCircle, Store } from "lucide-react"
import { products } from "@/lib/mock-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ServiceCard } from "@/components/service-card"
import { BookingNowModal } from "@/components/booking-now-modal"
import { Separator } from "@/components/ui/separator"

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
}

const categoryColors: Record<string, string> = {
  grooming: "bg-primary/10 text-primary border-primary/20",
  addon: "bg-accent/20 text-accent-foreground border-accent/30",
  spa: "bg-secondary/60 text-secondary-foreground border-secondary/40",
  medical: "bg-destructive/10 text-destructive border-destructive/20",
}

const sizeLabels: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  "extra-large": "Extra Large",
}

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = products.find((p) => p.id === id)

  if (!product) {
    notFound()
  }

  const relatedProducts = products
    .filter((p) => p.id !== product.id && p.isActive)
    .slice(0, 3)

  const hasPrices = product.prices && product.prices.length > 0

  return (
    <main className="flex-1">

        {/* Hero Image */}
        {product.image && (
          <div className="relative h-64 w-full overflow-hidden lg:h-80">
            <img
              src={product.image}
              alt={product.name}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        )}

        <div className="mx-auto max-w-5xl px-6 py-10">
          <Link
            href="/#services"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Link>

          <div className="grid gap-8 lg:grid-cols-3">
            {/* ── Left: Main Info ── */}
            <div className="flex flex-col gap-6 lg:col-span-2">

              {/* Header */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`capitalize ${categoryColors[product.category] || ""}`}>
                    {product.category}
                  </Badge>
                  {product.code && (
                    <div className="flex items-center gap-1 rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-mono text-muted-foreground">
                      <Hash className="h-3 w-3" />
                      {product.code}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{product.duration} menit</span>
                  </div>
                </div>

                <h1 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
                  {product.name}
                </h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              </div>

              {/* Includes */}
              {product.includes && product.includes.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Yang Termasuk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {product.includes.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Pricing Table */}
              {hasPrices ? (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold">Harga per Ukuran</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border/50">
                      {product.prices!.map((p) => (
                        <div key={p.sizeId} className="flex items-center justify-between px-6 py-3">
                          <span className="text-sm font-medium text-foreground">{p.sizeName}</span>
                          <span className="font-display text-base font-bold text-primary">{formatPrice(p.price)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-6">
                  <div>
                    <span className="text-sm text-muted-foreground">Mulai dari</span>
                    <p className="font-display text-3xl font-extrabold text-primary">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>
              )}

              {/* Available Stores */}
              {product.availableStores && product.availableStores.length > 0 && (
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Store className="h-4 w-4 text-primary" />
                      Tersedia di Store
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    {product.availableStores.map((store) => (
                      <div key={store.id} className="flex items-start justify-between gap-4 rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-sm font-semibold text-foreground">{store.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{store.address}</span>
                          </div>
                        </div>
                        {store.whatsapp && (
                          <a
                            href={`https://wa.me/${store.whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0"
                          >
                            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
                              <MessageCircle className="h-3.5 w-3.5" />
                              WA
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* ── Right: Sidebar ── */}
            <div className="flex flex-col gap-4">

              {/* CTA Card */}
              <Card className="sticky top-24 border-border/50">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Mulai dari</p>
                    <p className="font-display text-2xl font-extrabold text-primary">
                      {formatPrice(product.price)}
                    </p>
                  </div>

                  <Separator />

                  {/* Pet Types */}
                  <div className="flex flex-col gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Untuk Hewan</p>
                    <div className="flex flex-wrap gap-1.5">
                      {product.petTypes.map((type) => (
                        <div
                          key={type}
                          className="flex items-center gap-1 rounded-full bg-secondary/60 px-3 py-1 text-xs font-medium capitalize text-secondary-foreground"
                        >
                          <Tag className="h-3 w-3" />
                          {type}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Size Categories */}
                  {product.sizeCategories && product.sizeCategories.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ukuran</p>
                      <div className="flex flex-wrap gap-1.5">
                        {product.sizeCategories.map((size) => (
                          <span
                            key={size}
                            className="rounded-full border border-border/60 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground/70"
                          >
                            {sizeLabels[size] ?? size}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  <BookingNowModal
                    product={product}
                    buttonLabel="Booking Sekarang"
                    buttonSize="lg"
                    buttonClassName="w-full font-display font-bold"
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Related Services */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-border/50 bg-card py-16">
            <div className="mx-auto max-w-7xl px-6">
              <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
                Layanan Lain yang Mungkin Kamu Suka
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {relatedProducts.map((p) => (
                  <ServiceCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          </div>
        )}
    </main>
  )
}
