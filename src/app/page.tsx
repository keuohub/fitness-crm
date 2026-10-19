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

function Divider() {
  return (
    <div className="py-8 max-w-4xl mx-auto px-5 sm:px-8 md:px-12">
      <hr className="border-[#F0F0F0]" />
    </div>
  );
}

export default function BrandHome() {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection />
      <Divider />
      <BeliefSection />
      <EvidenceSection />
      <FounderLetterSection />
      <ManifestoSection />
      <Divider />
      <ActivityFeedSection />
      <CasesSection />
      <Divider />
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

      <footer className="py-20 sm:py-28 bg-[#1A1A1A]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left">
          <div>
            <h4 className="text-[11px] tracking-[0.15em] font-semibold mb-4 text-white">
              徕舞成长系统
            </h4>
            <p className="text-sm text-[#AAAAAA] leading-relaxed">
              不追求完美的短期改变。<br />
              相信时间的力量，让成长自然发生。
            </p>
          </div>
          <div>
            <h4 className="text-[11px] tracking-[0.15em] font-semibold mb-4 text-white">
              探索
            </h4>
            <ul className="space-y-2 text-sm text-[#AAAAAA]">
              <li>成长故事</li>
              <li>训练空间</li>
              <li>关于徕舞</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[11px] tracking-[0.15em] font-semibold mb-4 text-white">
              联系
            </h4>
            <ul className="space-y-2 text-sm text-[#AAAAAA]">
              <li>湖北 · 钟祥</li>
              <li>微信：小桥</li>
            </ul>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 mt-12 pt-6 border-t border-white/10">
          <p className="text-xs text-[#AAAAAA] text-center">
            徕舞成长系统
          </p>
        </div>
      </footer>
    </main>
  );
}
