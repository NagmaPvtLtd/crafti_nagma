import type { RowDataPacket } from "mysql2/promise";

export type UserRole = "super_admin" | "admin" | "manager" | "customer";
export type UserStatus = "active" | "inactive" | "banned";

export interface UserRow extends RowDataPacket {
  id: string;
  first_name: string;
  last_name: string | null;
  full_name: string | null;

  email: string;
  phone: string;
  password_hash: string | null;
  google_id: string | null;
  google_profile_picture: string | null;
  email_verified: 0 | 1;
  phone_verified: 0 | 1;

  address_line_1: string | null;
  address_line_2: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;

  company_name: string | null;
  gstin: string | null;

  role: UserRole;
  status: UserStatus;
  profile_completed: 0 | 1;

  created_at: string;
  updated_at: string | null;
}
