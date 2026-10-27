"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  UserCheck,
  Users,
  ShieldCheck,
  CreditCard,
  Building2,
  TrendingUp,
  Monitor,
  Share2,
  QrCode,
  ChevronRight,
  X,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

export interface RecentActivityItem {
  id: number;
  status: string;
  created_at: string;
  cancelled_at: string | null;
  updated_at: string;
  member_name: string;
  course_name: string;
  session_date: string;
  start_time: string;
}

interface MobileManagementHomeProps {
  todayBookingsCount: number;
  todayNewCardsCount: number;
  todayNewMembersCount: number;
  recentActivities: RecentActivityItem[];
  totalMembersCount: number;
  portalEnabledCount: number;
}

function formatRelativeTime(dateStr: string) {
  if (!dateStr) return "刚刚";
  const now = new Date().getTime();
  const target = new Date(dateStr).getTime();
  const diffSec = Math.floor((now - target) / 1000);
  if (diffSec < 60) return "刚刚";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}分钟前`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}小时前`;
  return `${Math.floor(diffSec / 86400)}天前`;
}

export default function MobileManagementHome({
  todayBookingsCount,
  todayNewCardsCount,
  todayNewMembersCount,
  recentActivities,
  totalMembersCount,
  portalEnabledCount,
}: MobileManagementHomeProps) {
  const [modalType, setModalType] = useState<"pc" | "invite" | "checkin" | null>(null);
  const [copied, setCopied] = useState(false);

  const pcUrl = typeof window !== "undefined" ? `${window.location.origin}/admin` : "https://crm.laiwupilates.com/admin";

  const handleCopy = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const todayStr = (() => {
    const now = new Date();
    const days = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${days[now.getDay()]}`;
  })();

  const topActivity = recentActivities[0];

  const gridItems = [
    {
      title: "预约",
      subtitle: "实时名单",
      href: "/admin/bookings",
      icon: ClipboardCheck,
      color: "#9E7B44",
      bg: "#FAF4EC",
    },
    {
      title: "排课",
      subtitle: "周课日历",
      href: "/admin/schedule",
      icon: CalendarDays,
      color: "#2563EB",
      bg: "#EFF6FF",
    },
    {
      title: "课程管理",
      subtitle: "分类星级",
      href: "/admin/courses",
      icon: BookOpen,
      color: "#7C3AED",
      bg: "#F5F3FF",
    },
    {
      title: "私教",
      subtitle: "1V1授课",
      href: "/admin/coach",
      icon: UserCheck,
      color: "#059669",
      bg: "#ECFDF5",
    },
    {
      title: "会员",
      subtitle: "档案CRM",
      href: "/admin/members",
      icon: Users,
      color: "#D97706",
      bg: "#FFFBEB",
    },
    {
      title: "员工",
      subtitle: "团队权限",
      href: "/admin/team",
      icon: ShieldCheck,
      color: "#475569",
      bg: "#F1F5F9",
    },
    {
      title: "会员卡",
      subtitle: "扣次延期",
      href: "/admin/cards",
      icon: CreditCard,
      color: "#B45309",
      bg: "#FEF3C7",
    },
    {
      title: "教室",
      subtitle: "场地管理",
      href: "/admin/venue",
      icon: Building2,
      color: "#0284C7",
      bg: "#F0F9FF",
    },
    {
      title: "数据统计",
      subtitle: "经营报表",
      href: "/admin/reports",
      icon: TrendingUp,
      color: "#E11D48",
      bg: "#FFF1F2",
    },
  ];

  return (
    <div style={{ width: "100%", paddingBottom: 16 }}>
      {/* 顶部店铺标题与状态 */}
      <div
        style={{
          background: "linear-gradient(135deg, #1A191D 0%, #0D0C0F 100%)",
          borderRadius: 16,
          padding: "18px 20px",
          color: "#FFFFFF",
          marginBottom: 14,
          boxShadow: "0 4px 16px rgba(13, 12, 15, 0.12)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            right: -20,
            top: -20,
            width: 120,
            height: 120,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(184, 147, 88, 0.15) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 0.5,
                color: "#FFFFFF",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              徕舞普拉提女子塑形
            </span>
            <span
              style={{
                fontSize: 10,
                padding: "2px 6px",
                borderRadius: 4,
                background: "rgba(184, 147, 88, 0.2)",
                color: "#F6E6DA",
                border: "1px solid rgba(184, 147, 88, 0.4)",
                fontWeight: 500,
              }}
            >
              管家端
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#A8A29E" }}>{todayStr}</span>
        </div>

        <div style={{ fontSize: 12, color: "#C7C2BA", marginTop: 4 }}>
          全自研SaaS智能中枢 · 约课已打通 · 课后自动结课
        </div>
      </div>

      {/* 核心指标 3 卡片 (对标用户参考图) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 14,
        }}
      >
        {/* 今日预约 */}
        <Link
          href="/admin/bookings"
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            padding: "14px 10px",
            textAlign: "center",
            textDecoration: "none",
            border: "1px solid #ECE8E1",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#78716C", fontWeight: 500, marginBottom: 4 }}>
            今日预约
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#0D0C0F",
              lineHeight: 1.2,
              fontFamily: "system-ui, -apple-system, monospace",
            }}
          >
            {todayBookingsCount}
          </div>
          <div style={{ fontSize: 10, color: "#9E7B44", marginTop: 4, fontWeight: 500 }}>
            点击查名单
          </div>
        </Link>

        {/* 新增会员卡 */}
        <Link
          href="/admin/cards"
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            padding: "14px 10px",
            textAlign: "center",
            textDecoration: "none",
            border: "1px solid #ECE8E1",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#78716C", fontWeight: 500, marginBottom: 4 }}>
            新增会员卡
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#0D0C0F",
              lineHeight: 1.2,
              fontFamily: "system-ui, -apple-system, monospace",
            }}
          >
            {todayNewCardsCount}
          </div>
          <div style={{ fontSize: 10, color: "#059669", marginTop: 4, fontWeight: 500 }}>
            发卡与扣次
          </div>
        </Link>

        {/* 新增会员 */}
        <Link
          href="/admin/members"
          style={{
            background: "#FFFFFF",
            borderRadius: 12,
            padding: "14px 10px",
            textAlign: "center",
            textDecoration: "none",
            border: "1px solid #ECE8E1",
            boxShadow: "0 2px 6px rgba(0, 0, 0, 0.03)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#78716C", fontWeight: 500, marginBottom: 4 }}>
            新增会员
          </div>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: "#0D0C0F",
              lineHeight: 1.2,
              fontFamily: "system-ui, -apple-system, monospace",
            }}
          >
            {todayNewMembersCount}
          </div>
          <div style={{ fontSize: 10, color: "#2563EB", marginTop: 4, fontWeight: 500 }}>
            会员CRM
          </div>
        </Link>
      </div>

      {/* 实时动态通报条 (对标用户的 "• 金鑫取消预约动感普拉提 2小时前 >") */}
      <Link
        href="/admin/bookings"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFFFFF",
          borderRadius: 10,
          padding: "10px 14px",
          marginBottom: 14,
          border: "1px solid #ECE8E1",
          textDecoration: "none",
          boxShadow: "0 1px 4px rgba(0,0,0,0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: topActivity?.status === "cancelled" ? "#EF4444" : "#10B981",
              flexShrink: 0,
            }}
          />
          <div
            style={{
              fontSize: 12.5,
              color: "#1C1917",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {topActivity ? (
              <>
                <strong style={{ fontWeight: 600 }}>{topActivity.member_name}</strong>{" "}
                <span
                  style={{
                    color: topActivity.status === "cancelled" ? "#DC2626" : "#059669",
                  }}
                >
                  {topActivity.status === "cancelled" ? "取消预约" : "预约课程"}
                </span>{" "}
                {topActivity.course_name}
              </>
            ) : (
              <span style={{ color: "#78716C" }}>今日约课系统运行正常，等待新动态</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: "#A8A29E" }}>
            {topActivity ? formatRelativeTime(topActivity.updated_at || topActivity.created_at) : "实时"}
          </span>
          <ChevronRight size={14} style={{ color: "#A8A29E" }} />
        </div>
      </Link>

      {/* 快捷工具 3 按钮 (对标 电脑登录 / 邀请会员 / 签到码) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => setModalType("pc")}
          style={{
            background: "#FFFFFF",
            border: "1px solid #ECE8E1",
            borderRadius: 10,
            padding: "10px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            color: "#292524",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Monitor size={15} style={{ color: "#9E7B44" }} />
          <span>电脑登录</span>
        </button>

        <button
          type="button"
          onClick={() => setModalType("invite")}
          style={{
            background: "#FFFFFF",
            border: "1px solid #ECE8E1",
            borderRadius: 10,
            padding: "10px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            color: "#292524",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <Share2 size={15} style={{ color: "#2563EB" }} />
          <span>邀请会员</span>
        </button>

        <button
          type="button"
          onClick={() => setModalType("checkin")}
          style={{
            background: "#FFFFFF",
            border: "1px solid #ECE8E1",
            borderRadius: 10,
            padding: "10px 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
            color: "#292524",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <QrCode size={15} style={{ color: "#059669" }} />
          <span>签到码</span>
        </button>
      </div>

      {/* 九宫格核心业务入口 (3x3 对标用户参考图) */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          padding: "14px 10px",
          border: "1px solid #ECE8E1",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.03)",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1C1917",
            padding: "0 8px 12px 8px",
            borderBottom: "1px solid #F5F2EB",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>业务功能中枢</span>
          <span style={{ fontSize: 11, color: "#A8A29E", fontWeight: 400 }}>
            9项核心SaaS功能全部打通
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px 8px",
            paddingTop: 12,
          }}
        >
          {gridItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 4px",
                  borderRadius: 10,
                  textDecoration: "none",
                  transition: "background 0.15s ease",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: item.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.color,
                    marginBottom: 6,
                  }}
                >
                  <Icon size={22} strokeWidth={2} />
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#1C1917",
                    marginBottom: 2,
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#A8A29E",
                  }}
                >
                  {item.subtitle}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 经营底座概览 */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 12,
          padding: "12px 16px",
          border: "1px solid #ECE8E1",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: "#78716C" }}>在籍总会员</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0D0C0F", marginTop: 2 }}>
            {totalMembersCount} 位
          </div>
        </div>
        <div style={{ width: 1, height: 26, background: "#E7E5E4" }} />
        <div>
          <div style={{ fontSize: 11, color: "#78716C" }}>已开通会员端</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#059669", marginTop: 2 }}>
            {portalEnabledCount} 人
          </div>
        </div>
        <div style={{ width: 1, height: 26, background: "#E7E5E4" }} />
        <Link
          href="/admin/members"
          style={{
            fontSize: 12,
            color: "#9E7B44",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          查看全景 &gt;
        </Link>
      </div>

      {/* 弹窗：电脑登录 */}
      {modalType === "pc" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              width: "100%",
              maxWidth: 360,
              padding: 20,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1C1917" }}>
                电脑端管理后台
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#78716C" }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6, marginBottom: 14 }}>
              请在电脑浏览器中访问以下网址，使用管理员手机号和验证码即可登录：
            </p>
            <div
              style={{
                background: "#F5F5F4",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 12,
                color: "#1C1917",
                wordBreak: "break-all",
                marginBottom: 16,
                fontFamily: "monospace",
              }}
            >
              {pcUrl}
            </div>
            <button
              type="button"
              onClick={() => handleCopy(pcUrl)}
              style={{
                width: "100%",
                padding: "10px 0",
                background: "#0D0C0F",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "已复制到剪贴板" : "复制电脑端网址"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 弹窗：邀请会员 */}
      {modalType === "invite" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              width: "100%",
              maxWidth: 360,
              padding: 20,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1C1917" }}>
                邀请会员预约
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#78716C" }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13, color: "#57534E", lineHeight: 1.6, marginBottom: 14 }}>
              会员可直接在微信中搜索小程序 <strong>徕舞普拉提</strong> 或长按识别小程序码进行在线约课与选座。
            </p>
            <div
              style={{
                background: "#FAF4EC",
                border: "1px solid #ECE0D1",
                borderRadius: 8,
                padding: "12px",
                fontSize: 12,
                color: "#78350F",
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              小程序已发布最新版本，包含：
              <br />• 精品课 / 团体课 / 私教课 分类
              <br />• 真实封面图与难度星级
              <br />• 下课自动结课，无需会员排队扫码
            </div>
            <button
              type="button"
              onClick={() => {
                handleCopy("微信搜索小程序【徕舞普拉提】即可在线约课");
              }}
              style={{
                width: "100%",
                padding: "10px 0",
                background: "#0D0C0F",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? "已复制引导文案" : "复制微信分享指引"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 弹窗：签到码 */}
      {modalType === "checkin" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              width: "100%",
              maxWidth: 360,
              padding: 20,
              boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "#1C1917" }}>
                签到与消课规则
              </h3>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#78716C" }}
              >
                <X size={18} />
              </button>
            </div>
            <div
              style={{
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                borderRadius: 8,
                padding: "12px",
                fontSize: 12.5,
                color: "#166534",
                lineHeight: 1.6,
                marginBottom: 16,
              }}
            >
              <strong>已启用智能自动结课引擎：</strong>
              <br />
              会员预约课程后，若未在课前主动取消，系统将在课程结束时<strong>自动视为已上课并自动扣减课时</strong>。
              <br /><br />
              前台管家与教练无需逐一扫码核销，有效避免上课高峰期排队拥堵。
            </div>
            <button
              type="button"
              onClick={() => setModalType(null)}
              style={{
                width: "100%",
                padding: "10px 0",
                background: "#0D0C0F",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
