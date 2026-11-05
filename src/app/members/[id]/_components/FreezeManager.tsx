"use client";

import { useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/design/DESIGN_TOKEN";

interface Props {
  memberId: number;
}

interface FreezeState {
  isFrozen: boolean;
  freezeStart: string | null;
  freezeEnd: string | null;
  frozenDays: number;
  plannedExtendDays: number;
  extendableCards: Array<{ id: number; validUntil: string; remainingCount: number }>;
}

const inputClass =
  "h-9 w-full rounded-xl border border-[#E5E5E5] bg-white px-3 text-sm text-[#1A1A1A] outline-none focus:border-[#1A1A1A]";

function today() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export default function FreezeManager({ memberId }: Props) {
  const [state, setState] = useState<FreezeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState("");
  const [unfreezeDate, setUnfreezeDate] = useState(today());
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/members/freeze?memberId=${memberId}`);
      if (!res.ok) return;
      const data = await res.json();
      setState(data);
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (action: "freeze" | "unfreeze") => {
    setBusy(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { memberId, action, reason: reason.trim() || undefined };
      if (action === "freeze") {
        payload.startDate = startDate;
        payload.endDate = endDate || undefined;
      } else {
        payload.endDate = unfreezeDate;
      }

      const res = await fetch("/api/admin/members/freeze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "err", text: data.error || "操作失败" });
        return;
      }

      if (action === "unfreeze") {
        const days = Number(data.frozenDays || 0);
        const cards = Number(data.extendedCards || 0);
        setMessage({
          type: "ok",
          text:
            cards > 0
              ? `已复卡。停卡 ${days} 天，${cards} 张卡的到期日已顺延 ${days} 天。`
              : `已复卡。停卡 ${days} 天，该会员没有带到期日的卡，无需顺延。`,
        });
      } else {
        setMessage({ type: "ok", text: "已办理停卡。陪伴天数暂停累计，复卡时卡期自动顺延。" });
      }

      setReason("");
      setConfirming(false);
      await load();
    } catch {
      setMessage({ type: "err", text: "网络异常，请重试" });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="h-32 rounded-xl bg-[#FAFAFA] animate-pulse" />;
  }

  if (!state) return null;

  const cardCount = state.extendableCards.length;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: state.isFrozen
          ? "linear-gradient(135deg, #F7F4EF 0%, #FFF 100%)"
          : "linear-gradient(135deg, #FAFAFA 0%, #FFF 100%)",
        border: "1px solid #E5E5E5",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <p className="font-serif text-sm font-bold text-[#1A1A1A]">停卡 · 陪伴天数与卡期</p>
        {state.isFrozen ? (
          <span className="text-xs px-2 py-0.5 rounded-full bg-[#1A1A1A] text-white">
            停卡中 · 第 {state.frozenDays} 天
          </span>
        ) : (
          <span className="text-xs text-[#9E9E9E]">正常在籍</span>
        )}
      </div>

      {state.isFrozen ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-[#9E9E9E] mb-0.5">停卡开始</p>
              <p className="text-[#1A1A1A]">{state.freezeStart || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-[#9E9E9E] mb-0.5">预计复卡</p>
              <p className="text-[#1A1A1A]">{state.freezeEnd || "未设置（长期停卡）"}</p>
            </div>
          </div>

          <p className="text-xs text-[#666666] leading-relaxed">
            停卡期间陪伴天数不累计。现在复卡，{cardCount > 0 ? `${cardCount} 张带到期日的卡` : "该会员的卡（无到期日）"}
            {cardCount > 0 ? ` 会顺延 ${state.plannedExtendDays} 天。` : " 不受影响。"}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#9E9E9E]">复卡日期</label>
              <input
                type="date"
                value={unfreezeDate}
                onChange={(e) => setUnfreezeDate(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="text-xs text-[#9E9E9E]">备注（可空）</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="出差 / 术后恢复"
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>

          {confirming ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => submit("unfreeze")}
                disabled={busy}
                className="h-9 px-4 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: COLORS.primary }}
              >
                {busy ? "处理中..." : "确认复卡并顺延"}
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="h-9 px-4 rounded-xl text-sm border border-[#E5E5E5] text-[#666666]"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="h-9 px-4 rounded-xl text-sm font-medium text-white"
              style={{ backgroundColor: COLORS.primary }}
            >
              办理复卡
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-[#666666] leading-relaxed">
            会员出差、术后恢复、孕期可停卡。停卡期间不计陪伴天数，复卡时按实际停卡天数顺延卡有效期，流水会留痕。
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#9E9E9E]">停卡开始</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
            <div>
              <label className="text-xs text-[#9E9E9E]">预计复卡（可空）</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-[#9E9E9E]">备注（可空）</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="出差 / 术后恢复"
              className={`${inputClass} mt-1`}
            />
          </div>

          <button
            onClick={() => submit("freeze")}
            disabled={busy}
            className="h-9 px-4 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: COLORS.primary }}
          >
            {busy ? "处理中..." : "办理停卡"}
          </button>
        </div>
      )}

      {message && (
        <p
          className="mt-3 text-xs rounded-lg px-3 py-2"
          style={{
            color: message.type === "ok" ? "#40513B" : "#8A3B3B",
            backgroundColor: message.type === "ok" ? "#F0F4EE" : "#FBF0F0",
          }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
