export interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

interface GenerateBadgesParams {
  joinedAt?: string;
  trainingCount: number;
  questionnaireCount: number;
  photoCount: number;
  consecutiveTrainingDays: number;
}

function daysSince(joinedAt: string | undefined): number {
  if (!joinedAt) return 0;
  const d = new Date(joinedAt);
  if (isNaN(d.getTime())) return 0;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function generateBadges(params: GenerateBadgesParams): Badge[] {
  const days = daysSince(params.joinedAt);
  const { trainingCount, questionnaireCount, photoCount, consecutiveTrainingDays } = params;

  return [
    {
      id: "first-questionnaire",
      name: "初次启程",
      description: "完成第一份健康问卷",
      unlocked: questionnaireCount >= 1,
    },
    {
      id: "first-photo",
      name: "记录者",
      description: "上传第一张成长照片",
      unlocked: photoCount >= 1,
    },
    {
      id: "training-10",
      name: "训练新星",
      description: "完成第10次训练",
      unlocked: trainingCount >= 10,
    },
    {
      id: "training-50",
      name: "持续成长",
      description: "完成第50次训练",
      unlocked: trainingCount >= 50,
    },
    {
      id: "joined-30",
      name: "习惯建立",
      description: "加入满30天",
      unlocked: days >= 30,
    },
    {
      id: "joined-180",
      name: "长期蜕变",
      description: "加入满180天",
      unlocked: days >= 180,
    },
    {
      id: "streak-7",
      name: "坚持一周",
      description: "连续训练7天",
      unlocked: consecutiveTrainingDays >= 7,
    },
  ];
}
