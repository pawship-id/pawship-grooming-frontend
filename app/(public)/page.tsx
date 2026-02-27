import { HeroSection } from "@/components/hero-section"
import { ServicesSection } from "@/components/services-section"
import { AboutSection } from "@/components/about-section"

export default function HomePage() {
  return (
    <main className="flex-1">
      <HeroSection />
      <ServicesSection />
      <AboutSection />
    </main>
  )
}
