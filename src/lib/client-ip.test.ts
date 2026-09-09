import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

describe("clientIp", () => {
  it("takes the first entry of X-Forwarded-For", () => {
    expect(clientIp("203.0.113.5, 10.0.0.1, 10.0.0.2")).toBe("203.0.113.5");
  });
  it("falls back to X-Real-IP when there is no XFF", () => {
    expect(clientIp(null, "198.51.100.7")).toBe("198.51.100.7");
  });
  it("returns 'unknown' when neither header is present", () => {
    expect(clientIp(undefined, undefined)).toBe("unknown");
  });
});
