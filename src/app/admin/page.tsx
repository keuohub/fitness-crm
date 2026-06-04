import { db } from "@/db";
import { members, trainings } from "@/db/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

const today = new Date().toISOString().slice(5, 10); // MM-DD
const sevenDaysLater = new Date(Date.now() + 7 * 86400000).toISOString().slice(5, 10);

interface AnniversaryInfo {
  memberId: number;
  memberName: string;
  joinedAt: string;
  days: number;
  level: string;
}

// Days since joined_at
function daysBetween(d1: string): number {
  const a = new Date(d1);
  const b = new Date();
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

function getLevel(days: number): string {
  if (days < 30) return "启程";
  if (days < 90) return "习惯建立";
  if (days < 180) return "稳定成长";
  if (days < 365) return "深度蜕变";
  return "长期主义";
}

// Care reminders: 14 days no training members
interface CareReminder {
  memberId: number;
  memberName: string;
  lastTrainingDate: string | null;
  daysSinceJoin: number;
}

export default async function AdminPage() {
  const allMembers = await db.select().from(members).where(sql`${members.status} = 'active'`);

  // Anniversaries this week (MM-DD match in coming 7 days)
  const anniversaries: AnniversaryInfo[] = [];
  for (const m of allMembers) {
    if (!m.joinedAt) continue;
    const joinedMMDD = m.joinedAt.slice(5, 10);
    const days = daysBetween(m.joinedAt);
    const anniversaries_30 = [30, 90, 180, 365, 1095, 1825];
    const isClose = anniversaries_30.some((d) => Math.abs(days - d) <= 3);
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

  // Care reminders: 14+ days since last training
  const careReminders: CareReminder[] = [];
  for (const m of allMembers) {
    const lastTraining = await db
      .select({ date: trainings.trainingDate })
      .from(trainings)
      .where(sql`${trainings.memberId} = ${m.id}`)
      .orderBy(sql`${trainings.trainingDate} DESC`)
      .limit(1);

    const lastDate = lastTraining[0]?.date ?? null;
    const daysSinceLastTraining = lastDate ? daysBetween(lastDate) : (m.joinedAt ? daysBetween(m.joinedAt) : 999);

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
    <main style={{ background: "#FAF7F2", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#3E2723" }}>CRM 首页</h1>
          <Link href="/members" style={{ fontSize: 14, color: "#8B5E3C", fontWeight: 500, textDecoration: "none" }}>
            会员列表 →
          </Link>
        </div>

        {anniversaries.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#8B5E3C", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              本周纪念会员
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {anniversaries.map((a) => (
                <Link key={a.memberId} href={`/members/${a.memberId}`}
                  style={{
                    background: "#FFFFFF", borderRadius: 10, padding: "14px 18px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    textDecoration: "none", boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                  }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#3E2723" }}>{a.memberName}</span>
                    <span style={{ fontSize: 12, color: "#9E8E7E", marginLeft: 10 }}>{a.days}天 · {a.level}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "#8B5E3C", fontWeight: 500 }}>加入于 {a.joinedAt?.slice(0, 10)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {careReminders.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#F57F17", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>
              值得联系会员
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {careReminders.map((c) => (
                <Link key={c.memberId} href={`/members/${c.memberId}`}
                  style={{
                    background: "#FFFDF7", borderRadius: 10, padding: "14px 18px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    textDecoration: "none", border: "1px solid #FCE4EC"
                  }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#3E2723" }}>{c.memberName}</span>
                    <span style={{ fontSize: 12, color: "#9E8E7E", marginLeft: 10 }}>
                      {c.lastTrainingDate ? `最近训练 ${c.lastTrainingDate}` : "暂无训练记录"}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: "#C62828", fontWeight: 500 }}>加入 {c.daysSinceJoin} 天</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <Link href="/members" style={{
            background: "#FFFFFF", padding: "12px 24px", borderRadius: 10,
            fontSize: 14, color: "#3E2723", fontWeight: 500, textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>全部会员</Link>
          <Link href="/admin/sync" style={{
            background: "#FFFFFF", padding: "12px 24px", borderRadius: 10,
            fontSize: 14, color: "#3E2723", fontWeight: 500, textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>飞书同步</Link>
          <Link href="/admin/usage" style={{
            background: "#FFFFFF", padding: "12px 24px", borderRadius: 10,
            fontSize: 14, color: "#3E2723", fontWeight: 500, textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>运营数据</Link>
        </div>
      </div>
    </main>
  );
}
