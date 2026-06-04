"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AIFeedbackCard from "./AIFeedbackCard";
import PeriodReportCard from "./PeriodReportCard";
import FeedbackTimeline from "./FeedbackTimeline";
import GrowthTimeline from "./GrowthTimeline";

// ─── 类型定义 ──────────────────────────────────────────

interface Member {
  id: number;
  name: string;
  phone: string | null;
  gender: string | null;
  birthday: string | null;
  status: string;
  stage: string | null;
  freezeStatus: string | null;
  freezeStart: string | null;
  tags: string | null;
  memberCode: string | null;
  notes: string | null;
  joinedAt: string | null;
  createdAt: string | null;
}

interface MemoryItem {
  id: number;
  memberId: number;
  memoryType: string;
  content: string | null;
  structuredData: string | null;
  createdAt: string | null;
}

interface TrainingItem {
  id: number;
  memberId: number;
  trainingDate: string;
  type: string;
  durationMinutes: number | null;
  focusArea: string | null;
  notes: string | null;
}

interface PhotoItem {
  id: number;
  memberId: number;
  filePath: string;
  photoType: string;
  takenAt: string | null;
}

interface QuestionnaireItem {
  id: number;
  memberId: number;
  height: number | null;
  weight: number | null;
  desiredState: string | null;
  avgSleep: number | null;
  occupation: string | null;
  workStatus: string | null;
  exerciseFrequency: string | null;
  submittedAt: string | null;
}

interface Props {
  member: Member;
  memberId: number;
  memories: MemoryItem[];
  latestTraining: TrainingItem | undefined;
  trainingCount: number;
  latestPhoto: PhotoItem | undefined;
  latestQuestionnaire: QuestionnaireItem | undefined;
  hasQuestionnaire: boolean;
}

// ─── 标签映射 ──────────────────────────────────────────

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    active: "在籍",
    inactive: "停课",
    archived: "归档",
  };
  return map[s] || s;
};

const stageLabel = (s: string | null) => {
  const map: Record<string, string> = {
    new: "新会员",
    active: "活跃",
    regular: "常客",
    at_risk: "流失风险",
    churned: "已流失",
  };
  return s ? map[s] || s : "-";
};

const memoryTypeLabel = (t: string) => {
  const map: Record<string, string> = {
    note: "备注",
    milestone: "里程碑",
    preference: "偏好",
    ai_summary: "会员摘要",
  };
  return map[t] || t;
};

const trainingTypeLabel = (t: string) => {
  const map: Record<string, string> = {
    private: "私教",
    group: "团课",
    assessment: "评估",
  };
  return map[t] || t;
};

const photoTypeLabel = (t: string) => {
  const map: Record<string, string> = {
    body: "体型",
    posture: "体态",
    progress: "进度",
  };
  return map[t] || t;
};

// ─── 组件 ──────────────────────────────────────────────

