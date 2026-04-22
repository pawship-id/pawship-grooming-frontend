import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WA_ADMIN } from "./constants";

export function MembershipBannerSection() {
  return (
    <section className="bg-card py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-center md:gap-16">
          {/* Image — left */}
          <div className="relative h-72 w-full shrink-0 overflow-hidden rounded-2xl md:h-96 md:w-[45%]">
            <Image
              src="https://placedog.net/800/600?id=30"
              alt="Membership Limited Offers"
              fill
              className="object-cover"
            />
          </div>

          {/* Text — right */}
          <div className="flex flex-1 flex-col gap-5">
            <span className="inline-flex w-fit items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              Limited Offers
            </span>

            <h2 className="font-display text-2xl font-extrabold leading-tight text-foreground lg:text-3xl">
              Membership Limited Offers
            </h2>

            <p className="text-muted-foreground">
              Dapatkan penawaran spesial untuk member baru yang mendaftar
              sekarang. Jangan sampai ketinggalan — slot terbatas!
            </p>

            <Button
              asChild
              size="lg"
              className="w-fit rounded-full px-8 shadow-lg shadow-primary/25"
            >
              <a href={WA_ADMIN} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" />
                Chat Admin
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
