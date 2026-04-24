import { Scissors, ShieldCheck, HeartHandshake, Star } from "lucide-react";

const USP_ITEMS = [
  {
    icon: <Scissors className="h-7 w-7 text-primary" />,
    title: "Selalu Bersih & Terjaga",
    desc: "Setiap station dibersihkan untuk Pawfriends selanjutnya",
  },
  {
    icon: <ShieldCheck className="h-7 w-7 text-primary" />,
    title: "Aman & Diawasi",
    desc: "Setiap Pawfriends diawasi selama proses grooming",
  },
  {
    icon: <HeartHandshake className="h-7 w-7 text-primary" />,
    title: "Pendekatan Tenang",
    desc: "Kami fokus pada kenyamanan, bukan kecepatan",
  },
  {
    icon: <Star className="h-7 w-7 text-primary" />,
    title: "Groomer Terlatih & Konsisten",
    desc: "Setiap grooming mengikuti standar yang sama",
  },
];

export function GroomingUspSection() {
  return (
    <section id="usp" className="bg-card px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Kenapa <span className="text-primary">Pawship?</span>
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Bukan sekadar grooming — kami memastikan setiap Pawfriends pulang
            bersih, nyaman, dan bahagia.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {USP_ITEMS.map((item, i) => (
            <div
              key={i}
              className="flex flex-col items-start gap-4 rounded-2xl border border-border/50 bg-card p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                {item.icon}
              </div>
              <h3 className="font-display text-base font-bold text-foreground">
                {item.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
