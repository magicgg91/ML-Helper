import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

describe("M2: baseline security headers", () => {
  const byKey = Object.fromEntries(
    securityHeaders.map((h) => [h.key.toLowerCase(), h.value]),
  );

  it("denies framing (clickjacking)", () => {
    expect(byKey["x-frame-options"]).toBe("DENY");
  });
  it("blocks MIME sniffing", () => {
    expect(byKey["x-content-type-options"]).toBe("nosniff");
  });
  it("sets a privacy-preserving referrer policy", () => {
    expect(byKey["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
  it("locks down powerful features", () => {
    expect(byKey["permissions-policy"]).toContain("camera=()");
  });
  it("does not set HSTS here (that belongs on the TLS proxy — M5)", () => {
    expect(byKey["strict-transport-security"]).toBeUndefined();
  });
});
