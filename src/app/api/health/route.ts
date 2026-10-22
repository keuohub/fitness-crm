import { NextResponse } from "next/server";
import { rawSql } from "@/db";

export async function GET() {
  try {
    await rawSql`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "up",
      service: "laiwu-fitness-crm",
      time: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[health] db error", err);
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
