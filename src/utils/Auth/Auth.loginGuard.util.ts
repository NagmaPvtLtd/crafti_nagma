import type { PoolConnection, RowDataPacket } from "mysql2/promise";

import { formatSqlDateTime } from "../ValueFetcher/getDateTime.util";
import {
  LOGIN_COOLDOWN_MS,
  MAX_FAILED_PASSWORD_ATTEMPTS,
  nextPasswordAttemptCount,
} from "./Auth.loginCooldown.util";

interface PasswordAttemptRow extends RowDataPacket {
  failed_password_attempts: number;
  seconds_since_last_failure: number | null;
}

export interface FailedPasswordAttemptResult {
  attempts: number;
  cooldownTill: Date | null;
}

/**
 * Records one failed password verification in a sliding 24-hour window.
 * The row lock keeps concurrent failures from losing increments.
 */
export async function recordFailedPasswordAttempt(
  conn: PoolConnection,
  userId: string,
): Promise<FailedPasswordAttemptResult | null> {
  await conn.beginTransaction();

  try {
    const [rows] = await conn.query<PasswordAttemptRow[]>(
      `SELECT failed_password_attempts,
              TIMESTAMPDIFF(SECOND, last_failed_password_at, UTC_TIMESTAMP())
                AS seconds_since_last_failure
         FROM users
        WHERE id = ?
        FOR UPDATE`,
      [userId],
    );

    const row = rows[0];
    if (!row) {
      await conn.rollback();
      return null;
    }

    const secondsSinceLastFailure =
      row.seconds_since_last_failure === null
        ? null
        : Number(row.seconds_since_last_failure);
    const attempts = nextPasswordAttemptCount(
      Number(row.failed_password_attempts),
      secondsSinceLastFailure,
    );
    const now = new Date();
    const cooldownTill =
      attempts >= MAX_FAILED_PASSWORD_ATTEMPTS
        ? new Date(now.getTime() + LOGIN_COOLDOWN_MS)
        : null;

    await conn.execute(
      `UPDATE users
          SET failed_password_attempts = ?,
              last_failed_password_at = ?,
              cooldown_till = CASE WHEN ? THEN ? ELSE cooldown_till END
        WHERE id = ?`,
      [
        attempts,
        formatSqlDateTime(now),
        cooldownTill !== null,
        cooldownTill ? formatSqlDateTime(cooldownTill) : null,
        userId,
      ],
    );
    await conn.commit();

    return { attempts, cooldownTill };
  } catch (err) {
    await conn.rollback();
    throw err;
  }
}

/** Clears failed-attempt state after a successful password verification. */
export async function clearPasswordAttempts(
  conn: PoolConnection,
  userId: string,
): Promise<void> {
  await conn.execute(
    `UPDATE users
        SET failed_password_attempts = 0,
            last_failed_password_at = NULL,
            cooldown_till = NULL
      WHERE id = ?`,
    [userId],
  );
}