export default function MemberTabs({
  member,
  memberId,
  memories,
  latestTraining,
  trainingCount,
  latestPhoto,
  latestQuestionnaire,
  hasQuestionnaire,
}: Props) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="w-full border-b border-[#E8E0D5] pb-0 mb-6">
        <TabsTrigger value="profile">档案</TabsTrigger>
        <TabsTrigger value="training">训练</TabsTrigger>
        <TabsTrigger value="photos">照片</TabsTrigger>
        <TabsTrigger value="feedback">反馈</TabsTrigger>
        <TabsTrigger value="growth">成长</TabsTrigger>
      </TabsList>

      {/* ─── Tab 1: 档案 ─── */}
      <TabsContent value="profile" className="space-y-6">
        {/* 基本信息网格 */}
        <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm">
          <h2 className="font-serif text-lg mb-4">基本信息</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-[#9E8E7E]">姓名</span>
              <p className="font-medium">{member.name}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">性别</span>
              <p>{member.gender === "female" ? "女" : member.gender === "male" ? "男" : "未填写"}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">生日</span>
              <p>{member.birthday || "-"}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">年龄</span>
              <p>{member.birthday ? `${new Date().getFullYear() - new Date(member.birthday).getFullYear()}岁` : "-"}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">编号</span>
              <p>{member.memberCode || `#${member.id}`}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">阶段</span>
              <p>{stageLabel(member.stage)}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">状态</span>
              <p>{statusLabel(member.status)}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">标签</span>
              <p>{member.tags || "-"}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">入会日期</span>
              <p className="text-xs">{member.joinedAt?.slice(0, 10) || "-"}</p>
            </div>
            <div>
              <span className="text-[#9E8E7E]">登记日期</span>
              <p className="text-xs">{member.createdAt?.slice(0, 10) || "-"}</p>
            </div>
            {member.notes && (
              <div className="col-span-2 sm:col-span-4">
                <span className="text-[#9E8E7E]">备注</span>
                <p className="text-[#3E2723] mt-0.5">{member.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* 健康问卷 */}
        <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-lg">健康问卷</h2>
            <div className="flex gap-2">
              {latestQuestionnaire ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/members/${memberId}/questionnaire`}>查看完整问卷</Link>
                </Button>
              ) : null}
              <Button asChild size="sm">
                <Link href={`/members/${memberId}/questionnaire/new`}>
                  {latestQuestionnaire ? "更新问卷" : "新增问卷"}
                </Link>
              </Button>
            </div>
          </div>

          {latestQuestionnaire ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-[#9E8E7E]">身高</span>
                <p>{latestQuestionnaire.height ? `${latestQuestionnaire.height}cm` : "-"}</p>
              </div>
              <div>
                <span className="text-[#9E8E7E]">体重</span>
                <p>{latestQuestionnaire.weight ? `${latestQuestionnaire.weight}kg` : "-"}</p>
              </div>
              <div>
                <span className="text-[#9E8E7E]">目标</span>
                <p className="truncate">{latestQuestionnaire.desiredState || "-"}</p>
              </div>
              <div>
                <span className="text-[#9E8E7E]">日均睡眠</span>
                <p>{latestQuestionnaire.avgSleep ? `${latestQuestionnaire.avgSleep}h` : "-"}</p>
              </div>
              <div>
                <span className="text-[#9E8E7E]">职业</span>
                <p>{latestQuestionnaire.occupation || "-"}</p>
              </div>
              <div>
                <span className="text-[#9E8E7E]">工作状态</span>
                <p>{latestQuestionnaire.workStatus || "-"}</p>
              </div>
              <div>
                <span className="text-[#9E8E7E]">运动频率</span>
                <p>{latestQuestionnaire.exerciseFrequency || "-"}</p>
              </div>
              <div>
                <span className="text-[#9E8E7E]">提交时间</span>
                <p className="text-xs">{latestQuestionnaire.submittedAt}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[#9E8E7E]">暂未填写健康问卷</p>
          )}
        </div>

        {/* 会员记忆 */}
        {memories.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm">
            <h2 className="font-serif text-lg mb-4">会员记忆</h2>
            <div className="space-y-3">
              {memories.map((m) => (
                <div key={m.id} className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-[#E8E0D5] px-1.5 py-0.5 rounded">
                      {memoryTypeLabel(m.memoryType)}
                    </span>
                    <span className="text-xs text-[#9E8E7E]">{m.createdAt}</span>
                  </div>
                  {m.content && (
                    <p className="text-[#3E2723]">{m.content}</p>
                  )}
                  {m.structuredData && (
                    <pre className="text-xs bg-[#FAFAFA] p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(JSON.parse(m.structuredData), null, 2)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ─── Tab 2: 训练 ─── */}
      <TabsContent value="training" className="space-y-6">
        <Link href={`/members/${memberId}/trainings`} className="block">
          <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <h2 className="font-serif text-lg mb-4">训练记录</h2>
            {latestTraining ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-[#E8E0D5] px-1.5 py-0.5 rounded">
                    {trainingTypeLabel(latestTraining.type)}
                  </span>
                  <span className="text-[#9E8E7E]">{latestTraining.trainingDate}</span>
                </div>
                {latestTraining.focusArea && (
                  <p>
                    <span className="text-[#9E8E7E]">重点部位：</span>
                    {latestTraining.focusArea}
                  </p>
                )}
                {latestTraining.durationMinutes && (
                  <p>
                    <span className="text-[#9E8E7E]">时长：</span>
                    {latestTraining.durationMinutes}分钟
                  </p>
                )}
                {latestTraining.notes && (
                  <div className="p-3 bg-[#FAF7F2] border border-[#E8E0D5] rounded text-[#3E2723]">
                    {latestTraining.notes}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[#9E8E7E]">暂无训练记录</p>
            )}

            <div className="mt-4 pt-4 border-t border-[#E8E0D5] flex items-center justify-between">
              <span className="text-sm text-[#9E8E7E]">共 {trainingCount} 次训练</span>
              <span className="text-sm text-[#3E2723] font-medium">
                查看全部 →
              </span>
            </div>
          </div>
        </Link>

        <Button asChild className="w-full">
          <Link href={`/members/${memberId}/trainings/new`}>+ 新增训练记录</Link>
        </Button>
      </TabsContent>

      {/* ─── Tab 3: 照片 ─── */}
      <TabsContent value="photos" className="space-y-6">
        <Link href={`/members/${memberId}/photos`} className="block">
          <div className="bg-white rounded-2xl border border-[#E8E0D5] p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
            <h2 className="font-serif text-lg mb-4">体态照片</h2>
            {latestPhoto ? (
              <div className="flex gap-3">
                <img
                  src={latestPhoto.filePath}
                  alt="最新照片"
                  className="w-20 h-20 object-cover rounded border border-[#E8E0D5]"
                />
                <div>
                  <p className="text-xs bg-[#E8E0D5] px-1.5 py-0.5 rounded inline-block">
                    {photoTypeLabel(latestPhoto.photoType)}
                  </p>
                  {latestPhoto.takenAt && (
                    <p className="text-xs text-[#9E8E7E] mt-1">{latestPhoto.takenAt}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#9E8E7E]">暂无照片</p>
            )}

            <div className="mt-4 pt-4 border-t border-[#E8E0D5] text-sm text-[#3E2723] font-medium">
              查看全部照片 →
            </div>
          </div>
        </Link>

        <Button asChild className="w-full">
          <Link href={`/members/${memberId}/photos/upload`}>+ 上传新照片</Link>
        </Button>
      </TabsContent>

      {/* ─── Tab 4: 反馈 ─── */}
      <TabsContent value="feedback" className="space-y-0">
        <AIFeedbackCard memberId={memberId} hasQuestionnaire={hasQuestionnaire} />
        <PeriodReportCard memberId={memberId} />
        <FeedbackTimeline memberId={memberId} />
      </TabsContent>

      {/* ─── Tab 5: 成长 ─── */}
      <TabsContent value="growth" className="space-y-6">
        <GrowthTimeline memberId={memberId} memberName={member.name} joinedAt={member.joinedAt ?? undefined} />
      </TabsContent>
    </Tabs>
  );
}
