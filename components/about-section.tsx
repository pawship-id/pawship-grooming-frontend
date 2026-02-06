import { Heart, Home, Shield, Award } from "lucide-react"

const features = [
  {
    icon: Heart,
    title: "Gentle Care",
    description: "Every pet receives individual attention with gentle handling techniques suited to their temperament.",
  },
  {
    icon: Home,
    title: "Home Grooming",
    description: "Can't come to us? We come to you. Professional grooming in the comfort of your home.",
  },
  {
    icon: Shield,
    title: "Safe Products",
    description: "We use only vet-approved, hypoallergenic products to keep your pet safe and comfortable.",
  },
  {
    icon: Award,
    title: "Certified Groomers",
    description: "Our team is professionally trained and experienced with all breeds and pet types.",
  },
]

export function AboutSection() {
  return (
    <section id="about" className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Why PAWship
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            We Treat Your Pet Like Family
          </h2>
          <p className="mt-3 max-w-xl mx-auto text-muted-foreground">
            With years of experience and a passion for animals, PAWship delivers grooming services that prioritize your pet's comfort and wellbeing.
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
