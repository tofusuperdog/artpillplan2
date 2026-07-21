"use client";

import { ArrowLeft, Copy, Eye, EyeOff, KeyRound, LockKeyhole, Pencil, Plus, Settings, ShieldCheck, Trash2, Vault, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { changeVaultCode, deleteVaultItem, loadVaultItems, loadVaultStatus, lockVault, refreshVaultSession, saveVaultItem, setupVault, unlockVault } from "@/lib/vaultData";
import type { VaultItem } from "@/lib/vaultTypes";

const AUTO_LOCK_MS = 5 * 60 * 1000;

export default function VaultClient({ content = false }: { content?: boolean }) {
  const router = useRouter();
  const [initialized, setInitialized] = useState<boolean | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [editor, setEditor] = useState<VaultItem | "new" | null>(null);
  const [changingCode, setChangingCode] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const lastSessionRefresh = useRef(0);

  useEffect(() => {
    if (content) {
      loadVaultItems()
        .then((result) => setItems(result.items))
        .catch(() => router.replace("/vault"));
      return;
    }
    loadVaultStatus()
      .then((status) => setInitialized(status.initialized))
      .catch((error) => setMessage(error instanceof Error ? error.message : "Unable to load vault."));
  }, [content, router]);

  useEffect(() => {
    if (!content) return;
    let timer: number;
    const lock = () => {
      void lockVault().finally(() => router.replace("/vault"));
    };
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(lock, AUTO_LOCK_MS);
      if (Date.now() - lastSessionRefresh.current >= 30_000) {
        lastSessionRefresh.current = Date.now();
        void refreshVaultSession().catch(() => router.replace("/vault"));
      }
    };
    reset();
    window.addEventListener("pointerdown", reset);
    window.addEventListener("keydown", reset);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", reset);
      window.removeEventListener("keydown", reset);
    };
  }, [router]);

  const lock = async () => {
    await lockVault().catch(() => undefined);
    router.replace("/vault");
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    setMessage(`${label} copied.`);
    window.setTimeout(() => setMessage(null), 1800);
  };

  return (
    <main className="launcher-page-shell vault-page-shell">
      <div className={`launcher-app vault-app ${content ? "vault-content-app" : ""}`}>
        <header className="top-header vault-header">
          <button className="icon-btn" onClick={() => router.push("/home")} aria-label="Back"><ArrowLeft /></button>
          <div className="wordmark">Vault</div>
          {content && <div className="header-actions"><button className="icon-btn" onClick={() => setChangingCode(true)} aria-label="Change vault code"><Settings /></button><button className="icon-btn" onClick={() => void lock()} aria-label="Lock vault"><LockKeyhole /></button></div>}
        </header>

        {!content && initialized === null && !message && <VaultLoading />}
        {!content && initialized === null && message && <section className="vault-gate"><div className="vault-door-icon"><Vault /></div><h1>Unable to open vault</h1><p className="vault-message">{message}</p><button className="secondary" onClick={() => window.location.reload()}>Retry</button></section>}
        {!content && initialized === false && <VaultSetup onReady={() => { setInitialized(true); setMessage("Vault is ready. Unlock it with your 9-digit daily code."); }} />}
        {!content && initialized === true && <VaultUnlock message={message} onUnlocked={() => router.replace("/vault/content")} />}
        {content && (
          <VaultContents
            items={items}
            revealed={revealed}
            onReveal={(id) => setRevealed((current) => {
              const next = new Set(current);
              if (next.has(id)) next.delete(id); else next.add(id);
              return next;
            })}
            onCopy={copy}
            onEdit={(item) => setEditor(item)}
            onAdd={() => setEditor("new")}
          />
        )}

        {content && editor && (
          <VaultItemEditor
            item={editor === "new" ? null : editor}
            onClose={() => setEditor(null)}
            onChanged={(nextItems) => { setItems(nextItems); setEditor(null); setRevealed(new Set()); }}
          />
        )}

        {content && changingCode && <VaultCodeChange
          onClose={() => setChangingCode(false)}
          onChanged={(nextItems) => { setItems(nextItems); setChangingCode(false); setRevealed(new Set()); setMessage("Vault code changed."); }}
        />}

        {content && message && <div className="toast">{message}</div>}
      </div>
    </main>
  );
}

