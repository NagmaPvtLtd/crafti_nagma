/**
 * Determines whether the incoming request originates from India.
 *
 * ── TODO ──
 * Replace the `return true` below with a real lookup. Common options:
 *
 *   1. Vercel  → headers.get("x-vercel-ip-country") === "IN"
 *   2. Cloudflare → headers.get("cf-ipcountry") === "IN"
 *   3. Roll your own → extract IP from `x-forwarded-for`, look it up via
 *      MaxMind GeoLite2 / ipapi.co / ipregistry.
 *
 * Until then, everyone is treated as Indian so login works end-to-end
 * while you finish the rest of the app.
 */
export default async function isRequestFromIndia(
  headers: Headers,
): Promise<boolean> {
  // Example Vercel implementation (uncomment once deployed on Vercel):
  //
  // const country = headers.get("x-vercel-ip-country");
  // return country === "IN";

  return true;
}
