import { MembershipHeroSection } from "@/components/membership/membership-hero-section";
import { MembershipVideoSection } from "@/components/membership/membership-video-section";
import { MembershipProblemSection } from "@/components/membership/membership-problem-section";
import { MembershipSolutionSection } from "@/components/membership/membership-solution-section";
import { MembershipPackagesSection } from "@/components/membership/membership-packages-section";
import { MembershipBannerSection } from "@/components/membership/membership-banner-section";
import { MembershipTestimonialsSection } from "@/components/membership/membership-testimonials-section";
import { MembershipFinalCtaSection } from "@/components/membership/membership-final-cta-section";

export default function MembershipPage() {
  return (
    <main className="flex-1 overflow-x-hidden">
      <MembershipHeroSection />
      <MembershipVideoSection />
      <MembershipProblemSection />
      <MembershipSolutionSection />
      <MembershipPackagesSection />
      <MembershipBannerSection />
      <MembershipTestimonialsSection />
      <MembershipFinalCtaSection />
    </main>
  );
}
