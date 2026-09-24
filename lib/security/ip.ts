import { createHmac } from "node:crypto";

/**
 * Client-address handling.
 *
 * Raw IP addresses are personal data. Lunara never stores one. Instead it stores
 * a keyed HMAC digest, which is stable enough to count attempts per address
 * (rate limiting) and to show "was this a new location?" signals, while not
 * being reversible to an address without the server secret.
 */

const IP_HEADER_PRIORITY = [
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
  "x-vercel-forwarded-for",
  "true-client-ip",
] as const;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      "AUTH_SECRET is not configured (needs to be at least 32 characters).",
    );
  }
  return value;
}

/**
 * Best-effort client IP extraction from proxy headers.
 *
 * `x-forwarded-for` is a list; the left-most entry is the original client, but
 * it is client-controllable unless a trusted proxy overwrites it. We therefore
 * only use this for coarse rate limiting, never for authorisation.
 */
export function getClientIp(headers: Headers): string | null {
  for (const name of IP_HEADER_PRIORITY) {
    const raw = headers.get(name);
    if (!raw) continue;
    const first = raw.split(",")[0]?.trim();
    if (first && first.length > 0 && first.length <= 45) return first;
  }
  return null;
}

/** Keyed, truncated digest of an IP address. Returns null when unknown. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHmac("sha256", secret()).update(ip, "utf8").digest("hex").slice(0, 32);
}

/** Convenience: header -> pseudonymised address, in one step. */
export function hashIpFromHeaders(headers: Headers): string | null {
  return hashIp(getClientIp(headers));
}

/** Coarse, human-readable device label derived from a User-Agent string. */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();

  const platform = ua.includes("iphone") || ua.includes("ipad")
    ? "iOS"
    : ua.includes("android")
      ? "Android"
      : ua.includes("mac os x") || ua.includes("macintosh")
        ? "macOS"
        : ua.includes("windows")
          ? "Windows"
          : ua.includes("linux")
            ? "Linux"
            : "Unknown OS";

  const browser = ua.includes("edg/")
    ? "Edge"
    : ua.includes("opr/") || ua.includes("opera")
      ? "Opera"
      : ua.includes("chrome") || ua.includes("crios")
        ? "Chrome"
        : ua.includes("firefox") || ua.includes("fxios")
          ? "Firefox"
          : ua.includes("safari")
            ? "Safari"
            : "Browser";

  return `${browser} on ${platform}`;
}
