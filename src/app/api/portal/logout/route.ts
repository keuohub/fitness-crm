import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Clear all portal cookies
  response.cookies.delete("member_session");
  response.cookies.delete("portal_member_id");
  response.cookies.delete("portal_member_sig");
  response.cookies.delete("portal_member_name");
  response.cookies.delete("portal_joined_at");

  return response;
}
