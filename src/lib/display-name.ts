// ── 官网展示层姓名脱敏 ──
// 规则：职业身份优先 > 中文姓氏 + "女士"
// 非标准姓名（如单名、昵称）统一使用职业身份

interface MemberInfo {
  name: string;
  role?: string | null;
}

/**
 * 将数据库真实姓名转化为官网可展示的称谓。
 * 规则：
 *   - 有职业身份 → 用职业身份
 *   - 标准中文姓名 → 姓氏 + "女士"
 *   - 非标准姓名且无职业 → 统一 "会员"
 */
export function displayName(info: MemberInfo): string {
  const { name, role } = info;
  if (!name) return "会员";

  // 职业身份优先
  if (role && role.trim() !== "") {
    return role;
  }

  // 标准中文姓名：2-4字，全部中文
  const chName = name.replace(/\s+/g, "");
  if (/^[\u4e00-\u9fa5]{2,4}$/.test(chName)) {
    // 单姓 + 单名 或 复姓
    if (chName.length <= 3) {
      return chName[0] + "女士";
    }
    // 可能是复姓或四字名
    return chName[0] + "女士";
  }

  // 兜底：匿名化
  return "会员";
}

/**
 * 批量脱敏辅助 — 直接取 displayName 结果
 */
export function sanitizeName(name: string, role?: string | null): string {
  return displayName({ name, role });
}
