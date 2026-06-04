"use client";

import { useEffect, useRef, useState } from "react";

export default function HeroParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const scrolled = -rect.top;
      if (scrolled > 0) setOffsetY(scrolled * 0.3);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div ref={ref} className="relative overflow-hidden">
      <div style={{ transform: `translateY(${offsetY}px)`, transition: "transform 0.1s linear" }}>
        {children}
      </div>
    </div>
  );
}
