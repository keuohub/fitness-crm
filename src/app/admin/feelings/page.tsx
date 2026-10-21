"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * 待回便签
 *
 * 这一页存在的唯一理由：
 * 会员在课后写下一句话，小桥真的看见、真的回一句。
 * 机器只负责起草，不负责签名。
 */

type FeelingItem = {
  id: number;
  member_id: number;
  member_name: string | null;
  member_code: string | null;
  avatar_url: string | null;
  joined_at: string | null;
  mentor_name: string | null;
  training_count: number | string | null;
  last_training_date: string | null;
  feeling: string;
  xiaoqiao_reply: string | null;
  ai_draft: string | null;
  reply_status: string;
  created_at: string;
};

/** 把 "#肩颈舒展 今天练完很舒服" 拆成 标签 + 正文 */
function splitFeeling(raw: string) {
  const text = String(raw || "").trim();
  const tags: string[] = [];
  let rest = text;
  const tagRe = /^#(\S+?)(?=\s|$)/;
  while (tagRe.test(rest)) {
    const m = rest.match(tagRe)!;
    tags.push(m[1]);
    rest = rest.slice(m[0].length).trim();
  }
  // 中间夹杂的标签也提出来
  const inlineTags = rest.match(/#\S+/g) || [];
  inlineTags.forEach((t) => tags.push(t.replace(/^#/, "")));
  rest = rest.replace(/#\S+/g, "").replace(/\s{2,}/g, " ").trim();
  return { tags: Array.from(new Set(tags)), body: rest };
}

function waitedText(createdAt: string) {
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return "";
  const d = Math.floor((Date.now() - t) / 86400000);
  if (d <= 0) {
    const h = Math.max(1, Math.floor((Date.now() - t) / 3600000));
    return `今天 · 已等 ${h} 小时`;
  }
  if (d === 1) return "昨天 · 已等 1 天";
  return `已等 ${d} 天`;
}

function fmtDate(v: string | null) {
  if (!v) return "待录入";
  const s = String(v).slice(0, 10).replace(/[-/.]/g, ".");
  return s || "待录入";
}

const STATUS_LABEL: Record<string, string> = {
  pending: "待回",
  replied: "已回",
  dismissed: "已划掉",
  auto_legacy: "改造前自动回复",
};

export default function AdminFeelingsPage() {
  const [items, setItems] = useState<FeelingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "replied" | "all">("pending");
  const [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [hint, setHint] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/training-feelings?status=${filter}`);
      if (res.status === 401) {
        setError("登录已过期，请重新登录管理后台。");
        setItems([]);
        return;
      }
      const data = await res.json();
      const list: FeelingItem[] = Array.isArray(data) ? data : data?.items ?? [];
      setItems(list);
      setDrafts((prev) => {
        const next = { ...prev };
        list.forEach((it) => {
          if (next[it.id] === undefined) {
            // 默认把草稿填进输入框，但一眼能看出这是机器写的
            next[it.id] = it.reply_status === "pending" ? it.ai_draft || "" : it.xiaoqiao_reply || "";
          }
        });
        return next;
      });
    } catch (e: any) {
      setError(e?.message || "读取失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const pendingCount = useMemo(
    () => items.filter((i) => i.reply_status === "pending").length,
    [items]
  );

  const send = async (item: FeelingItem) => {
    const text = (drafts[item.id] || "").trim();
    if (!text) {
      setHint("还没写内容 —— 空的便签不能发出去。");
      setTimeout(() => setHint(""), 2600);
      return;
    }
    setSaving(item.id);
    try {
      const res = await fetch("/api/admin/training-feelings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, reply: text, action: "reply" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "发送失败");
      setHint(`已经回了 ${item.member_name || "她"} 一句。`);
      setTimeout(() => setHint(""), 2600);
      await load();
    } catch (e: any) {
      setHint(e?.message || "发送失败");
      setTimeout(() => setHint(""), 3200);
    } finally {
      setSaving(null);
    }
  };

  const dismiss = async (item: FeelingItem) => {
    setSaving(item.id);
    try {
      const res = await fetch("/api/admin/training-feelings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action: "dismiss" }),
      });
      if (!res.ok) throw new Error("操作失败");
      await load();
    } catch (e: any) {
      setHint(e?.message || "操作失败");
      setTimeout(() => setHint(""), 3000);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px 80px" }}>
      {/* 标题 */}
      <div style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1C1415", margin: 0, letterSpacing: 0.3 }}>
          待回便签
        </h1>
        {pendingCount > 0 && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#8A4B3A",
              background: "#FBEDE7",
              border: "1px solid #F0D8CE",
              padding: "2px 9px",
              borderRadius: 999,
            }}
          >
            {pendingCount} 条等你
          </span>
        )}
      </div>
      <p style={{ fontSize: 13, color: "#8C827B", margin: "0 0 22px", lineHeight: 1.7 }}>
        她们在课后写下的话，只有你回过，才算真的被听见。
        下面的灰色字是机器起草的参考稿，可以直接改，也可以整段删掉重写。
      </p>

      {/* 筛选 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {(
          [
            ["pending", "待回"],
            ["replied", "已回"],
            ["all", "全部"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              padding: "6px 16px",
              borderRadius: 999,
              fontSize: 13,
              cursor: "pointer",
              border: filter === k ? "1px solid #0E0D10" : "1px solid #E2D9D2",
              background: filter === k ? "#0E0D10" : "#fff",
              color: filter === k ? "#fff" : "#6D645D",
              transition: "all .15s ease",
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={load}
          style={{
            marginLeft: "auto",
            padding: "6px 14px",
            borderRadius: 999,
            fontSize: 12,
            cursor: "pointer",
            border: "1px solid #E2D9D2",
            background: "#fff",
            color: "#8C827B",
          }}
        >
          刷新
        </button>
      </div>

      {hint && (
        <div
          style={{
            marginBottom: 14,
            padding: "9px 14px",
            borderRadius: 8,
            background: "#F3F7F3",
            border: "1px solid #D9E6D9",
            color: "#2E7D32",
            fontSize: 13,
          }}
        >
          {hint}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 10,
            background: "#FDF3F0",
            border: "1px solid #F0D8CE",
            color: "#8A4B3A",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {loading && !error && (
        <div style={{ padding: "60px 0", textAlign: "center", color: "#A89E97", fontSize: 13 }}>
          正在翻便签本…
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div
          style={{
            padding: "56px 24px",
            textAlign: "center",
            background: "#fff",
            border: "1px dashed #E2D9D2",
            borderRadius: 14,
          }}
        >
          <div style={{ fontSize: 15, color: "#4A403E", fontWeight: 600, marginBottom: 8 }}>
            {filter === "pending" ? "便签本翻完了，没有谁在等" : "这里还是空的"}
          </div>
          <div style={{ fontSize: 13, color: "#9E948E", lineHeight: 1.8 }}>
            会员在小程序「我的」里写完体感，就会落到这里。
            <br />
            如果一直空着，说明她们还没开始写 —— 也可能是你没在课后提醒她们写。
          </div>
        </div>
      )}

      {/* 便签列表 */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((item) => {
          const { tags, body } = splitFeeling(item.feeling);
          const isPending = item.reply_status === "pending";
          const val = drafts[item.id] ?? "";
          const untouched = isPending && item.ai_draft && val === item.ai_draft;
          const count = Number(item.training_count || 0);

          return (
            <div
              key={item.id}
              style={{
                background: "#fff",
                border: "1px solid #EBE4DF",
                borderRadius: 14,
                overflow: "hidden",
                boxShadow: "0 2px 10px rgba(14,13,16,0.03)",
              }}
            >
              {/* 便签头 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 18px",
                  borderBottom: "1px solid #F4EEE9",
                  background: isPending ? "#FFFDFB" : "#FAFAF9",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "#0E0D10",
                    color: "#F6E6DA",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    flex: "0 0 auto",
                    overflow: "hidden",
                  }}
                >
                  {item.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatar_url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    (item.member_name || "?").slice(0, 1)
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1C1415" }}>
                    {item.member_name || `会员 #${item.member_id}`}
                    <span style={{ fontSize: 11, color: "#B0A69F", fontWeight: 400, marginLeft: 8 }}>
                      {item.member_code || "无编号"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9E948E", marginTop: 2 }}>
                    入会 {fmtDate(item.joined_at)} · 累计 {count} 节
                    {item.last_training_date ? ` · 上次 ${fmtDate(item.last_training_date)}` : " · 还没有训练记录"}
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color:
                        item.reply_status === "pending"
                          ? "#8A4B3A"
                          : item.reply_status === "replied"
                          ? "#2E7D32"
                          : "#9E948E",
                    }}
                  >
                    {STATUS_LABEL[item.reply_status] || item.reply_status}
                  </div>
                  <div style={{ fontSize: 10, color: "#B0A69F", marginTop: 2 }}>
                    {isPending ? waitedText(item.created_at) : String(item.created_at).slice(0, 10)}
                  </div>
                </div>
              </div>

              {/* 她写的话 */}
              <div style={{ padding: "16px 18px 0" }}>
                {tags.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: body ? 10 : 0 }}>
                    {tags.map((t, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 11,
                          color: "#6D645D",
                          background: "#F6F1ED",
                          border: "1px solid #EDE4DE",
                          padding: "3px 9px",
                          borderRadius: 999,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                {body ? (
                  <div
                    style={{
                      fontSize: 14,
                      color: "#2A2224",
                      lineHeight: 1.85,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {body}
                  </div>
                ) : (
                  <div style={{ fontSize: 12.5, color: "#A89E97", fontStyle: "italic", lineHeight: 1.7 }}>
                    她只点了标签，没有写句子。（那就别提"你说过"，说说你看见的。）
                  </div>
                )}
              </div>

              {/* 回复区 */}
              <div style={{ padding: "16px 18px 18px" }}>
                {item.reply_status === "auto_legacy" && (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "#8A4B3A",
                      background: "#FBEDE7",
                      border: "1px solid #F0D8CE",
                      padding: "7px 11px",
                      borderRadius: 8,
                      marginBottom: 10,
                      lineHeight: 1.6,
                    }}
                  >
                    这条是改造前系统自动回的，不是你说的。要留要改，现在由你定。
                  </div>
                )}

                {item.reply_status === "replied" ? (
                  <div
                    style={{
                      fontSize: 13.5,
                      color: "#2A2224",
                      lineHeight: 1.85,
                      background: "#FAFAF9",
                      border: "1px solid #F0EAE5",
                      borderRadius: 10,
                      padding: "12px 14px",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {item.xiaoqiao_reply}
                  </div>
                ) : (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 11.5, color: "#A89E97" }}>
                        {untouched ? "机器起草 · 还没经过你的手" : "你的回复"}
                      </span>
                      {item.ai_draft && (
                        <div style={{ display: "flex", gap: 10 }}>
                          <button
                            onClick={() =>
                              setDrafts((p) => ({ ...p, [item.id]: item.ai_draft || "" }))
                            }
                            style={{
                              fontSize: 11.5,
                              color: "#6D645D",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            用回草稿
                          </button>
                          <button
                            onClick={() => setDrafts((p) => ({ ...p, [item.id]: "" }))}
                            style={{
                              fontSize: 11.5,
                              color: "#6D645D",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              textDecoration: "underline",
                            }}
                          >
                            清空自己写
                          </button>
                        </div>
                      )}
                    </div>

                    <textarea
                      value={val}
                      onChange={(e) => setDrafts((p) => ({ ...p, [item.id]: e.target.value }))}
                      placeholder="想说什么就写什么，一句也够。她认得你的口气。"
                      rows={3}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        fontSize: 13.5,
                        lineHeight: 1.85,
                        color: untouched ? "#7C736D" : "#1C1415",
                        background: untouched ? "#FAFAF9" : "#fff",
                        border: "1px solid #E2D9D2",
                        borderRadius: 10,
                        padding: "12px 14px",
                        resize: "vertical",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 10,
                      }}
                    >
                      <button
                        onClick={() => send(item)}
                        disabled={saving === item.id}
                        style={{
                          padding: "9px 22px",
                          borderRadius: 8,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: saving === item.id ? "wait" : "pointer",
                          background: "#0E0D10",
                          color: "#F6E6DA",
                          border: "none",
                          opacity: saving === item.id ? 0.6 : 1,
                        }}
                      >
                        {saving === item.id ? "发送中…" : "回复她"}
                      </button>
                      <button
                        onClick={() => dismiss(item)}
                        disabled={saving === item.id}
                        style={{
                          padding: "9px 16px",
                          borderRadius: 8,
                          fontSize: 12.5,
                          cursor: "pointer",
                          background: "#fff",
                          color: "#9E948E",
                          border: "1px solid #E2D9D2",
                        }}
                      >
                        当面聊过了，划掉
                      </button>
                      <span style={{ fontSize: 11, color: "#C0B6AF", marginLeft: "auto" }}>
                        {val.trim().length} 字
                        {val.trim().length > 120 ? " · 有点长了" : ""}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
