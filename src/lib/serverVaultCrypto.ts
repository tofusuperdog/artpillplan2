import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";
import type { VaultEncryptedRow, VaultPayload } from "./vaultTypes";

const ALGORITHM = "aes-256-gcm";
const AAD = Buffer.from("artplan-vault-v1", "utf8");

function pepper() {
  const value = process.env.VAULT_ENCRYPTION_SECRET || process.env.APP_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error("Vault encryption secret is not configured.");
  return value;
}

export function createVaultSalt() {
  return randomBytes(16).toString("base64");
}

export function createCodeVerifier(baseCode: string, salt: string) {
  return createHmac("sha256", pepper()).update(`${salt}:${baseCode}`, "utf8").digest("hex");
}

export function codeVerifierMatches(baseCode: string, salt: string, expected: string) {
  const actual = Buffer.from(createCodeVerifier(baseCode, salt), "hex");
  const target = Buffer.from(expected, "hex");
  return actual.length === target.length && timingSafeEqual(actual, target);
}

export function deriveVaultKey(baseCode: string, salt: string) {
  const secret = createHmac("sha256", pepper()).update(baseCode, "utf8").digest();
  return scryptSync(secret, Buffer.from(salt, "base64"), 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
}

export function encryptVaultPayload(payload: VaultPayload, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return {
    encrypted_payload: encrypted.toString("base64"),
    encryption_iv: iv.toString("base64"),
    auth_tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptVaultPayload(row: VaultEncryptedRow, key: Buffer): VaultPayload {
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(row.encryption_iv, "base64"));
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(row.auth_tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(row.encrypted_payload, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(decrypted) as VaultPayload;
}

export function bangkokDaySuffix(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", day: "2-digit" }).formatToParts(now);
  return parts.find((part) => part.type === "day")?.value || "";
}
