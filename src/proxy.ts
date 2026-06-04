import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ROUTES = ["/members", "/admin"];
const PORTAL_ROUTES = ["/portal"];
const PUBLIC_ADMIN = ["/admin/login"];
const PUBLIC_PORTAL = ["/portal/login"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes (API auth handled in route handlers)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(svg|png|jpg|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  const adminSession = request.cookies.get("admin_session")?.value;
  const adminToken = request.cookies.get("admin_token")?.value;
  const portalSession = request.cookies.get("portal_member_id")?.value;
  const memberSession = request.cookies.get("member_session")?.value;

  // Admin routes — require admin_session or admin_token cookie (except login)
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (PUBLIC_ADMIN.some((pp) => pathname.startsWith(pp))) {
      return NextResponse.next();
    }
    if (!adminSession && !adminToken) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // Portal routes — require portal_member_id or member_session cookie (except login)
  if (PORTAL_ROUTES.some((r) => pathname.startsWith(r))) {
    if (PUBLIC_PORTAL.some((pp) => pathname.startsWith(pp))) {
      return NextResponse.next();
    }
    if (!portalSession && !memberSession) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
