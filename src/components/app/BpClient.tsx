"use client";

import {
  Activity,
  ArrowLeft,
  ClipboardPlus,
  Heart,
  Info,
  Pencil,
  Plus,
  Save,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type React from "react";
import {
  deleteBloodPressureReading,
  loadBloodPressureData,
  saveBloodPressureReading,
} from "@/lib/data";
import type {
  BloodPressureData,
  BpAverage,
  BpLog,
  BpMeasurementContext,
  BpMedicationRelation,
} from "@/lib/types";

const symptomOptions = [
  "Dizziness",
  "Palpitations",
  "Lightheadedness",
  "Nausea",
  "Other",
];

type BpFields = { sys: string; dia: string; pulse: string };

export default function BpClient({
  initialData = null,
  initialError = null,
}: {
  initialData?: BloodPressureData | null;
  initialError?: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const view = pathname.endsWith("/log") ? "log" : pathname.endsWith("/report") ? "report" : "dashboard";
  const [data, setData] = useState<BloodPressureData | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [saving, setSaving] = useState(false);
  const [editingLog, setEditingLog] = useState<BpLog | null>(null);
  const [savedLog, setSavedLog] = useState<BpLog | null>(null);
  const [form, setForm] = useState(() => defaultBpForm(initialData));
  const [toast, setToast] = useState<string | null>(null);

  const activeRounds = (data?.rounds || []).filter((round) => round.is_active);
  const showBp3Suggestion = hasHighVariation(form.bp1, form.bp2);

  const refresh = async () => {
    try {
      const next = await loadBloodPressureData();
      setData(next);
      setError(null);
      return next;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load blood pressure data.";
      if (message === "Unauthorized") {
        router.replace("/");
        router.refresh();
        return null;
      }
      setError(message);
      return null;
    }
  };

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  };

  const setMeasuredAt = (measuredAt: string) => {
    const roundId = form.measurementContext === "around_medication"
      ? autoRoundId(measuredAt, activeRounds) || form.medicationRoundId
      : "";
    setForm({ ...form, measuredAt, medicationRoundId: roundId });
  };

  const submitLog = async () => {
    setSaving(true);
    setError(null);
    try {
      if (form.measurementContext === "around_medication" && !form.medicationRelation) {
        throw new Error("Please select whether this reading was taken before or after medication.");
      }
      await saveBloodPressureReading({
        id: editingLog?.id,
        measuredAt: new Date(form.measuredAt).toISOString(),
        measurementContext: form.measurementContext,
        medicationRoundId: form.measurementContext === "around_medication" ? form.medicationRoundId : null,
        medicationRelation: form.measurementContext === "around_medication" ? form.medicationRelation : null,
        bp1: toBpInput(form.bp1),
        bp2: isCompleteBp(form.bp2) ? toBpInput(form.bp2) : null,
        bp3: isCompleteBp(form.bp3) ? toBpInput(form.bp3) : null,
        symptoms: form.symptoms.filter((item) => item !== "Other"),
        otherSymptom: form.symptoms.includes("Other") ? form.otherSymptom : null,
        note: form.note,
      });
      const next = await refresh();
      const log = next?.logs[0] || null;
      setSavedLog(log);
      setEditingLog(null);
      setForm(defaultBpForm(next));
      flash(editingLog ? "BP log updated" : "BP log saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save BP log.");
    } finally {
      setSaving(false);
    }
  };

  const editLog = (log: BpLog) => {
    setEditingLog(log);
    setSavedLog(null);
    setForm(formFromLog(log));
    router.push("/bp/log");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const removeLog = async (id: string) => {
    setSaving(true);
    try {
      await deleteBloodPressureReading(id);
      await refresh();
      flash("BP log deleted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete BP log.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="launcher-page-shell bp-page-shell">
      <div className="launcher-app bp-app">
        <header className="top-header bp-header">
          <button className="icon-btn" onClick={() => router.push(view === "log" ? "/bp" : "/home")} aria-label="Back"><ArrowLeft /></button>
          <div className="wordmark">Blood Pressure</div>
        </header>

        {error && (
          <section className="retro-panel center-panel">
            <Activity />
            <h2>Blood pressure setup needed</h2>
            <p>{error}</p>
            <button className="primary wide" onClick={refresh}>Retry</button>
          </section>
        )}

        {data && view === "dashboard" && (
          <Dashboard
            data={data}
            onLog={() => router.push("/bp/log")}
          />
        )}

        {data && view === "log" && (
          <LogView
            data={data}
            form={form}
            savedLog={savedLog}
            showBp3Suggestion={showBp3Suggestion}
            saving={saving}
            editing={Boolean(editingLog)}
            setForm={setForm}
            setMeasuredAt={setMeasuredAt}
            submit={submitLog}
            editSaved={() => savedLog && editLog(savedLog)}
            addAnother={() => { setSavedLog(null); setForm(defaultBpForm(data)); }}
            done={() => router.push("/bp")}
          />
        )}

        {data && view === "report" && <ReportView data={data} onEdit={editLog} />}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </main>
  );
}

function Dashboard({
  data,
  onLog,
}: {
  data: BloodPressureData;
  onLog: () => void;
}) {
  return (
    <>
      <div className="bp-top-actions">
        <button className="primary wide" onClick={onLog}><Plus /> Log BP</button>
      </div>
      <LatestBpCard log={data.summary.latestLog} />
      <section className="bp-dashboard-stack">
        <TrendPanel title="Blood Pressure" metric="bp" data={data} />
        <TrendPanel title="Heart Rate" metric="pulse" data={data} />
      </section>
    </>
  );
}

function LatestBpCard({ log }: { log: BpLog | null }) {
  return (
    <section className="retro-panel bp-latest-summary">
      <span className="mini-icon"><Heart /></span>
      <div>
        <small>Latest BP</small>
        {log ? (
          <>
            <strong>{formatDateTime(log.measured_at)}</strong>
            <p>BP {log.avg_sys}/{log.avg_dia} mmHg · {log.avg_pulse} bpm</p>
          </>
        ) : (
          <>
            <strong>No BP logs yet</strong>
            <p>Log a blood pressure reading to see the latest result.</p>
          </>
        )}
      </div>
    </section>
  );
}

type TrendMetric = "bp" | "pulse";
type TrendMode = "morning_medication" | "evening_medication" | "day_parts" | "daily_range";
type TrendSeries = { label: string; color: string; points: (number | null)[]; dash?: string };

const trendModeOptions: { value: TrendMode; label: string }[] = [
  { value: "morning_medication", label: "Morning before/after meds" },
  { value: "evening_medication", label: "Evening before/after meds" },
  { value: "day_parts", label: "Morning avg / Noon / Evening avg" },
  { value: "daily_range", label: "Daily max / min" },
];

function TrendPanel({ title, metric, data }: { title: string; metric: TrendMetric; data: BloodPressureData }) {
  const [listChart, setListChart] = useState<{
    title: string;
    chart: ReturnType<typeof buildTrendChart>;
    unit: string;
  } | null>(null);
  const unit = metric === "bp" ? "mmHg" : "bpm";

  return (
    <section className="retro-panel bp-chart-panel">
      <div className="bp-chart-heading">
        <h1>{title}</h1>
      </div>
      <div className="bp-chart-stack">
        {trendModeOptions.map((option) => {
          const chart = buildTrendChart(data.logs, 7, option.value, metric);
          return (
            <section className="bp-chart-section" key={option.value}>
              <div className="bp-chart-title-row">
                <h2>{option.label}</h2>
                <button className="bp-chart-info-btn" onClick={() => setListChart({ title: `${title} · ${option.label}`, chart, unit })} aria-label={`${option.label} list`}>
                  <Info />
                </button>
              </div>
              <TrendChart chart={chart} />
            </section>
          );
        })}
      </div>
      {listChart && <TrendListModal title={listChart.title} chart={listChart.chart} unit={listChart.unit} onClose={() => setListChart(null)} />}
    </section>
  );
}

function TrendChart({ chart }: { chart: ReturnType<typeof buildTrendChart> }) {
  const values = chart.series.flatMap((item) => item.points).filter((value): value is number => value !== null);
  if (values.length === 0) return <div className="bp-chart-empty">No data</div>;

  const width = 640;
  const height = 512;
  const padding = { top: 5, right: 5, bottom: 34, left: 42 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const yMargin = Math.max(2, Math.round((max - min) * 0.08));
  const yMin = chart.metric === "bp" ? Math.max(0, Math.floor((min - yMargin) / 5) * 5) : Math.max(0, min - yMargin);
  const yMax = chart.metric === "bp" ? Math.ceil((max + yMargin) / 5) * 5 : max + yMargin;
  const xFor = (index: number) => padding.left + (chart.labels.length <= 1 ? 0 : index * (width - padding.left - padding.right) / (chart.labels.length - 1));
  const yFor = (value: number) => padding.top + (yMax - value) * (height - padding.top - padding.bottom) / Math.max(1, yMax - yMin);

  return (
    <div className="bp-chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Trend chart">
        {Array.from({ length: chart.metric === "bp" ? Math.floor((yMax - yMin) / 5) + 1 : 4 }, (_, line) => {
          const value = chart.metric === "bp" ? yMin + line * 5 : Math.round(yMin + (yMax - yMin) * line / 3);
          const y = yFor(value);
          const showGridLine = chart.metric !== "bp" || value % 10 === 0;
          return (
            <g key={line}>
              {showGridLine && <line className="bp-chart-grid-line" x1={padding.left} y1={y} x2={width - padding.right} y2={y} />}
              <text className="bp-chart-axis" x={6} y={y + 7}>{value}</text>
            </g>
          );
        })}
        {chart.series.map((series) => (
          <g key={`${series.label}-${series.color}-${series.dash || "solid"}`}>
            <polyline
              className="bp-chart-line"
              points={series.points.map((value, index) => value === null ? "" : `${xFor(index)},${yFor(value)}`).filter(Boolean).join(" ")}
              stroke={series.color}
              strokeDasharray={series.dash}
            />
            {series.points.map((value, index) => value === null ? null : (
              <circle key={`${series.label}-${index}`} cx={xFor(index)} cy={yFor(value)} r="6" fill={series.color}>
                <title>{`${chart.labels[index]} · ${series.label}: ${value}`}</title>
              </circle>
            ))}
          </g>
        ))}
        {chart.labels.map((label, index) => (
          <text key={label} className="bp-chart-axis" x={xFor(index)} y={height - 8} textAnchor="middle">{label}</text>
        ))}
      </svg>
      <div className="bp-chart-legend">
        {legendItems(chart).map((series) => (
          <span key={`${series.label}-${series.color}`} title={series.label} aria-label={series.label}><i style={{ background: series.color }} />{series.label}</span>
        ))}
      </div>
    </div>
  );
}

function TrendListModal({
  title,
  chart,
  unit,
  onClose,
}: {
  title: string;
  chart: ReturnType<typeof buildTrendChart>;
  unit: string;
  onClose: () => void;
}) {
  return (
    <div className="bp-list-modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <section className="bp-list-modal">
        <div className="bp-list-modal-header">
          <h1>{title}</h1>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="bp-list-table">
          {chart.labels.map((label, index) => (
            <article className="bp-list-row" key={label}>
              <time>{label}</time>
              <div>
                {listItemsForDay(chart, index, unit).map((item) => (
                  <span key={`${label}-${item.label}-${item.color}`}>
                    <i style={{ background: item.color }} />
                    <strong>{item.label}</strong>
                    <em>{item.value}</em>
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function buildTrendChart(logs: BpLog[], days: number, mode: TrendMode, metric: TrendMetric) {
  const buckets = dayBuckets(logs, days);
  const byRound = (items: BpLog[], roundName: "morning" | "evening") => items.filter((log) =>
    log.measurement_context === "around_medication" &&
    (log.bp_medication_rounds?.name || "").toLowerCase().includes(roundName)
  );
  const colors = ["#b32923", "#1f6f8b", "#527145", "#6a328a", "#d97822", "#2b2119"];
  let series: TrendSeries[];

  const groupedSeries = (label: string, color: string, groups: BpLog[][]): TrendSeries[] => {
    if (metric === "pulse") {
      return [{ label, color, points: groups.map((items) => averagePulseValue(items)) }];
    }
    return [
      { label: `${label} SYS`, color, points: groups.map((items) => averageBpValue(items, "sys")) },
      { label: `${label} DIA`, color, dash: "10 8", points: groups.map((items) => averageBpValue(items, "dia")) },
    ];
  };

  if (mode === "morning_medication" || mode === "evening_medication") {
    const roundName = mode === "morning_medication" ? "morning" : "evening";
    const roundLabel = mode === "morning_medication" ? "Morning" : "Evening";
    series = [
      ...groupedSeries(
        `${roundLabel} before meds`,
        colors[0],
        buckets.map((bucket) => byRound(bucket.logs, roundName).filter((log) => log.medication_relation === "before")),
      ),
      ...groupedSeries(
        `${roundLabel} after meds`,
        colors[1],
        buckets.map((bucket) => byRound(bucket.logs, roundName).filter((log) => log.medication_relation === "after")),
      ),
    ];
  } else if (mode === "day_parts") {
    series = [
      ...groupedSeries("Morning avg", colors[0], buckets.map((bucket) => byRound(bucket.logs, "morning"))),
      ...groupedSeries("Noon", colors[2], buckets.map((bucket) => bucket.logs.filter((log) => log.measurement_context === "symptom_check"))),
      ...groupedSeries("Evening avg", colors[1], buckets.map((bucket) => byRound(bucket.logs, "evening"))),
    ];
  } else {
    series = metric === "pulse"
      ? [
          { label: "Daily max", color: colors[0], points: buckets.map((bucket) => pulseExtreme(bucket.logs, "max")) },
          { label: "Daily min", color: colors[2], points: buckets.map((bucket) => pulseExtreme(bucket.logs, "min")) },
        ]
      : [
          { label: "Daily max SYS", color: colors[0], points: buckets.map((bucket) => bpExtreme(bucket.logs, "sys", "max")) },
          { label: "Daily max DIA", color: colors[0], dash: "10 8", points: buckets.map((bucket) => bpExtreme(bucket.logs, "dia", "max")) },
          { label: "Daily min SYS", color: colors[2], points: buckets.map((bucket) => bpExtreme(bucket.logs, "sys", "min")) },
          { label: "Daily min DIA", color: colors[2], dash: "10 8", points: buckets.map((bucket) => bpExtreme(bucket.logs, "dia", "min")) },
        ];
  }

  return { labels: buckets.map((bucket) => bucket.label), series, metric };
}

function legendItems(chart: ReturnType<typeof buildTrendChart>) {
  if (chart.metric === "pulse") return chart.series;
  const seen = new Set<string>();
  return chart.series.flatMap((series) => {
    if (seen.has(series.color)) return [];
    seen.add(series.color);
    return [{ ...series, label: series.label.replace(/\s+(SYS|DIA)$/, "") }];
  });
}

function listItemsForDay(chart: ReturnType<typeof buildTrendChart>, index: number, unit: string) {
  if (chart.metric === "pulse") {
    return chart.series.map((series) => ({
      label: series.label,
      color: series.color,
      value: series.points[index] === null ? "-" : `${series.points[index]} ${unit}`,
    }));
  }

  const grouped = new Map<string, { label: string; color: string; sys: number | null; dia: number | null }>();
  chart.series.forEach((series) => {
    const label = series.label.replace(/\s+(SYS|DIA)$/, "");
    const current = grouped.get(series.color) || { label, color: series.color, sys: null, dia: null };
    if (series.label.endsWith(" SYS")) current.sys = series.points[index];
    if (series.label.endsWith(" DIA")) current.dia = series.points[index];
    grouped.set(series.color, current);
  });

  return Array.from(grouped.values()).map((item) => ({
    label: item.label,
    color: item.color,
    value: item.sys === null || item.dia === null ? "-" : `${item.sys}/${item.dia} ${unit}`,
  }));
}

function dayBuckets(logs: BpLog[], days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = date.toDateString();
    return {
      key,
      label: date.toLocaleDateString("en-GB", { day: "numeric", month: "numeric" }),
      logs: logs.filter((log) => new Date(log.measured_at).toDateString() === key),
    };
  });
}

function averagePulseValue(logs: BpLog[]) {
  if (logs.length === 0) return null;
  return Math.round(logs.reduce((sum, log) => sum + Number(log.avg_pulse), 0) / logs.length);
}

function averageBpValue(logs: BpLog[], field: "sys" | "dia") {
  if (logs.length === 0) return null;
  const key = field === "sys" ? "avg_sys" : "avg_dia";
  return Math.round(logs.reduce((sum, log) => sum + Number(log[key]), 0) / logs.length);
}

function pulseExtreme(logs: BpLog[], kind: "max" | "min") {
  if (logs.length === 0) return null;
  const values = logs.map((log) => log.avg_pulse);
  return kind === "max" ? Math.max(...values) : Math.min(...values);
}

function bpExtreme(logs: BpLog[], field: "sys" | "dia", kind: "max" | "min") {
  if (logs.length === 0) return null;
  const values = logs.map((log) => field === "sys" ? log.avg_sys : log.avg_dia);
  return kind === "max" ? Math.max(...values) : Math.min(...values);
}

function LogView(props: {
  data: BloodPressureData;
  form: ReturnType<typeof defaultBpForm>;
  savedLog: BpLog | null;
  showBp3Suggestion: boolean;
  saving: boolean;
  editing: boolean;
  setForm: (form: ReturnType<typeof defaultBpForm>) => void;
  setMeasuredAt: (value: string) => void;
  submit: () => void;
  editSaved: () => void;
  addAnother: () => void;
  done: () => void;
}) {
  const { data, form, savedLog, showBp3Suggestion, saving, editing, setForm, setMeasuredAt, submit } = props;
  if (savedLog) {
    return <SavedSummary log={savedLog} onEdit={props.editSaved} onAddAnother={props.addAnother} onDone={props.done} />;
  }
  const aroundMedication = form.measurementContext === "around_medication";
  return (
    <section className="retro-panel bp-form-panel">
      <h1>{editing ? "Edit BP Log" : "Log BP"}</h1>
      <label className="field compact-field no-icon">
        <span>Measured at</span>
        <div><input type="datetime-local" value={form.measuredAt} onChange={(event) => setMeasuredAt(event.target.value)} /></div>
      </label>

      <div className="bp-choice-group">
        <span>Why are you measuring?</span>
        {(["around_medication", "symptom_check"] as BpMeasurementContext[]).map((value) => (
          <button key={value} className={form.measurementContext === value ? "active" : ""} onClick={() => setForm({
            ...form,
            measurementContext: value,
            medicationRoundId: value === "around_medication" ? autoRoundId(form.measuredAt, data.rounds.filter((round) => round.is_active)) : "",
            medicationRelation: null,
          })}>{contextLabel(value)}</button>
        ))}
      </div>

      {aroundMedication && (
        <div className="bp-form-grid">
          <label className="field compact-field no-icon">
            <span>Medication Round</span>
            <div>
              <select value={form.medicationRoundId} onChange={(event) => setForm({ ...form, medicationRoundId: event.target.value })}>
                <option value="">Select round</option>
                {data.rounds.filter((round) => round.is_active).map((round) => (
                  <option key={round.id} value={round.id}>{round.name}</option>
                ))}
              </select>
            </div>
          </label>
          <div className="bp-choice-group inline">
            <span>Medication Relation</span>
            {(["before", "after"] as BpMedicationRelation[]).map((value) => (
              <button key={value} className={form.medicationRelation === value ? "active" : ""} onClick={() => setForm({ ...form, medicationRelation: value })}>{value === "before" ? "Before Medication" : "After Medication"}</button>
            ))}
          </div>
        </div>
      )}

      <BpInputGroup label="BP1 *" value={form.bp1} onChange={(bp1) => setForm({ ...form, bp1 })} />
      <BpInputGroup label="BP2 optional" value={form.bp2} onChange={(bp2) => setForm({ ...form, bp2 })} />
      {showBp3Suggestion && <p className="hint">The first two readings differ by more than 5 mmHg. Please rest 1 minute and consider taking a third reading.</p>}
      {(showBp3Suggestion || isAnyBpFilled(form.bp3)) && <BpInputGroup label="BP3 optional" value={form.bp3} onChange={(bp3) => setForm({ ...form, bp3 })} />}

      <section className="bp-symptom-panel">
        <h2>Symptoms</h2>
        <div className="bp-chip-grid">
          {symptomOptions.map((symptom) => (
            <button key={symptom} className={form.symptoms.includes(symptom) ? "active" : ""} onClick={() => setForm({
              ...form,
              symptoms: form.symptoms.includes(symptom)
                ? form.symptoms.filter((item) => item !== symptom)
                : [...form.symptoms, symptom],
            })}>{symptom}</button>
          ))}
        </div>
        {form.symptoms.includes("Other") && (
          <label className="field compact-field">
            <span>Other symptom</span>
            <div><input value={form.otherSymptom} onChange={(event) => setForm({ ...form, otherSymptom: event.target.value })} /></div>
          </label>
        )}
      </section>

      <label className="field compact-field no-icon">
        <span>Note</span>
        <div><input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="optional" /></div>
      </label>
      <button className="primary wide" disabled={saving} onClick={submit}><Save /> {saving ? "Saving..." : "Save"}</button>
    </section>
  );
}

function ReportView({ data, onEdit }: { data: BloodPressureData; onEdit: (log: BpLog) => void }) {
  const [period, setPeriod] = useState(14);
  const logs = filterDays(data.logs, period);
  return (
    <div className="bp-layout">
      <section className="bp-main">
        <section className="retro-panel bp-report-panel">
          <h1>BP Report</h1>
          <div className="tabs">
            {[7, 14, 30].map((days) => <button key={days} className={period === days ? "active" : ""} onClick={() => setPeriod(days)}>{days} days</button>)}
          </div>
          <MiniTrend logs={logs} rounds={data.rounds.filter((round) => round.is_active)} />
          <div className="bp-average-grid">
            <AverageBlock title="Overall average" average={averageLogs(logs)} count={logs.length} />
            <AverageBlock title="Before Medication" average={averageLogs(logs.filter((log) => log.medication_relation === "before"))} count={logs.filter((log) => log.medication_relation === "before").length} />
            <AverageBlock title="After Medication" average={averageLogs(logs.filter((log) => log.medication_relation === "after"))} count={logs.filter((log) => log.medication_relation === "after").length} />
          </div>
          <p className="hint">High variation logs: {logs.filter((log) => log.reading_quality === "high_variation").length}</p>
        </section>
      </section>
      <section className="bp-history">
        <h1>Logs</h1>
        <LogList logs={logs} onEdit={onEdit} />
      </section>
    </div>
  );
}

function BpInputGroup({ label, value, onChange }: { label: string; value: BpFields; onChange: (value: BpFields) => void }) {
  return (
    <section className="bp-input-group">
      <h2>{label}</h2>
      <div className="bp-input-row">
        <NumericField label="SYS" value={value.sys} onChange={(sys) => onChange({ ...value, sys })} warn={isUnusual(value.sys, 70, 250)} />
        <NumericField label="DIA" value={value.dia} onChange={(dia) => onChange({ ...value, dia })} warn={isUnusual(value.dia, 40, 150)} />
        <NumericField label="Pulse" value={value.pulse} onChange={(pulse) => onChange({ ...value, pulse })} warn={isUnusual(value.pulse, 30, 200)} />
      </div>
    </section>
  );
}

function NumericField({ label, value, onChange, warn }: { label: string; value: string; onChange: (value: string) => void; warn: boolean }) {
  return (
    <label className="field compact-field no-icon">
      <span>{label}</span>
      <div><input inputMode="numeric" value={value} onChange={(event) => onChange(digitsOnly(event.target.value, 3))} /></div>
      {warn && <small className="bp-warning">This value looks unusual. Please check again.</small>}
    </label>
  );
}

function SavedSummary({ log, onEdit, onAddAnother, onDone }: { log: BpLog; onEdit: () => void; onAddAnother: () => void; onDone: () => void }) {
  return (
    <section className="retro-panel bp-form-panel">
      <h1>BP Log Saved</h1>
      <SummaryLine label="Measured at" value={formatDateTime(log.measured_at)} />
      <SummaryLine label="Context" value={contextLabel(log.measurement_context)} />
      {log.bp_medication_rounds && <SummaryLine label="Medication Round" value={log.bp_medication_rounds.name} />}
      {log.medication_relation && <SummaryLine label="Relation" value={log.medication_relation === "before" ? "Before Medication" : "After Medication"} />}
      <SummaryLine label="Average BP" value={`${log.avg_sys}/${log.avg_dia} mmHg · Pulse ${log.avg_pulse} bpm`} />
      <SummaryLine label="Calculated from" value={averageSourceText(log.average_source)} />
      <SummaryLine label="Readings" value={rawReadingsText(log)} />
      <SummaryLine label="Symptoms" value={symptomsText(log)} />
      <SummaryLine label="Note" value={log.note || "-"} />
      <div className="bp-dashboard-actions">
        <button className="secondary" onClick={onEdit}><Pencil /> Edit</button>
        <button className="secondary" onClick={onAddAnother}><ClipboardPlus /> Add another BP log</button>
        <button className="primary" onClick={onDone}>Done</button>
      </div>
    </section>
  );
}

function LogList({ logs, onEdit }: { logs: BpLog[]; onEdit: (log: BpLog) => void }) {
  if (logs.length === 0) return <section className="retro-panel center-panel"><Heart /><h2>No BP logs yet</h2></section>;
  return (
    <div className="bp-reading-list">
      {logs.map((log) => (
        <article className="bp-reading-card" key={log.id}>
          <div><strong>{log.avg_sys}/{log.avg_dia}</strong><span>mmHg · Pulse {log.avg_pulse} bpm</span></div>
          <p>{formatDateTime(log.measured_at)} · {contextText(log)}</p>
          <p>Calculated from {averageSourceText(log.average_source)}</p>
          <button className="secondary" onClick={() => onEdit(log)}><Pencil /> Edit</button>
        </article>
      ))}
    </div>
  );
}

function AverageBlock({ title, average, count }: { title: string; average: BpAverage | null; count: number }) {
  return (
    <div className="bp-average-block">
      <small>{title}</small>
      <strong>{average ? `${average.sys}/${average.dia} mmHg` : count === 0 ? "No data" : "Not enough data"}</strong>
      <span>{average ? `Pulse ${average.pulse} bpm · Based on ${average.count} logs` : count === 0 ? "No logs" : "At least 3 logs required"}</span>
    </div>
  );
}

function MiniTrend({ logs, rounds }: { logs: BpLog[]; rounds: BloodPressureData["rounds"] }) {
  const points = rounds.map((round) => {
    const roundLogs = logs.filter((log) => log.medication_round_id === round.id && log.measurement_context === "around_medication");
    return { round, average: averageLogs(roundLogs), count: roundLogs.length };
  });
  return (
    <div className="bp-mini-trend">
      {points.map((point) => (
        <div className="bp-trend-line" key={point.round.id}>
          <span>{point.round.name}</span>
          <div><i style={{ width: `${Math.min(100, point.average ? Math.max(10, point.average.sys - 80) : 8)}%` }} /></div>
          <strong>{point.average ? `${point.average.sys}/${point.average.dia}` : point.count ? "Not enough data" : "No data"}</strong>
        </div>
      ))}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <p className="bp-summary-line"><strong>{label}:</strong> {value}</p>;
}

function defaultBpForm(data?: BloodPressureData | null) {
  const measuredAt = toDateTimeLocal(new Date().toISOString());
  return {
    measuredAt,
    measurementContext: "around_medication" as BpMeasurementContext,
    medicationRoundId: data ? autoRoundId(measuredAt, data.rounds.filter((round) => round.is_active)) : "",
    medicationRelation: null as BpMedicationRelation | null,
    bp1: { sys: "", dia: "", pulse: "" },
    bp2: { sys: "", dia: "", pulse: "" },
    bp3: { sys: "", dia: "", pulse: "" },
    symptoms: [] as string[],
    otherSymptom: "",
    note: "",
  };
}

function formFromLog(log: BpLog) {
  return {
    measuredAt: toDateTimeLocal(log.measured_at),
    measurementContext: log.measurement_context,
    medicationRoundId: log.medication_round_id || "",
    medicationRelation: log.medication_relation,
    bp1: { sys: String(log.bp1_sys), dia: String(log.bp1_dia), pulse: String(log.bp1_pulse) },
    bp2: { sys: log.bp2_sys ? String(log.bp2_sys) : "", dia: log.bp2_dia ? String(log.bp2_dia) : "", pulse: log.bp2_pulse ? String(log.bp2_pulse) : "" },
    bp3: { sys: log.bp3_sys ? String(log.bp3_sys) : "", dia: log.bp3_dia ? String(log.bp3_dia) : "", pulse: log.bp3_pulse ? String(log.bp3_pulse) : "" },
    symptoms: [...(log.symptoms || []), ...(log.other_symptom ? ["Other"] : [])],
    otherSymptom: log.other_symptom || "",
    note: log.note || "",
  };
}

function autoRoundId(value: string, rounds: BloodPressureData["rounds"]) {
  const measured = new Date(value);
  if (Number.isNaN(measured.getTime())) return "";
  let best = { id: "", diff: Infinity };
  rounds.forEach((round) => {
    const [hours, minutes] = round.usual_time.split(":").map(Number);
    const target = new Date(measured);
    target.setHours(hours, minutes || 0, 0, 0);
    const diff = Math.abs(target.getTime() - measured.getTime());
    if (diff <= 4 * 60 * 60 * 1000 && diff < best.diff) best = { id: round.id, diff };
  });
  return best.id;
}

function toBpInput(value: BpFields) {
  return { sys: Number(value.sys), dia: Number(value.dia), pulse: Number(value.pulse) };
}

function isCompleteBp(value: BpFields) {
  return Boolean(value.sys && value.dia && value.pulse);
}

function isAnyBpFilled(value: BpFields) {
  return Boolean(value.sys || value.dia || value.pulse);
}

function hasHighVariation(bp1: BpFields, bp2: BpFields) {
  if (!isCompleteBp(bp1) || !isCompleteBp(bp2)) return false;
  return Math.abs(Number(bp1.sys) - Number(bp2.sys)) > 5 || Math.abs(Number(bp1.dia) - Number(bp2.dia)) > 5;
}

function averageLogs(logs: BpLog[]): BpAverage | null {
  if (logs.length < 3) return null;
  return {
    sys: Math.round(logs.reduce((sum, log) => sum + log.avg_sys, 0) / logs.length),
    dia: Math.round(logs.reduce((sum, log) => sum + log.avg_dia, 0) / logs.length),
    pulse: Math.round(logs.reduce((sum, log) => sum + log.avg_pulse, 0) / logs.length),
    count: logs.length,
  };
}

function filterDays(logs: BpLog[], days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return logs.filter((log) => new Date(log.measured_at) >= since);
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function digitsOnly(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function isUnusual(value: string, min: number, max: number) {
  if (!value) return false;
  const parsed = Number(value);
  return parsed < min || parsed > max;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  const today = new Date();
  const day = date.toDateString() === today.toDateString()
    ? "Today"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${day}, ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}

function contextLabel(value: BpMeasurementContext) {
  if (value === "around_medication") return "Around Medication";
  if (value === "symptom_check") return "Symptom Check";
  return "General Check";
}

function contextText(log: BpLog) {
  if (log.measurement_context !== "around_medication") return contextLabel(log.measurement_context);
  const round = log.bp_medication_rounds?.name || "Medication";
  const relation = log.medication_relation === "before" ? "Before Medication" : "After Medication";
  return `${round} · ${relation}`;
}

function averageSourceText(value: BpLog["average_source"]) {
  if (value === "bp1_bp2") return "BP1 + BP2";
  if (value === "bp2_bp3") return "BP2 + BP3";
  return "BP1";
}

function rawReadingsText(log: BpLog) {
  return [
    `BP1: ${log.bp1_sys}/${log.bp1_dia}, Pulse ${log.bp1_pulse}`,
    log.bp2_sys ? `BP2: ${log.bp2_sys}/${log.bp2_dia}, Pulse ${log.bp2_pulse}` : "BP2: -",
    log.bp3_sys ? `BP3: ${log.bp3_sys}/${log.bp3_dia}, Pulse ${log.bp3_pulse}` : "BP3: -",
  ].join(" · ");
}

function symptomsText(log: BpLog) {
  const symptoms = [...(log.symptoms || []), ...(log.other_symptom ? [log.other_symptom] : [])];
  return symptoms.length ? symptoms.join(", ") : "-";
}
