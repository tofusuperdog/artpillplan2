import { NextResponse } from "next/server";
import { hasSessionCookie } from "@/lib/serverAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { BpMeasurementContext, BpMedicationRelation } from "@/lib/types";

type BpInput = { sys: number; dia: number; pulse: number };

type ActionBody =
  | { action: "save_log"; input: SaveLogInput }
  | { action: "delete_log"; input: { id: string } };

type SaveLogInput = {
  id?: string;
  measuredAt: string;
  measurementContext: BpMeasurementContext;
  medicationRoundId?: string | null;
  medicationRelation?: BpMedicationRelation | null;
  bp1: BpInput;
  bp2?: BpInput | null;
  bp3?: BpInput | null;
  symptoms?: string[];
  otherSymptom?: string | null;
  note?: string | null;
};

export async function POST(request: Request) {
  if (!(await hasSessionCookie())) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as ActionBody | null;
  if (!body) return NextResponse.json({ message: "Invalid request" }, { status: 400 });

  try {
    if (body.action === "save_log") await saveLog(body.input);
    if (body.action === "delete_log") await deleteRow("bp_logs", body.input.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Action failed";
    return NextResponse.json({ message }, { status: 500 });
  }
}

async function saveLog(input: SaveLogInput) {
  const measuredAt = new Date(input.measuredAt);
  if (Number.isNaN(measuredAt.getTime())) throw new Error("Measured time is invalid.");
  if (!["around_medication", "symptom_check", "general_check"].includes(input.measurementContext)) {
    throw new Error("Measurement context is invalid.");
  }

  if (input.measurementContext === "around_medication") {
    if (!input.medicationRoundId) throw new Error("Please select a medication round.");
    if (!input.medicationRelation) {
      throw new Error("Please select whether this reading was taken before or after medication.");
    }
  }

  const bp1 = normalizeBp(input.bp1, true);
  const bp2 = input.bp2 ? normalizeBp(input.bp2, false) : null;
  const bp3 = input.bp3 ? normalizeBp(input.bp3, false) : null;
  const calculated = calculateAverage(bp1, bp2, bp3);
  const symptoms = (input.symptoms || []).map((item) => item.trim()).filter(Boolean);

  const payload = {
    measured_at: measuredAt.toISOString(),
    measurement_context: input.measurementContext,
    medication_round_id: input.measurementContext === "around_medication" ? input.medicationRoundId : null,
    medication_relation: input.measurementContext === "around_medication" ? input.medicationRelation : null,
    bp1_sys: bp1.sys,
    bp1_dia: bp1.dia,
    bp1_pulse: bp1.pulse,
    bp2_sys: bp2?.sys ?? null,
    bp2_dia: bp2?.dia ?? null,
    bp2_pulse: bp2?.pulse ?? null,
    bp3_sys: bp3?.sys ?? null,
    bp3_dia: bp3?.dia ?? null,
    bp3_pulse: bp3?.pulse ?? null,
    avg_sys: calculated.avgSys,
    avg_dia: calculated.avgDia,
    avg_pulse: calculated.avgPulse,
    average_source: calculated.averageSource,
    reading_quality: calculated.readingQuality,
    symptoms: symptoms.length ? symptoms : null,
    other_symptom: input.otherSymptom?.trim() || null,
    note: input.note?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const query = input.id
    ? supabaseAdmin.from("bp_logs").update(payload).eq("id", input.id)
    : supabaseAdmin.from("bp_logs").insert(payload);
  const { error } = await query;
  if (error) throw new Error(error.message);
}

function normalizeBp(input: BpInput, required: boolean) {
  const sys = Number(input?.sys);
  const dia = Number(input?.dia);
  const pulse = Number(input?.pulse);
  if (required && (!sys || !dia || !pulse)) throw new Error("BP1 is required.");
  if (!Number.isInteger(sys) || sys < 50 || sys > 280) throw new Error("SYS value is invalid.");
  if (!Number.isInteger(dia) || dia < 30 || dia > 180) throw new Error("DIA value is invalid.");
  if (!Number.isInteger(pulse) || pulse < 25 || pulse > 240) throw new Error("Pulse value is invalid.");
  return { sys, dia, pulse };
}

function calculateAverage(bp1: BpInput, bp2: BpInput | null, bp3: BpInput | null) {
  if (bp2 && bp3) {
    return {
      avgSys: Math.round((bp2.sys + bp3.sys) / 2),
      avgDia: Math.round((bp2.dia + bp3.dia) / 2),
      avgPulse: Math.round((bp2.pulse + bp3.pulse) / 2),
      averageSource: "bp2_bp3",
      readingQuality: "three_readings_last_two_average",
    };
  }
  if (bp2) {
    const highVariation = Math.abs(bp1.sys - bp2.sys) > 5 || Math.abs(bp1.dia - bp2.dia) > 5;
    return {
      avgSys: Math.round((bp1.sys + bp2.sys) / 2),
      avgDia: Math.round((bp1.dia + bp2.dia) / 2),
      avgPulse: Math.round((bp1.pulse + bp2.pulse) / 2),
      averageSource: "bp1_bp2",
      readingQuality: highVariation ? "high_variation" : "two_readings",
    };
  }
  return {
    avgSys: bp1.sys,
    avgDia: bp1.dia,
    avgPulse: bp1.pulse,
    averageSource: "bp1",
    readingQuality: "single_reading",
  };
}

async function deleteRow(table: "bp_logs", id: string) {
  if (!id) throw new Error("Record is required.");
  const { error } = await supabaseAdmin.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
}