function VaultLoading() {
  return <section className="vault-gate"><div className="vault-door-icon"><Vault /></div><p>Checking vault...</p></section>;
}

function VaultSetup({ onReady }: { onReady: () => void }) {
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!/^\d{7}$/.test(code)) return setMessage("Enter exactly 7 digits.");
    if (code !== confirmCode) return setMessage("The codes do not match.");
    setWorking(true);
    setMessage(null);
    try {
      await setupVault(code);
      setCode("");
      setConfirmCode("");
      onReady();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to set up vault.");
    } finally {
      setWorking(false);
    }
  };

  return <section className="vault-gate">
    <div className="vault-door-icon"><Vault /></div>
    <span className="vault-eyebrow">First-time setup</span>
    <h1>Create your vault code</h1>
    <p>Choose a private 7-digit code. To unlock later, add the current 2-digit day to the end.</p>
    <div className="vault-code-example"><span>Your 7 digits</span><i>+</i><strong>{daySuffix()}</strong></div>
    <label className="vault-code-field"><span>7-digit code</span><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={7} value={code} onChange={(event) => setCode(digits(event.target.value, 7))} /></label>
    <label className="vault-code-field"><span>Confirm code</span><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={7} value={confirmCode} onChange={(event) => setConfirmCode(digits(event.target.value, 7))} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} /></label>
    <div className="vault-warning"><ShieldCheck /><span>This code cannot be recovered. Store it somewhere safe.</span></div>
    {message && <p className="vault-message">{message}</p>}
    <button className="primary wide" disabled={working} onClick={submit}>{working ? "Creating vault..." : "Create vault"}</button>
  </section>;
}

function VaultUnlock({ message: initialMessage, onUnlocked }: { message: string | null; onUnlocked: () => void }) {
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage);

  const submit = async () => {
    if (!/^\d{9}$/.test(code)) {
      setCode("");
      return setMessage("Invalid vault code.");
    }
    setWorking(true);
    setMessage(null);
    try {
      await unlockVault(code);
      onUnlocked();
      setCode("");
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "Unable to unlock vault.";
      if (nextMessage === "Incorrect vault code.") {
        setCode("");
        setMessage("Invalid vault code.");
      } else {
        setMessage(nextMessage);
      }
    } finally {
      setWorking(false);
    }
  };

  return <section className="vault-gate">
    <div className="vault-door-icon"><Vault /></div>
    <h1>Unlock your vault</h1>
    <div className="vault-current-date"><span>Today - Thailand</span><strong>{currentThailandDate()}</strong></div>
    <VaultCodeInput value={code} onChange={(value) => { setCode(value); if (message) setMessage(null); }} onSubmit={submit} />
    {message && <p className="vault-message">{message}</p>}
    <button className="primary wide" disabled={working} onClick={submit}><KeyRound /> {working ? "Unlocking..." : "Unlock vault"}</button>
    <small>Five incorrect attempts lock the vault for 15 minutes.</small>
  </section>;
}

