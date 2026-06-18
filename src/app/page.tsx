"use client";

import {
  ArrowLeft,
  BadgePlus,
  Box,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Edit3,
  History,
  Home,
  Lock,
  LogOut,
  PackagePlus,
  Pill,
  RotateCcw,
  Save,
  Settings,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import {
  addStockLot,
  loadAppData,
  saveMedication,
  saveSettings,
  softDeleteMedication,
  updateLotsForRecount,
} from "@/lib/data";
import {
  compactNumber,
  formatExpiry,
  lotStatus,
  money,
  sortSummariesForHome,
  summarizeMedication,
  validateExpiryInput,
} from "@/lib/stock";
import type { AppData, Medication, MedicationSummary, StatusBadge, StockHistory } from "@/lib/types";

type Screen = "home" | "detail" | "history" | "settings" | "edit" | "changePin";

const badgeClass: Record<StatusBadge["kind"], string> = {
  no_stock: "badge danger",
  runs_out_today: "badge warning",
  low_stock: "badge warning",
  expired_lot: "badge purple",
  expiring_lot: "badge danger",
  in_stock: "badge good",
};

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [screen, setScreen] = useState<Screen>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stockId, setStockId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loadAppData());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load app data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch("/api/auth/session")
      .then((response) => response.json())
      .then((result: { authenticated?: boolean }) => setLoggedIn(Boolean(result.authenticated)))
      .catch(() => setLoggedIn(false));
    refresh();
  }, []);

  const summaries = useMemo(() => {
    if (!data) return [];
    return sortSummariesForHome(
      data.medications.map((med) => summarizeMedication(med, data.stockLots, data.stockHistory, data.settings)),
    );
  }, [data]);

  const selected = summaries.find((item) => item.medication.id === selectedId) || summaries[0] || null;
  const stockTarget = summaries.find((item) => item.medication.id === stockId) || null;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  if (!loggedIn) {
    return (
      <DeviceFrame>
        <PinLogin
          onSuccess={() => {
            setLoggedIn(true);
            refresh();
          }}
        />
      </DeviceFrame>
    );
  }

  return (
    <DeviceFrame>
      <Header
        mode={screen === "detail" || screen === "history" || screen === "settings" || screen === "edit" || screen === "changePin" ? "back" : "main"}
        onBack={() => setScreen(screen === "detail" || screen === "settings" ? "home" : "settings")}
        onHome={() => setScreen("home")}
        onHistory={() => setScreen("history")}
        onSettings={() => setScreen("settings")}
        showHomeAction={screen !== "settings"}
        title={screen === "settings" ? "Settings" : screen === "history" ? "History" : "ArtPillPlan"}
      />
      {loading && <Panel className="center-panel">Loading ArtPillPlan...</Panel>}
      {error && (
        <Panel className="center-panel">
          <ShieldAlert />
          <h2>Database setup needed</h2>
          <p>{error}</p>
          <p>Run the migration and seed SQL in the Supabase project, then reload.</p>
          <button className="primary wide" onClick={refresh}>Retry</button>
        </Panel>
      )}
      {data && !loading && !error && (
        <>
          {screen === "home" && (
            <HomeScreen
              summaries={summaries}
              onOpenDetail={(id) => {
                setSelectedId(id);
                setScreen("detail");
              }}
              onOpenStock={setStockId}
            />
          )}
          {screen === "detail" && selected && (
            <DetailScreen
              summary={selected}
              settings={data.settings}
              onEdit={() => setScreen("edit")}
              onStock={() => setStockId(selected.medication.id)}
            />
          )}
          {screen === "history" && <HistoryScreen data={data} />}
          {screen === "settings" && (
            <SettingsScreen
              data={data}
              onEditMedication={(id) => {
                setSelectedId(id);
                setScreen("edit");
              }}
              onAddMedication={() => {
                setSelectedId(null);
                setScreen("edit");
              }}
              onChangePin={() => setScreen("changePin")}
              onLogout={async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                setLoggedIn(false);
              }}
              onRefresh={refresh}
              showToast={showToast}
            />
          )}
          {screen === "edit" && (
            <EditMedicationScreen
              medication={selectedId ? data.medications.find((med) => med.id === selectedId) || null : null}
              onCancel={() => setScreen("settings")}
              onSaved={async (message) => {
                showToast(message);
                await refresh();
                setScreen("settings");
              }}
            />
          )}
          {screen === "changePin" && (
            <ChangePinScreen
              settings={data.settings}
              onSaved={async () => {
                showToast("PIN saved");
                await refresh();
                setScreen("settings");
              }}
            />
          )}
        </>
      )}
      {stockTarget && data && (
        <StockModal
          summary={stockTarget}
          onClose={() => setStockId(null)}
          onSaved={async (message) => {
            setStockId(null);
            showToast(message);
            await refresh();
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </DeviceFrame>
  );
}

function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="page-shell">
      <div className="mobile-shell">
        <div className="app">{children}</div>
      </div>
      <div className="desktop-unsupported">
        <Logo />
        <Wordmark />
        <Panel className="unsupported-panel">
          <h1>Mobile Only</h1>
          <p>ArtPillPlan is designed for mobile use only.</p>
          <p>Please open this app on a phone-width screen.</p>
        </Panel>
      </div>
    </main>
  );
}

