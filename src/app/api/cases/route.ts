import { NextResponse } from "next/server";
import { FEATURED_CASES } from "@/lib/cases/cases";
import { getCaseData } from "@/lib/cases/fetch-case-data";

export async function GET() {
  try {
    const results = await Promise.all(
      FEATURED_CASES.map(async (c) => {
        const data = await getCaseData(c.memberId);
        return { ...c, ...data };
      })
    );
    return NextResponse.json({ cases: results });
  } catch (e) {
    console.error("cases error:", e);
    return NextResponse.json({ cases: [] }, { status: 500 });
  }
}
