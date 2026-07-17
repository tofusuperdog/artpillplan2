"use client";

import {
  ArrowLeft,
  BadgePlus,
  Box,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  Copy,
  Edit3,
  History,
  Home,
  Info,
  Lock,
  LogOut,
  PackagePlus,
  Pill,
  Save,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  addStockLot,
  deleteHistoryItem,
  editHistoryItem,
  loadAppData,
  saveMedication,
  saveSettings,
  softDeleteMedication,
  updateLotsForRecount,
} from "@/lib/data";
import { medicationDisplayName, medicationGenericName, medicationSubtitle } from "@/lib/medications";
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

type Screen = "home" | "detail" | "history" | "settings";

const badgeClass: Record<StatusBadge["kind"], string> = {
  no_stock: "badge danger",
  runs_out_today: "badge warning",
  low_stock: "badge warning",
  expired_lot: "badge purple",
  expiring_lot: "badge danger",
  in_stock: "badge good",
};

function screenFromPathname(pathname: string): Screen {
  if (pathname === "/history") return "history";
  if (pathname === "/settings") return "settings";
  if (pathname.startsWith("/medications/")) return "detail";
  return "home";
}

function medicationIdFromPathname(pathname: string) {
  if (!pathname.startsWith("/medications/")) return null;
  return decodeURIComponent(pathname.replace("/medications/", "").split("/")[0] || "");
}

