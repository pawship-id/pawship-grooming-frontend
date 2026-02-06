import { notFound } from "next/navigation"
import Link from "next/link"
import { Clock, ArrowLeft, Tag } from "lucide-react"
import { products } from "@/lib/mock-data"
import { PublicNavbar } from "@/components/public-navbar"
import { PublicFooter } from "@/components/public-footer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ServiceCard } from "@/components/service-card"

function formatPrice(price: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price)
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

  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <Link
            href="/#services"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Link>

          <Card className="border-border/50">
            <CardContent className="flex flex-col gap-6 p-8">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 capitalize">
                  {product.category}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{product.duration} minutes</span>
                </div>
              </div>

              <h1 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
                {product.name}
              </h1>

              <p className="text-lg leading-relaxed text-muted-foreground">
                {product.description}
              </p>

              <div className="flex items-center gap-4 rounded-xl bg-muted/50 p-6">
                <div>
                  <span className="text-sm text-muted-foreground">Starting from</span>
                  <p className="font-display text-3xl font-extrabold text-primary">
                    {formatPrice(product.price)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="font-display text-sm font-bold text-foreground">Available for</h3>
                <div className="flex flex-wrap gap-2">
                  {product.petTypes.map((type) => (
                    <div
                      key={type}
                      className="flex items-center gap-1 rounded-full bg-secondary/60 px-3 py-1 text-sm capitalize text-secondary-foreground"
                    >
                      <Tag className="h-3 w-3" />
                      {type}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
                <p className="text-sm text-accent-foreground">
                  To book this service, please contact us via phone or WhatsApp. Our team will help you schedule the perfect appointment for your pet.
                </p>
              </div>

              <Button asChild size="lg" className="w-fit font-display font-bold">
                <Link href="/#contact">Contact Us to Book</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {relatedProducts.length > 0 && (
          <div className="border-t border-border/50 bg-card py-16">
            <div className="mx-auto max-w-7xl px-6">
              <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
                Other Services You May Like
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
      <PublicFooter />
    </div>
  )
}
