"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowDown, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { type PublicBanner, getPublicBanners } from "@/lib/api/banners"

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getTextAlignClass(align?: string) {
  if (align === "left") return "text-left items-start"
  if (align === "right") return "text-right items-end"
  return "text-center items-center"
}

function getCtaVerticalClass(pos?: string) {
  if (pos === "top") return "justify-start"
  if (pos === "center") return "justify-center"
  return "justify-end"
}

function getCtaHorizontalClass(pos?: string) {
  if (pos === "left") return "items-start"
  if (pos === "right") return "items-end"
  return "items-center"
}

// ─────────────────────────────────────────────────────────────────────────────
// Banner slide
// ─────────────────────────────────────────────────────────────────────────────
function BannerSlide({ banner }: { banner: PublicBanner }) {
  const textAlign = getTextAlignClass(banner.text_align)
  const color = banner.text_color ?? "#ffffff"

  return (
    <div className="relative h-full w-full select-none">
      {/* Background image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={banner.image_url}
        alt={banner.title ?? "Banner"}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      {/* Overlay */}
      {/* <div className="absolute inset-0 bg-black/30" /> */}

      {/* Text content */}
      <div
        className={`absolute inset-0 flex flex-col px-8 py-10 md:px-16 md:py-14 ${textAlign}`}
        style={{ color }}
      >
        {(banner.title || banner.subtitle) && (
          <div className={`flex flex-col gap-2 max-w-2xl ${banner.text_align === "center" ? "mx-auto" : banner.text_align === "right" ? "ml-auto" : ""}`}>
            {banner.title && (
              <h2 className="text-2xl font-extrabold leading-tight drop-shadow md:text-4xl">
                {banner.title}
              </h2>
            )}
            {banner.subtitle && (
              <p className="text-sm leading-relaxed drop-shadow md:text-base">
                {banner.subtitle}
              </p>
            )}
          </div>
        )}

        {/* CTA */}
        {banner.cta && (
          <div
            className={`absolute inset-x-8 inset-y-10 flex flex-col md:inset-x-16 md:inset-y-14 ${getCtaVerticalClass(banner.cta.vertical_position)} ${getCtaHorizontalClass(banner.cta.horizontal_position)}`}
          >
            <Link
              href={banner.cta.link}
              className="inline-block rounded-md px-5 py-2.5 text-sm font-bold shadow transition-opacity hover:opacity-90 active:opacity-80"
              style={{
                backgroundColor: banner.cta.background_color ?? "#FF6B35",
                color: banner.cta.text_color ?? "#ffffff",
              }}
            >
              {banner.cta.label}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Carousel
// ─────────────────────────────────────────────────────────────────────────────
const AUTOPLAY_INTERVAL = 5000

function BannerCarousel({ banners }: { banners: PublicBanner[] }) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback(
    (index: number) => {
      setCurrent((index + banners.length) % banners.length)
    },
    [banners.length]
  )

  const prev = useCallback(() => goTo(current - 1), [current, goTo])
  const next = useCallback(() => goTo(current + 1), [current, goTo])

  // Autoplay
  useEffect(() => {
    if (banners.length <= 1 || isPaused) return
    timerRef.current = setInterval(() => setCurrent((c) => (c + 1) % banners.length), AUTOPLAY_INTERVAL)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [banners.length, isPaused])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [prev, next])

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 40) delta > 0 ? next() : prev()
    touchStartX.current = null
  }

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-roledescription="carousel"
    >
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-500 ease-in-out will-change-transform"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {banners.map((banner) => (
          <div key={banner._id} className="h-full w-full shrink-0" aria-roledescription="slide">
            <BannerSlide banner={banner} />
          </div>
        ))}
      </div>

      {/* Prev / Next buttons */}
      {banners.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-black/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dot indicators */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2" role="tablist">
          {banners.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === current}
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Static fallback (shown when there are no banners or while loading)
// ─────────────────────────────────────────────────────────────────────────────
function StaticHero() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-6 py-20 text-center lg:py-28">
      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-balance font-display text-4xl font-extrabold tracking-tight text-foreground lg:text-6xl">
          Your Pawfriends Deserve the Best
        </h1>
        <p className="text-pretty text-lg leading-relaxed text-muted-foreground lg:text-xl">
          A happy place for pawfriends to be pampered with love. In-store or at home, always handled with care.
          Fresh, fluffy, and beautifully groomed — with transparent pricing you can trust.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button asChild size="lg" className="font-display font-bold">
          <Link href="/booking">Book Services</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="font-display font-bold bg-transparent">
          <Link href="/#contact">Contact Us</Link>
        </Button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero section
// ─────────────────────────────────────────────────────────────────────────────
export function HeroSection() {
  const [banners, setBanners] = useState<PublicBanner[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getPublicBanners()
      .then((res) => setBanners(res.banners ?? []))
      .catch(() => setBanners([]))
      .finally(() => setLoaded(true))
  }, [])

  const hasBanners = loaded && banners.length > 0

  return (
    <section className="relative overflow-hidden bg-background">
      {/* Carousel or static hero */}
      {hasBanners ? (
        <div className="h-[360px] w-full sm:h-[440px] lg:h-[520px]">
          <BannerCarousel banners={banners} />
        </div>
      ) : (
        <>
          {/* Decorative elements shown only in static mode */}
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-secondary/30" aria-hidden="true" />
          <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-accent/20" aria-hidden="true" />
          <StaticHero />
        </>
      )}

      {/* Scroll hint */}
      {/* <div className="flex justify-center pb-6 pt-4">
        <Link
          href="/#services"
          className="flex flex-col items-center gap-1 text-muted-foreground transition-colors hover:text-primary"
          aria-label="Scroll to services"
        >
          <span className="text-xs font-medium">Our Services</span>
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </Link>
      </div> */}
    </section>
  )
}

