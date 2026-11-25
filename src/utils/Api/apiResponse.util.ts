import { NextResponse } from "next/server";

/**
 * Standard 400 for schema failures. Shape matches what the client forms read:
 * `{ error, details: { field: [message] } }`.
 */
export function invalidInput(details: Record<string, string[]>) {
  return NextResponse.json(
    { error: "Validation failed", details },
    { status: 400 },
  );
}

/** MySQL unique-key violation — a code, slug, SKU or name is already taken. */
export function isDuplicateEntry(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "ER_DUP_ENTRY"
  );
}
