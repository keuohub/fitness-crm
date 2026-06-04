// Portal Motion System 2.0
// Premium interaction presets for all Portal pages.
// Reference: Apple · Linear · DeepMind

import type { Variants, Transition } from "framer-motion";

// ─── Base Variants ───

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1 },
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 24 },
  visible: { opacity: 1, x: 0 },
};

export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 32, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.8,
      ease: [0.25, 0.1, 0.25, 1.0],
      staggerChildren: 0.12,
    },
  },
};

// ─── Container Variants ───

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

// ─── Durations ───

export const DURATION = {
  instant: 0.15,
  fast: 0.25,
  normal: 0.4,
  slow: 0.6,
  reveal: 0.8,
} as const;

// ─── Easing ───

export const EASE = {
  out: [0.25, 0.1, 0.25, 1.0] as const,
  inOut: [0.4, 0.0, 0.2, 1.0] as const,
  spring: { type: "spring", stiffness: 300, damping: 24 } as Transition,
};

// ─── Micro Interactions ───

export const MICRO = {
  hoverLift: {
    y: -4,
    scale: 1.01,
    transition: { duration: DURATION.instant },
  },
  hoverCard: {
    y: -2,
    boxShadow: "0 8px 30px rgba(62,39,35,0.10)",
    transition: { duration: DURATION.fast },
  },
  tapScale: {
    scale: 0.97,
    transition: { duration: DURATION.instant },
  },
  scrollReveal: {
    viewport: { once: true, margin: "-80px" },
    transition: { duration: DURATION.normal, ease: EASE.out },
  },
} as const;
