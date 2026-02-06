import Image from "next/image"
import Link from "next/link"
import { ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-background">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-20 text-center lg:py-28">
        <Image
          src="/images/pawship-square-logo.png"
          alt="PAWship Logo"
          width={160}
          height={160}
          style={{ width: "auto", height: "auto" }}
          className="h-32 lg:h-40"
          priority
        />

        <div className="flex max-w-2xl flex-col gap-4">
          <h1 className="text-balance font-display text-4xl font-extrabold tracking-tight text-foreground lg:text-6xl">
            Premium Pet Grooming, Made with Love
          </h1>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground lg:text-xl">
            From refreshing baths to full grooming transformations, we keep your furry friends looking and feeling their best. Available in-store and at your home.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button asChild size="lg" className="font-display font-bold">
            <Link href="/#services">Explore Services</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="font-display font-bold bg-transparent">
            <Link href="/#contact">Get in Touch</Link>
          </Button>
        </div>

        <Link
          href="/#services"
          className="mt-8 flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
          aria-label="Scroll to services"
        >
          <span className="text-xs font-medium">Our Services</span>
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </Link>
      </div>

      {/* Decorative elements */}
      <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-secondary/30" aria-hidden="true" />
      <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-accent/20" aria-hidden="true" />
    </section>
  )
}
