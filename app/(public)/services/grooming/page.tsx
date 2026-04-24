import { GroomingHeroSection } from "@/components/grooming/grooming-hero-section";
import { GroomingUspSection } from "@/components/grooming/grooming-usp-section";
import { GroomingServicesSection } from "@/components/grooming/grooming-services-section";
import { GroomingFaqSection } from "@/components/grooming/grooming-faq-section";
import { GroomingMembershipPushSection } from "@/components/grooming/grooming-membership-push-section";
import { GroomingFinalCtaSection } from "@/components/grooming/grooming-final-cta-section";

export default function GroomingServicesPage() {
  return (
    <main className="flex-1 overflow-x-hidden">
      <GroomingHeroSection />
      <GroomingUspSection />
      <GroomingServicesSection />
      <GroomingFaqSection />
      <GroomingMembershipPushSection />
      <GroomingFinalCtaSection />
    </main>
  );
}
