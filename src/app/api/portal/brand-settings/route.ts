import { NextResponse } from "next/server";
import { rawSql } from "@/db";

const DEFAULT_BRAND_SETTINGS = {
  heroTitle: "了解徕舞",
  heroSubtitle: "以克制之道，唤醒身体内在的秩序与平衡",
  sec1Num: "01",
  sec1Title: "场馆空间",
  sec1En: "SPACES",
  sec1Intro: "柔和漫射日光、天然实木大器械与私密更衣室，营造沉静专注的练习氛围。",
  sec2Num: "02",
  sec2Title: "同行导师",
  sec2En: "MENTORS",
  sec2Intro: "深耕人体解剖与体态矫正，用细腻口令与精准触觉纠正，守护每次发力安全。",
  sec3Num: "03",
  sec3Title: "项目介绍",
  sec3En: "OFFERINGS",
  sec3Intro: "针对不同阶段与体态目标，由主理团队精心研发的核心训练体系。",
};

export async function GET() {
  try {
    const rows = await rawSql`
      SELECT value FROM studio_settings
      WHERE tenant_id = 1 AND key = 'brand_settings'
      LIMIT 1
    `;
    if (rows && rows.length > 0 && rows[0].value) {
      const parsed = JSON.parse(rows[0].value);
      return NextResponse.json({ ...DEFAULT_BRAND_SETTINGS, ...parsed });
    }
    return NextResponse.json(DEFAULT_BRAND_SETTINGS);
  } catch (err) {
    console.error("GET /api/portal/brand-settings error:", err);
    return NextResponse.json(DEFAULT_BRAND_SETTINGS);
  }
}
