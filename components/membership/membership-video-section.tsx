export function MembershipVideoSection() {
  return (
    <section id="video" className="bg-card py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <span className="mb-2 inline-block rounded-full bg-secondary/60 px-3 py-1 text-xs font-semibold text-secondary-foreground">
            In Action
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            Lihat Bagaimana Kami Merawat Anabulmu
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Video 1 - pickup */}
          <div className="overflow-hidden rounded-2xl bg-card shadow-md">
            <video
              className="aspect-video w-full object-cover"
              poster="https://placedog.net/800/450?id=20"
              controls
              preload="none"
              playsInline
            >
              <source src="/videos/pickup.mp4" type="video/mp4" />
              Browser Anda tidak mendukung video.
            </video>
            <div className="p-4">
              <p className="font-display text-sm font-bold text-foreground">
                🚗 Layanan Pickup &amp; Antar
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Kami jemput anabul dari pintu rumahmu
              </p>
            </div>
          </div>

          {/* Video 2 - grooming */}
          <div className="overflow-hidden rounded-2xl bg-card shadow-md">
            <video
              className="aspect-video w-full object-cover"
              poster="https://placedog.net/800/450?id=21"
              controls
              preload="none"
              playsInline
            >
              <source src="/videos/grooming.mp4" type="video/mp4" />
              Browser Anda tidak mendukung video.
            </video>
            <div className="p-4">
              <p className="font-display text-sm font-bold text-foreground">
                ✂️ Proses Grooming
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Profesional, sabar, dan penuh kasih sayang
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
