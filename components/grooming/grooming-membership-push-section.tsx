import Link from "next/link";
import { Button } from "@/components/ui/button";

export function GroomingMembershipPushSection() {
  return (
    <section className="bg-card pb-20">
      <div className="bg-background rounded-3xl mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          </div>

          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Grooming lebih praktis dengan{" "}
            <span className="text-primary">Membership</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Untuk pawrents yang rutin grooming, membership membuat semuanya
            lebih mudah tanpa perlu booking dan bayar setiap kali.
          </p>
          <div className="mt-8">
            <Button
              asChild
              size="lg"
              className="rounded-full px-8 shadow-lg shadow-primary/30"
            >
              <Link href="/membership">Cek Membership</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
