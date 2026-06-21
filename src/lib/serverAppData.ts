import "server-only";

import { supabaseAdmin } from "./supabaseAdmin";
import { syncDailyStockConsumption } from "./serverStockSync";
import type { AppData, AppSettings, Medication, StockHistory, StockLot } from "./types";

const DEFAULT_SETTINGS: AppSettings = {
  id: "",
  low_stock_alert_days: 14,
  expiring_lot_alert_days: 90,
  pin_value: null,
  updated_at: new Date(0).toISOString(),
};

export async function getAppData({ syncDailyStock = true } = {}): Promise<AppData> {
  if (syncDailyStock) await syncDailyStockConsumption();

  const [medicationsResult, lotsResult, historyResult, settingsResult] = await Promise.all([
    supabaseAdmin.from("medications").select("*").eq("is_active", true).order("created_at", { ascending: true }),
    supabaseAdmin.from("stock_lots").select("*").order("created_at", { ascending: true }),
    supabaseAdmin
      .from("stock_history")
      .select("*, medications(id,name,brand_name,generic_name), stock_lots(lot_code,standard_box_price)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabaseAdmin
      .from("app_settings")
      .select("id, low_stock_alert_days, expiring_lot_alert_days, updated_at")
      .limit(1)
      .maybeSingle(),
  ]);

  const error = medicationsResult.error || lotsResult.error || historyResult.error || settingsResult.error;
  if (error) throw new Error(error.message);

  return {
    medications: (medicationsResult.data || []) as Medication[],
    stockLots: (lotsResult.data || []) as StockLot[],
    stockHistory: (historyResult.data || []) as StockHistory[],
    settings: settingsResult.data
      ? ({ ...settingsResult.data, pin_value: null } as AppSettings)
      : DEFAULT_SETTINGS,
  };
}
