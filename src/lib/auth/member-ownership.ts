// Member Ownership Verification — unified guard for data APIs

import { NextRequest } from "next/server";
import { getAdminSession } from "./admin-session";
import { getPortalMemberId } from "./member-session";

export async function verifyMemberAccess(
  request: NextRequest,
  requestedMemberId: number
): Promise<{ allowed: boolean; reason?: string }> {
  // Admin can access anything
  const admin = getAdminSession(request);
  if (admin) return { allowed: true };

  // Portal member can only access their own data
  const portalId = await getPortalMemberId(request);
  if (portalId !== null) {
    if (portalId === requestedMemberId) return { allowed: true };
    return { allowed: false, reason: "NOT_OWNER" };
  }

  return { allowed: false, reason: "NOT_AUTHENTICATED" };
}
