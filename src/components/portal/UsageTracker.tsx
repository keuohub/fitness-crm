"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function UsageTracker() {
  const pathname = usePathname();
  const startTime = useRef(Date.now());

  useEffect(() => {
    // On mount: start timer
    startTime.current = Date.now();

    return () => {
      // On unmount: log page view with duration
      const duration = Math.round((Date.now() - startTime.current) / 1000);
      navigator.sendBeacon?.(
        "/api/portal/track",
        JSON.stringify({
          event: "page_view",
          page: pathname,
          durationSeconds: duration,
        })
      );
    };
  }, [pathname]);

  return null;
}
