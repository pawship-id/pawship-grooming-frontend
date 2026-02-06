import Link from "next/link"
import { Clock, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
    <Link href={`/services/${product.id}`}>
      <Card className="group h-full border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:shadow-md">
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

          <div className="flex flex-1 flex-col gap-2">
            <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
              {product.name}
            </h3>
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="font-display text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-primary">
              Details <ArrowRight className="h-3 w-3" />
            </span>
          </div>

          <div className="flex flex-wrap gap-1">
            {product.petTypes.map((type) => (
              <span
                key={type}
                className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground"
              >
                {type}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
