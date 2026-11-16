import { rawSql } from "@/db";

export interface AuditLogEntry {
  adminId: number;
  adminName: string;
  adminUsername: string;
  action: string;
  entityType?: string;
  entityId?: number;
  summary: string;
  details?: Record<string, any>;
  ip?: string;
}

export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    const detailsJson = entry.details ? JSON.stringify(entry.details) : null;
    await rawSql`
      INSERT INTO audit_logs (
        tenant_id,
        actor_type,
        actor_id,
        actor_name,
        actor_username,
        action,
        entity_type,
        entity_id,
        summary,
        after_json,
        ip,
        created_at
      ) VALUES (
        1,
        'manager',
        ${entry.adminId},
        ${entry.adminName},
        ${entry.adminUsername},
        ${entry.action},
        ${entry.entityType || null},
        ${entry.entityId || null},
        ${entry.summary},
        ${detailsJson},
        ${entry.ip || null},
        NOW()
      )
    `;
  } catch (err) {
    console.error("[audit_logs] Failed to record admin audit log:", err);
  }
}
