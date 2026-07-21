"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ClipboardPlus,
  Heart,
  Info,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type React from "react";
import {
  deleteBloodPressureReading,
  loadBloodPressurePeriodLogs,
  loadRecentBloodPressureLogs,
  loadBloodPressureData,
  saveBloodPressureReading,
  saveSimpleBloodPressureReading,
  type SimpleBloodPressureLog,
  updateSimpleBloodPressureReading,
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
  const [recentLogs, setRecentLogs] = useState<SimpleBloodPressureLog[]>([]);
  const [selectedRecentLog, setSelectedRecentLog] = useState<SimpleBloodPressureLog | null>(null);
  const [selectedReadingDate, setSelectedReadingDate] = useState(todayDateInput());
  const [readingsLoading, setReadingsLoading] = useState(true);
  const [summaryDays, setSummaryDays] = useState<7 | 15 | 30>(7);
  const [summaryLogs, setSummaryLogs] = useState<SimpleBloodPressureLog[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const summaryRequestId = useRef(0);

  const refreshRecentLogs = async (date = selectedReadingDate) => {
    setReadingsLoading(true);
    try {
      setRecentLogs(await loadRecentBloodPressureLogs(date));
    } catch {
      setRecentLogs([]);
    } finally {
      setReadingsLoading(false);
    }
  };

  useEffect(() => { void refreshRecentLogs(selectedReadingDate); }, [selectedReadingDate]);

  const refreshSummaryLogs = async (days = summaryDays) => {
    const requestId = ++summaryRequestId.current;
    setSummaryLoading(true);
    try {
      const logs = await loadBloodPressurePeriodLogs(days);
      if (requestId === summaryRequestId.current) setSummaryLogs(logs);
    } catch {
      if (requestId === summaryRequestId.current) setSummaryLogs([]);
    } finally {
      if (requestId === summaryRequestId.current) setSummaryLoading(false);
    }
  };

  useEffect(() => { void refreshSummaryLogs(summaryDays); }, [summaryDays]);

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
    const roundId = form.measurementContext === "around_medication" || form.measurementContext === "symptom_check"
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
        medicationRoundId: form.measurementContext === "around_medication" || form.measurementContext === "symptom_check" ? form.medicationRoundId : null,
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
      <div className={`launcher-app bp-app ${view === "dashboard" ? "bp-dashboard-app" : ""}`}>
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

        {view === "dashboard" && <Dashboard
          logs={recentLogs}
          selectedDate={selectedReadingDate}
          loading={readingsLoading}
          onDateChange={setSelectedReadingDate}
          summaryDays={summaryDays}
          summaryLogs={summaryLogs}
          summaryLoading={summaryLoading}
          onSummaryDaysChange={setSummaryDays}
          onLog={() => router.push("/bp/log")}
          onSelect={setSelectedRecentLog}
        />}

        {view === "log" && (
          <LogView
            initialMeasuredAt={form.measuredAt}
            onSaved={async () => {
              await Promise.all([refreshRecentLogs(), refreshSummaryLogs()]);
              router.replace("/bp");
            }}
          />
        )}

        {data && view === "report" && <ReportView data={data} onEdit={editLog} />}

        {selectedRecentLog && <RecentLogModal
          log={selectedRecentLog}
          onClose={() => setSelectedRecentLog(null)}
          onSaved={async () => {
            await Promise.all([refreshRecentLogs(), refreshSummaryLogs()]);
            setSelectedRecentLog(null);
          }}
        />}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </main>
  );
}

function Dashboard({
  logs,
  selectedDate,
  loading,
  onDateChange,
  summaryDays,
  summaryLogs,
  summaryLoading,
  onSummaryDaysChange,
  onLog,
  onSelect,
}: {
  logs: SimpleBloodPressureLog[];
  selectedDate: string;
  loading: boolean;
  onDateChange: (date: string) => void;
  summaryDays: 7 | 15 | 30;
  summaryLogs: SimpleBloodPressureLog[];
  summaryLoading: boolean;
  onSummaryDaysChange: (days: 7 | 15 | 30) => void;
  onLog: () => void;
  onSelect: (log: SimpleBloodPressureLog) => void;
}) {
  return (
    <>
      <div className="bp-top-actions">
        <button className="primary wide" onClick={onLog}><Plus /> Log BP</button>
      </div>
      <PeriodSummary
        days={summaryDays}
        logs={summaryLogs}
        loading={summaryLoading}
        onDaysChange={onSummaryDaysChange}
      />
      <section className="retro-panel bp-recent-panel">
        <div className="bp-readings-heading">
          <div><h1>Daily readings</h1></div>
          <label className="bp-reading-date"><span>Date</span><input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} /></label>
        </div>
        {loading ? <p>Loading readings...</p> : logs.length === 0 ? <p>No blood pressure readings for this day.</p> : <div className="bp-recent-list">
          {logs.map((log) => <button key={log.id} className="bp-recent-row" onClick={() => onSelect(log)}>
            <div className="bp-recent-copy">
              <div className="bp-recent-meta"><span>{measurementRoundLabel(log.measurement_round)}</span><time>{formatReadingTime(log.measured_at)}</time></div>
              <strong>{log.sys}/{log.dia} mmHg · {log.pulse} bpm</strong>
            </div>
          </button>)}
        </div>}
      </section>
    </>
  );
}

