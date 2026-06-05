"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, staggerContainer, staggerItem, MICRO } from "@/lib/design/motion-presets";

const STUDIO_IMAGES = [
  {
    src: "/brand/studio/studio-1.jpg",
    alt: "徕舞普拉提训练空间 — 明亮自然光",
    label: "训练空间",
  },
  {
    src: "/brand/studio/reformer-1.jpg",
    alt: "Reformer 核心床训练器械",
    label: "Reformer 器械",
  },
  {
    src: "/brand/training/detail-1.jpg",
    alt: "普拉提训练细节 — 侧身动作",
    label: "训练细节",
  },
];

const PLACEHOLDER_BLUR = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F9PQAI8wNPvd7POQAAAABJRU5ErkJggg==";

export default function StudioShowcaseSection() {
  return (
    <section id="studio" className="max-w-5xl mx-auto px-5 sm:px-8 md:px-12 py-40 md:py-48 bg-white">
      <motion.div
        {...MICRO.scrollReveal}
        variants={fadeUp}
        initial="hidden"
        whileInView="visible"
        className="text-center mb-16"
      >
        <p
          className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8"
          style={{ color: COLORS.primary }}
        >
          Our Space
        </p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#3E2723] tracking-[-0.02em] leading-[1.15] mb-4">
          训练空间
        </h2>
        <p className="text-sm text-[#6E6E73] max-w-[34em] mx-auto">
          在舒适的环境中专注每一次训练。自然光、专业器械、安静氛围。
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-60px" }}
        className="grid md:grid-cols-3 gap-6"
      >
        {STUDIO_IMAGES.map((img, i) => (
          <motion.div
            key={img.label}
            variants={staggerItem}
            className="relative rounded-3xl overflow-hidden aspect-[3/4] group"
            style={{ boxShadow: "0 4px 24px rgba(62,39,35,0.06)" }}
          >
            <Image
              src={img.src}
              alt={img.alt}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, 33vw"
              loading="lazy"
              placeholder="blur"
              blurDataURL={PLACEHOLDER_BLUR}
            />
            {/* 图底标签 */}
            <div className="absolute bottom-0 left-0 right-0 p-5" style={{
              background: "linear-gradient(transparent, rgba(62,39,35,0.5))",
            }}>
              <p className="text-white text-sm font-medium tracking-wide">
                {img.label}
              </p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
