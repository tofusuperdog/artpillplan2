import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { StockLot } from "@/lib/types";

type ActionBody =
  | { action: "add_stock"; input: AddStockInput }
  | { action: "recount_stock"; input: { medicationId: string; countedPills: number } }
  | { action: "save_medication"; input: SaveMedicationInput }
  | { action: "delete_medication"; input: { id: string } }
  | { action: "save_settings"; input: { low_stock_alert_days?: number; expiring_lot_alert_days?: number } };

type AddStockInput = {
  medicationId: string;
  quantityPills: number;
  expiryMonth: number;
  expiryYear: number;
  totalPrice: number;
  costPerPill: number;
  standardBoxPrice: number;
};

type SaveMedicationInput = {
  id?: string;
  name: string;
  dailyDosePills: number;
  pillsPerBox: number;
};

export async function POST(request: Request) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as ActionBody | null;
  if (!body) return NextResponse.json({ message: "Invalid request" }, { status: 400 });

  try {
    if (body.action === "add_stock") await addStock(body.input);
    if (body.action === "recount_stock") await recountStock(body.input.medicationId, body.input.countedPills);
    if (body.action === "save_medication") await saveMedication(body.input);
    if (body.action === "delete_medication") await softDeleteMedication(body.input.id);
    if (body.action === "save_settings") await saveSettings(body.input);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Action failed" },
      { status: 500 },
    );
  }
}

async function addStock(input: AddStockInput) {
  const { data: lot, error: lotError } = await supabaseAdmin
    .from("stock_lots")
    .insert({
      medication_id: input.medicationId,
      quantity_pills_original: input.quantityPills,
      quantity_pills_remaining: input.quantityPills,
      expiry_month: input.expiryMonth,
      expiry_year: input.expiryYear,
      total_price: input.totalPrice,
      cost_per_pill: input.costPerPill,
      standard_box_price: input.standardBoxPrice,
    })
    .select("*")
    .single();
  if (lotError) throw new Error(lotError.message);

  const { error: historyError } = await supabaseAdmin.from("stock_history").insert({
    medication_id: input.medicationId,
    stock_lot_id: lot.id,
    type: "add_stock",
    quantity_pills: input.quantityPills,
    price: input.totalPrice,
    expiry_month: input.expiryMonth,
    expiry_year: input.expiryYear,
    note: `Added ${lot.lot_code || "lot"}`,
  });
  if (historyError) throw new Error(historyError.message);
}

async function recountStock(medicationId: string, countedPills: number) {
  if (!Number.isInteger(countedPills) || countedPills < 0) {
    throw new Error("Counted pills must be a whole number.");
  }

  const { data, error } = await supabaseAdmin
    .from("stock_lots")
    .select("*")
    .eq("medication_id", medicationId)
    .gt("quantity_pills_remaining", 0)
    .order("expiry_year", { ascending: true })
    .order("expiry_month", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const lots = (data || []) as StockLot[];
  const current = lots.reduce((sum, lot) => sum + lot.quantity_pills_remaining, 0);
  const delta = countedPills - current;

  if (delta < 0) {
    let remainingReduction = Math.abs(delta);
    for (const lot of lots) {
      if (remainingReduction <= 0) break;
      const reduceBy = Math.min(lot.quantity_pills_remaining, remainingReduction);
      remainingReduction -= reduceBy;
      const { error: updateError } = await supabaseAdmin
        .from("stock_lots")
        .update({ quantity_pills_remaining: lot.quantity_pills_remaining - reduceBy })
        .eq("id", lot.id);
      if (updateError) throw new Error(updateError.message);
    }
  } else if (delta > 0 && lots.length > 0) {
    const first = lots[0];
    const { error: updateError } = await supabaseAdmin
      .from("stock_lots")
      .update({ quantity_pills_remaining: first.quantity_pills_remaining + delta })
      .eq("id", first.id);
    if (updateError) throw new Error(updateError.message);
  }

  const { error: historyError } = await supabaseAdmin.from("stock_history").insert({
    medication_id: medicationId,
    type: "recount_stock",
    quantity_pills: countedPills,
    note: `Updated to ${countedPills} pills`,
  });
  if (historyError) throw new Error(historyError.message);
}

async function saveMedication(input: SaveMedicationInput) {
  if (!input.name || Number(input.dailyDosePills) <= 0 || Number(input.pillsPerBox) <= 0) {
    throw new Error("Medication fields are invalid.");
  }

  const payload = {
    name: input.name,
    daily_dose_pills: input.dailyDosePills,
    pills_per_box: input.pillsPerBox,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? supabaseAdmin.from("medications").update(payload).eq("id", input.id)
    : supabaseAdmin.from("medications").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

async function softDeleteMedication(id: string) {
  const { error } = await supabaseAdmin
    .from("medications")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

async function saveSettings(input: { low_stock_alert_days?: number; expiring_lot_alert_days?: number }) {
  const patch: Record<string, number | string> = { updated_at: new Date().toISOString() };
  if (input.low_stock_alert_days !== undefined) {
    if (!Number.isInteger(input.low_stock_alert_days) || input.low_stock_alert_days < 1 || input.low_stock_alert_days > 365) {
      throw new Error("Low stock alert must be 1-365 days.");
    }
    patch.low_stock_alert_days = input.low_stock_alert_days;
  }
  if (input.expiring_lot_alert_days !== undefined) {
    if (!Number.isInteger(input.expiring_lot_alert_days) || input.expiring_lot_alert_days < 1 || input.expiring_lot_alert_days > 730) {
      throw new Error("Expiring lot alert must be 1-730 days.");
    }
    patch.expiring_lot_alert_days = input.expiring_lot_alert_days;
  }

  const { data: current, error: readError } = await supabaseAdmin
    .from("app_settings")
    .select("id")
    .limit(1)
    .maybeSingle();
  if (readError) throw new Error(readError.message);

  const query = current?.id
    ? supabaseAdmin.from("app_settings").update(patch).eq("id", current.id)
    : supabaseAdmin.from("app_settings").insert({
        low_stock_alert_days: input.low_stock_alert_days ?? 14,
        expiring_lot_alert_days: input.expiring_lot_alert_days ?? 90,
        pin_value: "1234",
      });

  const { error } = await query;
  if (error) throw new Error(error.message);
}
