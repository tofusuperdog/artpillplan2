import type { AppData, AppSettings, StockLot } from "./types";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(body?.message || `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function loadAppData(): Promise<AppData> {
  return api<AppData>("/api/app/data");
}

export async function addStockLot(input: {
  medicationId: string;
  quantityPills: number;
  expiryMonth: number;
  expiryYear: number;
  totalPrice: number;
  costPerPill: number;
  standardBoxPrice: number;
}) {
  await api("/api/app/action", {
    method: "POST",
    body: JSON.stringify({ action: "add_stock", input }),
  });
}

export async function updateLotsForRecount(
  medicationId: string,
  _lots: StockLot[],
  countedPills: number,
) {
  await api("/api/app/action", {
    method: "POST",
    body: JSON.stringify({ action: "recount_stock", input: { medicationId, countedPills } }),
  });
}

export async function saveMedication(input: {
  id?: string;
  name: string;
  dailyDosePills: number;
  pillsPerBox: number;
}) {
  await api("/api/app/action", {
    method: "POST",
    body: JSON.stringify({ action: "save_medication", input }),
  });
}

export async function softDeleteMedication(id: string) {
  await api("/api/app/action", {
    method: "POST",
    body: JSON.stringify({ action: "delete_medication", input: { id } }),
  });
}

export async function saveSettings(_settings: AppSettings, patch: Partial<AppSettings>) {
  await api("/api/app/action", {
    method: "POST",
    body: JSON.stringify({ action: "save_settings", input: patch }),
  });
}
