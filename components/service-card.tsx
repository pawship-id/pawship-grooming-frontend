import Link from "next/link"
import { Clock, ArrowRight, CheckCircle2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookingNowModal } from "@/components/booking-now-modal"
import type { Product } from "@/lib/types"

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

export function ServiceCard({ product }: { product: Product }) {
  return (
    <Card className="group h-full border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md overflow-hidden">
      {/* Service Image */}
      {product.image && (
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        </div>
      )}

      <CardContent className="flex h-full flex-col gap-4 p-6">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={categoryColors[product.category] || ""}>
            {product.category}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{product.duration} min</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        </div>

        {/* Includes List */}
        {product.includes && product.includes.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Termasuk:</p>
            <ul className="flex flex-col gap-1">
              {product.includes.map((item, index) => (
                <li key={index} className="flex items-start gap-2 text-xs text-foreground/80">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* <div className="mt-auto flex flex-col gap-3 pt-2 border-t border-border/50">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            <div className="flex flex-wrap gap-1 justify-end">
              {product.petTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button asChild variant="ghost" className="px-0 text-xs font-medium text-muted-foreground hover:text-primary">
              <Link href={`/services/${product.id}`}>
                Details <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
            <BookingNowModal product={product} buttonSize="sm" />
          </div>
        </div> */}
      </CardContent>
    </Card>
  )
}