function VaultCodeInput({ value, onChange, onSubmit }: { value: string; onChange: (value: string) => void; onSubmit: () => void }) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const [visible, setVisible] = useState(false);

  const updateDigit = (index: number, rawValue: string) => {
    const entered = digits(rawValue, 9);
    if (!entered) {
      if (value[index]) onChange(value.slice(0, index) + value.slice(index + 1));
      return;
    }

    if (entered.length > 1) {
      const nextValue = digits(value.slice(0, index) + entered, 9);
      onChange(nextValue);
      inputs.current[Math.min(nextValue.length, 8)]?.focus();
      return;
    }

    const nextDigits = value.split("");
    nextDigits[index] = entered;
    const nextValue = nextDigits.filter(Boolean).join("").slice(0, 9);
    onChange(nextValue);
    if (index < 8) inputs.current[index + 1]?.focus();
  };

  return <div className="vault-pin-field">
    <div className="vault-pin-heading">
      <span>Daily vault code</span>
      <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Hide vault code" : "Show vault code"}>
        {visible ? <EyeOff /> : <Eye />}
      </button>
    </div>
    <div className="vault-pin-inputs" onPaste={(event) => {
      event.preventDefault();
      const pasted = digits(event.clipboardData.getData("text"), 9);
      if (!pasted) return;
      onChange(pasted);
      inputs.current[Math.min(pasted.length, 8)]?.focus();
    }}>
      {Array.from({ length: 9 }, (_, index) => <input
        key={index}
        ref={(element) => { inputs.current[index] = element; }}
        type={visible ? "text" : "password"}
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete={index === 0 ? "one-time-code" : "off"}
        maxLength={1}
        value={value[index] || ""}
        className={value[index] ? "is-filled" : ""}
        aria-label={`Vault code digit ${index + 1}`}
        autoFocus={index === 0}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => updateDigit(index, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") return void onSubmit();
          if (event.key === "ArrowLeft" && index > 0) return void inputs.current[index - 1]?.focus();
          if (event.key === "ArrowRight" && index < 8) return void inputs.current[index + 1]?.focus();
          if (event.key === "Backspace") {
            event.preventDefault();
            if (value[index]) onChange(value.slice(0, index) + value.slice(index + 1));
            else if (index > 0) {
              onChange(value.slice(0, index - 1) + value.slice(index));
              inputs.current[index - 1]?.focus();
            }
            return;
          }
          if (!event.ctrlKey && !event.metaKey && event.key.length === 1 && !/^\d$/.test(event.key)) event.preventDefault();
        }}
      />)}
    </div>
  </div>;
}

function VaultContents({ items, revealed, onReveal, onCopy, onEdit, onAdd }: {
  items: VaultItem[];
  revealed: Set<string>;
  onReveal: (id: string) => void;
  onCopy: (value: string, label: string) => void;
  onEdit: (item: VaultItem) => void;
  onAdd: () => void;
}) {
  return <>
    <section className="vault-content-heading"><div><span>Secure storage</span><h1>Your secrets</h1></div><button className="primary" onClick={onAdd}><Plus /> Add</button></section>
    {items.length === 0 ? <section className="vault-empty"><ShieldCheck /><h2>Vault is empty</h2><p>Add a server password, email login, API key, or private note.</p><button className="secondary" onClick={onAdd}><Plus /> Add first secret</button></section> : <section className="vault-item-list">
      {items.map((item) => <article className="vault-item" key={item.id}>
        <div className="vault-item-title"><div><span><LockKeyhole /></span><h2>{item.label}</h2></div><button onClick={() => onEdit(item)} aria-label={`Edit ${item.label}`}><Pencil /></button></div>
        {item.account && <div className="vault-value-row"><span>Account</span><strong>{item.account}</strong><button onClick={() => onCopy(item.account, "Account")} aria-label="Copy account"><Copy /></button></div>}
        <div className="vault-value-row"><span>Secret</span><strong className={revealed.has(item.id) ? "" : "masked"}>{revealed.has(item.id) ? item.secret : "••••••••••••"}</strong><div><button onClick={() => onReveal(item.id)} aria-label={revealed.has(item.id) ? "Hide secret" : "Show secret"}>{revealed.has(item.id) ? <EyeOff /> : <Eye />}</button><button onClick={() => onCopy(item.secret, "Secret")} aria-label="Copy secret"><Copy /></button></div></div>
        {item.notes && <p className="vault-item-note">{item.notes}</p>}
      </article>)}
    </section>}
  </>;
}

