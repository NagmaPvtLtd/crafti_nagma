import axios from "axios";

/** Zod issues → one message per top-level field. */
export function topLevelErrors(
  issues: { path: PropertyKey[]; message: string }[],
) {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}

/** Field details sent by the API (`details: { field: [message] }`). */
export function fieldErrors(err: unknown): Record<string, string[]> {
  if (axios.isAxiosError(err)) {
    const details = err.response?.data?.details;
    if (details && typeof details === "object") {
      return details as Record<string, string[]>;
    }
  }
  return {};
}
