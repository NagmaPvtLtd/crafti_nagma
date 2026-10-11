import { randomUUID } from "crypto";
import type { ResultSetHeader } from "mysql2/promise";
import {
  DbExecutor,
  LogAuditInput,
  LogAuditOptions,
} from "../types/AuditLog/auditLog.types";

export class AuditLogService {
  async log(
    db: DbExecutor,
    input: LogAuditInput,
    opts: LogAuditOptions = {},
  ): Promise<string | null> {
    const {
      userId = null,
      action,
      entityType,
      entityId = null,
      description,
      metadata = null,
      id = randomUUID(),
      createdAt,
    } = input;

    const useExplicitTimestamp = createdAt instanceof Date;

    const metadataJson =
      metadata === null || metadata === undefined
        ? null
        : JSON.stringify(metadata);

    const sql = useExplicitTimestamp
      ? `INSERT INTO audit_logs
           (id, user_id, action, entity_type, entity_id,
            description, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO audit_logs
           (id, user_id, action, entity_type, entity_id,
            description, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const params = useExplicitTimestamp
      ? [
          id,
          userId,
          action,
          entityType,
          entityId,
          description,
          metadataJson,
          createdAt,
        ]
      : [id, userId, action, entityType, entityId, description, metadataJson];

    try {
      const [result] = await db.execute<ResultSetHeader>(sql, params);
      return result.affectedRows > 0 ? id : null;
    } catch (err) {
      console.error("[AuditLogService.log] failed to write audit log:", err, {
        action,
        entityType,
        entityId,
        userId,
      });
      if (opts.throwOnError) throw err;
      return null;
    }
  }
}

export const auditLog = new AuditLogService();