function VaultCodeChange({ onClose, onChanged }: { onClose: () => void; onChanged: (items: VaultItem[]) => void }) {
  const [code, setCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!/^\d{7}$/.test(code)) return setMessage("Enter exactly 7 digits.");
    if (code !== confirmCode) return setMessage("The codes do not match.");
    setWorking(true);
    setMessage(null);
    try {
      const result = await changeVaultCode(code);
      onChanged(result.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to change vault code.");
    } finally {
      setWorking(false);
    }
  };

  return <div className="vault-modal-backdrop" role="dialog" aria-modal="true" aria-label="Change vault code">
    <section className="vault-modal">
      <div className="vault-modal-title"><h1>Change vault code</h1><button onClick={onClose} aria-label="Close"><X /></button></div>
      <p className="vault-code-change-note">Your saved secrets will be re-encrypted with this new 7-digit code.</p>
      <label><span>New 7-digit code</span><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={7} value={code} onChange={(event) => setCode(digits(event.target.value, 7))} autoFocus /></label>
      <label><span>Confirm new code</span><input type="password" inputMode="numeric" autoComplete="new-password" maxLength={7} value={confirmCode} onChange={(event) => setConfirmCode(digits(event.target.value, 7))} onKeyDown={(event) => { if (event.key === "Enter") void submit(); }} /></label>
      {message && <p className="vault-message">{message}</p>}
      <div className="vault-modal-actions"><button className="secondary" disabled={working} onClick={onClose}>Cancel</button><button className="primary" disabled={working} onClick={submit}>{working ? "Changing..." : "Change code"}</button></div>
    </section>
  </div>;
}

function VaultItemEditor({ item, onClose, onChanged }: { item: VaultItem | null; onClose: () => void; onChanged: (items: VaultItem[]) => void }) {
  const [label, setLabel] = useState(item?.label || "");
  const [account, setAccount] = useState(item?.account || "");
  const [secret, setSecret] = useState(item?.secret || "");
  const [notes, setNotes] = useState(item?.notes || "");
  const [showSecret, setShowSecret] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!label.trim() || !secret) return setMessage("Name and secret are required.");
    setWorking(true);
    setMessage(null);
    try {
      const result = await saveVaultItem({ id: item?.id, label, account, secret, notes });
      onChanged(result.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save secret.");
    } finally {
      setWorking(false);
    }
  };

  const remove = async () => {
    if (!item || !window.confirm("Delete this secret permanently?")) return;
    setWorking(true);
    try {
      const result = await deleteVaultItem(item.id);
      onChanged(result.items);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to delete secret.");
      setWorking(false);
    }
  };

  return <div className="vault-modal-backdrop" role="dialog" aria-modal="true" aria-label={item ? "Edit secret" : "Add secret"}>
    <section className="vault-modal">
      <div className="vault-modal-title"><h1>{item ? "Edit secret" : "Add secret"}</h1><button onClick={onClose} aria-label="Close"><X /></button></div>
      <label><span>Name</span><input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Production server" autoFocus /></label>
      <label><span>Account / email</span><input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="Optional" autoComplete="off" /></label>
      <label><span>Password / key</span><div className="vault-secret-input"><input type={showSecret ? "text" : "password"} value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="new-password" /><button onClick={() => setShowSecret((value) => !value)} aria-label={showSecret ? "Hide" : "Show"}>{showSecret ? <EyeOff /> : <Eye />}</button></div></label>
      <label><span>Notes</span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional details" /></label>
      {message && <p className="vault-message">{message}</p>}
      <div className="vault-modal-actions">{item && <button className="secondary danger-text" disabled={working} onClick={remove}><Trash2 /> Delete</button>}<button className="primary" disabled={working} onClick={save}>{working ? "Encrypting..." : "Save encrypted"}</button></div>
    </section>
  </div>;
}

function digits(value: string, length: number) {
  return value.replace(/\D/g, "").slice(0, length);
}

function daySuffix() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Bangkok", day: "2-digit" }).formatToParts(new Date());
  return parts.find((part) => part.type === "day")?.value || "";
}

function currentThailandDate() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}
