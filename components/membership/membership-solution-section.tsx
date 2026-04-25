import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { solutions } from "./constants";

const emojis = ["💸", "🚗", "📅", "🐾"];

export function MembershipSolutionSection() {
  return (
    <section className="relative overflow-hidden bg-card py-20">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-center gap-14 lg:flex-row lg:gap-20">
          {/* ── Left: image ── */}
          <div className="relative w-full shrink-0 lg:w-[42%]">
            <div className="relative overflow-hidden rounded-3xl shadow-xl">
              <Image
                src="https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=500&fit=crop&crop=face"
                alt="Happy groomed dog"
                width={600}
                height={500}
                className="h-full w-full object-cover"
              />
              {/* tinted overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
            </div>

            {/* floating badge */}
            <div className="absolute -bottom-5 -right-4 flex items-center gap-2 rounded-2xl bg-background px-4 py-3 shadow-lg border border-border/50">
              <span className="text-2xl">✨</span>
              <div>
                <p className="text-xs font-bold text-foreground leading-tight">
                  Solusi lengkap
                </p>
                <p className="text-[10px] text-muted-foreground">
                  untuk Pawrents aktif
                </p>
              </div>
            </div>
          </div>

          {/* ── Right: content ── */}
          <div className="flex flex-1 flex-col">
            <span className="mb-4 inline-flex w-fit items-center rounded-full bg-primary/15 px-4 py-1.5 text-xs font-semibold text-primary">
              Solusinya
            </span>

            <h2 className="font-display text-3xl font-extrabold leading-tight text-foreground lg:text-4xl">
              Dengan Membership Pawship,
              <br />
              <span className="text-primary">semua jadi lebih mudah.</span>
            </h2>

            <p className="mt-4 text-muted-foreground">
              Satu paket membership, banyak manfaat yang bikin perawatan anabul
              jauh lebih praktis dan konsisten.
            </p>

            <ul className="mt-8 flex flex-col gap-4">
              {solutions.map((s, i) => (
                <li key={s} className="flex items-start gap-4">
                  {/* number badge */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg">
                    {emojis[i]}
                  </div>
                  <div className="flex flex-1 items-start gap-3 rounded-xl border border-border/50 bg-background px-4 py-3 shadow-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {s}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
