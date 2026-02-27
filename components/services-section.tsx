import { products } from "@/lib/mock-data"
import { ServiceCard } from "@/components/service-card"

export function ServicesSection() {
  const activeProducts = products.filter((p) => p.isActive)
  const mainServices = activeProducts.filter((p) => p.category === "grooming" || p.category === "spa" || p.category === "medical")
  const addOns = activeProducts.filter((p) => p.category === "addon")

  return (
    <section id="services" className="bg-card py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            Our Services
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Everything Your Pet Needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            Professional grooming services tailored to every breed and size
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {mainServices.map((product) => (
            <ServiceCard key={product.id} product={product} />
          ))}
        </div>

        {addOns.length > 0 && (
          <div className="mt-16">
            <div className="mb-8 text-center">
              <span className="mb-2 inline-block rounded-full bg-accent/20 px-3 py-1 text-xs font-semibold text-accent-foreground">
                Add-Ons
              </span>
              <h3 className="font-display text-2xl font-bold text-foreground">
                Enhance Your Visit
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Extra care options you can add to any service
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {addOns.map((product) => (
                <ServiceCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
