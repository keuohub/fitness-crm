/**
 * 飞书同步引擎
 *
 * 职责：
 * 1. 从飞书四张子表拉取记录
 * 2. 字段映射（飞书中文 → 内部字段）
 * 3. 容错：单条异常不阻塞整批
 * 4. 写入 daily_health_logs + member_memories
 * 5. 结构化日志
 */

import { listTableRecords, type FeishuRecord } from "@/lib/feishu";
import { extractFields, isValidDate, inRange, MEMBER_BASE_MAPPING, HEALTH_LOG_MAPPING, SELF_REPORT_MAPPING } from "@/lib/feishu-field-map";
import { db } from "@/db";
import { members as membersTable, dailyHealthLogs, memberMemories } from "@/db/schema";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

// ─── 日志系统 ───

const LOG_DIR = path.join(process.cwd(), "data");
const LOG_FILE = path.join(LOG_DIR, "sync-log.jsonl");

interface SyncLogEntry {
  syncId: string;
  startedAt: string;
  finishedAt?: string;
  source: string;
  totalRecords: number;
  successCount: number;
  skipCount: number;
  errorCount: number;
  errors: string[];
}

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeStructuredLog(entry: SyncLogEntry) {
  ensureLogDir();
  fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n");
}

function readSyncLogs(limit = 50): SyncLogEntry[] {
  ensureLogDir();
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, "utf-8").trim().split("\n").filter(Boolean);
  return lines
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .slice(-limit)
    .reverse();
}

/** Prune logs older than 30 days */
function pruneOldLogs() {
  ensureLogDir();
  if (!fs.existsSync(LOG_FILE)) return;
  const cutoff = Date.now() - 30 * 86400000;
  const lines = fs.readFileSync(LOG_FILE, "utf-8").trim().split("\n").filter(Boolean);
  const recent = lines.filter((l) => {
    try {
      const e: SyncLogEntry = JSON.parse(l);
      return new Date(e.startedAt).getTime() > cutoff;
    } catch { return false; }
  });
  if (recent.length < lines.length) {
    fs.writeFileSync(LOG_FILE, recent.join("\n") + "\n");
  }
}

// ─── 配置 ───

const FEISHU_APP_TOKEN = process.env.FEISHU_BASE_TOKEN || "RnlqbnTcBaGIW0skLLWclgHbnzb";
const MEMBER_TABLE_ID = process.env.FEISHU_TABLE_ID || "tblg1rCqMOOjksj5";

// 四张新子表 ID（从环境变量读取，有默认值）
const CARE_TABLES = {
  "15d": process.env.FEISHU_TABLE_15D,
  "30d": process.env.FEISHU_TABLE_30D,
  "90d": process.env.FEISHU_TABLE_90D,
  "365d": process.env.FEISHU_TABLE_365D,
};

// ─── 会员基础同步 ───

export async function syncMembers(): Promise<SyncLogEntry> {
  const syncId = `sync-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let successCount = 0;
  let skipCount = 0;

  try {
    const records = await listTableRecords(FEISHU_APP_TOKEN, MEMBER_TABLE_ID, 500);
    const existing = await db.select().from(membersTable);

    for (const rec of records) {
      try {
        const mapped = extractFields(rec.fields, MEMBER_BASE_MAPPING);
        const memberCode = mapped["member_code"] as string | undefined;
        const name = mapped["name"] as string | undefined;

        if (!memberCode || !name) {
          skipCount++;
          errors.push(`skip record ${rec.recordId}: missing member_code or name`);
          continue;
        }

        const memberData = {
          name: name,
          memberCode: memberCode,
          gender: (mapped["gender"] as string) || null,
          phone: (mapped["phone"] as string) || null,
          stage: (mapped["stage"] as string) || null,
          tags: (mapped["tags"] as string) || null,
          status: "active" as const,
          joinedAt: isValidDate(mapped["joined_at"] as string) ? (mapped["joined_at"] as string) : null,
          birthday: isValidDate(mapped["birthday"] as string) ? (mapped["birthday"] as string) : null,
        };

        const exists = existing.find((m) => m.memberCode === memberCode);
        if (exists) {
          await db.update(membersTable).set(memberData).where(eq(membersTable.id, exists.id));
        } else {
          await db.insert(membersTable).values({ ...memberData, tenantId: 1 });
        }
        successCount++;
      } catch (e) {
        skipCount++;
        errors.push(`record ${rec.recordId}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }
  } catch (feishuErr) {
    errors.push(`feishu API: ${feishuErr instanceof Error ? feishuErr.message : "connection failed"}`);
  }

  const entry: SyncLogEntry = {
    syncId,
    startedAt,
    finishedAt: new Date().toISOString(),
    source: "members",
    totalRecords: successCount + skipCount,
    successCount,
    skipCount,
    errorCount: skipCount,
    errors: errors.slice(0, 20),
  };

  writeStructuredLog(entry);
  pruneOldLogs();
  return entry;
}

// ─── 健康日志 + 自我报告同步（四表共用） ───

const CARE_TABLE_LABELS: Record<string, string> = {
  "15d": "15天适应记录",
  "30d": "30天月度记录",
  "90d": "90天阶段回顾",
  "365d": "365天周年纪念",
};

/**
 * 同步单张关怀表的记录
 */
