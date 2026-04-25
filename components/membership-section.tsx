"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "6281234567890"; // replace with actual number
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Halo Pawship! Saya ingin tahu lebih lanjut tentang program membership.",
);

const benefits = [
  "Tidak perlu mikir biaya lagi setiap grooming",
  "Bisa antar-jemput dan home grooming",
  "Slot jadwal prioritas",
  "Lebih praktis untuk perawatan jangka panjang",
];

export function MembershipSection() {
  return (
    <section id="membership" className="bg-card  dark:bg-background py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <span className="mb-3 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
          Pawship Membership
        </span>
        <h2 className="font-display text-3xl font-extrabold leading-tight text-foreground lg:text-4xl">
          Jadi member, dapatkan banyak keuntungan.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Cocok untuk Pawrents yang ingin merawat anabul secara rutin dan
          praktis.
        </p>

        <ul className="mt-8 inline-flex flex-col items-start gap-3 text-left">
          {benefits.map((benefit) => (
            <li
              key={benefit}
              className="flex items-start gap-3 text-sm text-foreground"
            >
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Button asChild size="lg" className="rounded-full px-8">
            <Link href="/membership">Cek Membership</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-full px-8"
          >
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat Admin
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