function Logo() {
  return (
    <div className="logo-mark" aria-label="ArtPillPlan logo">
      <Pill size={34} />
    </div>
  );
}

function Wordmark({ children = "ArtPillPlan" }: { children?: React.ReactNode }) {
  return <div className="wordmark">{children}</div>;
}

function Header({
  mode,
  onBack,
  onHome,
  onHistory,
  onSettings,
  showHomeAction = true,
  title = "ArtPillPlan",
}: {
  mode: "main" | "back";
  onBack: () => void;
  onHome: () => void;
  onHistory: () => void;
  onSettings: () => void;
  showHomeAction?: boolean;
  title?: string;
}) {
  return (
    <header className="top-header">
      {mode === "back" ? (
        <button className="icon-btn" onClick={onBack} aria-label="Back"><ArrowLeft /></button>
      ) : (
        <Logo />
      )}
      <Wordmark>{title}</Wordmark>
      <div className="header-actions">
        {mode === "main" ? (
          <>
            <button className="icon-btn" onClick={onHistory} aria-label="History"><History /></button>
            <button className="icon-btn" onClick={onSettings} aria-label="Settings"><Settings /></button>
          </>
        ) : showHomeAction ? (
          <button className="icon-btn" onClick={onHome} aria-label="Home"><Home /></button>
        ) : null}
      </div>
    </header>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("retro-panel", className)}>{children}</section>;
}

function PinLogin({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [failed, setFailed] = useState(false);
  const [checking, setChecking] = useState(false);
  const push = (value: string) => {
    const next = (pin + value).slice(0, 4);
    setPin(next);
    setFailed(false);
    if (next.length === 4) {
      setChecking(true);
      window.setTimeout(async () => {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: next }),
        }).catch(() => null);

        setChecking(false);
        if (response?.ok) {
          onSuccess();
        } else {
          setFailed(true);
          setPin("");
        }
      }, 120);
    }
  };
  return (
    <div className="login-screen">
      <div className="login-brand"><Logo /><Wordmark /></div>
      <div className="login-pad-shell">
        <Panel className="pin-panel">
          <h1>Enter PIN</h1>
          <div className="pin-dots">{[0, 1, 2, 3].map((i) => <span key={i} className={pin.length > i ? "filled" : ""} />)}</div>
          <p>{checking ? "Checking PIN..." : failed ? "Incorrect PIN" : "Enter your 4-digit PIN"}</p>
        </Panel>
        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} onClick={() => push(String(n))}>{n}</button>)}
          <span />
          <button onClick={() => push("0")}>0</button>
          <button className="backspace-key" onClick={() => setPin(pin.slice(0, -1))} aria-label="Backspace" disabled={checking}>
            <X size={28} strokeWidth={4} />
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({
  summaries,
  onOpenDetail,
  onOpenStock,
}: {
  summaries: MedicationSummary[];
  onOpenDetail: (id: string) => void;
  onOpenStock: (id: string) => void;
}) {
  return (
    <div className="stack">
      {summaries.map((summary) => (
        <div
          className="med-card"
          key={summary.medication.id}
          onClick={() => onOpenDetail(summary.medication.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onOpenDetail(summary.medication.id);
          }}
        >
          <div className="rail" />
          <div className="card-main">
            <h2>{summary.medication.name}</h2>
            <div className="days-readout">
              {summary.usableStockPills > 0 && summary.remainingDaysRaw < 1 ? (
                <span className="today-text">RUNS OUT TODAY</span>
              ) : (
                <>
                  <strong>{summary.remainingDaysDisplay}</strong>
                  <span>DAYS</span>
                </>
              )}
            </div>
            <BadgeRow badges={summary.badges} max={2} />
          </div>
          <button
            className="icon-btn stock"
            onClick={(event) => {
              event.stopPropagation();
              onOpenStock(summary.medication.id);
            }}
            aria-label={`Open stock for ${summary.medication.name}`}
          >
            <PackagePlus />
          </button>
        </div>
      ))}
    </div>
  );
}

