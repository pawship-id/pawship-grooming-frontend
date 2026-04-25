import { Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WA_ADMIN, WA_ELIGIBILITY } from "./constants";

export function MembershipHeroSection() {
  return (
    <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 px-6 py-24 text-center">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />

      <span className="relative mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary">
        Pawship Membership
      </span>

      <h1 className="relative font-display text-4xl font-extrabold leading-tight text-foreground sm:text-5xl lg:text-6xl">
        Bayar sekali,
        <br />
        <span className="text-primary">Grooming kapanpun.</span>
      </h1>

      <p className="relative mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
        Untuk Pawrents yang siap merawat anabul secara rutin dan jangka panjang,
        tanpa harus ribet berulang kali.
      </p>

      <div className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button
          asChild
          size="lg"
          className="rounded-full px-8 shadow-lg shadow-primary/30"
        >
          <a href={WA_ELIGIBILITY} target="_blank" rel="noopener noreferrer">
            Cek Kelayakan Member
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="rounded-full px-8"
        >
          <a href={WA_ADMIN} target="_blank" rel="noopener noreferrer">
            Chat Admin
          </a>
        </Button>
      </div>

      {/* scroll hint */}
      <a
        href="#video"
        className="relative mt-14 flex animate-bounce flex-col items-center gap-1 text-xs text-muted-foreground"
      >
        <ChevronDown className="h-5 w-5" />
        Scroll
      </a>
    </section>
  );
}
