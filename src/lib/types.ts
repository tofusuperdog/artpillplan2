export type StockHistoryType = "add_stock" | "recount_stock";

export interface Medication {
  id: string;
  name: string;
  brand_name: string | null;
  generic_name: string | null;
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
  medications?: Pick<Medication, "id" | "name" | "brand_name" | "generic_name">;
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

export type BpMeasurementContext = "around_medication" | "symptom_check" | "general_check";
export type BpMedicationRelation = "before" | "after";
export type BpAverageSource = "bp1" | "bp1_bp2" | "bp2_bp3";
export type BpReadingQuality = "single_reading" | "two_readings" | "high_variation" | "three_readings_last_two_average";

export interface BpMedicationRound {
  id: string;
  name: string;
  usual_time: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BpLog {
  id: string;
  measured_at: string;
  measurement_context: BpMeasurementContext;
  medication_round_id: string | null;
  medication_relation: BpMedicationRelation | null;
  bp1_sys: number;
  bp1_dia: number;
  bp1_pulse: number;
  bp2_sys: number | null;
  bp2_dia: number | null;
  bp2_pulse: number | null;
  bp3_sys: number | null;
  bp3_dia: number | null;
  bp3_pulse: number | null;
  avg_sys: number;
  avg_dia: number;
  avg_pulse: number;
  average_source: BpAverageSource;
  reading_quality: BpReadingQuality;
  symptoms: string[] | null;
  other_symptom: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  bp_medication_rounds?: Pick<BpMedicationRound, "id" | "name" | "usual_time"> | null;
}

export interface BpAverage {
  sys: number;
  dia: number;
  pulse: number | null;
  count: number;
}

export interface BloodPressureSummary {
  latestLog: BpLog | null;
  average14Day: BpAverage | null;
  beforeMedicationAverage14Day: BpAverage | null;
  afterMedicationAverage14Day: BpAverage | null;
  count30Day: number;
  highVariation14Day: number;
}

export interface BloodPressureData {
  logs: BpLog[];
  rounds: BpMedicationRound[];
  summary: BloodPressureSummary;
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
