import "server-only";

import { supabaseAdmin } from "./supabaseAdmin";
import type { BloodPressureData, BloodPressureSummary, BpAverage, BpLog } from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function average(logs: BpLog[]): BpAverage | null {
  if (logs.length < 3) return null;
  return {
    sys: Math.round(logs.reduce((sum, log) => sum + Number(log.avg_sys), 0) / logs.length),
    dia: Math.round(logs.reduce((sum, log) => sum + Number(log.avg_dia), 0) / logs.length),
    pulse: Math.round(logs.reduce((sum, log) => sum + Number(log.avg_pulse), 0) / logs.length),
    count: logs.length,
  };
}

export function summarizeBloodPressure(logs: BpLog[], now = new Date()): BloodPressureSummary {
  const fourteenDaysAgo = new Date(now.getTime() - 14 * MS_PER_DAY);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * MS_PER_DAY);
  const recent14 = logs.filter((log) => new Date(log.measured_at) >= fourteenDaysAgo);
  const recent30 = logs.filter((log) => new Date(log.measured_at) >= thirtyDaysAgo);

  return {
    latestLog: logs[0] || null,
    average14Day: average(recent14),
    beforeMedicationAverage14Day: average(
      recent14.filter((log) => log.measurement_context === "around_medication" && log.medication_relation === "before"),
    ),
    afterMedicationAverage14Day: average(
      recent14.filter((log) => log.measurement_context === "around_medication" && log.medication_relation === "after"),
    ),
    count30Day: recent30.length,
    highVariation14Day: recent14.filter((log) => log.reading_quality === "high_variation").length,
  };
}

export async function getBloodPressureData(): Promise<BloodPressureData> {
  const [logsResult, roundsResult] = await Promise.all([
    supabaseAdmin
      .from("bp_logs")
      .select("*, bp_medication_rounds(id,name,usual_time)")
      .order("measured_at", { ascending: false })
      .limit(240),
    supabaseAdmin
      .from("bp_medication_rounds")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("usual_time", { ascending: true }),
  ]);

  const error = logsResult.error || roundsResult.error;
  if (error) throw new Error(error.message);

  const logs = (logsResult.data || []) as BpLog[];
  return {
    logs,
    rounds: roundsResult.data || [],
    summary: summarizeBloodPressure(logs),
  };
}
