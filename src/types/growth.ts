// ─── 成长时间轴 · 事件类型定义 ───

export type GrowthEventType =
  | "join"          // 会员入会
  | "training"      // 训练记录
  | "photo"         // 体态照片
  | "questionnaire" // 问卷提交
  | "ai_report"     // AI 反馈报告
  | "milestone";    // 成长里程碑（未来扩展）

export interface GrowthEvent {
  /** 唯一标识，如 "training_42"、"join" */
  id: string;

  /** 事件类型 */
  type: GrowthEventType;

  /** 日期，格式 YYYY-MM-DD */
  date: string;

  /** 时间轴上显示的标题 */
  title: string;

  /** 可选描述（训练备注、反馈摘要等） */
  description?: string;

  /** 数据来源，如 "/api/trainings" */
  source: string;

  /** 原始数据载荷，具体结构由 type 决定 */
  payload: unknown;
}
