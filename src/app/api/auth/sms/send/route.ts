import { NextRequest, NextResponse } from "next/server";
import { generateSMSCode } from "@/lib/auth/sms";

export async function POST(request: NextRequest) {
  const { phone } = await request.json();
  if (!phone || !/^\d{11}$/.test(phone)) {
    return NextResponse.json({ error: "请输入正确的手机号" }, { status: 400 });
  }

  const { code, error } = await generateSMSCode(phone);
  if (error) {
    return NextResponse.json({ error }, { status: 429 });
  }

  // 开发环境返回验证码（生产环境通过短信发送）
  return NextResponse.json({
    success: true,
    code: process.env.NODE_ENV === "production" ? undefined : code,
    message: "验证码已发送",
  });
}
