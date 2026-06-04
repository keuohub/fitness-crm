import HeroSection from "@/components/brand/HeroSection";
import BeliefSection from "@/components/brand/BeliefSection";
import FounderLetterSection from "@/components/brand/FounderLetterSection";
import ManifestoSection from "@/components/brand/ManifestoSection";
import EvidenceSection from "@/components/brand/EvidenceSection";
import ActivityFeedSection from "@/components/brand/ActivityFeedSection";
import CasesSection from "@/components/brand/CasesSection";
import StoriesTeaserSection from "@/components/brand/StoriesTeaserSection";
import StudioSection from "@/components/brand/StudioSection";
import BrandFilmSection from "@/components/brand/BrandFilmSection";
import EcosystemSection from "@/components/brand/EcosystemSection";
import AIReportSection from "@/components/brand/AIReportSection";
import HowItWorksSection from "@/components/brand/HowItWorksSection";
import PartnerSection from "@/components/brand/PartnerSection";
import TrySection from "@/components/brand/TrySection";
import ContactSection from "@/components/brand/ContactSection";
import DemoSection from "@/components/brand/DemoSection";

export default function BrandHome() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <BeliefSection />
      <FounderLetterSection />
      <ManifestoSection />
      <EvidenceSection />
      <ActivityFeedSection />
      <CasesSection />
      <StoriesTeaserSection />
      <StudioSection />
      <BrandFilmSection />
      <EcosystemSection />
      <AIReportSection />
      <HowItWorksSection />
      <PartnerSection />
      <TrySection />
      <ContactSection />
      <DemoSection />

      <footer className="py-12 text-center bg-white">
        <p className="text-xs text-[#6E6E73]">
          徕舞成长系统 · 徕舞成长系统
        </p>
      </footer>
    </main>
  );
}
