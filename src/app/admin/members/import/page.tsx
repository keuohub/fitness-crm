"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Download, Users, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/components/admin/Toast";

type ResultRow = {
  line: number;
  status: "created" | "skipped" | "failed";
  name: string;
  matchedBy?: "phone" | "memberCode" | "name" | "new";
  portalCode?: string;
  loginPin?: string;
  loginMode?: "phone" | "pin";
  secondFactor?: string;
  cardName?: string;
  cardId?: number;
  reason?: string;
  warnings?: string[];
};

const HEADER_ALIASES: Record<string, string[]> = {
  name: ["姓名", "会员姓名", "名字", "name"],
  phone: ["手机号", "手机", "电话", "phone", "mobile"],
  memberCode: ["会员编号", "卡号", "编号", "membercode", "code"],
  gender: ["性别", "gender"],
  birthday: ["生日", "birthday"],
  joinedAt: ["入会日期", "入会时间", "joinedat", "joindate", "相伴天数", "来时路天数", "天数", "相伴日子"],
  mentorName: ["带教导师", "导师", "mentorname", "mentor"],
  notes: ["备注", "notes", "note"],
  cardName: ["卡名", "卡种", "卡类型", "cardname", "cardtype"],
  total: ["总次数", "总数", "total", "totalcount"],
  remaining: ["剩余次数", "剩余", "remaining", "remainingcount"],
  validFrom: ["生效日", "生效日期", "validfrom"],
  validUntil: ["到期日", "截止日期", "validuntil"],
  days: ["有效天数", "validitydays"],
};

