import { db, rawSql } from "@/db";
import { members, trainings } from "@/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";
import {
  Users,
  Calendar,
  Clock,
  MessageSquare,
  ArrowRight,
  Sparkles,
  Building2,
  TrendingUp,
  CreditCard,
  CalendarDays,
  ClipboardCheck,
  BellRing,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface AnniversaryInfo {
  memberId: number;
  memberName: string;
  joinedAt: string;
  days: number;
  level: string;
}

function daysBetween(d1: string): number {
  const a = new Date(d1);
  const b = new Date();
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function getLevel(days: number): string {
  if (days < 30) return "初识启程";
  if (days < 90) return "习惯建立";
  if (days < 180) return "稳定成长";
  if (days < 365) return "深度蜕变";
  return "长期相伴";
}

interface CareReminder {
  memberId: number;
  memberName: string;
  lastTrainingDate: string | null;
  daysSinceJoin: number;
}

export default async function AdminPage() {
  const [allMembers, rows, recentFeelings] = await Promise.all([
    db
      .select()
      .from(members)
      .where(sql`${members.status} = 'active'`)
      .catch((e) => {
        console.error("members query error:", e);
        return [];
      }),
    rawSql`
      SELECT member_id, MAX(training_date) as last_date
      FROM trainings
      GROUP BY member_id
    `.catch((e) => {
      console.error("trainings query error:", e);
      return [];
    }),
    rawSql`
      SELECT tf.id, tf.member_id, tf.feeling, tf.xiaoqiao_reply, tf.created_at,
             m.name as member_name, m.member_code
        FROM training_feelings tf
        LEFT JOIN members m ON m.id = tf.member_id
       ORDER BY tf.created_at DESC
       LIMIT 6
    `.catch((e) => {
      console.error("recentFeelings error:", e);
      return [];
    }),
  ]);

  // 已开通会员端的会员数（原来这里写死「271 人支持微信免密」，是假数）
  const portalEnabledCount = allMembers.filter(
    (m) => Number((m as any).portalEnabled) === 1
  ).length;

  // 本周入会纪念日学员
  const anniversaries: AnniversaryInfo[] = [];
  for (const m of allMembers) {
    if (!m.joinedAt) continue;
    const days = daysBetween(m.joinedAt);
    const milestones = [30, 90, 180, 365, 730, 1095];
    const isClose = milestones.some((d) => Math.abs(days - d) <= 3);
    if (isClose) {
      anniversaries.push({
        memberId: m.id,
        memberName: m.name,
        joinedAt: m.joinedAt,
        days,
        level: getLevel(days),
      });
    }
  }

  // 14 天以上未记录训练会员（单表分组聚合查出）
  const lastTrainingMap = new Map<number, string>();
  for (const r of rows) {
    if (r.member_id && r.last_date) {
      lastTrainingMap.set(Number(r.member_id), String(r.last_date));
    }
  }

  const careReminders: CareReminder[] = [];
  for (const m of allMembers) {
    const lastDate = lastTrainingMap.get(m.id) || null;
    const daysSinceLastTraining = lastDate
      ? daysBetween(lastDate)
      : m.joinedAt
      ? daysBetween(m.joinedAt)
      : 999;

    if (daysSinceLastTraining >= 14) {
      careReminders.push({
        memberId: m.id,
        memberName: m.name,
        lastTrainingDate: lastDate,
        daysSinceJoin: m.joinedAt ? daysBetween(m.joinedAt) : 0,
      });
    }
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      {/* 头部标题与面包屑 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "#697180",
              marginBottom: 4,
            }}
          >
            门店工作台 / 运营中枢与关怀看板
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 600,
              color: "#292D35",
              margin: 0,
              letterSpacing: -0.3,
            }}
          >
            总览数据
          </h1>
        </div>

        <Link
          href="/admin/members"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "#2563EB",
            color: "#FFFFFF",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            textDecoration: "none",
            transition: "background 0.15s ease",
          }}
        >
          <span>查看全部会员名录 ({allMembers.length})</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* 4 维核心运营数据指标 (Google 风格冷白卡片) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {/* 卡片 1 */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E1E5EB",
            borderRadius: 8,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 12.5, color: "#697180", fontWeight: 500 }}>
              在籍活跃会员
            </span>
            <Users size={16} style={{ color: "#697180" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "#292D35",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {allMembers.length}
            </span>
            <span style={{ fontSize: 12, color: "#10B981", fontWeight: 500 }}>
              ● {portalEnabledCount} 人已开通会员端
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#697180", marginTop: 8 }}>
            数据以后台手工维护为准
          </div>
        </div>

        {/* 卡片 2 */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E1E5EB",
            borderRadius: 8,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 12.5, color: "#697180", fontWeight: 500 }}>
              本周纪念日关怀
            </span>
            <Calendar size={16} style={{ color: "#2563EB" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "#2563EB",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {anniversaries.length}
            </span>
            <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 500 }}>
              位学员到达节点
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#697180", marginTop: 8 }}>
            30天/90天/1年/2年陪伴里程碑
          </div>
        </div>

        {/* 卡片 3 */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E1E5EB",
            borderRadius: 8,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 12.5, color: "#697180", fontWeight: 500 }}>
              两周未到馆预警
            </span>
            <Clock size={16} style={{ color: "#F59E0B" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "#292D35",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {careReminders.length}
            </span>
            <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 500 }}>
              人待温情唤醒
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#697180", marginTop: 8 }}>
            基于真实消课打卡日志计算
          </div>
        </div>

        {/* 卡片 4 */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E1E5EB",
            borderRadius: 8,
            padding: "18px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 12.5, color: "#697180", fontWeight: 500 }}>
              课后留言便签
            </span>
            <MessageSquare size={16} style={{ color: "#8B83D7" }} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 600,
                color: "#292D35",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {recentFeelings.length}
            </span>
            <span style={{ fontSize: 12, color: "#697180", fontWeight: 500 }}>
              条最新学员心声
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#697180", marginTop: 8 }}>
            支持导师手札亲笔真诚回复
          </div>
        </div>
      </div>

      {/* 小程序 4 大板块内容快捷入口 (1:1 映射微信端 Tab) */}
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#292D35", margin: 0 }}>
            微信小程序 4 大内容板块
          </h2>
          <span style={{ fontSize: 12, color: "#697180" }}>
            修改后实时同步至学员端
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          <Link
            href="/admin/stars"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E1E5EB",
              borderRadius: 8,
              padding: "16px 18px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.15s ease",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Sparkles size={16} style={{ color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#292D35" }}>
                  1. 徕舞之星
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "#697180", margin: 0, lineHeight: 1.5 }}>
                首屏大封面画报轮播、优秀学员故事、蜕变语录与杂志风封面。
              </p>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 500, color: "#2563EB" }}>
              管理画报 →
            </div>
          </Link>

          <Link
            href="/admin/brand"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E1E5EB",
              borderRadius: 8,
              padding: "16px 18px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.15s ease",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Building2 size={16} style={{ color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#292D35" }}>
                  2. 了解徕舞
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "#697180", margin: 0, lineHeight: 1.5 }}>
                场馆实拍相册、同行导师团队与三大课程体系底图。
              </p>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 500, color: "#2563EB" }}>
              配置空间与导师 →
            </div>
          </Link>

          <Link
            href="/admin/transformation"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E1E5EB",
              borderRadius: 8,
              padding: "16px 18px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.15s ease",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <TrendingUp size={16} style={{ color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#292D35" }}>
                  3. 我的蜕变
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "#697180", margin: 0, lineHeight: 1.5 }}>
                学员入学初测与进阶定格对照图谱、三维体态评估与诊断评语。
              </p>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 500, color: "#2563EB" }}>
              录入蜕变档案 →
            </div>
          </Link>

          <Link
            href="/admin/members"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E1E5EB",
              borderRadius: 8,
              padding: "16px 18px",
              textDecoration: "none",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transition: "border-color 0.15s ease",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Users size={16} style={{ color: "#2563EB" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#292D35" }}>
                  4. 我的账户
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: "#697180", margin: 0, lineHeight: 1.5 }}>
                会员名录秒查、四类细分课时手工核销、学员身体手札维护。
              </p>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, fontWeight: 500, color: "#2563EB" }}>
              管理课时档案 →
            </div>
          </Link>
        </div>
      </div>

      {/* 双列工作区：里程碑关怀 vs 最新便签 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* 左列：纪念日节点 */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E1E5EB",
            borderRadius: 8,
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#292D35", margin: 0 }}>
              入会纪念日节点关怀 ({anniversaries.length})
            </h3>
            <span
              style={{
                fontSize: 11.5,
                color: "#2563EB",
                background: "#E8EEFF",
                padding: "2px 8px",
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              本周节点
            </span>
          </div>

          {anniversaries.length === 0 ? (
            <div
              style={{
                padding: "36px 0",
                textAlign: "center",
                color: "#697180",
                fontSize: 13,
              }}
            >
              本周暂无刚好到达 30/90/180/365 天节点的学员
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {anniversaries.map((a) => (
                <div
                  key={a.memberId}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: "#F5F7FA",
                    border: "1px solid #E1E5EB",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13.5, color: "#292D35" }}>
                        {a.memberName}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          background: "#E8EEFF",
                          color: "#2563EB",
                          padding: "1px 6px",
                          borderRadius: 4,
                          fontWeight: 500,
                        }}
                      >
                        {a.level}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#697180",
                        marginTop: 3,
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      入会: {a.joinedAt.slice(0, 10)} · 已陪伴 {a.days} 天
                    </div>
                  </div>
                  <Link
                    href={`/admin/members?q=${encodeURIComponent(a.memberName)}`}
                    style={{
                      fontSize: 12,
                      color: "#2563EB",
                      background: "#FFFFFF",
                      border: "1px solid #E1E5EB",
                      padding: "4px 10px",
                      borderRadius: 4,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    去跟进
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右列：最新便签与回音 */}
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #E1E5EB",
            borderRadius: 8,
            padding: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#292D35", margin: 0 }}>
              最新学员课后留言
            </h3>
            <Link
              href="/admin/feelings"
              style={{
                fontSize: 12,
                color: "#2563EB",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              全部便签 ({recentFeelings.length}) →
            </Link>
          </div>

          {recentFeelings.length === 0 ? (
            <div
              style={{
                padding: "36px 0",
                textAlign: "center",
                color: "#697180",
                fontSize: 13,
              }}
            >
              暂无学员课后留言
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {recentFeelings.slice(0, 4).map((f: any) => (
                <div
                  key={f.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: "#F5F7FA",
                    border: "1px solid #E1E5EB",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: 13.5,
                          color: "#292D35",
                        }}
                      >
                        {f.member_name || "学员"}
                      </span>
                      {f.member_code && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "#697180",
                            background: "#E8EAF0",
                            padding: "1px 5px",
                            borderRadius: 4,
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          {f.member_code}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        color: "#697180",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {f.created_at ? String(f.created_at).slice(0, 10) : ""}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: "#292D35",
                      margin: 0,
                      lineHeight: 1.45,
                    }}
                  >
                    “{f.feeling}”
                  </p>
                  {f.xiaoqiao_reply ? (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "#2563EB",
                        background: "#E8EEFF",
                        padding: "3px 8px",
                        borderRadius: 4,
                        marginTop: 2,
                      }}
                    >
                      导师回音：{f.xiaoqiao_reply}
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "#F59E0B",
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>● 待导师回复</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
