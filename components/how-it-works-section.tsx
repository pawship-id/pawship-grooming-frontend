import Link from "next/link";
import { Button } from "@/components/ui/button";

const steps = [
  {
    number: "1",
    emoji: "1️⃣",
    title: "Pilih Layanan",
    description: "Pilih layanan sesuai untuk anabulmu.",
  },
  {
    number: "2",
    emoji: "2️⃣",
    title: "Isi Data Anabul & Jadwal",
    description:
      "Isi data Pawfriends. Hanya isi sekali, akan kami ingat untuk booking selanjutnya!",
  },
  {
    number: "3",
    emoji: "3️⃣",
    title: "Kami Konfirmasi via WhatsApp / Web",
    description:
      "Tim kami akan konfirmasi jadwalmu via WhatsApp dan Pawrents bisa cek via website.",
  },
  {
    number: "4",
    emoji: "4️⃣",
    title: "Siap Grooming!",
    description: "Pawrents tinggal datang atau Pawship datang ke rumahmu.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Cara Booking
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 mx-auto max-w-xl text-muted-foreground">
            Booking grooming di Pawship mudah dan cepat — cukup beberapa
            langkah!
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="relative flex flex-col items-center text-center gap-4 h-full"
            >
              {/* connector line */}
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-6 hidden h-px w-full translate-x-6 border-t-2 border-dashed border-border lg:block" />
              )}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl text-primary-foreground font-extrabold shadow-md z-10">
                {step.number}
              </div>
              <div className="flex flex-1 flex-col items-center rounded-xl border border-border/50 bg-card p-5 w-full">
                <p className="text-2xl mb-2">{step.emoji}</p>
                <h3 className="font-display text-sm font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg" className="rounded-full px-10">
            <Link href="/booking">Booking Sekarang</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
