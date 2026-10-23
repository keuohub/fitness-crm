"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast 容器 */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => {
          let bg = "#FFFFFF";
          let border = "#E1E5EB";
          let iconColor = "#2563EB";
          let IconComponent = Info;

          if (t.type === "success") {
            border = "#10B981";
            iconColor = "#10B981";
            IconComponent = CheckCircle2;
          } else if (t.type === "error") {
            border = "#EF4444";
            iconColor = "#EF4444";
            IconComponent = AlertCircle;
          } else if (t.type === "warning") {
            border = "#F59E0B";
            iconColor = "#F59E0B";
            IconComponent = AlertCircle;
          }

          return (
            <div
              key={t.id}
              style={{
                pointerEvents: "auto",
                minWidth: 260,
                maxWidth: 420,
                background: bg,
                border: `1px solid ${border}`,
                borderRadius: 8,
                padding: "12px 16px",
                boxShadow: "0 8px 24px rgba(41, 45, 53, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 13.5,
                color: "#292D35",
                animation: "fadeIn 0.2s ease-out",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <IconComponent size={18} style={{ color: iconColor, flexShrink: 0 }} />
                <span>{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#697180",
                  padding: 2,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={15} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // 降级兜底（避免在未包裹组件中崩溃）
    return {
      showToast: (msg: string) => {
        console.log("[Toast]", msg);
      },
    };
  }
  return context;
}
