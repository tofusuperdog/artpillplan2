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

export function saveVaultItem(unlockCode: string, input: VaultPayload & { id?: string }) {
  return vaultApi<{ items: VaultItem[] }>("/api/vault/action", {
    method: "POST",
    body: JSON.stringify({ action: "save_item", input: { unlockCode, ...input } }),
  });
}

export function deleteVaultItem(unlockCode: string, id: string) {
  return vaultApi<{ items: VaultItem[] }>("/api/vault/action", {
    method: "POST",
    body: JSON.stringify({ action: "delete_item", input: { unlockCode, id } }),
  });
}
