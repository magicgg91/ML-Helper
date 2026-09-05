// Sentinel returned when the client IP can't be determined (no proxy
// headers). Callers must not build a shared per-IP throttle bucket out of
// it — every such request would collide in one bucket.
export const UNKNOWN_IP = "unknown";

// Extracts the caller's IP from the reverse-proxy headers. Behind the
// self-hosted openresty proxy, X-Forwarded-For's first entry is the real
// client; X-Real-IP is the fallback. Returns UNKNOWN_IP when neither is
// present (e.g. a same-host request).
export function clientIp(
  forwardedFor: string | null | undefined,
  realIp?: string | null | undefined,
): string {
  const forwarded = (forwardedFor ?? "").split(",")[0]?.trim();
  if (forwarded) return forwarded;
  const real = (realIp ?? "").trim();
  return real || UNKNOWN_IP;
}
