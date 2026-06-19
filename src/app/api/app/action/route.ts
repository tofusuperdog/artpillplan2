import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { StockLot } from "@/lib/types";

type ActionBody =
  | { action: "add_stock"; input: AddStockInput }
  | { action: "recount_stock"; input: { medicationId: string; countedPills: number } }
  | { action: "edit_history_item"; input: EditHistoryInput }
  | { action: "delete_history_item"; input: { id: string } }
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
  brandName: string;
  genericName?: string;
  dailyDosePills: number;
  pillsPerBox: number;
};

type EditHistoryInput = {
  id: string;
  quantityPills: number;
  totalPrice?: number;
  expiryMonth?: number;
  expiryYear?: number;
  note?: string;
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
    if (body.action === "edit_history_item") await editHistoryItem(body.input);
    if (body.action === "delete_history_item") await deleteHistoryItem(body.input.id);
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

async function editHistoryItem(input: EditHistoryInput) {
  if (!input.id) throw new Error("History item is required.");
  if (!Number.isInteger(input.quantityPills) || input.quantityPills < 0) {
    throw new Error("Quantity must be a whole number.");
  }

  const { data: history, error: historyError } = await supabaseAdmin
    .from("stock_history")
    .select("*")
    .eq("id", input.id)
    .single();
  if (historyError) throw new Error(historyError.message);

  if (history.type === "add_stock") {
    if (input.quantityPills <= 0) throw new Error("Quantity must be greater than 0.");
    const totalPrice = Number(input.totalPrice);
    const expiryMonth = Number(input.expiryMonth);
    const expiryYear = Number(input.expiryYear);
    if (!Number.isFinite(totalPrice) || totalPrice < 0) throw new Error("Price must be 0 or greater.");
    if (!Number.isInteger(expiryMonth) || expiryMonth < 1 || expiryMonth > 12) throw new Error("Expiry month is invalid.");
    if (!Number.isInteger(expiryYear) || expiryYear < 2000 || expiryYear > 2100) throw new Error("Expiry year is invalid.");

    const { data: medication, error: medError } = await supabaseAdmin
      .from("medications")
      .select("pills_per_box")
      .eq("id", history.medication_id)
      .single();
    if (medError) throw new Error(medError.message);

    const costPerPill = totalPrice / input.quantityPills;
    const standardBoxPrice = costPerPill * Number(medication.pills_per_box);

    if (history.stock_lot_id) {
      const { data: lot, error: lotReadError } = await supabaseAdmin
        .from("stock_lots")
        .select("quantity_pills_remaining")
        .eq("id", history.stock_lot_id)
        .single();
      if (lotReadError) throw new Error(lotReadError.message);

      const delta = input.quantityPills - Number(history.quantity_pills);
      const nextRemaining = Math.max(0, Number(lot.quantity_pills_remaining) + delta);
      const { error: lotUpdateError } = await supabaseAdmin
        .from("stock_lots")
        .update({
          quantity_pills_original: input.quantityPills,
          quantity_pills_remaining: nextRemaining,
          expiry_month: expiryMonth,
          expiry_year: expiryYear,
          total_price: totalPrice,
          cost_per_pill: costPerPill,
          standard_box_price: standardBoxPrice,
        })
        .eq("id", history.stock_lot_id);
      if (lotUpdateError) throw new Error(lotUpdateError.message);
    }

    const { error: updateError } = await supabaseAdmin
      .from("stock_history")
      .update({
        quantity_pills: input.quantityPills,
        price: totalPrice,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        note: input.note || history.note,
      })
      .eq("id", input.id);
    if (updateError) throw new Error(updateError.message);
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from("stock_history")
    .update({
      quantity_pills: input.quantityPills,
      note: input.note || `Updated to ${input.quantityPills} pills`,
    })
    .eq("id", input.id);
  if (updateError) throw new Error(updateError.message);
}

async function deleteHistoryItem(id: string) {
  if (!id) throw new Error("History item is required.");
  const { data: history, error: historyError } = await supabaseAdmin
    .from("stock_history")
    .select("*")
    .eq("id", id)
    .single();
  if (historyError) throw new Error(historyError.message);

  const { error: deleteHistoryError } = await supabaseAdmin
    .from("stock_history")
    .delete()
    .eq("id", id);
  if (deleteHistoryError) throw new Error(deleteHistoryError.message);

  if (history.type === "add_stock" && history.stock_lot_id) {
    const { error: deleteLotError } = await supabaseAdmin
      .from("stock_lots")
      .delete()
      .eq("id", history.stock_lot_id);
    if (deleteLotError) throw new Error(deleteLotError.message);
  }
}

async function saveMedication(input: SaveMedicationInput) {
  const brandName = input.brandName?.trim();
  const genericName = input.genericName?.trim() || null;
  if (!brandName || Number(input.dailyDosePills) <= 0 || Number(input.pillsPerBox) <= 0) {
    throw new Error("Medication fields are invalid.");
  }

  const payload = {
    name: brandName,
    brand_name: brandName,
    generic_name: genericName,
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