const summaryRounds: { value: SimpleBloodPressureLog["measurement_round"]; label: string }[] = [
  { value: "morning_before_medication", label: "Morning before medication" },
  { value: "morning_after_medication", label: "Morning after medication" },
  { value: "noon", label: "Noon" },
  { value: "evening_before_medication", label: "Evening before medication" },
  { value: "evening_after_medication", label: "Evening after medication" },
  { value: "bedtime", label: "Before bed" },
];

function PeriodSummary({
  days,
  logs,
  loading,
  onDaysChange,
}: {
  days: 7 | 15 | 30;
  logs: SimpleBloodPressureLog[];
  loading: boolean;
  onDaysChange: (days: 7 | 15 | 30) => void;
}) {
  const [detail, setDetail] = useState<{ label: string; logs: SimpleBloodPressureLog[] } | null>(null);

  return (
    <section className="retro-panel bp-period-summary">
      <div className="bp-period-heading">
        <div><h1>BP summary</h1></div>
        <div className="bp-period-picker" aria-label="Summary period">
          {([7, 15, 30] as const).map((value) => <button key={value} className={days === value ? "active" : ""} onClick={() => onDaysChange(value)}>{value} days</button>)}
        </div>
      </div>
      {loading ? <p className="bp-period-status">Loading summary...</p> : <div className="bp-summary-grid">
        {summaryRounds.map((round) => {
          const roundLogs = logs.filter((log) => log.measurement_round === round.value);
          return <RoundSummaryCard key={round.value} label={round.label} logs={roundLogs} onOpen={() => setDetail({ label: round.label, logs: roundLogs })} />;
        })}
      </div>}
      {detail && <RoundSummaryDetail label={detail.label} logs={detail.logs} onClose={() => setDetail(null)} />}
    </section>
  );
}

function RoundSummaryCard({ label, logs, onOpen }: { label: string; logs: SimpleBloodPressureLog[]; onOpen: () => void }) {
  if (logs.length === 0) return <article className="bp-round-summary bp-round-summary-empty"><h2>{label}</h2><p>No readings</p></article>;

  const average = (field: "sys" | "dia" | "pulse") => Math.round(logs.reduce((sum, log) => sum + log[field], 0) / logs.length);
  const range = (field: "sys" | "dia" | "pulse") => ({
    low: Math.min(...logs.map((log) => log[field])),
    high: Math.max(...logs.map((log) => log[field])),
  });
  const sys = range("sys");
  const dia = range("dia");
  const pulse = range("pulse");

  return <button className="bp-round-summary bp-round-summary-button" onClick={onOpen} aria-label={`View details for ${label}`}>
    <h2>{label}</h2>
    <div className="bp-round-summary-value"><strong>{average("sys")}/{average("dia")} mmHg · {average("pulse")} bpm</strong></div>
    <div><span>Highest / lowest</span><strong>{sys.high}/{dia.high} – {sys.low}/{dia.low} <em>mmHg</em></strong><b>Pulse {pulse.high} – {pulse.low} bpm</b></div>
  </button>;
}

