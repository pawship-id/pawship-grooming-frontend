import { testimonials, TestimonialItem } from "./constants";

export function MembershipTestimonialsSection() {
  return (
    <section className="bg-card py-20 dark:bg-muted/10">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-12 text-center">
          <span className="mb-2 inline-block rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground">
            Testimonial
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Kata Mereka yang Sudah Gabung
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real stories from real Pawrents 🐾
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {testimonials.map((t, i) => (
            <TestimonialCard key={i} item={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonial Card ──────────────────────────────────────────────────────────

function TestimonialCard({ item }: { item: TestimonialItem }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/50 bg-background shadow-sm">
      {/* Fixed 4:5 aspect ratio so every card media is the same size */}
      <div className="relative aspect-[4/5] w-full">
        {item.type === "video" ? (
          <video
            className="absolute inset-0 h-full w-full object-cover"
            poster={item.poster}
            controls
            preload="none"
            playsInline
          >
            <source src={item.src} type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.src}
            alt={item.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-primary">{item.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.caption}</p>
      </div>
    </div>
  );
}
