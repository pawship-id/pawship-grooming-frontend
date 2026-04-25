import { HeroSection } from "@/components/hero-section";
import { ServicesSection } from "@/components/services-section";
import { AboutSection } from "@/components/about-section";
import { MembershipSection } from "@/components/membership-section";
import { HowItWorksSection } from "@/components/how-it-works-section";
import { TestimonialSection } from "@/components/testimonial-section";
import { FinalCtaSection } from "@/components/final-cta-section";

export default function HomePage() {
  return (
    <main className="flex-1">
      <HeroSection />
      <ServicesSection />
      <AboutSection />
      <MembershipSection />
      <HowItWorksSection />
      <TestimonialSection />
      <FinalCtaSection />
    </main>
  );
}
