import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Encrypts GitHub access/refresh tokens before they hit the database. Node's
// built-in crypto only — no new dependency for something this contained.
//
// Requires GITHUB_TOKEN_ENCRYPTION_KEY in your env (any long random string —
// generate one with `openssl rand -hex 32`). Losing/rotating this key means
// every stored token becomes unreadable, so treat it like any other secret.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const secret = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("No GitHub token encryption secret is configured. Set GITHUB_TOKEN_ENCRYPTION_KEY or provide AUTH_SECRET/NEXTAUTH_SECRET.");
  }
  return scryptSync(secret, "oshunt-github-tokens", 32);
}

export function encrypt(plainText: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decrypt(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(dataHex, "hex")), decipher.final()]).toString("utf8");
}