function parseTable(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const first = clean.split("\n")[0] || "";
  const delim = first.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delim) { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

function normalizeKey(s: string) {
  return String(s || "").trim().toLowerCase().replace(/[\s_\-()（）]/g, "");
}

function toObjects(table: string[][]) {
  if (table.length < 2) return [] as Record<string, string>[];
  const headers = table[0].map((h) => {
    const k = normalizeKey(h);
    for (const [field, list] of Object.entries(HEADER_ALIASES)) {
      if (list.some((a) => normalizeKey(a) === k)) return field;
    }
    return "";
  });
  return table.slice(1).map((r) => {
    const o: Record<string, string> = {};
    headers.forEach((field, i) => { if (field) o[field] = (r[i] ?? "").trim(); });
    return o;
  });
}

export default function MembersImportPage() {
  const { showToast } = useToast();
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rollingBack, setRollingBack] = useState(false);

  const canonicalize = (input: Record<string, string>[]) =>
    input.map((row) => {
      const o: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        const nk = normalizeKey(key);
        let field = "";
        for (const [name, list] of Object.entries(HEADER_ALIASES)) {
          if (list.some((a) => normalizeKey(a) === nk)) field = name;
        }
        if (field) o[field] = String(value ?? "").trim();
      }
      return o;
    });

  const parse = (text: string) => {
    const table = parseTable(text);
    const objs = toObjects(table);
    setRows(objs);
    if (!objs.length) showToast("没解析到数据行，检查一下表头是不是第一行", "warning");
    return objs;
  };

  const toBase64 = (buf: ArrayBuffer) => {
    const bytes = new Uint8Array(buf);
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const onFile = async (file: File) => {
    if (/\.xlsx$/i.test(file.name)) {
      try {
        const buf = await file.arrayBuffer();
        const res = await fetch("/api/admin/members-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "parse", xlsxBase64: toBase64(buf) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "无法读取 Excel");
        const objs = canonicalize(data.rows || []);
        setRaw("");
        setRows(objs);
        setSummary(null);
        setResults([]);
        showToast(`已读取 ${file.name}，共 ${objs.length} 行`, "success");
      } catch (err: unknown) {
        showToast(err instanceof Error ? err.message : "无法读取 Excel", "error");
      }
      return;
    }
    const text = await file.text();
    setRaw(text);
    parse(text);
    showToast(`已读取 ${file.name}，共 ${toObjects(parseTable(text)).length} 行`, "success");
  };

  const submit = async (dryRun: boolean) => {
    const toSend = rows.length ? rows : parse(raw);
    if (!toSend.length) { showToast("先粘贴或上传数据", "warning"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/members-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: toSend, dryRun }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "导入失败");
      setSummary(data.summary);
      setResults(data.results || []);
      showToast(
        dryRun
          ? `预检完成：可写入 ${data.summary.created} 行，跳过 ${data.summary.skipped}，失败 ${data.summary.failed}。还没有写入数据库`
          : `导入完成：写入 ${data.summary.created} 行，跳过 ${data.summary.skipped}，失败 ${data.summary.failed}`,
        data.summary.failed ? "warning" : "success"
      );
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "导入失败", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const rollback = async () => {
    const batchId = summary?.batchId;
    if (!batchId) return;
    if (!window.confirm(`撤回批次 ${batchId}？只会删除这批新建、且还没有预约或消课的会员和卡。`)) return;
    setRollingBack(true);
    try {
      const res = await fetch("/api/admin/members-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rollback", batchId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "回滚失败");
      const blocked = (data.blocked || []).join("；");
      showToast(blocked ? `${data.message} ${blocked}` : data.message, blocked ? "warning" : "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "回滚失败", "error");
    } finally {
      setRollingBack(false);
    }
  };

  const downloadCsv = () => {
    if (!results.length) return;
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = [["行号", "姓名", "匹配方式", "结果", "邀请码", "登录方式", "登录第二因子", "登录PIN备用", "卡", "说明"].map(esc).join(",")];
    results.forEach((r) => {
      const matchLabel = r.matchedBy === "phone" ? "手机号匹配(老会员)" : r.matchedBy === "memberCode" ? "卡号匹配(老会员)" : r.matchedBy === "name" ? "姓名匹配(老会员)" : "新会员入会";
      lines.push([
        r.line, r.name,
        matchLabel,
        r.status === "created" ? "成功" : r.status === "skipped" ? "已跳过" : "失败",
        r.portalCode || "",
        r.loginMode === "phone" ? "手机尾号后4位" : "登录PIN",
        r.secondFactor || "",
        r.loginPin || "",
        r.cardName || "",
        r.reason || "",
      ].map(esc).join(","));
    });
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `会员导入结果_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setRaw(""); setRows([]); setSummary(null); setResults([]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csvContent =
      "\uFEFF" +
      "姓名,手机号,性别,生日,入会日期,带教导师,备注,卡名,总次数,剩余次数,生效日,到期日,有效天数\n" +
      "王小华,13800000001,女,,2022-03-15,小桥,老会员陪伴多年,,,,,\n" +
      "李美云,13800000002,女,,,何老师,大概来了820天（卡名留空只记相伴）,,,,,\n" +
      "周芳,13800000003,女,,,翠翠,600天老会员（精确具体天数）,,,,,\n" +
      "赵晴,13800000004,女,,,汪老师,来了300天,普拉提次卡,10,8,2026-10-01,2027-04-01,180\n";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "徕舞会员与相伴来时路导入模板.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", borderRadius: 8, border: "1px solid #E1E5EB", padding: "10px 12px",
    fontSize: 13, boxSizing: "border-box", outline: "none", color: "#292D35",
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto" }}>
      <Link href="/admin/members" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "#697180", textDecoration: "none", marginBottom: 14 }}>
        <ArrowLeft size={14} />
        返回会员档案
      </Link>

      <h1 style={{ fontSize: 22, fontWeight: 600, color: "#292D35", margin: "0 0 6px" }}>批量导入会员</h1>
      <p style={{ fontSize: 13, color: "#697180", margin: "0 0 22px", lineHeight: 1.7 }}>
        先预检，确认没有失败行，再正式导入。同一份表可以重导：已开通的卡不会重复开，已有相伴起始日不会被覆盖。导入后如果还没有人约课，可以用批次号撤回。
      </p>

      {!results.length && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E1E5EB", borderRadius: 10, padding: 22, marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <FileSpreadsheet size={16} style={{ color: "#2563EB" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#292D35" }}>第一步 填入数据</span>
          </div>

          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
            <button type="button" onClick={() => fileRef.current?.click()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid #E1E5EB", background: "#F5F7FA", color: "#292D35", fontSize: 13, cursor: "pointer" }}>
              <Upload size={14} /> 上传 CSV 或 Excel
            </button>
            <button type="button" onClick={downloadTemplate} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 6, border: "1px solid #E1E5EB", background: "#FFFFFF", color: "#2563EB", fontSize: 13, cursor: "pointer" }}>
              <Download size={14} /> 下载标准导入模板
            </button>
            <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            <span style={{ fontSize: 12.5, color: "#697180" }}>或者直接从 Excel 复制整张表粘贴到下方输入框</span>
          </div>

          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", marginBottom: 14, fontSize: 12.5, color: "#475569", lineHeight: 1.7 }}>
            <div style={{ fontWeight: 600, color: "#1E293B", marginBottom: 4 }}>表头必须是第一行，列可以少，但不能改含义：</div>
            <div>姓名（必填）、手机号（11 位，可空）、性别（男/女，可空）、生日（YYYY-MM-DD，可空）、入会日期（可填日期、2022、820 或「820天」）、带教导师、备注、卡名（须与后台卡种名称完全一致，留空则只建档不开卡）、总次数、剩余次数（留空=按总次数；要记 0 次必须写 0）、生效日、到期日、有效天数。</div>
            <div style={{ marginTop: 6 }}>1. 有手机号时按手机号认人，不会因为同名并到别人身上。没有手机号时，只在库里姓名唯一才匹配。</div>
            <div>2. 相伴天数按上海日期计算。填「820天」表示今天是第 820 天，明天自动变成 821。已有起始日的老会员，重导不会改这个日期。</div>
            <div>3. 卡名必须先在「会员卡」里建好。次卡剩余大于总次数、期限卡没有到期日，这一行会失败，其他人不受影响。</div>
          </div>

          <textarea
            value={raw}
            onChange={(e) => { setRaw(e.target.value); parse(e.target.value); }}
            rows={9}
            placeholder={"姓名,手机号,性别,生日,入会日期,带教导师,备注,卡名,总次数,剩余次数,生效日,到期日,有效天数\n张三,13800000000,女,1995-05-20,2026-10-26,小桥,朋友介绍,普拉提次卡,20,20,2026-10-26,,\n李四,,,,2026-10-26,,,普拉提月卡,,,2026-10-26,2026-11-25,30"}
            style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", fontSize: 12.5, lineHeight: 1.7, resize: "vertical" }}
          />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, gap: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12.5, color: rows.length ? "#2563EB" : "#697180" }}>
              {rows.length ? `已解析 ${rows.length} 行，点右侧按钮开始导入` : "还没有解析到数据"}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={reset} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #E1E5EB", background: "#FFFFFF", color: "#697180", fontSize: 13, cursor: "pointer" }}>清空</button>
              <button type="button" onClick={() => submit(true)} disabled={submitting || !rows.length} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #BFDBFE", background: "#FFFFFF", color: "#1D4ED8", fontSize: 13, cursor: rows.length ? "pointer" : "not-allowed" }}>
                {submitting ? "处理中..." : "先预检"}
              </button>
              <button type="button" onClick={() => submit(false)} disabled={submitting || !rows.length} style={{ padding: "8px 18px", borderRadius: 6, border: "none", background: rows.length ? "#2563EB" : "#BFD3F5", color: "#FFFFFF", fontSize: 13, fontWeight: 500, cursor: rows.length ? "pointer" : "not-allowed" }}>
                {submitting ? "导入中..." : "确认导入"}
              </button>
            </div>
          </div>

          {rows.length > 0 && (
            <div style={{ marginTop: 16, overflowX: "auto" }}>
              <div style={{ fontSize: 12, color: "#697180", marginBottom: 6 }}>前 5 行预览</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#F5F7FA" }}>
                    {["姓名", "手机号", "卡名", "总次数", "剩余次数"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #E1E5EB", fontWeight: 600, color: "#697180" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #F1F3F6" }}>{r.name || "（空）"}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #F1F3F6" }}>{r.phone || "—"}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #F1F3F6" }}>{r.cardName || "—"}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #F1F3F6" }}>{r.total || "—"}</td>
                      <td style={{ padding: "7px 10px", borderBottom: "1px solid #F1F3F6" }}>{r.remaining || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div style={{ background: "#FFFFFF", border: "1px solid #E1E5EB", borderRadius: 10, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={16} style={{ color: "#059669" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "#292D35" }}>{summary?.dryRun ? "预检结果（未写入）" : "导入结果"}</span>
              <span style={{ fontSize: 12.5, color: "#697180" }}>
                {summary?.dryRun ? "可写入" : "已写入"} {summary?.created} 行 · 开卡 {summary?.cardsCreated} 张 · 跳过 {summary?.skipped} · 失败 {summary?.failed}
                {summary?.batchId ? ` · 批次 ${summary.batchId}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={downloadCsv} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 6, border: "1px solid #E1E5EB", background: "#F5F7FA", color: "#292D35", fontSize: 13, cursor: "pointer" }}>
                <Download size={14} /> 下载结果与凭据
              </button>
              {summary?.dryRun && (
                <button type="button" onClick={() => submit(false)} disabled={submitting} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#2563EB", color: "#FFFFFF", fontSize: 13, cursor: "pointer" }}>
                  {submitting ? "导入中..." : "确认写入"}
                </button>
              )}
              {summary?.batchId && !summary?.dryRun && (
                <button type="button" onClick={rollback} disabled={rollingBack} style={{ padding: "7px 14px", borderRadius: 6, border: "1px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontSize: 13, cursor: "pointer" }}>
                  {rollingBack ? "撤回中..." : "撤回这批"}
                </button>
              )}
              <button type="button" onClick={reset} style={{ padding: "7px 14px", borderRadius: 6, border: "none", background: "#2563EB", color: "#FFFFFF", fontSize: 13, cursor: "pointer" }}>再导一批</button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: "#F5F7FA" }}>
                  {["行", "姓名", "匹配方式", "结果", "邀请码", "登录第二因子", "卡", "说明"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "9px 10px", borderBottom: "1px solid #E1E5EB", fontWeight: 600, color: "#697180", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.line}>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F3F6", color: "#697180" }}>{r.line}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F3F6" }}>{r.name}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F3F6" }}>
                      <span style={{
                        fontSize: 11.5,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: r.matchedBy === "new" ? "#F0FDF4" : "#EFF6FF",
                        color: r.matchedBy === "new" ? "#166534" : "#1E40AF",
                        border: `1px solid ${r.matchedBy === "new" ? "#BBF7D0" : "#BFDBFE"}`,
                      }}>
                        {r.matchedBy === "phone" ? "手机号匹配" : r.matchedBy === "memberCode" ? "卡号匹配" : r.matchedBy === "name" ? "姓名唯一匹配" : "新会员入会"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F3F6" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: r.status === "created" ? "#059669" : r.status === "skipped" ? "#B45309" : "#DC2626" }}>
                        {r.status === "created" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                        {r.status === "created" ? "成功" : r.status === "skipped" ? "已跳过" : "失败"}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F3F6", fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "#2563EB" }}>{r.portalCode || "—"}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F3F6" }}>
                      {r.secondFactor ? (
                        <span>
                          <b style={{ fontFamily: "ui-monospace, monospace" }}>{r.secondFactor}</b>
                          <span style={{ color: "#697180", fontSize: 11.5, marginLeft: 6 }}>{r.loginMode === "phone" ? "手机尾号" : "登录PIN"}</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F3F6" }}>{r.cardName || "—"}</td>
                    <td style={{ padding: "8px 10px", borderBottom: "1px solid #F1F3F6", color: "#697180" }}>
                      {r.reason || ""}
                      {r.warnings && r.warnings.length > 0 ? ` ${r.warnings.join("；")}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 14, fontSize: 12.5, color: "#697180", lineHeight: 1.7 }}>
            把「邀请码」和「登录第二因子」发给对应会员即可登录小程序。有手机号的会员用手机尾号后 4 位登录，没有手机号的用 6 位登录 PIN。结果表可以点右上「下载结果与凭据」导出成 CSV，方便逐个发。
          </div>
        </div>
      )}
    </div>
  );
}
