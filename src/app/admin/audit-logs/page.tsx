"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  User,
  ShieldCheck,
  Activity,
  FileSpreadsheet,
} from "lucide-react";

interface AuditLog {
  id: number;
  actorName: string;
  actorUsername: string;
  action: string;
  entityType?: string;
  entityId?: number;
  summary: string;
  ip: string;
  createdAt: string;
}

const ACTION_MAP: Record<string, { label: string; bg: string; text: string }> = {
  manager_login: { label: "管家登录", bg: "bg-purple-50", text: "text-purple-700 border-purple-200" },
  checkin: { label: "到课签到", bg: "bg-emerald-50", text: "text-emerald-700 border-emerald-200" },
  no_show: { label: "旷课未到", bg: "bg-rose-50", text: "text-rose-700 border-rose-200" },
  issue_card: { label: "开卡办理", bg: "bg-amber-50", text: "text-amber-700 border-amber-200" },
  return_card: { label: "退卡停卡", bg: "bg-orange-50", text: "text-orange-700 border-orange-200" },
  cancel_booking: { label: "代客退课", bg: "bg-blue-50", text: "text-blue-700 border-blue-200" },
  book_for_member: { label: "代客约课", bg: "bg-teal-50", text: "text-teal-700 border-teal-200" },
  security_provision: { label: "安全审计", bg: "bg-slate-50", text: "text-slate-700 border-slate-200" },
};

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (keyword) params.set("keyword", keyword);
    if (actionFilter) params.set("action", actionFilter);

    fetch(`/api/admin/audit-logs?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && data.logs) {
          setLogs(data.logs);
          setTotal(data.total || 0);
        }
      })
      .catch((err) => console.error("Failed to load audit logs:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* 顶部标题区 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#B92E32] tracking-wide uppercase flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5" /> SECURITY & AUDIT TRAIL · 全链路留痕寻迹
          </div>
          <h1 className="text-2xl font-semibold text-[#292D35] mt-1 tracking-tight">操作留痕与安全审计寻迹</h1>
          <p className="text-sm text-[#697180] mt-1">
            严格记录管理端每一次签到扣次、发卡退卡、约课排课与登录操作，责任到人，全程防篡改。
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="px-4 py-2 text-xs font-medium text-[#292D35] bg-white border border-[#E1E5EB] hover:bg-gray-50 rounded-lg shadow-xs flex items-center gap-1.5 self-start transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> 刷新最新留痕
        </button>
      </div>

      {/* 三宫格数据状态 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-xs">
          <div className="text-xs text-[#697180] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#B92E32]" /> 累计操作寻迹条数
          </div>
          <div className="text-2xl font-bold text-[#1A1719] mt-2">{total} <span className="text-xs font-normal text-[#8A8B90]">条记录</span></div>
          <div className="text-xs text-[#2E7D4F] mt-1">● 实时写入 Neon 数据库</div>
        </div>

        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-xs">
          <div className="text-xs text-[#697180] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" /> 授权专职管理账号
          </div>
          <div className="text-2xl font-bold text-[#1A1719] mt-2">3 <span className="text-xs font-normal text-[#8A8B90]">位专职人员</span></div>
          <div className="text-xs text-[#8A8B90] mt-1">总店长 · 前台管家 · 教务督导</div>
        </div>

        <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-xs">
          <div className="text-xs text-[#697180] flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-600" /> 手机号免密与小桥状态
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">已全面阻断</div>
          <div className="text-xs text-[#8A8B90] mt-1">小桥后台权限已撤销，仅限专用账号</div>
        </div>
      </div>

      {/* 搜索与过滤工具条 */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜索操作人、账号或关键词（如：王芳 / 开卡 / 签到）..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B92E32]"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
          }}
          className="px-3 py-1.5 text-xs bg-white border border-[#E1E5EB] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#B92E32]"
        >
          <option value="">全部业务动作</option>
          <option value="checkin">到课签到</option>
          <option value="no_show">旷课未到</option>
          <option value="issue_card">开卡办理</option>
          <option value="return_card">退卡停卡</option>
          <option value="cancel_booking">代客退课</option>
          <option value="book_for_member">代客约课</option>
          <option value="manager_login">管家登录</option>
        </select>

        <button
          onClick={fetchLogs}
          className="px-4 py-1.5 text-xs font-medium text-white bg-[#B92E32] hover:bg-[#9B2529] rounded-lg shadow-xs transition-colors"
        >
          查询
        </button>
      </div>

      {/* 审计日志列表表格 */}
      <div className="bg-white border border-[#E1E5EB] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF8F5] border-b border-[#E1E5EB] text-[#697180] font-semibold">
                <th className="py-3 px-4 w-[180px]">记录时间</th>
                <th className="py-3 px-4 w-[160px]">操作责任人</th>
                <th className="py-3 px-4 w-[110px]">业务类型</th>
                <th className="py-3 px-4">操作留痕详情</th>
                <th className="py-3 px-4 w-[130px]">来源 IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1E5EB]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8A8B90]">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#B92E32]" />
                    正在同步操作留痕数据…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#8A8B90]">
                    暂无符合条件的操作记录
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = ACTION_MAP[log.action] || {
                    label: log.action,
                    bg: "bg-gray-50",
                    text: "text-gray-700 border-gray-200",
                  };
                  return (
                    <tr key={log.id} className="hover:bg-[#FFFBFB] transition-colors">
                      <td className="py-3 px-4 text-[#8A8B90] font-mono whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {formatTime(log.createdAt)}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-[#1A1719]">{log.actorName}</div>
                        <div className="text-[11px] text-[#8A8B90] font-mono">{log.actorUsername}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-sm border ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#292D35] font-medium leading-relaxed">
                        {log.summary}
                      </td>
                      <td className="py-3 px-4 text-[#8A8B90] font-mono text-[11px] whitespace-nowrap">
                        {log.ip}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
