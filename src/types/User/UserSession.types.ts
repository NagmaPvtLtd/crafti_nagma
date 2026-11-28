import type { RowDataPacket } from "mysql2";

export interface UserSession extends RowDataPacket {
  user_id: string;
  session_id: string;
  created_at: string;
}
