import Link from "next/link";
import { CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "6281234567890"; // replace with actual number
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Halo Pawship! Saya ingin mendaftar program membership.",
);

const benefits = [
  {
    title: "Tidak perlu mikir biaya lagi setiap grooming",
    description:
      "Bayar sekali di awal, nikmati grooming rutin tanpa harus khawatir biaya setiap sesi.",
  },
  {
    title: "Bisa antar-jemput dan home grooming",
    description:
      "Layanan jemput anabul dari rumah atau groomer langsung datang ke lokasi kamu.",
  },
  {
    title: "Slot jadwal prioritas",
    description:
      "Member mendapatkan akses prioritas untuk memesan slot jadwal sebelum peserta umum.",
  },
  {
    title: "Lebih praktis untuk perawatan jangka panjang",
    description:
      "Satu paket untuk semua kebutuhan grooming anabul, cocok untuk perawatan rutin bulanan.",
  },
];

export default function MembershipPage() {
  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="bg-primary/5 py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <Link
            href="/#membership"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </Link>
          <span className="mb-4 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            Pawship Membership
          </span>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-foreground lg:text-5xl">
            Start your Pet&apos;s Care Journey
            <br className="hidden lg:block" /> with Us
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Jadi member, dapatkan banyak keuntungan. Cocok untuk Pawrents yang
            ingin merawat anabul secara rutin dan praktis.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-full px-8">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Daftar Sekarang
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8"
            >
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Halo Pawship! Saya ingin tanya-tanya tentang membership dulu.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat Admin
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-background py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
              Keuntungan Menjadi Member
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
              Satu paket membership, banyak manfaat yang bikin perawatan anabul
              kamu jauh lebih mudah.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="flex items-start gap-4 rounded-xl border border-border/50 bg-card p-6"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    {benefit.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-extrabold lg:text-4xl">
            Siap mulai perjalanan perawatan anabul?
          </h2>
          <p className="mt-4 text-primary-foreground/80">
            Hubungi admin kami dan mulai perjalanan grooming rutin yang praktis
            bersama Pawship.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="rounded-full px-8"
            >
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat Admin via WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
