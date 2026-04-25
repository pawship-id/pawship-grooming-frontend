import { Button } from "@/components/ui/button";
import { WA_ADMIN, WA_ELIGIBILITY } from "./constants";

export function MembershipFinalCtaSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-secondary/10 py-24">
      <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground lg:text-4xl">
          Mau grooming lebih praktis
          <br />
          dan konsisten?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Bergabunglah dengan ratusan Pawrents yang sudah mempercayakan
          perawatan anabul mereka kepada Pawship.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="w-full rounded-full px-8 shadow-lg shadow-primary/30 sm:w-auto"
          >
            <a href={WA_ELIGIBILITY} target="_blank" rel="noopener noreferrer">
              👉 Cek Kelayakan Membership
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full rounded-full px-8 sm:w-auto"
          >
            <a href={WA_ADMIN} target="_blank" rel="noopener noreferrer">
              👉 Chat Admin
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
