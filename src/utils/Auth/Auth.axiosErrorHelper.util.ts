import axios from "axios";

/**
 * Extracts a human-readable message from any thrown value:
 *  - axios error   → response.data.error / .message / .message
 *  - Error         → .message
 *  - string        → itself
 *  - anything else → fallback
 *
 * Does NOT translate app codes (e.g. "password_not_set"). That is a
 * separate concern handled by `resolveAuthError` below.
 */
export default function getApiErrorMessage(
  err: unknown,
  fallback = "Unexpected error",
): string {
  if (typeof err === "string") return err;
  if (axios.isAxiosError(err)) {
    return (
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      fallback
    );
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
