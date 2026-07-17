"use client";

import { Activity, Heart, ListTodo, LogOut, Pill, ShoppingCart, Vault } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { loadAppData, loadLatestBloodPressureLog, type SimpleBloodPressureLog } from "@/lib/data";
import { loadTodoData } from "@/lib/todoData";
import {
  sortSummariesForHome,
  summarizeMedication,
} from "@/lib/stock";
import type { AppData, MedicationSummary } from "@/lib/types";
import type { TodoData } from "@/lib/todoTypes";

export default function HomeClient({
  initialData = null,
}: {
  initialData?: AppData | null;
}) {
  const router = useRouter();
  const [data, setData] = useState<AppData | null>(initialData);
  const [latestBpLog, setLatestBpLog] = useState<SimpleBloodPressureLog | null>(null);
  const [todoData, setTodoData] = useState<TodoData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loading = !data && !error;
  const summaries = data
    ? sortSummariesForHome(
      data.medications.map((medication) =>
        summarizeMedication(medication, data.stockLots, data.stockHistory, data.settings),
      ),
    )
    : [];
  const medicationStatus = getMedicationStatus(summaries);

  useEffect(() => {
    if (initialData) return;

    let cancelled = false;
    Promise.all([
      loadAppData({ syncDailyStock: false }),
      loadLatestBloodPressureLog().catch(() => null),
      loadTodoData().catch(() => null),
    ])
      .then(([appData, bpLog, todos]) => {
        if (cancelled) return;
        setData(appData);
        setLatestBpLog(bpLog);
        setTodoData(todos);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "Unable to load home data.";
        if (message === "Unauthorized") {
          router.replace("/");
          router.refresh();
          return;
        }
        setError(message);
      });

    return () => {
      cancelled = true;
    };
  }, [initialData, router]);

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
              <span><strong>Lowest stock</strong>{loading ? "Loading..." : error ? "Unavailable" : medicationStatus.lowestStock}</span>
              <span><strong>Near expiry</strong>{loading ? "Loading..." : error ? "Unavailable" : medicationStatus.nearExpiry}</span>
            </div>
            <div className="module-action"><ShoppingCart /> Open stock</div>
          </button>

          <button className="module-card module-card-bp" onClick={() => router.push("/bp")}> 
            <div className="module-title">
              <div className="module-icon"><Heart /></div>
              <h2>Blood Pressure</h2>
            </div>
            <div className="module-status">
              <span><strong>Last log</strong>{formatLastLog(latestBpLog)}</span>
              <span><strong>BP</strong>{formatLatestBloodPressure(latestBpLog)}</span>
              <span><strong>Heart rate</strong>{formatLatestHeartRate(latestBpLog)}</span>
            </div>
            <div className="module-action"><Activity /> Open BP</div>
          </button>

          <button className="module-card module-card-todo" onClick={() => router.push("/todo")}> 
            <div className="module-title">
              <div className="module-icon"><ListTodo /></div>
              <h2>To do List</h2>
            </div>
            <div className="module-status">
              <span><strong>Open tasks</strong>{todoData ? todoData.tasks.filter((task) => !task.is_completed).length : "Loading..."}</span>
              <span><strong>Due today</strong>{todoData ? todoData.tasks.filter((task) => !task.is_completed && task.due_date === bangkokDate()).length : "Loading..."}</span>
            </div>
            <div className="module-action"><ListTodo /> Open tasks</div>
          </button>

          <button className="module-card module-card-vault" onClick={() => router.push("/vault")}> 
            <div className="module-title">
              <div className="module-icon"><Vault /></div>
              <h2>Secure Vault</h2>
            </div>
            <div className="module-status">
              <span><strong>Protection</strong>AES-256 encrypted</span>
              <span><strong>Access</strong>Daily vault code</span>
            </div>
            <div className="module-action"><Vault /> Open vault</div>
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

function formatLastLog(log: SimpleBloodPressureLog | null) {
  if (!log) return "No BP logs yet";
  const date = new Date(log.measured_at);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const day = isToday ? "Today" : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${day} ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
}

function formatLatestBloodPressure(log: SimpleBloodPressureLog | null) {
  if (!log) return "No BP logs yet";
  return `${log.sys}/${log.dia} mmHg`;
}

function formatLatestHeartRate(log: SimpleBloodPressureLog | null) {
  if (!log) return "No BP logs yet";
  return `${log.pulse} bpm`;
}

function bangkokDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
