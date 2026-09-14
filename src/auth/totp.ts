import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import * as OTPAuth from "otpauth";

const encryptionVersion = "v1";
const initializationVectorBytes = 12;
const totpDigits = 6;
const totpPeriodSeconds = 30;
const totpValidationWindow = 1;
const totpIssuer = "ML-Helper";

function encryptionKey() {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for TOTP");
  return createHash("sha256").update(secret).digest();
}

export function encryptTotpSecret(secret: string) {
  const initializationVector = randomBytes(initializationVectorBytes);
  const cipher = createCipheriv(
    "aes-256-gcm",
    encryptionKey(),
    initializationVector,
  );
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [
    encryptionVersion,
    initializationVector.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptTotpSecret(payload: string) {
  const [version, encodedIv, encodedTag, encodedSecret] = payload.split(".");
  if (
    version !== encryptionVersion ||
    !encodedIv ||
    !encodedTag ||
    !encodedSecret
  )
    throw new Error("Invalid encrypted TOTP secret");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(encodedIv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedSecret, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createTotpEnrollment(username: string) {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = new OTPAuth.TOTP({
    issuer: totpIssuer,
    label: username,
    algorithm: "SHA1",
    digits: totpDigits,
    period: totpPeriodSeconds,
    secret,
  });
  return { secret: secret.base32, uri: totp.toString() };
}

export function verifyTotpToken(secret: string, token: string) {
  if (!/^\d{6}$/.test(token)) return false;
  const totp = new OTPAuth.TOTP({
    issuer: totpIssuer,
    algorithm: "SHA1",
    digits: totpDigits,
    period: totpPeriodSeconds,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
  return totp.validate({ token, window: totpValidationWindow }) !== null;
}
