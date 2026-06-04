"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function ContactSection() {
  return (
    <section id="contact" className="max-w-4xl mx-auto px-6 py-32 bg-white">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* WeChat */}
          <div className="text-center">
            <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>微信</p>
            <div className="w-40 h-40 mx-auto rounded-3xl flex items-center justify-center mb-4"
              style={{ background: "linear-gradient(160deg, #F7F1EA 0%, #EDE0D4 100%)", boxShadow: "0 2px 16px rgba(62,39,35,0.05)" }}>
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white/60 flex items-center justify-center mb-2">
                  <svg width="28" height="24" viewBox="0 0 28 24" fill="none">
                    <path d="M10 2C4.48 2 0 5.96 0 10.82c0 2.68 1.34 5.1 3.44 6.7L2.5 20l3.12-1.72c1.3.4 2.76.62 4.3.62.4 0 .8-.02 1.2-.04C11.4 17.12 12.8 15 14.6 13.4 13.2 13 12 12.2 12 11.2c0-.63.23-1.2.64-1.64A2.06 2.06 0 0114 9c.54 0 1.04.2 1.42.56.16.16.28.34.38.54A3.2 3.2 0 0114 12.8c-.8 0-1.6-.2-2.2-.6-.8-.5-1.2-1.4-1.2-2.4 0-1 .4-1.8 1-2.4.6-.5 1.4-.8 2.2-.8.6 0 1.2.1 1.6.4l.2-.2C15.6 6.7 15.5 6.6 15.4 6.4 14.8 5.8 14 5.4 13.2 5.2V5.1c0-.3-.2-.5-.5-.5h-.4c.2-.5.5-1 .9-1.4C11.4 1 8.2 0 5.6.5 6 .3 10 1.5 10 2z" fill={COLORS.primary} />
                  </svg>
                </div>
                <p className="text-xs text-[#6E6E73]">微信咨询</p>
              </div>
            </div>
            <p className="text-sm text-[#6E6E73]">扫描二维码添加顾问</p>
          </div>

          {/* Direct contact */}
          <div className="text-center md:text-left">
            <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>联系</p>
            <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15] mb-4">直接联系</h3>
            <div className="space-y-3 text-sm text-[#6E6E73]">
              <p>钟祥 · 徕舞女子塑形</p>
              <p>15271754857（微信同号）</p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
