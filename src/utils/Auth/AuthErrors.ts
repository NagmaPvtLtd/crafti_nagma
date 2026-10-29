export const NEXTAUTH_ERRORS = {
  CredentialsSignin: "Invalid email or password.",
  OAuthAccountNotLinked:
    "This email is already linked to another sign-in method. Use that method instead.",
  AccessDenied: "Access was denied. Please try again.",
  Configuration: "Sign-in is temporarily unavailable. Please try again later.",
  Verification: "This sign-in link has expired. Please try again.",
} as const;

export const APP_ERRORS = {
  password_not_set: "Password not set for this account. Sign in with Google.",
  account_banned: "This account has been suspended.",
  account_inactive: "This account is inactive.",
  region_error: "Sign-in is currently available from India only.",
  service_offline: "Sign-in is temporarily disabled. Please try again later.",
  signups_closed: "New registrations are temporarily closed.",
} as const;

export const FALLBACK_ERROR = "Something went wrong. Please try again.";

export type AuthErrorCode =
  | keyof typeof NEXTAUTH_ERRORS
  | keyof typeof APP_ERRORS;

/**
 * Map a raw error code (from NextAuth OR from an API response body) to
 * user-facing text. Unknown codes fall back gracefully.
 */
export function resolveAuthError(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  if (raw in APP_ERRORS) return APP_ERRORS[raw as keyof typeof APP_ERRORS];
  if (raw in NEXTAUTH_ERRORS)
    return NEXTAUTH_ERRORS[raw as keyof typeof NEXTAUTH_ERRORS];
  return FALLBACK_ERROR;
}
