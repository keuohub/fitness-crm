// Member Ownership Verification — unified guard for data APIs

import { NextRequest } from "next/server";
import { getAdminSession } from "./admin-session";
import { getPortalMemberId } from "./member-session";

/**
 * Check if the requestor is authorized to access the given member's data.
 *
 * Rules:
 * - Admin session: access to ALL members
 * - Portal session (member_session cookie or legacy portal_member_id): only the member whose cookie matches
 * - No session: denied
 */
export async function verifyMemberAccess(
  request: NextRequest,
  requestedMemberId: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Admin can access anything
  const admin = getAdminSession(request);
  if (admin) return { allowed: true };

  // Portal member can only access their own data
  const portalId = await getPortalMemberId(request);
  if (portalId === null) {
    return { allowed: false, reason: "NOT_AUTHENTICATED" };
  }

  if (portalId !== requestedMemberId) {
    return { allowed: false, reason: "NOT_OWNER" };
  }

  return { allowed: true };
}
