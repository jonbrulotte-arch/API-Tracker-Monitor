import { db } from "./db";

interface AuditEntry {
  action: "created" | "updated" | "deleted" | "revealed";
  entityType: "api_key" | "monitor";
  entityId: string;
  entityName: string;
  provider?: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  details?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        entityName: entry.entityName,
        provider: entry.provider,
        userId: entry.userId,
        userEmail: entry.userEmail,
        userName: entry.userName,
        details: entry.details ? JSON.stringify(entry.details) : null,
      },
    });
  } catch {
    // audit log failure must never block the main operation
  }
}