async function syncCareTable(tableKey: string, tableId: string): Promise<SyncLogEntry> {
  const syncId = `sync-care-${tableKey}-${Date.now()}`;
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  let successCount = 0;
  let skipCount = 0;

  try {
    const records = await listTableRecords(FEISHU_APP_TOKEN, tableId, 500);
    const existingMembers = await db.select({ id: membersTable.id, memberCode: membersTable.memberCode }).from(membersTable);

    for (const rec of records) {
      try {
        const healthMapped = extractFields(rec.fields, HEALTH_LOG_MAPPING);
        const reportMapped = extractFields(rec.fields, SELF_REPORT_MAPPING);

        const memberCode = (healthMapped["member_code"] || reportMapped["member_code"]) as string | undefined;
        if (!memberCode) {
          skipCount++;
          errors.push(`table=${tableKey} record=${rec.recordId}: missing member_code`);
          continue;
        }

        const member = existingMembers.find((m) => m.memberCode === memberCode);
        if (!member) {
          skipCount++;
          errors.push(`table=${tableKey} record=${rec.recordId}: member_code=${memberCode} not found in CRM`);
          continue;
        }

        const memberId = member.id;

        // ── 写入 daily_health_logs ──
        const weight = healthMapped["weight_kg"] as number | undefined;
        const sleepHours = healthMapped["avg_sleep_hours"] as number | undefined;
        const energyLevel = healthMapped["energy_level"] as number | undefined;
        const stressLevel = healthMapped["stress_level"] as number | undefined;
        const painAreas = healthMapped["pain_areas"] as string | undefined;

        const hasHealthData = weight !== undefined || sleepHours !== undefined || energyLevel !== undefined || stressLevel !== undefined;

        if (hasHealthData) {
          // Validate ranges
          if (weight !== undefined && (isNaN(weight) || weight < 20 || weight > 300)) {
            errors.push(`table=${tableKey} record=${rec.recordId}: weight=${weight} out of range, skipping health log`);
          } else if (energyLevel !== undefined && !inRange(energyLevel, 1, 5)) {
            errors.push(`table=${tableKey} record=${rec.recordId}: energy_level=${energyLevel} must be 1-5, skipping health log`);
          } else if (stressLevel !== undefined && !inRange(stressLevel, 1, 5)) {
            errors.push(`table=${tableKey} record=${rec.recordId}: stress_level=${stressLevel} must be 1-5, skipping health log`);
          } else {
            await db.insert(dailyHealthLogs).values({
              tenantId: 1,
              memberId,
              logDate: new Date().toISOString().slice(0, 10),
              weight: weight ?? null,
              sleepHours: sleepHours ?? null,
              energyLevel: energyLevel ?? null,
              stressLevel: stressLevel ?? null,
              painAreas: painAreas ?? null,
            });
          }
        }

        // ── 写入 member_memories（自我报告） ──
        const reportTexts: string[] = [];
        const structured: Record<string, string | number> = {};

        for (const [key, val] of Object.entries(reportMapped)) {
          if (key === "member_code") continue;
          if (val === undefined || val === null || val === "") continue;

          if (typeof val === "number") {
            structured[key] = val;
          } else {
            const s = String(val).trim();
            if (s.length > 0) reportTexts.push(`${key}: ${s}`);
            if (["ADAPTATION_FEELING", "BODY_FEELING", "NEXT_EXPECTATION", "NEXT_GOAL", "NEXT_90_GOAL", "NEXT_YEAR_WISH", "LIFE_STATUS"].includes(key)) {
              structured[key] = s;
            }
          }
        }

        // Check for milestone-type memories
        const milestoneFields = ["PROUDEST_MOMENT", "TRAINING_MEANING", "BIGGEST_CHANGE_YEAR"];
        const isMilestone = milestoneFields.some((f) => String(reportMapped[f] || "").trim().length > 0);

        if (reportTexts.length > 0) {
          await db.insert(memberMemories).values({
            tenantId: 1,
            memberId,
            content: reportTexts.join("\n"),
            structuredData: Object.keys(structured).length > 0 ? JSON.stringify(structured) : null,
            memoryType: isMilestone ? "milestone" : "self_report",
          });
        }

        successCount++;
      } catch (e) {
        skipCount++;
        errors.push(`table=${tableKey} record=${rec.recordId}: ${e instanceof Error ? e.message : "unknown error"}`);
      }
    }
  } catch (feishuErr) {
    errors.push(`table=${tableKey} feishu API: ${feishuErr instanceof Error ? feishuErr.message : "connection failed"}`);
  }

  const entry: SyncLogEntry = {
    syncId,
    startedAt,
    finishedAt: new Date().toISOString(),
    source: `care_${tableKey}`,
    totalRecords: successCount + skipCount,
    successCount,
    skipCount,
    errorCount: skipCount,
    errors: errors.slice(0, 20),
  };

  writeStructuredLog(entry);
  pruneOldLogs();
  return entry;
}

// ─── 统一同步入口 ───

export interface FullSyncResult {
  members: SyncLogEntry;
  care: Record<string, SyncLogEntry>;
  allSuccess: boolean;
}

export async function fullSync(): Promise<FullSyncResult> {
  const memberResult = await syncMembers();

  const careResults: Record<string, SyncLogEntry> = {};
  for (const [key, tableId] of Object.entries(CARE_TABLES)) {
    if (tableId) {
      careResults[key] = await syncCareTable(key, tableId);
    }
  }

  const allSuccess = memberResult.errorCount === 0 &&
    Object.values(careResults).every((r) => r.errorCount === 0);

  return {
    members: memberResult,
    care: careResults,
    allSuccess,
  };
}

// ─── 导出日志读取 ───

export { readSyncLogs };
