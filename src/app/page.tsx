import HeroSection from "@/components/brand/HeroSection";
import BeliefSection from "@/components/brand/BeliefSection";
import EvidenceSection from "@/components/brand/EvidenceSection";
import FounderLetterSection from "@/components/brand/FounderLetterSection";
import ManifestoSection from "@/components/brand/ManifestoSection";
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
      <div className="h-8 md:h-12" aria-hidden="true" />
      <BeliefSection />
      <EvidenceSection />
      <FounderLetterSection />
      <ManifestoSection />
      <div className="h-12 md:h-16" aria-hidden="true" />
      <ActivityFeedSection />
      <CasesSection />
      <div className="h-12 md:h-16" aria-hidden="true" />
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

      <footer className="py-40 md:py-48 bg-white border-t border-[#E8E0D5]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          <div>
            <h4 className="text-[11px] tracking-[0.15em] font-semibold mb-4" style={{ color: "#8B5E3C" }}>
              徕舞成长系统
            </h4>
            <p className="text-sm text-[#6E6E73] leading-relaxed">
              不追求完美的短期改变。<br />
              相信时间的力量，让成长自然发生。
            </p>
          </div>
          <div>
            <h4 className="text-[11px] tracking-[0.15em] font-semibold mb-4" style={{ color: "#8B5E3C" }}>
              探索
            </h4>
            <ul className="space-y-2 text-sm text-[#6E6E73]">
              <li>成长故事</li>
              <li>训练空间</li>
              <li>关于徕舞</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] tracking-[0.15em] font-semibold mb-4" style={{ color: "#8B5E3C" }}>
              联系
            </h4>
            <ul className="space-y-2 text-sm text-[#6E6E73]">
              <li>湖北 · 钟祥</li>
              <li>微信：小桥</li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 mt-12 pt-6 border-t border-[#E8E0D5]">
          <p className="text-xs text-[#9E8E7E] text-center">
            徕舞成长系统
          </p>
        </div>
      </footer>
    </main>
  );
}
