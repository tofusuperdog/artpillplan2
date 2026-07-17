import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const VAULT_SESSION_COOKIE = "artpillplan_vault_session";
const VAULT_SESSION_MAX_AGE = 5 * 60;

function encryptionKey() {
  const secret = process.env.APP_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Missing APP_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY");
  return createHash("sha256").update(secret).digest();
}

function encrypt(payload: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64url");
}

function decrypt(value: string) {
  const buffer = Buffer.from(value, "base64url");
  if (buffer.length < 29) return null;
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), buffer.subarray(0, 12));
  decipher.setAuthTag(buffer.subarray(12, 28));
  return Buffer.concat([decipher.update(buffer.subarray(28)), decipher.final()]).toString("utf8");
}

export async function setVaultSessionCookie(baseCode: string) {
  const payload = encrypt(JSON.stringify({ baseCode, exp: Math.floor(Date.now() / 1000) + VAULT_SESSION_MAX_AGE }));
  const cookieStore = await cookies();
  cookieStore.set(VAULT_SESSION_COOKIE, payload, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: VAULT_SESSION_MAX_AGE,
  });
}

export async function getVaultSessionBaseCode() {
  const cookieStore = await cookies();
  const value = cookieStore.get(VAULT_SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    const parsed = JSON.parse(decrypt(value) || "") as { baseCode?: string; exp?: number };
    return /^\d{7}$/.test(parsed.baseCode || "") && (parsed.exp || 0) > Math.floor(Date.now() / 1000)
      ? parsed.baseCode!
      : null;
  } catch {
    return null;
  }
}

export async function hasVaultSessionCookie() {
  return Boolean(await getVaultSessionBaseCode());
}

export async function clearVaultSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(VAULT_SESSION_COOKIE);
}
