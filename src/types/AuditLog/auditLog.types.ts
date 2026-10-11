import type { Pool, PoolConnection, RowDataPacket } from "mysql2/promise";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN"
  | "LOGOUT"
  | "ROLE_CHANGED"
  | "STATUS_CHANGED"
  | "ORDER_CREATED"
  | "ORDER_STATUS_CHANGED"
  | "ORDER_CANCELLED"
  | "PAYMENT_CAPTURED"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "CART_CONVERTED"
  | "FILE_UPLOADED"
  | "FILE_DELETED";

export type AuditEntityType =
  | "USER"
  | "CATEGORY"
  | "PRODUCT"
  | "VARIANT"
  | "OPTION"
  | "OPTION_VALUE"
  | "PERSONALIZATION"
  | "FEATURE"
  | "CARE_INSTRUCTION"
  | "GIFT_INCLUDED"
  | "IMAGEKIT_FILE"
  | "CART"
  | "CART_ITEM"
  | "ORDER"
  | "ORDER_ITEM"
  | "PAYMENT"
  | "SYSTEM";

export interface AuditLogRow extends RowDataPacket {
  id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: AuditEntityType;
  entity_id: string | null;
  description: string;
  metadata: string | null;
  created_at: string;
}

export interface LogAuditInput {
  userId?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  id?: string;
  createdAt?: Date;
}

export interface LogAuditOptions {
  /** Throw instead of swallowing errors. Default: false. */
  throwOnError?: boolean;
}

/**
 * Anything that can execute SQL — a Pool, a PoolConnection, or a
 * transaction wrapper.
 */
export type DbExecutor = Pool | PoolConnection;