function BadgeRow({ badges, max = badges.length }: { badges: StatusBadge[]; max?: number }) {
  const visible = badges.slice(0, max);
  const hidden = badges.length - visible.length;
  return (
    <div className="badges">
      {visible.map((badge) => <span key={badge.kind} className={badgeClass[badge.kind]}>{badge.label}</span>)}
      {hidden > 0 && <span className="badge neutral">+{hidden}</span>}
    </div>
  );
}

function DetailScreen({
  summary,
  settings,
  onEdit,
  onStock,
}: {
  summary: MedicationSummary;
  settings: AppData["settings"];
  onEdit: () => void;
  onStock: () => void;
}) {
  return (
    <div className="detail-screen">
      <div className="detail-title"><Logo /><div><h1>{summary.medication.name}</h1><span>{compactNumber(summary.medication.daily_dose_pills)} mg</span></div></div>
      <InfoPanel icon={<CalendarDays />} title="Overall Status">
        <div className="stat-grid">
          <BigStat value={summary.remainingDaysDisplay} label="Remaining" suffix="DAYS" />
          <BigStat value={summary.usableStockPills} label="Usable Stock" suffix="PILLS" />
          <BadgeRow badges={summary.badges} />
        </div>
      </InfoPanel>
      <InfoPanel icon={<CalendarDays />} title="Daily Intake">
        <div className="two-stats">
          <BigStat value={compactNumber(summary.medication.daily_dose_pills)} label="Average Intake" suffix="PILLS/DAY" />
          <BigStat value={summary.medication.pills_per_box} label="Box Size" suffix="PILLS/BOX" />
        </div>
      </InfoPanel>
      <InfoPanel icon={<BadgePlus />} title="Cost">
        <div className="cost-grid">
          <SmallMoney title="Average cost" value={summary.averageCost} note="per pill" />
          <SmallMoney title="Standard box value" value={summary.standardBoxValue} note={`${summary.medication.pills_per_box} pills`} />
          <SmallMoney title="Current stock value" value={summary.currentStockValue} note={`${summary.usableStockPills} pills`} />
        </div>
      </InfoPanel>
      <InfoPanel icon={<Box />} title="Remaining Lots">
        <div className="lot-list">
          {summary.lots.map((lot) => (
            <div className="lot-row" key={lot.id}>
              <span>{lot.lot_code || `Lot #${lot.lot_number}`}</span>
              <span>{lot.quantity_pills_remaining} pills</span>
              <span>Expiry {formatExpiry(lot.expiry_month, lot.expiry_year)}</span>
              <span className={clsx("badge", lotStatus(lot, settings) === "Expired" ? "purple" : lotStatus(lot, settings) === "Good" ? "good" : "warning")}>{lotStatus(lot, settings)}</span>
            </div>
          ))}
        </div>
      </InfoPanel>
      <InfoPanel icon={<History />} title="Recent History">
        {summary.history.slice(0, 3).map((item) => <HistoryLine item={item} key={item.id} />)}
      </InfoPanel>
      <div className="action-row">
        <button className="secondary" onClick={onStock}><RotateCcw /> Recount Stock</button>
        <button className="primary" onClick={onEdit}><Edit3 /> Edit Medication Info</button>
      </div>
    </div>
  );
}

function InfoPanel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Panel className="info-panel">
      <h2><span className="mini-icon">{icon}</span>{title}</h2>
      {children}
    </Panel>
  );
}

function BigStat({ value, suffix, label }: { value: number | string; suffix: string; label: string }) {
  return <div className="big-stat"><strong>{value}</strong><span>{suffix}</span><small>{label}</small></div>;
}

function SmallMoney({ title, value, note }: { title: string; value: number; note: string }) {
  return <div className="small-money"><span>{title}</span><strong>{money(value)}</strong><small>{note}</small></div>;
}

