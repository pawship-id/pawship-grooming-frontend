import { Shield, Smile, Star, ShieldCheck } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Pendekatan Tenang & Aman",
    description:
      "Tim kami menyesuaikan pendekatan sesuai dengan kebutuhan karakter dan kebutuhan setiap Pawfriends.",
  },
  {
    icon: Smile,
    title: "Stress-Free Grooming",
    description:
      "Kami tidak terburu-buru dan memastikan setiap anabul relax dan senang, menjadikan sesi grooming sebagai sesi yang menyenangkan untuk anabul. No stress, just fresh!",
  },
  {
    icon: Star,
    title: "Tim Profesional & Konsisten",
    description:
      "Di Pawship, kami memastikan Pawfriends ditangani dengan standar yang sama untuk setiap anabulnya.",
  },
  {
    icon: ShieldCheck,
    title: "Transparan & Terpercaya",
    description:
      "Kami membangun kepercayaan melalui sistem, teknologi, dan komunikasi yang jelas untuk ketenangan Pawrents.",
  },
]

export function AboutSection() {
  return (
    <section id="about" className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Kenapa Pawship dipercaya Pawrents?
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
            Di Pawship, kami percaya setiap anabul layak mendapatkan perawatan terbaik — dimulai dari grooming yang aman dan nyaman.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center gap-3 rounded-xl bg-card p-6 text-center border border-border/50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
