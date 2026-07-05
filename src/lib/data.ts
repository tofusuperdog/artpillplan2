import type { AppData, AppSettings, BloodPressureData, BpMeasurementContext, BpMedicationRelation, StockLot } from "./types";

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

export async function loadAppData(options: { syncDailyStock?: boolean } = {}): Promise<AppData> {
  const query = options.syncDailyStock === false ? "?sync=false" : "";
  return api<AppData>(`/api/app/data${query}`);
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

export async function editHistoryItem(input: {
  id: string;
  quantityPills: number;
  totalPrice?: number;
  expiryMonth?: number;
  expiryYear?: number;
  note?: string;
}) {
  await api("/api/app/action", {
    method: "POST",
    body: JSON.stringify({ action: "edit_history_item", input }),
  });
}

export async function deleteHistoryItem(id: string) {
  await api("/api/app/action", {
    method: "POST",
    body: JSON.stringify({ action: "delete_history_item", input: { id } }),
  });
}

export async function saveMedication(input: {
  id?: string;
  brandName: string;
  genericName?: string;
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

export async function loadBloodPressureData(): Promise<BloodPressureData> {
  return api<BloodPressureData>("/api/bp/data");
}

export async function saveBloodPressureReading(input: {
  id?: string;
  measuredAt: string;
  measurementContext: BpMeasurementContext;
  medicationRoundId?: string | null;
  medicationRelation?: BpMedicationRelation | null;
  bp1: { sys: number; dia: number; pulse: number };
  bp2?: { sys: number; dia: number; pulse: number } | null;
  bp3?: { sys: number; dia: number; pulse: number } | null;
  symptoms?: string[];
  otherSymptom?: string | null;
  note?: string | null;
}) {
  await api("/api/bp/action", {
    method: "POST",
    body: JSON.stringify({ action: "save_log", input }),
  });
}

export async function deleteBloodPressureReading(id: string) {
  await api("/api/bp/action", {
    method: "POST",
    body: JSON.stringify({ action: "delete_log", input: { id } }),
  });
}
