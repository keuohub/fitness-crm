import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/db";
import { members, memberMemories, trainings, questionnaireSubmissions, photos } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import DeleteMemberButton from "./_components/DeleteMemberButton";
import PortalCodeManager from "./_components/PortalCodeManager";
import MemberTabs from "./_components/MemberTabs";

interface Props {
  params: Promise<{ id: string }>;
}

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    active: "在籍",
    inactive: "停课",
    archived: "归档",
  };
  return map[s] || s;
};

export default async function MemberDetail({ params }: Props) {
  const { id } = await params;
  const memberId = parseInt(id, 10);

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, memberId));

  if (!member) {
    notFound();
  }

  const memories = await db
    .select()
    .from(memberMemories)
    .where(eq(memberMemories.memberId, memberId))
    .orderBy(memberMemories.createdAt);

  const [latestTraining] = await db
    .select()
    .from(trainings)
    .where(eq(trainings.memberId, memberId))
    .orderBy(desc(trainings.trainingDate))
    .limit(1);

  const trainingCount = (
    await db
      .select()
      .from(trainings)
      .where(eq(trainings.memberId, memberId))
  ).length;

  const [latestPhoto] = await db
    .select()
    .from(photos)
    .where(eq(photos.memberId, memberId))
    .orderBy(desc(photos.takenAt))
    .limit(1);

  const [latestQuestionnaire] = await db
    .select()
    .from(questionnaireSubmissions)
    .where(eq(questionnaireSubmissions.memberId, memberId))
    .orderBy(desc(questionnaireSubmissions.submittedAt))
    .limit(1);

  const hasQuestionnaire = latestQuestionnaire !== undefined;

  return (
    <main className="min-h-screen bg-[#FAF7F2] text-[#3E2723]">
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* ═══ 面包屑 ═══ */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-[#9E8E7E] hover:text-[#3E2723] hover:underline transition-colors">
            ← 返回会员列表
          </Link>
        </div>

        {/* ═══ 头部信息卡 ═══ */}
        <div className="bg-white rounded-2xl border border-[#E8E0D5] p-5 mb-6">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-serif font-bold">{member.name}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm text-[#9E8E7E]">
                {member.phone && <span>{member.phone}</span>}
                {member.phone && <span className="text-[#E8E0D5]">|</span>}
                <span>编号 {member.memberCode || `#${member.id}`}</span>
                <span className="text-[#E8E0D5]">|</span>
                <span>{statusLabel(member.status)}</span>
                {member.tags && (
                  <>
                    <span className="text-[#E8E0D5]">|</span>
                    <span>{member.tags}</span>
                  </>
                )}
                {member.freezeStatus === "frozen" && (
                  <span className="text-xs bg-[#8B5E3C]/10 text-[#8B5E3C] px-1.5 py-0.5 rounded">
                    冻结中
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button asChild size="sm" variant="outline" className="rounded-xl">
                <Link href={`/members/${memberId}/edit`}>编辑</Link>
              </Button>
              <DeleteMemberButton memberId={memberId} memberName={member.name} />
            </div>
          </div>
        </div>

        <PortalCodeManager memberId={memberId} />

        {/* ═══ Tab 内容区 ═══
            as any: Drizzle schema 有循环引用导致 TS 类型推断失效，
            这是项目已知问题，数据本身是类型安全的。 */}
        <MemberTabs
          member={member as any}
          memberId={memberId}
          memories={memories as any}
          latestTraining={latestTraining as any}
          trainingCount={trainingCount}
          latestPhoto={latestPhoto as any}
          latestQuestionnaire={latestQuestionnaire as any}
          hasQuestionnaire={hasQuestionnaire}
        />
      </div>
    </main>
  );
}
