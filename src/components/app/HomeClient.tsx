"use client";

import { Activity, Heart, LogOut, Pill, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  sortSummariesForHome,
  summarizeMedication,
} from "@/lib/stock";
import type { AppData, BloodPressureSummary, MedicationSummary } from "@/lib/types";

export default function HomeClient({
  initialData,
  bpSummary,
}: {
  initialData: AppData;
  bpSummary: BloodPressureSummary | null;
}) {
  const router = useRouter();
  const summaries = sortSummariesForHome(
    initialData.medications.map((medication) =>
      summarizeMedication(medication, initialData.stockLots, initialData.stockHistory, initialData.settings),
    ),
  );
  const medicationStatus = getMedicationStatus(summaries);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  };

  return (
    <main className="launcher-page-shell">
      <div className="launcher-app">
        <header className="launcher-header">
          <div className="launcher-brand">
            <div className="logo-mark login-logo-mark" aria-label="ArtPlan 76 logo">
              <img src="/icons/artplan-76-login.png" alt="" />
            </div>
            <div className="wordmark login-wordmark" aria-label="ArtPlan 76">
              <span className="login-wordmark-name">ArtPlan</span>
              <span className="login-wordmark-year">76</span>
            </div>
          </div>
          <button className="icon-btn" onClick={logout} aria-label="Logout"><LogOut /></button>
        </header>

        <section className="module-grid" aria-label="Health modules">
          <button className="module-card" onClick={() => router.push("/main")}>
            <div className="module-title">
              <div className="module-icon"><Pill /></div>
              <h2>Medic Stock</h2>
            </div>
            <div className="module-status">
              <span><strong>Lowest stock</strong>{medicationStatus.lowestStock}</span>
              <span><strong>Near expiry</strong>{medicationStatus.nearExpiry}</span>
            </div>
            <div className="module-action"><ShoppingCart /> Open stock</div>
          </button>

          <button className="module-card module-card-bp" onClick={() => router.push("/bp")}>
            <div className="module-title">
              <div className="module-icon"><Heart /></div>
              <h2>Blood Pressure</h2>
            </div>
            <div className="module-status">
              <span><strong>Last log</strong>{formatLastLog(bpSummary)}</span>
              <span><strong>BP</strong>{formatLatestBloodPressure(bpSummary)}</span>
              <span><strong>Heart rate</strong>{formatLatestHeartRate(bpSummary)}</span>
            </div>
            <div className="module-action"><Activity /> Open BP</div>
          </button>
        </section>
      </div>
    </main>
  );
}

function getMedicationStatus(summaries: MedicationSummary[]) {
  const stocked = summaries.filter((summary) => summary.usableStockPills > 0);
  const lowest = stocked.length ? Math.min(...stocked.map((summary) => summary.remainingDaysDisplay)) : 0;
  const nearExpiry = summaries.filter((summary) =>
    summary.badges.some((badge) => badge.kind === "expiring_lot"),
  ).length;

  return {
    lowestStock: summaries.length ? `${lowest} days` : "No medicines",
    nearExpiry: `${nearExpiry} items`,
  };
}

function formatLastLog(summary: BloodPressureSummary | null) {
  if (!summary?.latestLog) return "No BP logs yet";
  const date = new Date(summary.latestLog.measured_at);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const day = isToday ? "Today" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatLatestBloodPressure(summary: BloodPressureSummary | null) {
  if (!summary?.latestLog) return "No BP logs yet";
  return `${summary.latestLog.avg_sys}/${summary.latestLog.avg_dia} mmHg`;
}

function formatLatestHeartRate(summary: BloodPressureSummary | null) {
  if (!summary?.latestLog) return "No BP logs yet";
  return `${summary.latestLog.avg_pulse} bpm`;
}
