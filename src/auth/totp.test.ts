import * as OTPAuth from "otpauth";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createTotpEnrollment,
  decryptTotpSecret,
  encryptTotpSecret,
  verifyTotpToken,
} from "./totp";

const previousSecret = process.env.NEXTAUTH_SECRET;

describe("TOTP security", () => {
  beforeEach(() => {
    process.env.NEXTAUTH_SECRET = "unit-test-nextauth-secret";
  });
  afterEach(() => {
    process.env.NEXTAUTH_SECRET = previousSecret;
  });

  it("encrypts the enrollment secret at rest", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptTotpSecret(secret);
    expect(encrypted).not.toContain(secret);
    expect(decryptTotpSecret(encrypted)).toBe(secret);
  });

  it("creates a standard otpauth enrollment and verifies its current token", () => {
    const enrollment = createTotpEnrollment("alice");
    const totp = OTPAuth.URI.parse(enrollment.uri) as OTPAuth.TOTP;
    expect(enrollment.uri).toContain("otpauth://totp/");
    expect(verifyTotpToken(enrollment.secret, totp.generate())).toBe(true);
    expect(verifyTotpToken(enrollment.secret, "00000")).toBe(false);
  });
});
