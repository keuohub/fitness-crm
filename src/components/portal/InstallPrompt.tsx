"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show after a short delay
      setTimeout(() => {
        if (!dismissed) setShow(true);
      }, 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShow(false);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div
            className="rounded-2xl p-4 flex items-center gap-3 backdrop-blur-xl"
            style={{
              background: "rgba(255,255,255,0.90)",
              boxShadow: "0 8px 32px rgba(62,39,35,0.12)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: COLORS.primary }}
            >
              <span className="text-white font-serif text-lg font-bold">L</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#3E2723]">
                添加到主屏幕
              </p>
              <p className="text-xs text-[#9E8E7E]">
                像 App 一样打开徕舞
              </p>
            </div>
            <button
              onClick={handleInstall}
              className="px-4 py-2 rounded-xl text-xs font-medium text-white flex-shrink-0"
              style={{ backgroundColor: COLORS.primary }}
            >
              添加
            </button>
            <button
              onClick={handleDismiss}
              className="text-xs text-[#9E8E7E] flex-shrink-0 px-1"
            >
              稍后
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
