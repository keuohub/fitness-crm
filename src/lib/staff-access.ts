import { rawSql } from "@/db";
import { normalizePhone } from "@/lib/member-import";

/**
 * Mini-program workbench access.
 * Phone/email match is enough. A same-name match only works when that name
 * belongs to exactly one active member, so an imported duplicate cannot
 * inherit a coach or the owner's console.
 */
const OWNER_PHONES = new Set(["15271754857"]);

export async function memberHasStaffAccess(member: {
  name: string | null;
  phone: string | null;
}): Promise<{ allowed: boolean; role: string | null }> {
  const phone = normalizePhone(member.phone || "");
  const phoneValue = phone.phone;
  if (phoneValue && OWNER_PHONES.has(phoneValue)) return { allowed: true, role: "owner" };

  const name = String(member.name || "").trim();
  const rows = await rawSql`
    SELECT u.role, u.is_coach, u.name, u.email
    FROM users u
    WHERE u.status = 'active'
      AND (
        (${phoneValue} <> '' AND regexp_replace(COALESCE(u.email, ''), '\\D', '', 'g') = ${phoneValue})
        OR (${phoneValue} <> '' AND u.email = ${phoneValue})
        OR (${name} <> '' AND u.name = ${name})
      )
  `.catch(() => []);

  const staff = (rows as Array<{ role: string | null; is_coach: number | null; name: string | null; email: string | null }>).filter((u) => {
    const role = String(u.role || "");
    return role === "owner" || role === "admin" || role === "manager" || role === "coach" || Number(u.is_coach) === 1;
  });
  if (!staff.length) return { allowed: false, role: null };

  const phoneHit = phoneValue
    ? staff.find((u) => {
        const emailDigits = String(u.email || "").replace(/\D/g, "");
        return emailDigits === phoneValue || String(u.email || "") === phoneValue;
      })
    : undefined;
  if (phoneHit) return { allowed: true, role: phoneHit.role || "coach" };

  const [{ n }] = await rawSql`
    SELECT COUNT(*)::int AS n FROM members
    WHERE tenant_id = 1 AND status = 'active' AND name = ${name}
  `.catch(() => [{ n: 99 }]);
  if (Number(n) !== 1) return { allowed: false, role: null };

  const nameHit = staff.find((u) => String(u.name || "") === name);
  if (!nameHit) return { allowed: false, role: null };
  return { allowed: true, role: nameHit.role || "coach" };
}
