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

  // Fallback: X-Portal-Member-Id header (for Portal SPA without HttpOnly cookies)
  const headerId = request.headers.get("x-portal-member-id");
  if (headerId) {
    const id = parseInt(headerId, 10);
    if (!isNaN(id) && id === requestedMemberId) return { allowed: true };
  }

  return { allowed: false, reason: "NOT_AUTHENTICATED" };
}
