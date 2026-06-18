export type StockHistoryType = "add_stock" | "recount_stock";

export interface Medication {
  id: string;
  name: string;
  daily_dose_pills: number;
  pills_per_box: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockLot {
  id: string;
  lot_number: number;
  lot_code: string | null;
  medication_id: string;
  quantity_pills_original: number;
  quantity_pills_remaining: number;
  expiry_month: number;
  expiry_year: number;
  total_price: number;
  cost_per_pill: number;
  standard_box_price: number;
  created_at: string;
}

export interface StockHistory {
  id: string;
  medication_id: string;
  stock_lot_id: string | null;
  type: StockHistoryType;
  quantity_pills: number;
  price: number | null;
  expiry_month: number | null;
  expiry_year: number | null;
  note: string | null;
  created_at: string;
  medications?: Pick<Medication, "id" | "name">;
  stock_lots?: Pick<StockLot, "lot_code" | "standard_box_price"> | null;
}

export interface AppSettings {
  id: string;
  low_stock_alert_days: number;
  expiring_lot_alert_days: number;
  pin_value: string | null;
  updated_at: string;
}

export interface AppData {
  medications: Medication[];
  stockLots: StockLot[];
  stockHistory: StockHistory[];
  settings: AppSettings;
}

export type BadgeKind =
  | "no_stock"
  | "runs_out_today"
  | "low_stock"
  | "expired_lot"
  | "expiring_lot"
  | "in_stock";

export interface StatusBadge {
  kind: BadgeKind;
  label: string;
}

export interface MedicationSummary {
  medication: Medication;
  lots: StockLot[];
  history: StockHistory[];
  usableLots: StockLot[];
  usableStockPills: number;
  totalStockPills: number;
  remainingDaysRaw: number;
  remainingDaysDisplay: number;
  badges: StatusBadge[];
  averageCost: number;
  standardBoxValue: number;
  currentStockValue: number;
}
