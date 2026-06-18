import type {
  AppSettings,
  Medication,
  MedicationSummary,
  StatusBadge,
  StockHistory,
  StockLot,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function expiryEndDate(month: number, year: number) {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

export function formatExpiry(month: number, year: number) {
  return `${String(month).padStart(2, "0")}/${year}`;
}

export function isExpiredLot(lot: Pick<StockLot, "expiry_month" | "expiry_year">, now = new Date()) {
  return expiryEndDate(lot.expiry_month, lot.expiry_year).getTime() < startOfToday(now).getTime();
}

export function isExpiringSoon(
  lot: Pick<StockLot, "expiry_month" | "expiry_year">,
  days: number,
  now = new Date(),
) {
  if (isExpiredLot(lot, now)) return false;
  const diff = expiryEndDate(lot.expiry_month, lot.expiry_year).getTime() - startOfToday(now).getTime();
  return Math.floor(diff / MS_PER_DAY) <= days;
}

export function startOfToday(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function lotStatus(lot: StockLot, settings: AppSettings, now = new Date()) {
  if (isExpiredLot(lot, now)) return "Expired";
  if (isExpiringSoon(lot, settings.expiring_lot_alert_days, now)) return "Expiring Soon";
  return "Good";
}

export function sortLotsFefo(lots: StockLot[]) {
  return [...lots].sort((a, b) => {
    if (a.expiry_year !== b.expiry_year) return a.expiry_year - b.expiry_year;
    if (a.expiry_month !== b.expiry_month) return a.expiry_month - b.expiry_month;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

export function summarizeMedication(
  medication: Medication,
  lots: StockLot[],
  history: StockHistory[],
  settings: AppSettings,
  now = new Date(),
): MedicationSummary {
  const activeLots = lots.filter((lot) => lot.medication_id === medication.id && lot.quantity_pills_remaining > 0);
  const usableLots = activeLots.filter((lot) => !isExpiredLot(lot, now));
  const usableStockPills = usableLots.reduce((sum, lot) => sum + lot.quantity_pills_remaining, 0);
  const totalStockPills = activeLots.reduce((sum, lot) => sum + lot.quantity_pills_remaining, 0);
  const remainingDaysRaw = medication.daily_dose_pills > 0 ? usableStockPills / medication.daily_dose_pills : 0;
  const remainingDaysDisplay = Math.floor(remainingDaysRaw);
  const totalUsableStockValue = usableLots.reduce(
    (sum, lot) => sum + lot.quantity_pills_remaining * lot.cost_per_pill,
    0,
  );
  const averageCost = usableStockPills > 0 ? totalUsableStockValue / usableStockPills : 0;
  const standardBoxValue = averageCost * medication.pills_per_box;
  const currentStockValue = totalUsableStockValue;

  const badges: StatusBadge[] = [];
  if (usableStockPills === 0) {
    badges.push({ kind: "no_stock", label: "No Stock" });
  } else if (remainingDaysRaw < 1) {
    badges.push({ kind: "runs_out_today", label: "Runs Out Today" });
  } else if (remainingDaysDisplay <= settings.low_stock_alert_days) {
    badges.push({ kind: "low_stock", label: "Low Stock" });
  }
  if (activeLots.some((lot) => isExpiredLot(lot, now))) badges.push({ kind: "expired_lot", label: "Expired Lot" });
  if (activeLots.some((lot) => isExpiringSoon(lot, settings.expiring_lot_alert_days, now))) {
    badges.push({ kind: "expiring_lot", label: "Expiring Lot" });
  }
  if (badges.length === 0) badges.push({ kind: "in_stock", label: "In Stock" });

  return {
    medication,
    lots: sortLotsFefo(activeLots),
    history: history
      .filter((item) => item.medication_id === medication.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    usableLots: sortLotsFefo(usableLots),
    usableStockPills,
    totalStockPills,
    remainingDaysRaw,
    remainingDaysDisplay,
    badges,
    averageCost,
    standardBoxValue,
    currentStockValue,
  };
}

export function sortSummariesForHome(summaries: MedicationSummary[]) {
  return [...summaries].sort((a, b) => {
    const rank = (summary: MedicationSummary) => {
      if (summary.usableStockPills === 0) return 0;
      if (summary.remainingDaysRaw < 1) return 1;
      if (summary.badges.some((badge) => badge.kind === "low_stock")) return 2;
      return 3;
    };
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.remainingDaysRaw - b.remainingDaysRaw;
  });
}

export function money(value: number) {
  return `฿${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function compactNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, "");
}

export function validateExpiryInput(input: string, now = new Date()) {
  const match = input.match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
  if (!match) return "Use MM/YYYY format.";
  const month = Number(match[1]);
  const year = Number(match[2]);
  if (expiryEndDate(month, year).getTime() < startOfToday(now).getTime()) {
    return "Expiry date has already passed.";
  }
  return null;
}