function RoundSummaryDetail({ label, logs, onClose }: { label: string; logs: SimpleBloodPressureLog[]; onClose: () => void }) {
  const range = (field: "sys" | "dia" | "pulse") => ({
    low: Math.min(...logs.map((log) => log[field])),
    high: Math.max(...logs.map((log) => log[field])),
  });
  const lowestBloodPressure = logs.reduce((lowest, log) => log.sys < lowest.sys ? log : lowest);
  const highestBloodPressure = logs.reduce((highest, log) => log.sys > highest.sys ? log : highest);
  const sys = range("sys");
  const dia = range("dia");
  const pulse = range("pulse");

  return <div className="bp-list-modal-backdrop" role="dialog" aria-modal="true" aria-label={`${label} details`}>
    <section className="bp-list-modal bp-round-detail-modal">
      <div className="bp-list-modal-header"><h1>{label}</h1><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>
      <p>{logs.length} reading{logs.length === 1 ? "" : "s"} in this period</p>
      <div className="bp-round-detail-values">
        <div className="bp-round-detail-current"><span>Blood pressure</span><strong>{lowestBloodPressure.sys}/{lowestBloodPressure.dia} – {highestBloodPressure.sys}/{highestBloodPressure.dia}</strong><small>Lowest / highest mmHg (based on SYS)</small></div>
        <div className="bp-round-detail-current"><span>Pulse</span><strong>{pulse.low} – {pulse.high}</strong><small>Lowest / highest bpm</small></div>
        <div><span>Blood pressure</span><strong>{sys.high}/{dia.high} – {sys.low}/{dia.low}</strong><small>Highest / lowest mmHg</small></div>
        <div><span>Pulse</span><strong>{pulse.high} – {pulse.low}</strong><small>Highest / lowest bpm</small></div>
      </div>
    </section>
  </div>;
}

function RecentLogModal({ log, onClose, onSaved }: { log: SimpleBloodPressureLog; onClose: () => void; onSaved: () => Promise<void> }) {
  const [measuredAt, setMeasuredAt] = useState(toDateTimeLocal(log.measured_at));
  const [measurementRound, setMeasurementRound] = useState<SimpleBloodPressureLog["measurement_round"]>(log.measurement_round);
  const [sys, setSys] = useState(String(log.sys));
  const [dia, setDia] = useState(String(log.dia));
  const [pulse, setPulse] = useState(String(log.pulse));
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    if (!sys || !dia || !pulse) return setMessage("Please enter SYS, DIA, and Pulse.");
    setWorking(true);
    setMessage(null);
    try {
      await updateSimpleBloodPressureReading({ id: log.id, measuredAt, measurementRound, sys: Number(sys), dia: Number(dia), pulse: Number(pulse) });
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to update this reading.");
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setWorking(true);
    setMessage(null);
    try {
      await deleteBloodPressureReading(log.id);
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete this reading.");
    } finally {
      setWorking(false);
    }
  };

  return <>
    <div className="bp-list-modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit blood pressure reading">
      <section className="bp-list-modal bp-edit-modal">
        <div className="bp-list-modal-header"><h1>Edit BP reading</h1><button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button></div>
        <label className="bp-simple-field"><span>Date & time</span><input type="datetime-local" value={measuredAt} onChange={(event) => setMeasuredAt(event.target.value)} /></label>
        <label className="bp-simple-field"><span>Measurement round</span><select value={measurementRound} onChange={(event) => setMeasurementRound(event.target.value as SimpleBloodPressureLog["measurement_round"])}>{measurementRounds.map((round) => <option key={round.value} value={round.value}>{round.label}</option>)}</select></label>
        <div className="bp-modal-values">
          <label><span>SYS</span><input inputMode="numeric" value={sys} onChange={(event) => setSys(digitsOnly(event.target.value, 3))} /></label>
          <label><span>DIA</span><input inputMode="numeric" value={dia} onChange={(event) => setDia(digitsOnly(event.target.value, 3))} /></label>
          <label><span>Pulse</span><input inputMode="numeric" value={pulse} onChange={(event) => setPulse(digitsOnly(event.target.value, 3))} /></label>
        </div>
        {message && <p className="bp-simple-status" role="status">{message}</p>}
        <div className="bp-modal-actions"><button className="secondary" disabled={working} onClick={() => setConfirmDelete(true)}><Trash2 /> Delete</button><button className="primary" disabled={working} onClick={save}><Save /> Save</button></div>
      </section>
    </div>
    {confirmDelete && <BpDeleteConfirm log={log} working={working} onCancel={() => setConfirmDelete(false)} onConfirm={remove} />}
  </>;
}