function HistoryLine({ item }: { item: StockHistory }) {
  return (
    <div className="history-line">
      <span className={clsx("badge", item.type === "add_stock" ? "warning" : "purple")}>
        {item.type === "add_stock" ? "Add Stock" : "Recount Stock"}
      </span>
      <span>{item.note || (item.type === "add_stock" ? `+${item.quantity_pills} pills` : "")}</span>
      <time>{formatDateTime(item.created_at)}</time>
    </div>
  );
}

function HistoryScreen({ data }: { data: AppData }) {
  const [filter, setFilter] = useState("all");
  const medicationOptions = useMemo(
    () => [...data.medications].sort((a, b) => a.name.localeCompare(b.name)),
    [data.medications],
  );
  const rows = data.stockHistory.filter((item) => filter === "all" || item.medication_id === filter);
  return (
    <div className="history-screen">
      <Panel className="history-filter-panel">
        <label className="filter-select">
          <span>Filter</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All</option>
            {medicationOptions.map((med) => (
              <option key={med.id} value={med.id}>{med.name}</option>
            ))}
          </select>
        </label>
      </Panel>
      {rows.map((item) => (
        <Panel className="history-card" key={item.id}>
          <div className="history-card-main">
            <div className="history-card-header">
              <h2>{item.medications?.name || "Medication"}</h2>
              <time>{formatDateTime(item.created_at)}</time>
            </div>
            {item.type === "add_stock" ? (
              <>
                <p>{item.stock_lots?.lot_code || "Lot"} <span aria-hidden="true">&bull;</span> +{item.quantity_pills} pills</p>
                <p>Exp: {item.expiry_month && item.expiry_year ? formatExpiry(item.expiry_month, item.expiry_year) : "-"}</p>
                <p className="price">
                  <span>Total: {money(item.price || 0)}</span>
                  {item.stock_lots?.standard_box_price ? <span>{money(item.stock_lots.standard_box_price)} / box</span> : null}
                </p>
              </>
            ) : <p>{item.note}</p>}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function SettingsScreen({
  data,
  onEditMedication,
  onAddMedication,
  onChangePin,
  onLogout,
  onRefresh,
  showToast,
}: {
  data: AppData;
  onEditMedication: (id: string) => void;
  onAddMedication: () => void;
  onChangePin: () => void;
  onLogout: () => void;
  onRefresh: () => Promise<void>;
  showToast: (message: string) => void;
}) {
  const updateAlert = async (key: "low_stock_alert_days" | "expiring_lot_alert_days", value: number) => {
    const min = 1;
    const max = key === "low_stock_alert_days" ? 365 : 730;
    if (value < min || value > max || !Number.isInteger(value)) {
      showToast(`Use ${min}-${max} days`);
      return;
    }
    await saveSettings(data.settings, { [key]: value });
    showToast("Settings saved");
    await onRefresh();
  };
  return (
    <div className="settings-screen">
      <InfoPanel icon={<Pill />} title="Medications">
        {data.medications.map((med) => (
          <button className="setting-row" key={med.id} onClick={() => onEditMedication(med.id)}>
            <span><strong>{med.name}</strong><small>{compactNumber(med.daily_dose_pills)} pills/day &bull; {compactNumber(med.pills_per_box)} pills/box</small></span>
            <Edit3 />
          </button>
        ))}
        <button className="secondary wide" onClick={onAddMedication}>+ Add Medication</button>
      </InfoPanel>
      <InfoPanel icon={<ShieldAlert />} title="Alerts">
        <EditableDays label="Low Stock Alert" value={data.settings.low_stock_alert_days} onSave={(value) => updateAlert("low_stock_alert_days", value)} />
        <EditableDays label="Expiring Lot Alert" value={data.settings.expiring_lot_alert_days} onSave={(value) => updateAlert("expiring_lot_alert_days", value)} />
      </InfoPanel>
      <InfoPanel icon={<Lock />} title="Security">
        <button className="setting-row" onClick={onChangePin}>Change PIN <ChevronRight /></button>
        <button className="setting-row" onClick={onLogout}>Logout <LogOut /></button>
      </InfoPanel>
      <p className="version">Version 2.0</p>
    </div>
  );
}

function EditableDays({ label, value, onSave }: { label: string; value: number; onSave: (value: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  return (
    <div className="setting-row">
      <span>{label}</span>
      {editing ? (
        <span className="inline-edit">
          <input value={draft} onChange={(e) => setDraft(e.target.value)} inputMode="numeric" />
          <button onClick={() => { setEditing(false); onSave(Number(draft)); }}><Save /></button>
        </span>
      ) : (
        <button onClick={() => setEditing(true)}><strong>{value} days</strong></button>
      )}
    </div>
  );
}

function EditMedicationScreen({
  medication,
  onCancel,
  onSaved,
}: {
  medication: Medication | null;
  onCancel: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [name, setName] = useState(medication?.name || "");
  const [daily, setDaily] = useState(String(medication?.daily_dose_pills || ""));
  const [box, setBox] = useState(String(medication?.pills_per_box || ""));
  const submit = async () => {
    await saveMedication({
      id: medication?.id,
      name,
      dailyDosePills: Number(daily),
      pillsPerBox: Number(box),
    });
    await onSaved(medication ? "Medication saved" : "Medication added");
  };
  const remove = async () => {
    if (!medication) return;
    await softDeleteMedication(medication.id);
    await onSaved("Medication deleted");
  };
  return (
    <div className="edit-screen">
      <h1>{medication ? "Edit Medication" : "Add Medication"}</h1>
      <Panel>
        <Field label="Medication name" value={name} onChange={setName} icon={<Pill />} />
        <Field label="Daily intake" value={daily} onChange={setDaily} icon={<CalendarDays />} suffix="pills/day" />
        <Field label="Pills per box" value={box} onChange={setBox} icon={<Box />} suffix="pills/box" />
      </Panel>
      <button className="primary wide" onClick={submit}><Save /> Save Changes</button>
      {medication && <button className="danger-action wide" onClick={remove}><Trash2 /> Delete Medication</button>}
      <button className="secondary wide" onClick={onCancel}>Cancel</button>
    </div>
  );
}

function Field({ label, value, onChange, icon, suffix }: { label: string; value: string; onChange: (v: string) => void; icon: React.ReactNode; suffix?: string }) {
  return (
    <label className="field">
      <span>{label}</span>
      <div><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={suffix} />{icon}</div>
    </label>
  );
}

function ChangePinScreen({ settings, onSaved }: { settings: AppData["settings"]; onSaved: () => Promise<void> }) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = pin.length === 4 && confirm.length === 4 && pin !== confirm;
  const submit = async () => {
    if (pin.length !== 4 || mismatch) return;
    const response = await fetch("/api/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!response.ok) return;
    await onSaved();
  };
  return (
    <div className="change-pin-screen">
      <h1>Change PIN</h1>
      <Panel>
        <PinField label="New PIN" value={pin} onChange={setPin} />
        <PinField label="Confirm New PIN" value={confirm} onChange={setConfirm} />
        {mismatch && <p className="error-text">! PINs do not match</p>}
      </Panel>
      <button className="primary wide" onClick={submit}>Save PIN</button>
    </div>
  );
}

function PinField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="field pin-field">
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric" type="password" />
    </label>
  );
}

function StockModal({
  summary,
  onClose,
  onSaved,
}: {
  summary: MedicationSummary;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [tab, setTab] = useState<"add" | "recount">("add");
  return (
    <div className="modal-backdrop">
      <div className="stock-modal">
        <button className="icon-btn close" onClick={onClose}><X /></button>
        <h1>{summary.medication.name}</h1>
        <h2>Stock</h2>
        <div className="tabs">
          <button className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>Add Stock</button>
          <button className={tab === "recount" ? "active" : ""} onClick={() => setTab("recount")}>Recount Stock</button>
        </div>
        {tab === "add" ? <AddStockForm summary={summary} onSaved={onSaved} /> : <RecountForm summary={summary} onSaved={onSaved} />}
      </div>
    </div>
  );
}

function AddStockForm({ summary, onSaved }: { summary: MedicationSummary; onSaved: (message: string) => Promise<void> }) {
  const [quantityType, setQuantityType] = useState<"pills" | "boxes">("pills");
  const [quantity, setQuantity] = useState("30");
  const [priceType, setPriceType] = useState<"total" | "box">("total");
  const [price, setPrice] = useState("600");
  const [expiry, setExpiry] = useState("12/2026");
  const qty = Number(quantity);
  const rawPills = quantityType === "pills" ? qty : qty * summary.medication.pills_per_box;
  const receivedPills = Number.isFinite(rawPills) ? rawPills : 0;
  const wholePills = Number.isInteger(receivedPills) && receivedPills > 0;
  const priceValue = Number(price);
  const totalPrice = priceType === "total" ? priceValue : (priceValue / summary.medication.pills_per_box) * receivedPills;
  const costPerPill = receivedPills > 0 ? totalPrice / receivedPills : 0;
  const standardBoxPrice = priceType === "box" ? priceValue : costPerPill * summary.medication.pills_per_box;
  const expiryError = validateExpiryInput(expiry);
  const error = !wholePills
    ? "Quantity must result in whole pills. Please adjust boxes or use Total pills."
    : expiryError;
  const save = async () => {
    if (error || !Number.isFinite(totalPrice) || totalPrice <= 0) return;
    const [month, year] = expiry.split("/").map(Number);
    await addStockLot({
      medicationId: summary.medication.id,
      quantityPills: receivedPills,
      expiryMonth: month,
      expiryYear: year,
      totalPrice,
      costPerPill,
      standardBoxPrice,
    });
    await onSaved("Stock added successfully");
  };
  return (
    <div className="form-stack">
      <Segment label="Quantity Type" value={quantityType} onChange={setQuantityType} options={[["pills", "Total pills"], ["boxes", "Boxes"]]} />
      <Field label="Quantity" value={quantity} onChange={setQuantity} icon={<span>{quantityType === "pills" ? "pills" : "boxes"}</span>} />
      <Segment label="Price Input Type" value={priceType} onChange={setPriceType} options={[["total", "Total price"], ["box", "Price per box"]]} />
      <Field label={priceType === "total" ? "Total Price" : "Price per Box"} value={price} onChange={setPrice} icon={<span>à¸¿</span>} />
      <Field label="Expiry Date" value={expiry} onChange={setExpiry} icon={<CalendarDays />} />
      {error && <p className="error-text">{error}</p>}
      <Panel className="preview">
        <h3>PREVIEW</h3>
        <p><span>Received:</span><strong>{wholePills ? receivedPills : 0} pills</strong></p>
        <p><span>Total value:</span><strong>{money(totalPrice || 0)}</strong></p>
        <p><span>Cost:</span><strong>{money(costPerPill || 0)} / pill</strong></p>
        <p><span>Standard box price:</span><strong>{money(standardBoxPrice || 0)} / box</strong></p>
        <p><span>Expiry:</span><strong>{expiry}</strong></p>
      </Panel>
      <div className="action-row">
        <button className="secondary">Cancel</button>
        <button className="primary" onClick={save}><PackagePlus /> Save Stock</button>
      </div>
    </div>
  );
}

function Segment<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (value: T) => void; options: [T, string][] }) {
  return (
    <div className="segment-row">
      <strong>{label}</strong>
      <div>
        {options.map(([key, text]) => <button key={key} className={value === key ? "active" : ""} onClick={() => onChange(key)}>{text}</button>)}
      </div>
    </div>
  );
}

function RecountForm({ summary, onSaved }: { summary: MedicationSummary; onSaved: (message: string) => Promise<void> }) {
  const [counted, setCounted] = useState(String(summary.totalStockPills));
  const value = Number(counted);
  const valid = Number.isInteger(value) && value >= 0;
  const save = async () => {
    if (!valid) return;
    await updateLotsForRecount(summary.medication.id, summary.lots, value);
    await onSaved("Stock updated successfully");
  };
  return (
    <div className="recount-form">
      <h3>Current stock</h3>
      <div className="huge-readout"><strong>{summary.totalStockPills}</strong><span>PILLS</span></div>
      <h3>Counted pills</h3>
      <div className="count-input">
        <input value={counted} onChange={(e) => setCounted(e.target.value)} inputMode="numeric" />
        <div><button onClick={() => setCounted(String(value + 1))}>âŒƒ</button><button onClick={() => setCounted(String(Math.max(0, value - 1)))}>âŒ„</button></div>
      </div>
      {!valid && <p className="error-text">Counted pills must be a whole number.</p>}
      <p className="hint">This will update the total stock to the counted amount.</p>
      <button className="primary wide" onClick={save}><Save /> Save Recount</button>
    </div>
  );
}

function formatDateTime(input: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(input));
}
