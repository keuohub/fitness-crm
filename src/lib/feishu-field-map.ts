/**
 * 飞书字段映射配置层
 *
 * 设计原则：
 * - 飞书中文标题与数据库列解耦
 * - 统一使用 member_code 作为关联键（禁止姓名/手机号）
 * - 新增四套表单字段在此集中管理
 */

// ─── 字段类型枚举 ───

type FeishuFieldValue = string | number | string[] | undefined | null;

// ─── 映射定义 ───

interface FieldMapping {
  /** 代码内部字段名 */
  internalKey: string;
  /** 飞书中文字段名（可多个，按优先级匹配） */
  feishuKeys: string[];
  /** 值类型 */
  type: "string" | "number" | "string_array" | "json";
  /** 是否必填 */
  required?: boolean;
  /** 默认值 */
  defaultValue?: FeishuFieldValue;
}

// ─── 会员基础信息映射 ───

export const MEMBER_BASE_MAPPING: FieldMapping[] = [
  { internalKey: "member_code", feishuKeys: ["会员编号", "memberCode", "编号"], type: "string", required: true },
  { internalKey: "name", feishuKeys: ["姓名", "name", "会员姓名"], type: "string", required: true },
  { internalKey: "gender", feishuKeys: ["性别", "gender"], type: "string" },
  { internalKey: "phone", feishuKeys: ["手机号", "phone", "电话"], type: "string" },
  { internalKey: "stage", feishuKeys: ["阶段", "stage"], type: "string" },
  { internalKey: "tags", feishuKeys: ["标签", "tags"], type: "json", defaultValue: "[]" },
  { internalKey: "joined_at", feishuKeys: ["入会日期", "joinedAt", "加入日期"], type: "string" },
  { internalKey: "birthday", feishuKeys: ["生日", "birthday"], type: "string" },
];

// ─── 健康日志映射（15天/30天/90天/365天共用） ───

export const HEALTH_LOG_MAPPING: FieldMapping[] = [
  { internalKey: "member_code", feishuKeys: ["会员编号", "memberCode", "member_code"], type: "string", required: true },
  { internalKey: "weight_kg", feishuKeys: ["体重kg", "weight_kg", "WEIGHT_KG", "weight"], type: "number" },
  { internalKey: "avg_sleep_hours", feishuKeys: ["睡眠小时", "avg_sleep_hours", "AVG_SLEEP_HOURS", "sleep"], type: "number" },
  { internalKey: "energy_level", feishuKeys: ["精力水平", "energy_level", "ENERGY_LEVEL"], type: "number" },
  { internalKey: "stress_level", feishuKeys: ["压力水平", "stress_level", "STRESS_LEVEL"], type: "number" },
  { internalKey: "pain_areas", feishuKeys: ["疼痛区域", "pain_areas", "PAIN_AREAS"], type: "string" },
];

// ─── 自我报告映射（15天/30天/90天/365天共用） ───

