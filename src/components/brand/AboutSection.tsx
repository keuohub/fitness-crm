"use client";

import { motion } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";
import { fadeUp, MICRO } from "@/lib/design/motion-presets";

export default function AboutSection() {
  return (
    <section id="about" className="max-w-5xl mx-auto px-6 py-32 bg-white">
      <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="text-center mb-20">
        <p className="text-[11px] uppercase tracking-[0.3em] font-medium mb-8" style={{ color: COLORS.primary }}>About</p>
        <h2 className="text-4xl sm:text-5xl font-semibold text-[#1D1D1F] tracking-[-0.04em] leading-tight">
          让成长被记录
          <br />
          让坚持被看见
        </h2>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-16">
        <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="space-y-6">
          <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15]">为什么创立徕舞</h3>
          <p className="text-sm text-[#6E6E73] leading-relaxed">
            在陪伴女性成长的这些年里，我们见过太多次这样的场景：
            会员练了三个月，感觉不到变化，慢慢就不来了。
            不是教练不努力，不是会员不坚持。
            是成长没有被记录，变化没有被看见。
          </p>
          <p className="text-sm text-[#6E6E73] leading-relaxed">
            传统的健身管理工具只是填表、记次数、算续费率。
            但女性需要的不是数据，是需要知道自己走多远，需要看到自己的变化。
          </p>
        </motion.div>

        <motion.div {...MICRO.scrollReveal} variants={fadeUp} initial="hidden" whileInView="visible" className="space-y-6">
          <h3 className="text-2xl font-semibold text-[#1D1D1F] tracking-[-0.03em] leading-[1.15]">为什么成长应该被记录</h3>
          <p className="text-sm text-[#6E6E73] leading-relaxed">
            体重秤上的数字不会告诉你，你的体态是否在变好。
            日历上的记录不会告诉你，你正在建立什么样的习惯。
          </p>
          <p className="text-sm text-[#6E6E73] leading-relaxed">
            当一个系统能够记录每一次训练、每一张体态照片、每一份洞察记录、每一个成长里程碑，
            坚持就变成了可以看见的东西。
          </p>
          <p className="text-sm text-[#6E6E73] leading-relaxed">
            这就是徕舞在做的事情。不是取代教练，而是让教练和会员一起看见成长。
          </p>
        </motion.div>
      </div>
    </section>
  );
}