function BpDeleteConfirm({ log, working, onCancel, onConfirm }: { log: SimpleBloodPressureLog; working: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="bp-delete-confirm-backdrop" role="alertdialog" aria-modal="true" aria-labelledby="bp-delete-title" aria-describedby="bp-delete-description">
    <section className="bp-delete-confirm">
      <div className="bp-delete-confirm-icon"><AlertTriangle /></div>
      <div><h1 id="bp-delete-title">Delete BP reading?</h1><p id="bp-delete-description">This reading will be permanently removed and the BP Summary will be recalculated.</p></div>
      <div className="bp-delete-reading">
        <span>{measurementRoundLabel(log.measurement_round)} · {formatReadingTime(log.measured_at)}</span>
        <strong>{log.sys}/{log.dia} mmHg · {log.pulse} bpm</strong>
      </div>
      <div className="bp-delete-confirm-actions"><button className="secondary" disabled={working} onClick={onCancel}>Cancel</button><button className="bp-confirm-delete-button" disabled={working} onClick={onConfirm}><Trash2 /> {working ? "Deleting..." : "Delete reading"}</button></div>
    </section>
  </div>;
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
  const noonSymptomLogs = (items: BpLog[]) => items.filter((log) =>
    log.measurement_context === "symptom_check" &&
    (log.bp_medication_rounds?.name || "").toLowerCase().includes("noon")
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
      ...groupedSeries("Noon", colors[2], buckets.map((bucket) => noonSymptomLogs(bucket.logs))),
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

const measurementRounds = [
  { value: "morning_before_medication", label: "Morning before medication" },
  { value: "morning_after_medication", label: "Morning after medication" },
  { value: "noon", label: "Noon" },
  { value: "evening_before_medication", label: "Evening before medication" },
  { value: "evening_after_medication", label: "Evening after medication" },
  { value: "bedtime", label: "Before bed" },
] as const;

function LogView({ initialMeasuredAt, onSaved }: { initialMeasuredAt: string; onSaved: () => Promise<void> }) {
  const [measuredAt, setMeasuredAt] = useState(initialMeasuredAt);
  const [measurementRound, setMeasurementRound] = useState<typeof measurementRounds[number]["value"] | "">("");
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const save = async () => {
    if (!measurementRound || !sys || !dia || !pulse) {
      setStatus("Please complete all fields.");
      return;
    }
    setSavingLog(true);
    setStatus(null);
    try {
      await saveSimpleBloodPressureReading({
        measuredAt,
        measurementRound,
        sys: Number(sys),
        dia: Number(dia),
        pulse: Number(pulse),
      });
      await onSaved();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save this reading.");
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <section className="retro-panel bp-simple-log-panel">
      <div className="bp-simple-log-heading">
        <span>Blood Pressure</span>
        <h1>Log blood pressure</h1>
      </div>

      <label className="bp-simple-field">
        <span>Date & time</span>
        <input type="datetime-local" value={measuredAt} onChange={(event) => setMeasuredAt(event.target.value)} aria-label="Date and time" />
      </label>

      <label className="bp-simple-field">
        <span>Measurement round</span>
        <select value={measurementRound} onChange={(event) => setMeasurementRound(event.target.value as typeof measurementRound)}>
          <option value="" disabled>Select a measurement round</option>
          {measurementRounds.map((round) => <option key={round.value} value={round.value}>{round.label}</option>)}
        </select>
      </label>

      <fieldset className="bp-simple-readings">
        <legend>Reading</legend>
        <div>
          <label><span>SYS</span><input inputMode="numeric" value={sys} onChange={(event) => setSys(digitsOnly(event.target.value, 3))} placeholder="120" aria-label="SYS" /><small>mmHg</small></label>
          <i aria-hidden="true">/</i>
          <label><span>DIA</span><input inputMode="numeric" value={dia} onChange={(event) => setDia(digitsOnly(event.target.value, 3))} placeholder="80" aria-label="DIA" /><small>mmHg</small></label>
          <label className="bp-pulse-field"><span>Pulse</span><input inputMode="numeric" value={pulse} onChange={(event) => setPulse(digitsOnly(event.target.value, 3))} placeholder="72" aria-label="Pulse" /><small>bpm</small></label>
        </div>
      </fieldset>

      {status && <p className="bp-simple-status" role="status">{status}</p>}
      <button type="button" className="primary wide bp-simple-save" disabled={savingLog} onClick={save}><Save /> {savingLog ? "SAVING..." : "SAVE"}</button>
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
  return `${day}, ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" })}`;
}

function formatReadingTime(value: string) {
  return new Date(value).toLocaleTimeString("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function measurementRoundLabel(value: SimpleBloodPressureLog["measurement_round"]) {
  return summaryRounds.find((round) => round.value === value)?.label || "Measurement";
}

function todayDateInput() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
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
