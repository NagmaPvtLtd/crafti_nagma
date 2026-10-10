import type { RowDataPacket } from "mysql2/promise";

export interface SettingRow extends RowDataPacket {
  field_name: string;
  active: 0 | 1;
  save_in_redis: 0 | 1;
}

export interface SettingResult {
  field_name: string;
  active: boolean;
  save_in_redis: boolean;
}

export type DbExecutor = {
  execute: <T = unknown>(
    sql: string,
    params?: unknown[],
  ) => Promise<[T, unknown]>;
};