export default function AppClient({
  initialData = null,
  initialError = null,
}: {
  initialData?: AppData | null;
  initialError?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activePathname, setActivePathname] = useState(pathname);
  const [data, setData] = useState<AppData | null>(initialData);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(!initialData && !initialError);
  const [stockId, setStockId] = useState<string | null>(null);
  const [orderOpen, setOrderOpen] = useState(false);
  const [changePinOpen, setChangePinOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [settingsMedicationEditId, setSettingsMedicationEditId] = useState<string | null | undefined>(undefined);
  const [toast, setToast] = useState<string | null>(null);
  const hasStartedBackgroundSync = useRef(false);

  const refresh = async ({
    syncDailyStock = true,
    showLoading = true,
  }: { syncDailyStock?: boolean; showLoading?: boolean } = {}) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      setData(await loadAppData({ syncDailyStock }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load app data.";
      if (message === "Unauthorized") {
        router.replace("/");
        router.refresh();
        return;
      }
      setError(message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };
  const refreshAfterSave = () => refresh({ syncDailyStock: false, showLoading: false });

  useEffect(() => {
    if (!initialData && !initialError) refresh();
  }, []);

  useEffect(() => {
    if (!initialData || hasStartedBackgroundSync.current) return;

    hasStartedBackgroundSync.current = true;
    let cancelled = false;

    // Reconcile the daily deduction without delaying the first render. This
    // request returns fresh data once the sync has completed.
    loadAppData()
      .then((freshData) => {
        if (!cancelled) setData(freshData);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unable to refresh app data.";
        if (message === "Unauthorized") {
          router.replace("/");
          router.refresh();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [initialData, router]);

  useEffect(() => {
    setActivePathname(pathname);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => setActivePathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (nextPathname: string) => {
    if (nextPathname === activePathname) return;
    window.history.pushState(null, "", nextPathname);
    setActivePathname(nextPathname);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  const summaries = useMemo(() => {
    if (!data) return [];
    return sortSummariesForHome(
      data.medications.map((med) => summarizeMedication(med, data.stockLots, data.stockHistory, data.settings)),
    );
  }, [data]);

  const screen = screenFromPathname(activePathname);
  const routeMedicationId = medicationIdFromPathname(activePathname);
  const selected = routeMedicationId ? summaries.find((item) => item.medication.id === routeMedicationId) || null : null;
  const stockTarget = summaries.find((item) => item.medication.id === stockId) || null;

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  return (
    <DeviceFrame>
      <Header
        mode={screen === "detail" || screen === "history" || screen === "settings" ? "back" : "main"}
        onBack={() => navigate("/main")}
        onMainBack={() => router.push("/home")}
        onHome={() => navigate("/main")}
        onHistory={() => navigate("/history")}
        onSettings={() => navigate("/settings")}
        showHomeAction={screen !== "settings" && screen !== "history" && screen !== "detail"}
        title={screen === "settings" ? "Settings" : screen === "history" ? "History" : screen === "detail" ? "Detail" : "Medic Stock"}
      />
      {loading && <Panel className="center-panel">Loading ArtPillPlan...</Panel>}
      {error && (
        <Panel className="center-panel">
          <ShieldAlert />
          <h2>Database setup needed</h2>
          <p>{error}</p>
          <p>Run the migration and seed SQL in the Supabase project, then reload.</p>
          <button className="primary wide" onClick={() => refresh()}>Retry</button>
        </Panel>
      )}
      {data && !loading && !error && (
        <>
          {screen === "home" && (
            <HomeScreen
              summaries={summaries}
              onOpenDetail={(id) => navigate(`/medications/${id}`)}
              onOpenStock={setStockId}
              onOpenOrder={() => setOrderOpen(true)}
            />
          )}
          {screen === "detail" && selected && (
            <DetailScreen
              summary={selected}
              settings={data.settings}
            />
          )}
          {screen === "history" && (
            <HistoryScreen
              data={data}
              onRefresh={refreshAfterSave}
              showToast={showToast}
            />
          )}
          {screen === "settings" && (
            <SettingsScreen
              data={data}
              onEditMedication={(id) => setSettingsMedicationEditId(id)}
              onAddMedication={() => setSettingsMedicationEditId(null)}
              onChangePin={() => setChangePinOpen(true)}
              onLogout={() => setLogoutOpen(true)}
              onRefresh={refreshAfterSave}
              showToast={showToast}
            />
          )}
          {screen === "detail" && routeMedicationId && !selected && (
            <Panel className="center-panel">
              <ShieldAlert />
              <h2>Medication not found</h2>
              <button className="primary wide" onClick={() => navigate("/main")}>Back Home</button>
            </Panel>
          )}
        </>
      )}
      {changePinOpen && (
        <ChangePinModal
          onClose={() => setChangePinOpen(false)}
          onSaved={async () => {
            setChangePinOpen(false);
            showToast("PIN saved");
            await refreshAfterSave();
          }}
        />
      )}
      {settingsMedicationEditId !== undefined && data && (
        <MedicationEditorModal
          medication={settingsMedicationEditId ? data.medications.find((med) => med.id === settingsMedicationEditId) || null : null}
          onCancel={() => setSettingsMedicationEditId(undefined)}
          onSaved={async (message) => {
            setSettingsMedicationEditId(undefined);
            showToast(message);
            await refreshAfterSave();
          }}
        />
      )}
      {logoutOpen && (
        <ConfirmLogoutModal
          onClose={() => setLogoutOpen(false)}
          onConfirm={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            setLogoutOpen(false);
            router.replace("/");
            router.refresh();
          }}
        />
      )}
      {stockTarget && data && (
        <StockModal
          summary={stockTarget}
          onClose={() => setStockId(null)}
          onSaved={async (message) => {
            setStockId(null);
            showToast(message);
            await refreshAfterSave();
          }}
        />
      )}
      {orderOpen && (
        <OrderModal
          summaries={summaries}
          onClose={() => setOrderOpen(false)}
          onCopied={() => showToast("Order list copied")}
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
  onMainBack,
  onHome,
  onHistory,
  onSettings,
  showHomeAction = true,
  title = "ArtPillPlan",
}: {
  mode: "main" | "back";
  onBack: () => void;
  onMainBack?: () => void;
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
      ) : onMainBack ? (
        <button className="icon-btn" onClick={onMainBack} aria-label="Back to home"><ArrowLeft /></button>
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

function HomeScreen({
  summaries,
  onOpenDetail,
  onOpenStock,
  onOpenOrder,
}: {
  summaries: MedicationSummary[];
  onOpenDetail: (id: string) => void;
  onOpenStock: (id: string) => void;
  onOpenOrder: () => void;
}) {
  return (
    <div className="stack">
      <button className="primary wide order-entry" onClick={onOpenOrder}>
        <ShoppingCart /> Order Medicine
      </button>
      {summaries.map((summary) => (
        <div
          className="med-card"
          key={summary.medication.id}
        >
          <div className="rail" />
          <div className="card-heading">
            <h2 className="card-title">{medicationDisplayName(summary.medication)}</h2>
            {medicationSubtitle(summary.medication) && <p className="card-subtitle">{medicationSubtitle(summary.medication)}</p>}
          </div>
          <div className="card-main">
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
          <div className="card-actions">
            <button
              className="icon-btn stock"
              onClick={() => onOpenDetail(summary.medication.id)}
              aria-label={`Open details for ${medicationDisplayName(summary.medication)}`}
              title="Detail"
            >
              <Info />
            </button>
            <button
              className="icon-btn stock"
              onClick={() => onOpenStock(summary.medication.id)}
              aria-label={`Open stock for ${medicationDisplayName(summary.medication)}`}
              title="Stock"
            >
              <PackagePlus />
            </button>
          </div>
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
}: {
  summary: MedicationSummary;
  settings: AppData["settings"];
}) {
  return (
    <div className="detail-screen">
      <div className="detail-title">
        <Logo />
        <div>
          <h1>{medicationDisplayName(summary.medication)}</h1>
          {medicationSubtitle(summary.medication) && <span>{medicationSubtitle(summary.medication)}</span>}
        </div>
      </div>
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
          <BigStat value={summary.medication.pills_per_box} label="Pack Size" suffix="PILLS/PACK" />
        </div>
      </InfoPanel>
      <InfoPanel icon={<BadgePlus />} title="Cost">
        <div className="cost-grid">
          <SmallMoney title="Average cost" value={summary.averageCost} note="per pill" />
          <SmallMoney title="Standard pack value" value={summary.standardBoxValue} note={`${summary.medication.pills_per_box} pills`} />
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
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Panel className={clsx("info-panel", className)}>
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
      <time>{formatDateOnly(item.created_at)}</time>
      <span>{item.note || (item.type === "add_stock" ? `+${item.quantity_pills} pills` : "")}</span>
    </div>
  );
}

function HistoryScreen({
  data,
  onRefresh,
  showToast,
}: {
  data: AppData;
  onRefresh: () => Promise<void>;
  showToast: (message: string) => void;
}) {
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<StockHistory | null>(null);
  const medicationOptions = useMemo(
    () => [...data.medications].sort((a, b) => medicationDisplayName(a).localeCompare(medicationDisplayName(b))),
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
              <option key={med.id} value={med.id}>{medicationDisplayName(med)}</option>
            ))}
          </select>
        </label>
      </Panel>
      {rows.map((item) => (
        <button className="retro-panel history-card history-card-button" key={item.id} onClick={() => setEditing(item)}>
          <div className="history-card-main">
            <div className="history-card-header">
              <h2>{item.medications ? medicationDisplayName(item.medications) : "Medication"}</h2>
              <time>{formatDateTime(item.created_at)}</time>
            </div>
            {item.type === "add_stock" ? (
              <>
                <p>{item.stock_lots?.lot_code || "Lot"} <span aria-hidden="true">&bull;</span> +{item.quantity_pills} pills</p>
                <p>Exp: {item.expiry_month && item.expiry_year ? formatExpiry(item.expiry_month, item.expiry_year) : "-"}</p>
                <p className="price">
                  <span>Total: {money(item.price || 0)}</span>
                </p>
              </>
            ) : <p>{item.note}</p>}
          </div>
        </button>
      ))}
      {editing && (
        <HistoryEditorModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={async (message) => {
            setEditing(null);
            showToast(message);
            await onRefresh();
          }}
        />
      )}
    </div>
  );
}

function HistoryEditorModal({
  item,
  onClose,
  onSaved,
}: {
  item: StockHistory;
  onClose: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(String(item.quantity_pills));
  const [price, setPrice] = useState(item.price === null ? "" : String(item.price));
  const [expiry, setExpiry] = useState(item.expiry_month && item.expiry_year ? formatExpiry(item.expiry_month, item.expiry_year) : "");
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    const quantityPills = Number(quantity);
    if (!Number.isInteger(quantityPills) || quantityPills < 0 || (item.type === "add_stock" && quantityPills === 0)) {
      setNotice(item.type === "add_stock" ? "Quantity must be greater than 0." : "Quantity must be a whole number.");
      return;
    }

    if (item.type === "add_stock") {
      const expiryError = validateExpiryInput(expiry);
      if (expiryError) {
        setNotice(expiryError);
        return;
      }
      const totalPrice = Number(price);
      if (!Number.isFinite(totalPrice) || totalPrice < 0) {
        setNotice("Price must be 0 or greater.");
        return;
      }
      const [expiryMonth, expiryYear] = expiry.split("/").map(Number);
      await editHistoryItem({
        id: item.id,
        quantityPills,
        totalPrice,
        expiryMonth,
        expiryYear,
      });
      await onSaved("History updated");
      return;
    }

    await editHistoryItem({
      id: item.id,
      quantityPills,
    });
    await onSaved("History updated");
  };

  return (
    <div className="modal-backdrop pin-modal-backdrop">
      <div className="pin-modal history-edit-modal pin-modal-with-close">
        <button className="icon-btn close" onClick={onClose} aria-label="Close"><X /></button>
        <InfoPanel className="history-edit-panel" icon={<History />} title={item.type === "add_stock" ? "Edit Stock Lot" : "Edit Recount"}>
          <p className="stock-modal-med-name">{item.medications ? medicationDisplayName(item.medications) : "Medication"}</p>
          <div className="form-stack history-edit-form">
            <Field
              label={item.type === "add_stock" ? "Quantity" : "Counted pills"}
              value={quantity}
              onChange={(value) => setQuantity(value.replace(/\D/g, ""))}
              icon={<span>pills</span>}
            />
            {item.type === "add_stock" && (
              <>
                <Field
                  label="Total price"
                  value={price}
                  onChange={setPrice}
                  icon={<span>baht</span>}
                />
                <Field
                  label="Expiry Date"
                  value={expiry}
                  onChange={setExpiry}
                  icon={<CalendarDays />}
                />
              </>
            )}
          </div>
        </InfoPanel>
        {notice && <p className="error-text">{notice}</p>}
        <button className="primary wide" onClick={submit}><Save /> Save Changes</button>
      </div>
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
  const medicationRows = useMemo(
    () => [...data.medications].sort((a, b) => medicationDisplayName(a).localeCompare(medicationDisplayName(b))),
    [data.medications],
  );
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
        {medicationRows.map((med) => (
          <button className="setting-row" key={med.id} onClick={() => onEditMedication(med.id)}>
            <span>
              <strong>{medicationDisplayName(med)}</strong>
              <small>
                {[
                  medicationGenericName(med),
                  `${compactNumber(med.daily_dose_pills)} pills/day`,
                  `${compactNumber(med.pills_per_box)} pills/pack`,
                ].filter(Boolean).join(" | ")}
              </small>
            </span>
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
  return (
    <div className="edit-screen">
      <h1>{medication ? "Edit Medication" : "Add Medication"}</h1>
      <MedicationEditorForm medication={medication} onCancel={onCancel} onSaved={onSaved} />
    </div>
  );
}

function MedicationEditorModal({
  medication,
  onCancel,
  onSaved,
}: {
  medication: Medication | null;
  onCancel: () => void;
  onSaved: (message: string) => Promise<void>;
}) {
  return (
    <div className="modal-backdrop pin-modal-backdrop">
      <div className="pin-modal pin-modal-with-close">
        <button className="icon-btn close" onClick={onCancel} aria-label="Close"><X /></button>
        <InfoPanel className="medication-modal-panel" icon={<Pill />} title={medication ? "Edit Medication" : "Add Medication"}>
          <MedicationEditorForm medication={medication} onCancel={onCancel} onSaved={onSaved} modal />
        </InfoPanel>
      </div>
    </div>
  );
}

function MedicationEditorForm({
  medication,
  onCancel,
  onSaved,
  modal = false,
}: {
  medication: Medication | null;
  onCancel: () => void;
  onSaved: (message: string) => Promise<void>;
  modal?: boolean;
}) {
  const [brandName, setBrandName] = useState(medication ? medicationDisplayName(medication) : "");
  const [genericName, setGenericName] = useState(medication?.generic_name || "");
  const [daily, setDaily] = useState(String(medication?.daily_dose_pills || ""));
  const [box, setBox] = useState(String(medication?.pills_per_box || ""));
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const submit = async () => {
    await saveMedication({
      id: medication?.id,
      brandName,
      genericName,
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
    <div className={clsx("medication-editor-form", modal && "modal-medication-form")}>
      <div className="form-fields">
        <Field label="Brand name" value={brandName} onChange={setBrandName} icon={<Pill />} compact={modal} hideIcon={modal} />
        <Field label="Generic name" value={genericName} onChange={setGenericName} icon={<Pill />} compact={modal} hideIcon={modal} />
        <Field label="Daily intake" value={daily} onChange={setDaily} icon={<CalendarDays />} suffix="pills/day" compact={modal} hideIcon={modal} />
        <Field label="Pills per pack" value={box} onChange={setBox} icon={<Box />} suffix="pills/pack" compact={modal} hideIcon={modal} />
      </div>
      <button className="primary wide" onClick={submit}><Save /> Save Changes</button>
      {medication && <button className="danger-action wide" onClick={() => setDeleteConfirmOpen(true)}><Trash2 /> Delete Medication</button>}
      {!modal && <button className="secondary wide" onClick={onCancel}>Cancel</button>}
      {medication && deleteConfirmOpen && (
        <ConfirmDeleteMedicationModal
          medicationName={medicationDisplayName(medication)}
          onClose={() => setDeleteConfirmOpen(false)}
          onConfirm={remove}
        />
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  icon,
  suffix,
  compact = false,
  hideIcon = false,
  labelAction,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  suffix?: string;
  compact?: boolean;
  hideIcon?: boolean;
  labelAction?: React.ReactNode;
}) {
  return (
    <label className={clsx("field", compact && "compact-field", hideIcon && "no-icon")}>
      <span className="field-label">
        <span>{label}</span>
        {labelAction}
      </span>
      <div><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={suffix} />{!hideIcon && icon}</div>
    </label>
  );
}

function ChangePinModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showIncomplete, setShowIncomplete] = useState(false);
  const incomplete = showIncomplete && (pin.length !== 4 || confirm.length !== 4);
  const mismatch = pin.length === 4 && confirm.length === 4 && pin !== confirm;
  const submit = async () => {
    if (pin.length !== 4 || confirm.length !== 4) {
      setShowIncomplete(true);
      return;
    }
    if (mismatch) return;
    const response = await fetch("/api/auth/change-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!response.ok) return;
    await onSaved();
  };
  return (
    <div className="modal-backdrop pin-modal-backdrop">
      <div className="pin-modal pin-modal-with-close">
        <button className="icon-btn close" onClick={onClose} aria-label="Close"><X /></button>
        <InfoPanel icon={<Lock />} title="Change PIN">
          <PinField label="New PIN" value={pin} onChange={(value) => { setPin(value); setShowIncomplete(false); }} />
          <PinField label="Confirm New PIN" value={confirm} onChange={(value) => { setConfirm(value); setShowIncomplete(false); }} />
          {incomplete && <p className="error-text">! PIN must be 4 digits</p>}
          {mismatch && <p className="error-text">! PINs do not match</p>}
        </InfoPanel>
        <button className="primary wide" onClick={submit}>Save PIN</button>
      </div>
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

function ConfirmLogoutModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => Promise<void> }) {
  return (
    <div className="modal-backdrop pin-modal-backdrop">
      <div className="pin-modal">
        <InfoPanel icon={<LogOut />} title="Logout">
          <p className="confirm-copy">Are you sure you want to logout?</p>
        </InfoPanel>
        <div className="action-row">
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button className="danger-action" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteMedicationModal({
  medicationName,
  onClose,
  onConfirm,
}: {
  medicationName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  return (
    <div className="modal-backdrop pin-modal-backdrop">
      <div className="pin-modal">
        <InfoPanel icon={<Trash2 />} title="Delete Medication">
          <p className="confirm-copy">Delete {medicationName}?</p>
        </InfoPanel>
        <div className="action-row">
          <button className="secondary" onClick={onClose}>Cancel</button>
          <button className="danger-action" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

type OrderLine = {
  name: string;
  genericName: string;
  missingPills: number;
  packSize: number;
  packs: number;
  packPrice: number | null;
  total: number | null;
};

function OrderModal({
  summaries,
  onClose,
  onCopied,
}: {
  summaries: MedicationSummary[];
  onClose: () => void;
  onCopied: () => void;
}) {
  const [targetDate, setTargetDate] = useState("");
  const [result, setResult] = useState<{ days: number; lines: OrderLine[]; text: string } | null>(null);
  const todayInput = toDateInputValue(new Date());

  const effectiveDays = () => {
    const today = startOfLocalDay(new Date());
    const target = startOfLocalDay(new Date(`${(targetDate || todayInput)}T00:00:00`));
    return Math.max(1, Math.ceil((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000)));
  };

  const calculate = () => {
    const plannedDays = effectiveDays();
    if (!Number.isFinite(plannedDays) || plannedDays < 1) return;
    const lines = calculateOrderLines(summaries, plannedDays);
    setResult({ days: plannedDays, lines, text: buildOrderText(plannedDays, lines) });
  };

  const copyResult = async () => {
    if (!result?.text) return;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(result.text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = result.text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    onCopied();
  };

  return (
    <div className="modal-backdrop pin-modal-backdrop">
      <div className="pin-modal order-modal pin-modal-with-close">
        <button className="icon-btn close" onClick={onClose} aria-label="Close"><X /></button>
        <InfoPanel className="order-modal-panel" icon={<ShoppingCart />} title="Order Medicine">
          <div className="order-inputs">
            <label className="field order-date-field">
              <span>Order until date</span>
              <input
                value={targetDate}
                min={todayInput}
                onChange={(event) => {
                  setTargetDate(event.target.value);
                  setResult(null);
                }}
                type="date"
              />
            </label>
          </div>
          <button className="primary wide" onClick={calculate}><CheckCircle /> Calculate</button>
          {result && (
            <div className="order-result">
              <div className="order-copy-box">
                <pre>{result.text}</pre>
              </div>
              <button className="secondary wide" onClick={copyResult}><Copy /> Copy list</button>
            </div>
          )}
        </InfoPanel>
      </div>
    </div>
  );
}

function calculateOrderLines(summaries: MedicationSummary[], days: number): OrderLine[] {
  return summaries.flatMap((summary) => {
    const requiredPills = Math.ceil(summary.medication.daily_dose_pills * days);
    const missingPills = Math.max(0, requiredPills - summary.usableStockPills);
    if (missingPills <= 0) return [];

    const packSize = Math.max(1, Number(summary.medication.pills_per_box));
    const packs = Math.ceil(missingPills / packSize);
    const packPrice = latestPackPrice(summary);
    return [{
      name: medicationDisplayName(summary.medication),
      genericName: medicationGenericName(summary.medication),
      missingPills,
      packSize,
      packs,
      packPrice,
      total: packPrice === null ? null : packs * packPrice,
    }];
  });
}

function latestPackPrice(summary: MedicationSummary) {
  const latestHistoryPrice = summary.history
    .filter((item) => item.type === "add_stock")
    .map((item) => {
      const standardPrice = item.stock_lots?.standard_box_price;
      if (standardPrice && standardPrice > 0) return standardPrice;
      if (item.price && item.quantity_pills > 0) {
        return (item.price / item.quantity_pills) * summary.medication.pills_per_box;
      }
      return null;
    })
    .find((price): price is number => price !== null);
  if (latestHistoryPrice !== undefined) return latestHistoryPrice;

  const latestLot = [...summary.lots]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .find((lot) => lot.standard_box_price > 0);
  return latestLot?.standard_box_price ?? null;
}

function buildOrderText(days: number, lines: OrderLine[]) {
  if (lines.length === 0) {
    return `Order medicine for ${days} days\nNo additional medicine needed.`;
  }

  const itemLines = lines.map((line) => {
    const name = line.genericName ? `${line.name} (${line.genericName})` : line.name;
    return `- ${name}, order ${line.packs} pack (${compactNumber(line.packSize)} pills/pack)`;
  });
  const knownTotal = lines.reduce((sum, line) => sum + (line.total ?? 0), 0);
  const hasUnknownPrice = lines.some((line) => line.total === null);
  return [
    `Order medicine for ${days} days`,
    ...itemLines,
    `Estimated total: ${money(knownTotal)}${hasUnknownPrice ? " + items with unknown price" : ""}`,
  ].join("\n");
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <div className="modal-backdrop pin-modal-backdrop">
      <div className="pin-modal stock-modal pin-modal-with-close">
        <button className="icon-btn close" onClick={onClose}><X /></button>
        <InfoPanel className="stock-modal-panel" icon={<PackagePlus />} title="Stock">
          <p className="stock-modal-med-name">{medicationDisplayName(summary.medication)}</p>
          <div className="tabs">
            <button className={tab === "add" ? "active" : ""} onClick={() => setTab("add")}>Add Stock</button>
            <button className={tab === "recount" ? "active" : ""} onClick={() => setTab("recount")}>Recount Stock</button>
          </div>
          {tab === "add"
            ? <AddStockForm summary={summary} onNotify={setNotice} onSaved={onSaved} />
            : <RecountForm summary={summary} onNotify={setNotice} onSaved={onSaved} />}
        </InfoPanel>
      </div>
      {notice && <StockNoticeModal message={notice} onClose={() => setNotice(null)} />}
    </div>
  );
}

function AddStockForm({
  summary,
  onNotify,
  onSaved,
}: {
  summary: MedicationSummary;
  onNotify: (message: string) => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [quantityType, setQuantityType] = useState<"pills" | "boxes">("pills");
  const [quantity, setQuantity] = useState("");
  const [priceType, setPriceType] = useState<"total" | "box">("total");
  const [price, setPrice] = useState("");
  const [expiry, setExpiry] = useState("");
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
    ? "Quantity must result in whole pills. Please adjust packs or use Total pills."
    : expiryError;
  const save = async () => {
    if (error) {
      onNotify(error);
      return;
    }
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      onNotify("Price must be greater than 0.");
      return;
    }
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
    <div className="form-stack add-stock-form">
      <Field
        label="Quantity"
        value={quantity}
        onChange={setQuantity}
        icon={<span>{quantityType === "pills" ? "pills" : "packs"}</span>}
        labelAction={(
          <select value={quantityType} onChange={(event) => setQuantityType(event.target.value as "pills" | "boxes")}>
            <option value="pills">Total pills</option>
            <option value="boxes">Packs</option>
          </select>
        )}
      />
      <Field
        label="Price"
        value={price}
        onChange={setPrice}
        icon={<span>baht</span>}
        labelAction={(
          <select value={priceType} onChange={(event) => setPriceType(event.target.value as "total" | "box")}>
            <option value="total">Total Price</option>
            <option value="box">Price per pack</option>
          </select>
        )}
      />
      <Field label="Expiry Date" value={expiry} onChange={setExpiry} icon={<CalendarDays />} />
      <button className="primary wide" onClick={save}><PackagePlus /> Save Stock</button>
    </div>
  );
}

function RecountForm({
  summary,
  onNotify,
  onSaved,
}: {
  summary: MedicationSummary;
  onNotify: (message: string) => void;
  onSaved: (message: string) => Promise<void>;
}) {
  const [counted, setCounted] = useState(String(summary.totalStockPills));
  const value = Number(counted);
  const valid = Number.isInteger(value) && value >= 0;
  const save = async () => {
    if (!valid) {
      onNotify("Counted pills must be a whole number.");
      return;
    }
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
      </div>
      <p className="hint">This will update the total stock to the counted amount.</p>
      <button className="primary wide" onClick={save}><Save /> Save Recount</button>
    </div>
  );
}

function StockNoticeModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="modal-backdrop pin-modal-backdrop">
      <div className="pin-modal">
        <InfoPanel icon={<ShieldAlert />} title="Notice">
          <p className="confirm-copy">{message}</p>
        </InfoPanel>
        <button className="primary wide" onClick={onClose}>OK</button>
      </div>
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

function formatDateOnly(input: string) {
  const date = new Date(input);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}
