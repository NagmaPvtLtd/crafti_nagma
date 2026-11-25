import { NextResponse } from "next/server";
import { runHeartbeat } from "../../../../utils/Heartbeat/Heartbeat.util";
import { HeartbeatResponseDTO } from "../../../../types/Heartbeat.types";

/**
 * @brief Health check endpoint to keep MySQL and Redis connections active.
 *
 * @description
 * Thin HTTP wrapper around `runHeartbeat()`. All logic lives in the
 * utility so it can be reused by cron jobs, CLI scripts, or other routes.
 */
/**
 * Health check that keeps the MySQL and Redis connections active.
 *
 * @async
 * @function GET
 * @description Public route with no auth check; a thin HTTP wrapper around `runHeartbeat()`,
 *              which lives in a utility so cron jobs and scripts can reuse it. The utility pings
 *              MySQL, creates the `heartbeat` table when missing, inserts a `HB` ULID row, trims
 *              the table to the 10 newest rows, pings Redis and writes the heartbeat key with its
 *              TTL. The status code follows the utility result instead of throwing.
 *
 * @returns {Promise<NextResponse>} JSON response with:
 *   - success: `true` when MySQL and Redis both responded
 *   - timestamp: ISO timestamp of a successful run
 *   - error: the failure message when `success` is `false`
 *
 * @throws {500} Response status (not an exception) when the heartbeat reports `success: false`
 *
 * @description Workflow:
 *   1. Run `runHeartbeat()`
 *   2. Return 200 when it succeeded, otherwise 500 with the same body
 */
export async function GET(): Promise<NextResponse> {
  const result = await runHeartbeat();

  return NextResponse.json<HeartbeatResponseDTO>(result, {
    status: result.success ? 200 : 500,
  });
}
