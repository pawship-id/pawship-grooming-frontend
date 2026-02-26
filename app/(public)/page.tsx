import { PublicNavbar } from "@/components/public-navbar"
import { HeroSection } from "@/components/hero-section"
import { ServicesSection } from "@/components/services-section"
import { AboutSection } from "@/components/about-section"
import { PublicFooter } from "@/components/public-footer"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNavbar />
      <main className="flex-1">
        <HeroSection />
        <ServicesSection />
        <AboutSection />
      </main>
      <PublicFooter />
    </div>
  )
}