export const SELF_REPORT_MAPPING: FieldMapping[] = [
  { internalKey: "member_code", feishuKeys: ["会员编号", "memberCode", "member_code"], type: "string", required: true },
  { internalKey: "FORM_VERSION", feishuKeys: ["表单版本", "form_version", "FORM_VERSION"], type: "string", defaultValue: "v2" },

  // 15天专用
  { internalKey: "ADAPTATION_FEELING", feishuKeys: ["适应感受", "adaptation_feeling", "ADAPTATION_FEELING"], type: "string" },
  { internalKey: "BODY_FEELING", feishuKeys: ["身体感受", "body_feeling", "BODY_FEELING"], type: "string" },
  { internalKey: "BODY_CHANGE_OBSERVED", feishuKeys: ["身体变化", "body_change_observed", "BODY_CHANGE_OBSERVED"], type: "string" },
  { internalKey: "NEXT_EXPECTATION", feishuKeys: ["下一步期待", "next_expectation", "NEXT_EXPECTATION"], type: "string" },
  { internalKey: "MESSAGE_TO_COACH", feishuKeys: ["给教练的话", "message_to_coach", "MESSAGE_TO_COACH"], type: "string" },

  // 30天专用（优化版：删除体重，新增变化选择题）
  { internalKey: "MOST_NOTICEABLE_CHANGE_30D", feishuKeys: ["一个月最大变化", "noticeable_change_30d", "NOTICEABLE_CHANGE_30D"], type: "string" },
  { internalKey: "DIET_CHANGE", feishuKeys: ["饮食变化", "diet_change", "DIET_CHANGE"], type: "string" },
  { internalKey: "PROUDEST_MOMENT", feishuKeys: ["最骄傲的事", "proudest_moment", "PROUDEST_MOMENT"], type: "string" },
  { internalKey: "NEXT_GOAL", feishuKeys: ["下月目标", "next_goal", "NEXT_GOAL"], type: "string" },

  // 90天专用（优化版：删除体重/睡眠/精力/压力，新增叙事题）
  { internalKey: "CHANGE_90D", feishuKeys: ["三个月最大变化", "change_90d", "CHANGE_90D"], type: "string" },
  { internalKey: "BEST_HABIT", feishuKeys: ["最满意的坚持", "best_habit", "BEST_HABIT"], type: "string" },
  { internalKey: "LIFE_STATUS", feishuKeys: ["最近生活状态", "life_status", "LIFE_STATUS"], type: "string" },
  { internalKey: "BIGGEST_SINCE_JOIN", feishuKeys: ["加入以来改变最大", "biggest_since_join", "BIGGEST_SINCE_JOIN"], type: "string" },
  { internalKey: "TRAINING_MEANING", feishuKeys: ["训练意义", "training_meaning", "TRAINING_MEANING"], type: "string" },
  { internalKey: "OVERCOME_MOMENT", feishuKeys: ["克服时刻", "overcome_moment", "OVERCOME_MOMENT"], type: "string" },
  { internalKey: "NEXT_90_GOAL", feishuKeys: ["下一个90天目标", "next_90_goal", "NEXT_90_GOAL"], type: "string" },

  // 365天专用（优化版：删除全部量化题，新增叙事题）
  { internalKey: "BIGGEST_CHANGE_YEAR", feishuKeys: ["年度最大变化", "biggest_change_year", "BIGGEST_CHANGE_YEAR"], type: "string" },
  { internalKey: "PROUDEST_ACHIEVEMENT", feishuKeys: ["最值得骄傲的事", "proudest_achievement", "PROUDEST_ACHIEVEMENT"], type: "string" },
  { internalKey: "MOST_MEMORABLE_TRAINING", feishuKeys: ["最难忘的训练瞬间", "most_memorable_training", "MOST_MEMORABLE_TRAINING"], type: "string" },
  { internalKey: "INTRO_TO_NEW_MEMBER", feishuKeys: ["向新会员介绍徕舞", "intro_to_new_member", "INTRO_TO_NEW_MEMBER"], type: "string" },
  { internalKey: "TRAINING_IDENTITY", feishuKeys: ["训练身份认同", "training_identity", "TRAINING_IDENTITY"], type: "string" },
  { internalKey: "GRATITUDE", feishuKeys: ["感恩", "gratitude", "GRATITUDE"], type: "string" },
  { internalKey: "MESSAGE_TO_PAST_SELF", feishuKeys: ["对过去的自己说", "message_to_past_self", "MESSAGE_TO_PAST_SELF"], type: "string" },
  { internalKey: "NEXT_YEAR_WISH", feishuKeys: ["新年期待", "next_year_wish", "NEXT_YEAR_WISH"], type: "string" },
];
// ─── 工具函数 ───

/**
 * 根据映射配置从飞书 fields 中提取值
 * @returns { [internalKey]: parsedValue }
 */
export function extractFields(
  fields: Record<string, unknown>,
  mapping: FieldMapping[]
): Record<string, FeishuFieldValue> {
  const result: Record<string, FeishuFieldValue> = {};

  for (const map of mapping) {
    // Find the first matching feishu key
    let rawValue: unknown = undefined;
    for (const key of map.feishuKeys) {
      if (key in fields && fields[key] !== undefined && fields[key] !== null && fields[key] !== "") {
        rawValue = fields[key];
        break;
      }
    }

    // Apply type coercion and validation
    let value: FeishuFieldValue = undefined;

    switch (map.type) {
      case "string":
        value = rawValue !== undefined ? String(rawValue) : undefined;
        break;

      case "number":
        if (rawValue !== undefined) {
          const n = Number(rawValue);
          value = isNaN(n) ? undefined : n;
        }
        break;

      case "string_array":
        if (Array.isArray(rawValue)) {
          value = rawValue.map(String);
        } else if (typeof rawValue === "string") {
          value = rawValue.split(",").map((s) => s.trim()).filter(Boolean);
        }
        break;

      case "json":
        if (typeof rawValue === "string") {
          try { value = JSON.parse(rawValue); } catch { value = rawValue; }
        } else if (rawValue !== undefined) {
          value = rawValue as string;
        }
        break;
    }

    // Apply default
    if (value === undefined && map.defaultValue !== undefined) {
      value = map.defaultValue;
    }

    // Validate required
    if (map.required && (value === undefined || value === null || value === "")) {
      // Skip this record — mark error
      result[map.internalKey] = undefined;
    } else {
      result[map.internalKey] = value;
    }
  }

  return result;
}

/**
 * 日期格式校验
 */
export function isValidDate(value: string | undefined | null): boolean {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

/**
 * 数字范围校验
 */
export function inRange(value: number | undefined | null, min: number, max: number): boolean {
  if (value === undefined || value === null) return true; // optional
  return value >= min && value <= max;
}
