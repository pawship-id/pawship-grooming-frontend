import { Heart, Home, Sparkles, Smile } from "lucide-react"

const features = [
  {
    icon: Heart,
    title: "Gentle & Loving Care",
    description:
      "Every furbaby has their own personality — some are shy, some are playful, some just want extra cuddles. Our team adjusts with patience and softness, giving each pawfriend the attention and comfort they need to feel safe.",
  },
  {
    icon: Home,
    title: "Instore & Home Grooming",
    description:
      "Whether you visit our store or choose home grooming, we make sure the experience stays calm and familiar. We come fully prepared, so your pawfriend can relax wherever they feel most comfortable.",
  },
  {
    icon: Sparkles,
    title: "Safe & Premium Products",
    description:
      "Only gentle, skin-friendly products touch your pawfriend's coat. We use premium shampoos that keep their fur soft, fluffy, and beautifully fresh — without harsh ingredients.",
  },
  {
    icon: Smile,
    title: "Stress-Free Grooming",
    description:
      "No rushing. No harsh handling. No drama. Just slow, patient care to keep your pawfriend relaxed, happy, and going home extra clean, extra fluffy, and extra loved.",
  },
]

export function AboutSection() {
  return (
    <section id="about" className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Why Pawship
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Because Every Pawfriend Deserves Gentle Care
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
            At Pawship, we believe grooming should feel like a little self-care day — safe, cozy, and full of love. Never scary, never stressful.
            Every pawfriend is treated with patience, gentle hands, and genuine care — just like they deserve.
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
