import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function GroomingHeroSection() {
  return (
    <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-6 py-24 text-center">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-secondary/20 blur-3xl" />

      <Badge className="relative mb-5 rounded-full bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15">
        Pawship Grooming
      </Badge>

      <h1 className="relative font-display text-4xl font-extrabold leading-tight text-foreground sm:text-5xl lg:text-6xl">
        Grooming Bersih,
        <br />
        <span className="text-primary">Aman dan Terpercaya</span>
      </h1>

      <p className="relative mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Setiap anabul dirawat dengan standar tinggi — tanpa terburu-buru dan
        tanpa kompromi.
      </p>

      <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button
          asChild
          size="lg"
          className="rounded-full px-8 shadow-lg shadow-primary/30"
        >
          <Link href="/booking">Booking Grooming Sekarang</Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-full px-8"
        >
          <Link href="/membership">Lihat Membership</Link>
        </Button>
      </div>

      {/* Scroll hint */}
      <a
        href="#usp"
        className="relative mt-14 flex animate-bounce flex-col items-center gap-1 text-xs text-muted-foreground"
      >
        <ChevronDown className="h-5 w-5" />
        Scroll
      </a>
    </section>
  );
}
