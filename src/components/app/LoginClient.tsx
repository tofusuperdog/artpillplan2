"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginClient() {
  const router = useRouter();

  return (
    <DeviceFrame>
      <PinLogin
        onSuccess={() => {
          router.replace("/home");
          router.refresh();
        }}
      />
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
          <p>ArtPlan is designed for mobile use only.</p>
          <p>Please open this app on a phone-width screen.</p>
        </Panel>
      </div>
    </main>
  );
}

function Logo() {
  return (
    <div className="logo-mark login-logo-mark" aria-label="ArtPlan 76 logo">
      <img src="/icons/artplan-76-login.png" alt="" />
    </div>
  );
}

function Wordmark() {
  return (
    <div className="wordmark login-wordmark" aria-label="ArtPlan 76">
      <span className="login-wordmark-name">ArtPlan</span>
      <span className="login-wordmark-year">76</span>
    </div>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={`retro-panel${className ? ` ${className}` : ""}`}>{children}</section>;
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
