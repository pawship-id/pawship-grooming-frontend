"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQ_ITEMS = [
  {
    q: "Apakah bisa antar jemput?",
    a: "Ya, kami menyediakan add on pickup disesuaikan dengan lokasi Pawrents.",
  },
  {
    q: "Berapa lama grooming?",
    a: "±1–2 jam tergantung kondisi bulu, kulit dan layanan yang dipilih.",
  },
  {
    q: "Apakah bisa home grooming?",
    a: "Bisa, dengan biaya transport.",
  },
  {
    q: "Apakah bisa request groomer?",
    a: "Bisa, tapi akan disesuaikan dengan jadwal dan antrian.",
  },
  {
    q: "Apakah harus booking dulu?",
    a: "Ya, kami sarankan untuk melakukan booking sebelum datang ke store min. H-1 untuk kenyamanan bersama.",
  },
  {
    q: "Apa bisa langsung dikerjakan?",
    a: "Semua anabul akan dikerjakan sesuai antrian kedatangan.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-semibold text-foreground transition-colors hover:text-primary"
      >
        {q}
        {open ? (
          <ChevronUp className="h-4 w-4 flex-shrink-0 text-primary" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <p className="pb-5 text-sm leading-relaxed text-muted-foreground">
          {a}
        </p>
      )}
    </div>
  );
}

export function GroomingFaqSection() {
  return (
    <section id="faq" className="bg-card px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Pertanyaan <span className="text-primary">Umum</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Ada yang ingin ditanyakan? Berikut jawaban dari pertanyaan yang
            paling sering kami terima dari Pawrents.
          </p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card px-6 shadow-sm">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}
