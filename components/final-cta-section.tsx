import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function FinalCtaSection() {
  return (
    <section className="bg-background py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-10 overflow-hidden rounded-2xl md:flex-row md:gap-0">
          {/* Image */}
          <div className="w-full flex-shrink-0 md:w-[45%]">
            <Image
              src="https://placedog.net/600/400?id=10"
              alt="Happy pawfriend"
              width={600}
              height={400}
              className="h-full w-full rounded-2xl object-cover md:rounded-r-none"
            />
          </div>

          {/* Text */}
          <div className="flex flex-col items-start gap-5 px-2 md:px-12">
            <h2 className="font-display text-2xl font-extrabold leading-snug text-foreground lg:text-3xl">
              Siap memberikan perawatan terbaik untuk{" "}
              <span className="text-primary">Pawfriends?</span>
            </h2>
            <p className="text-muted-foreground">
              Percayakan grooming anabulmu kepada tim Pawship yang
              berpengalaman, sabar, dan penuh kasih sayang.
            </p>
            <Button asChild size="lg" className="rounded-full px-8">
              <Link href="/booking">Booking Sekarang</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
