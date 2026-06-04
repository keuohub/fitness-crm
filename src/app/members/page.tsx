import { db } from "@/db";
import { members, trainings } from "@/db/schema";
import { desc, sql, eq, and, gte } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

type MemberRow = typeof members.$inferSelect;

function getActivityTag(trainCount: number, status: string, freezeStatus: string | null): { label: string; bg: string; text: string } {
  if (freezeStatus === "frozen") return { label: "已冻结", bg: "#F3F4F6", text: "#6B7280" };
  if (status !== "active") return { label: "非活跃", bg: "#FFF3E0", text: "#E65100" };
  if (trainCount >= 8) return { label: "高活跃", bg: "#E8F5E9", text: "#2E7D32" };
  if (trainCount >= 4) return { label: "稳定", bg: "#E3F2FD", text: "#1565C0" };
  if (trainCount >= 1) return { label: "值得关注", bg: "#FFF8E1", text: "#F57F17" };
  return { label: "长期未见", bg: "#FCE4EC", text: "#C62828" };
}

const THIRTY_DAYS_AGO = new Date();
THIRTY_DAYS_AGO.setDate(THIRTY_DAYS_AGO.getDate() - 30);
const thirtyDaysAgoStr = THIRTY_DAYS_AGO.toISOString().slice(0, 10);

async function getTrainCounts(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      memberId: trainings.memberId,
      count: sql<number>`count(*)`,
    })
    .from(trainings)
    .where(gte(trainings.trainingDate, thirtyDaysAgoStr))
    .groupBy(trainings.memberId);

  const map = new Map<number, number>();
  for (const r of rows) {
    map.set(r.memberId, r.count);
  }
  return map;
}

export default async function MembersPage() {
  const allMembers = await db.select().from(members).orderBy(desc(members.createdAt));
  const trainCounts = await getTrainCounts();

  return (
    <main style={{ background: "#FAF7F2", minHeight: "100vh", padding: "40px 24px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#3E2723" }}>会员列表</h1>
          <Link
            href="/members/new"
            style={{
              background: "#8B5E3C", color: "#fff", padding: "10px 20px",
              borderRadius: 8, fontWeight: 600, textDecoration: "none", fontSize: 14
            }}
          >
            新建会员
          </Link>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {allMembers.length === 0 && (
            <p style={{ color: "#9E8E7E", textAlign: "center", padding: 60 }}>暂无会员数据</p>
          )}
          {allMembers.map((m: MemberRow) => {
            const cnt = trainCounts.get(m.id) ?? 0;
            const tag = getActivityTag(cnt, m.status, m.freezeStatus);
            return (
              <Link
                key={m.id}
                href={`/members/${m.id}`}
                style={{
                  background: "#FFFFFF", borderRadius: 12, padding: "16px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  textDecoration: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#3E2723" }}>{m.name}</div>
                    {m.phone && <div style={{ fontSize: 13, color: "#9E8E7E", marginTop: 1 }}>{m.phone}</div>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 12 }}>
                  <span style={{ color: "#9E8E7E" }}>{cnt}次/30天</span>
                  <span style={{
                    background: tag.bg, color: tag.text,
                    padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                    whiteSpace: "nowrap"
                  }}>
                    {tag.label}
                  </span>
                  {m.stage && <span style={{ color: "#8B5E3C", fontWeight: 500 }}>{m.stage}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
