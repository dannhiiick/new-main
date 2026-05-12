import type { PrismaClient } from "@prisma/client";

export interface AuditLogEntry {
  /** The admin/actor performing the action */
  actorId: string;
  /** Optional: userId for the User relation (defaults to actorId) */
  userId?: string;
  /** Action name, e.g. PATCH_TRACK, BAN_USER, CHANGE_ROLE */
  action: string;
  /** Primary entity type, e.g. "Track", "User" */
  entityType: string;
  /** Primary entity ID */
  entityId: string;
  /** Alias for entityId (spec compat) */
  targetId?: string;
  /** Alias for entityType (spec compat) */
  targetType?: string;
  /** State before mutation */
  before?: Record<string, unknown>;
  /** State after mutation */
  after?: Record<string, unknown>;
  /** Any extra structured data */
  metadata?: Record<string, unknown>;
  /** IP address of the request originator */
  ipAddress?: string;
}

/**
 * Append-only audit log write. Errors are caught and logged — audit failure
 * must never interrupt the primary business operation.
 */
export async function writeAuditLog(
  prisma: PrismaClient,
  entry: AuditLogEntry,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actorId,
        userId: entry.userId ?? entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        targetId: entry.targetId ?? entry.entityId,
        targetType: entry.targetType ?? entry.entityType,
        // Prisma Json fields accept any serialisable value
        before: (entry.before ?? null) as never,
        after: (entry.after ?? null) as never,
        metadata: (entry.metadata ?? null) as never,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Audit log write failure must not break the request
    console.error("[AuditLog] Failed to write audit entry:", err);
  }
}
