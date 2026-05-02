import { MembershipHeroSection } from "@/components/membership/membership-hero-section";
import { MembershipVideoSection } from "@/components/membership/membership-video-section";
import { MembershipProblemSection } from "@/components/membership/membership-problem-section";
import { MembershipSolutionSection } from "@/components/membership/membership-solution-section";
import { MembershipPackagesSection } from "@/components/membership/membership-packages-section";
import { MembershipBannerSection } from "@/components/membership/membership-banner-section";
import { MembershipTestimonialsSection } from "@/components/membership/membership-testimonials-section";
import { MembershipFinalCtaSection } from "@/components/membership/membership-final-cta-section";
import {
  getPublicMemberships,
  type PublicMembershipPlan,
} from "@/lib/api/memberships";

export default async function MembershipPage() {
  let plans: PublicMembershipPlan[] = [];

  try {
    const res = await getPublicMemberships();
    plans = res.data ?? [];
  } catch {
    // Silently fall back to empty list — section will render a placeholder
  }

  return (
    <main className="flex-1 overflow-x-hidden">
      <MembershipHeroSection />
      <MembershipVideoSection />
      <MembershipProblemSection />
      <MembershipSolutionSection />
      <MembershipPackagesSection plans={plans} />
      <MembershipBannerSection />
      <MembershipTestimonialsSection />
      <MembershipFinalCtaSection />
    </main>
  );
}
