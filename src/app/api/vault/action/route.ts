import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { getVaultSessionBaseCode, setVaultSessionCookie } from "@/lib/serverVaultAuth";
import {
  bangkokDaySuffix,
  codeVerifierMatches,
  createCodeVerifier,
  createVaultSalt,
  decryptVaultPayload,
  deriveVaultKey,
  encryptVaultPayload,
} from "@/lib/serverVaultCrypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { VaultEncryptedRow, VaultItem, VaultPayload } from "@/lib/vaultTypes";

type ActionBody =
  | { action: "setup"; input: { baseCode: string } }
  | { action: "unlock"; input: { unlockCode: string } }
  | { action: "list" }
  | { action: "change_code"; input: { baseCode: string } }
  | { action: "save_item"; input: VaultPayload & { id?: string } }
  | { action: "delete_item"; input: { id: string } };

type VaultSetting = {
  id: number;
  code_salt: string;
  code_verifier: string;
  failed_attempts: number;
  locked_until: string | null;
};

export async function POST(request: Request) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as ActionBody | null;
  if (!body) return NextResponse.json({ message: "Invalid request." }, { status: 400 });

  try {
    if (body.action === "setup") {
      await setup(body.input.baseCode);
      return NextResponse.json({ ok: true });
    }
    if (body.action === "unlock") {
      const access = await verifyUnlockCode(body.input.unlockCode);
      const key = deriveVaultKey(access.baseCode, access.setting.code_salt);
      await setVaultSessionCookie(access.baseCode);
      return NextResponse.json({ items: await readItems(key) });
    }
    if (body.action === "list") {
      const access = await getVaultAccess();
      const key = deriveVaultKey(access.baseCode, access.setting.code_salt);
      return NextResponse.json({ items: await readItems(key) });
    }
    if (body.action === "change_code") {
      const items = await changeVaultCode(body.input.baseCode);
      return NextResponse.json({ items });
    }
    if (body.action === "save_item") {
      const access = await getVaultAccess();
      const key = deriveVaultKey(access.baseCode, access.setting.code_salt);
      await saveItem(body.input, key);
      return NextResponse.json({ items: await readItems(key) });
    }
    const access = await getVaultAccess();
    const key = deriveVaultKey(access.baseCode, access.setting.code_salt);
    await deleteItem(body.input.id);
    return NextResponse.json({ items: await readItems(key) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vault action failed.";
    return NextResponse.json({ message }, { status: message === "Vault is not set up." ? 409 : 400 });
  }
}

async function changeVaultCode(newBaseCode: string) {
  validateBaseCode(newBaseCode);
  const access = await getVaultAccess();
  const oldKey = deriveVaultKey(access.baseCode, access.setting.code_salt);
  const items = await readItems(oldKey);
  const newSalt = createVaultSalt();
  const encryptedItems = items.map((item) => ({
    id: item.id,
    ...encryptVaultPayload({ label: item.label, account: item.account, secret: item.secret, notes: item.notes }, deriveVaultKey(newBaseCode, newSalt)),
  }));
  const { error } = await supabaseAdmin.rpc("rotate_vault_code", {
    p_code_salt: newSalt,
    p_code_verifier: createCodeVerifier(newBaseCode, newSalt),
    p_items: encryptedItems,
  });
  if (error) throw new Error(error.message);
  await setVaultSessionCookie(newBaseCode);
  return items;
}

async function getVaultAccess() {
  const baseCode = await getVaultSessionBaseCode();
  if (!baseCode) throw new Error("Vault is locked.");
  const { data, error } = await supabaseAdmin.from("vault_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Vault is not set up.");
  return { baseCode, setting: data as VaultSetting };
}

async function setup(baseCode: string) {
  validateBaseCode(baseCode);
  const { count, error: countError } = await supabaseAdmin.from("vault_settings").select("id", { count: "exact", head: true });
  if (countError) throw new Error(countError.message);
  if ((count || 0) > 0) throw new Error("Vault is already set up.");

  const salt = createVaultSalt();
  const { error } = await supabaseAdmin.from("vault_settings").insert({
    id: 1,
    code_salt: salt,
    code_verifier: createCodeVerifier(baseCode, salt),
  });
  if (error) throw new Error(error.message);
}

function validateBaseCode(value: string) {
  if (!/^\d{7}$/.test(value)) throw new Error("Vault code must contain exactly 7 digits.");
  if (/^(\d)\1{6}$/.test(value) || value === "1234567" || value === "7654321") {
    throw new Error("Please choose a less predictable 7-digit code.");
  }
}

async function verifyUnlockCode(unlockCode: string) {
  const { data, error } = await supabaseAdmin.from("vault_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Vault is not set up.");
  const setting = data as VaultSetting;

  if (setting.locked_until && new Date(setting.locked_until) > new Date()) {
    const minutes = Math.max(1, Math.ceil((new Date(setting.locked_until).getTime() - Date.now()) / 60000));
    throw new Error(`Vault is temporarily locked. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`);
  }

  const correctlyFormatted = /^\d{9}$/.test(unlockCode);
  const baseCode = correctlyFormatted ? unlockCode.slice(0, 7) : "0000000";
  const dayMatches = correctlyFormatted && unlockCode.slice(7) === bangkokDaySuffix();
  const codeMatches = codeVerifierMatches(baseCode, setting.code_salt, setting.code_verifier);
  if (!dayMatches || !codeMatches) {
    await registerFailedAttempt(setting);
    throw new Error("Incorrect vault code.");
  }

  if (setting.failed_attempts || setting.locked_until) {
    await supabaseAdmin.from("vault_settings").update({ failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() }).eq("id", 1);
  }
  return { baseCode, setting };
}

async function registerFailedAttempt(setting: VaultSetting) {
  const attempts = setting.failed_attempts + 1;
  const shouldLock = attempts >= 5;
  const { error } = await supabaseAdmin.from("vault_settings").update({
    failed_attempts: shouldLock ? 0 : attempts,
    locked_until: shouldLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq("id", 1);
  if (error) throw new Error(error.message);
}

async function readItems(key: Buffer): Promise<VaultItem[]> {
  const { data, error } = await supabaseAdmin.from("vault_items").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as VaultEncryptedRow[]).map((row) => ({
    id: row.id,
    ...decryptVaultPayload(row, key),
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

async function saveItem(input: VaultPayload & { id?: string }, key: Buffer) {
  const payload = validatePayload(input);
  const encrypted = encryptVaultPayload(payload, key);
  const query = input.id
    ? supabaseAdmin.from("vault_items").update({ ...encrypted, updated_at: new Date().toISOString() }).eq("id", input.id)
    : supabaseAdmin.from("vault_items").insert(encrypted);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

function validatePayload(input: VaultPayload): VaultPayload {
  const payload = {
    label: input.label?.trim() || "",
    account: input.account?.trim() || "",
    secret: input.secret || "",
    notes: input.notes?.trim() || "",
  };
  if (!payload.label || payload.label.length > 120) throw new Error("Name must be 1-120 characters.");
  if (!payload.secret || payload.secret.length > 10000) throw new Error("Secret is required and must be under 10,000 characters.");
  if (payload.account.length > 320 || payload.notes.length > 20000) throw new Error("Vault item is too long.");
  return payload;
}

async function deleteItem(id: string) {
  if (!id) throw new Error("Vault item is required.");
  const { error } = await supabaseAdmin.from("vault_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
