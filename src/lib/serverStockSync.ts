import { isExpiredLot, sortLotsFefo } from "./stock";
import { supabaseAdmin } from "./supabaseAdmin";
import type { Medication, StockLot } from "./types";

type ConsumptionState = {
  medication_id: string;
  last_consumed_on: string | null;
  fractional_pills: number;
};

type StockActivity = {
  medication_id: string;
  created_at: string;
};

const APP_TIME_ZONE = "Asia/Bangkok";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function syncDailyStockConsumption(now = new Date()) {
  const today = dateInTimeZone(now, APP_TIME_ZONE);
  const { data: medications, error: medicationsError } = await supabaseAdmin
    .from("medications")
    .select("id, name, daily_dose_pills, pills_per_box, is_active, created_at, updated_at")
    .eq("is_active", true);
  if (medicationsError) throw new Error(medicationsError.message);
  if (!medications?.length) return;

  const medicationIds = medications.map((medication) => medication.id);
  const { data: states, error: statesError } = await supabaseAdmin
    .from("daily_stock_consumption_state")
    .select("medication_id, last_consumed_on, fractional_pills")
    .in("medication_id", medicationIds);
  if (statesError) throw new Error(statesError.message);

  const stateByMedication = new Map((states || []).map((state) => [state.medication_id, state as ConsumptionState]));
  const allMedicationsSyncedToday = medications.every((medication) => {
    return stateByMedication.get(medication.id)?.last_consumed_on === today;
  });
  if (allMedicationsSyncedToday) return;

  const { data: activities, error: activitiesError } = await supabaseAdmin
    .from("stock_history")
    .select("medication_id, created_at")
    .in("medication_id", medicationIds)
    .order("created_at", { ascending: false });
  if (activitiesError) throw new Error(activitiesError.message);

  const initialDateByMedication = new Map<string, string>();
  for (const activity of (activities || []) as StockActivity[]) {
    if (!initialDateByMedication.has(activity.medication_id)) {
      initialDateByMedication.set(activity.medication_id, dateInTimeZone(new Date(activity.created_at), APP_TIME_ZONE));
    }
  }

  for (const medication of medications as Medication[]) {
    await syncMedicationConsumption(
      medication,
      stateByMedication.get(medication.id),
      initialDateByMedication.get(medication.id) || today,
      today,
      now,
    );
  }
}

async function syncMedicationConsumption(
  medication: Medication,
  state: ConsumptionState | undefined,
  initialLastConsumedOn: string,
  today: string,
  now: Date,
) {
  const lastConsumedOn = state?.last_consumed_on || initialLastConsumedOn;
  const elapsedDays = daysBetween(lastConsumedOn, today);
  if (elapsedDays <= 0) return;

  const dose = Number(medication.daily_dose_pills);
  const pendingPills = dose * elapsedDays + Number(state?.fractional_pills || 0);
  const pillsToConsume = Math.floor(pendingPills);
  const nextFractional = roundFraction(pendingPills - pillsToConsume);

  if (pillsToConsume > 0) {
    await consumePillsFromLots(medication.id, pillsToConsume, now);
  }

  await saveConsumptionState(medication.id, today, nextFractional);
}

async function consumePillsFromLots(medicationId: string, pillsToConsume: number, now: Date) {
  const { data, error } = await supabaseAdmin
    .from("stock_lots")
    .select("*")
    .eq("medication_id", medicationId)
    .gt("quantity_pills_remaining", 0);
  if (error) throw new Error(error.message);

  let remaining = pillsToConsume;
  const usableLots = sortLotsFefo(((data || []) as StockLot[]).filter((lot) => !isExpiredLot(lot, now)));
  for (const lot of usableLots) {
    if (remaining <= 0) break;
    const reduceBy = Math.min(lot.quantity_pills_remaining, remaining);
    remaining -= reduceBy;

    const { error: updateError } = await supabaseAdmin
      .from("stock_lots")
      .update({ quantity_pills_remaining: lot.quantity_pills_remaining - reduceBy })
      .eq("id", lot.id);
    if (updateError) throw new Error(updateError.message);
  }
}

async function saveConsumptionState(medicationId: string, lastConsumedOn: string, fractionalPills: number) {
  const { error } = await supabaseAdmin
    .from("daily_stock_consumption_state")
    .upsert({
      medication_id: medicationId,
      last_consumed_on: lastConsumedOn,
      fractional_pills: fractionalPills,
      updated_at: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
}

function dateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function daysBetween(startDate: string, endDate: string) {
  const start = Date.parse(`${startDate}T00:00:00.000Z`);
  const end = Date.parse(`${endDate}T00:00:00.000Z`);
  return Math.floor((end - start) / MS_PER_DAY);
}

function roundFraction(value: number) {
  return Math.round(value * 10000) / 10000;
}
