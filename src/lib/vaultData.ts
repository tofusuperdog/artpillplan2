import type { VaultItem, VaultPayload } from "./vaultTypes";

async function vaultApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function loadVaultStatus() {
  return vaultApi<{ initialized: boolean }>("/api/vault/status");
}

export function setupVault(baseCode: string) {
  return vaultApi<{ ok: true }>("/api/vault/action", {
    method: "POST",
    body: JSON.stringify({ action: "setup", input: { baseCode } }),
  });
}

export function unlockVault(unlockCode: string) {
  return vaultApi<{ items: VaultItem[] }>("/api/vault/action", {
    method: "POST",
    body: JSON.stringify({ action: "unlock", input: { unlockCode } }),
  });
}

export function loadVaultItems() {
  return vaultApi<{ items: VaultItem[] }>("/api/vault/action", {
    method: "POST",
    body: JSON.stringify({ action: "list" }),
  });
}

export function lockVault() {
  return vaultApi<{ ok: true }>("/api/vault/lock", { method: "POST" });
}

export function refreshVaultSession() {
  return vaultApi<{ ok: true }>("/api/vault/refresh", { method: "POST" });
}

export function changeVaultCode(baseCode: string) {
  return vaultApi<{ items: VaultItem[] }>("/api/vault/action", {
    method: "POST",
    body: JSON.stringify({ action: "change_code", input: { baseCode } }),
  });
}

export function saveVaultItem(input: VaultPayload & { id?: string }) {
  return vaultApi<{ items: VaultItem[] }>("/api/vault/action", {
    method: "POST",
    body: JSON.stringify({ action: "save_item", input }),
  });
}

export function deleteVaultItem(id: string) {
  return vaultApi<{ items: VaultItem[] }>("/api/vault/action", {
    method: "POST",
    body: JSON.stringify({ action: "delete_item", input: { id } }),
  });
}
