import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Loader2, CheckCircle2, Bell,
  Sun, Moon, Shield, Mail, Key, AlertTriangle, Info, X, Eye, EyeOff,
} from "lucide-react";
import { apiFetch, clearToken } from "@/lib/api";
import { useTheme } from "@/lib/theme";
import { fadeInUp, smooth } from "@/lib/motion";
import { BusinessSidebar } from "@/components/BusinessSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────

type Business = { id: string; name: string };

// ── Notification prefs (localStorage) ─────────────────────────────────────────

const PREFS_KEY = "rs-notif-prefs";
type NotifPrefs = {
  paymentSuccess: boolean;
  paymentFailed: boolean;
  planCompleted: boolean;
  disputeReceived: boolean;
  disputeReplied: boolean;
  weeklyDigest: boolean;
};
const DEFAULT_PREFS: NotifPrefs = {
  paymentSuccess: true,
  paymentFailed: true,
  planCompleted: true,
  disputeReceived: true,
  disputeReplied: true,
  weeklyDigest: false,
};
function loadPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) } : { ...DEFAULT_PREFS };
  } catch { return { ...DEFAULT_PREFS }; }
}
function savePrefs(p: NotifPrefs) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }

// ── Toggle switch ──────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch" aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${checked ? "bg-primary" : "bg-border"}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-background shadow transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

// ── Notification row ───────────────────────────────────────────────────────────

function NotifRow({ label, description, checked, onChange }: {
  label: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-border/15 last:border-0">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

// ── Password field ─────────────────────────────────────────────────────────────

function PasswordField({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id} type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-border/50 bg-background px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
        <button
          type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── Modal shell ────────────────────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4 pb-4 sm:pb-0"
          onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md rounded-2xl border border-border/40 bg-card shadow-2xl"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Change Password Modal ──────────────────────────────────────────────────────

function ChangePasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function reset() { setCurrent(""); setNext(""); setConfirm(""); setError(null); setDone(false); }
  function close() { reset(); onClose(); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("New passwords do not match"); return; }
    if (next.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSaving(true); setError(null);
    try {
      const res = await apiFetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setDone(true);
      setTimeout(() => close(), 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={close}>
      <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Key className="h-4 w-4 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Change password</h2>
        </div>
        <button onClick={close} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={(e) => void submit(e)} className="p-6 space-y-4">
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6 text-center"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-7 w-7 text-primary" />
            </div>
            <p className="font-semibold text-foreground">Password updated!</p>
            <p className="text-sm text-muted-foreground">You're all set. Use your new password next time you sign in.</p>
          </motion.div>
        ) : (
          <>
            <PasswordField id="cur-pw" label="Current password" value={current} onChange={setCurrent} placeholder="••••••••" />
            <PasswordField id="new-pw" label="New password" value={next} onChange={setNext} placeholder="Min. 8 characters" />
            <PasswordField id="con-pw" label="Confirm new password" value={confirm} onChange={setConfirm} placeholder="Repeat new password" />

            <AnimatePresence>
              {error && (
                <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={close}
                className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border/40 bg-secondary/20 text-sm font-medium text-foreground hover:bg-secondary/40 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving || !current || !next || !confirm}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Update password"}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

// ── Delete Account Modal ───────────────────────────────────────────────────────

function DeleteAccountModal({ open, businessName, onClose }: { open: boolean; businessName: string; onClose: () => void }) {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const required = "delete";

  function close() { setConfirm(""); setError(null); onClose(); }

  async function doDelete() {
    setDeleting(true); setError(null);
    try {
      const res = await apiFetch("/api/business", { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Failed to delete account");
      }
      clearToken();
      window.location.href = "/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
      setDeleting(false);
    }
  }

  return (
    <Modal open={open} onClose={close}>
      <div className="flex items-center justify-between border-b border-border/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Delete account</h2>
        </div>
        <button onClick={close} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-1.5">
          <p className="text-sm font-semibold text-destructive">This action is permanent and cannot be undone.</p>
          <p className="text-sm text-muted-foreground">
            Deleting <span className="font-semibold text-foreground">{businessName}</span> will permanently remove your business
            profile, all payment plans, customer data, and dispute history.
          </p>
        </div>

        <div>
          <label htmlFor="del-confirm" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Type <span className="font-bold text-foreground">delete</span> to confirm
          </label>
          <input
            id="del-confirm" type="text" value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="delete"
            className="h-11 w-full rounded-xl border border-border/50 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/40 transition-all"
          />
        </div>

        <AnimatePresence>
          {error && (
            <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={close}
            className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border/40 bg-secondary/20 text-sm font-medium text-foreground hover:bg-secondary/40 transition-colors">
            Cancel
          </button>
          <button
            type="button" disabled={confirm !== required || deleting}
            onClick={() => void doDelete()}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-white shadow-sm shadow-destructive/25 transition-opacity hover:opacity-90 disabled:opacity-40">
            {deleting ? <><Loader2 className="h-4 w-4 animate-spin" />Deleting…</> : "Delete my account"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function BusinessSettingsPage() {
  const { theme, toggle } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [prefs, setPrefs] = useState<NotifPrefs>(() => loadPrefs());
  const [prefsSaved, setPrefsSaved] = useState(false);

  const [showChangePw, setShowChangePw] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([apiFetch("/api/business/me"), apiFetch("/api/auth/me")]).then(async ([bRes, aRes]) => {
      if (cancelled) return;
      if (bRes.ok) {
        const d = (await bRes.json()) as { business: Business | null };
        setBusiness(d.business);
        if (d.business) setName(d.business.name);
      } else setBusiness(null);
      if (aRes.ok) {
        const d = (await aRes.json()) as { user: { email: string } };
        setAccountEmail(d.user.email);
      }
    });
    return () => { cancelled = true; };
  }, []);

  async function onSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaveError(null); setSaved(false);
    try {
      const res = await apiFetch("/api/business", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed to save");
      setSaved(true);
      setBusiness((b) => b ? { ...b, name: name.trim() } : b);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  }

  function updatePref<K extends keyof NotifPrefs>(key: K, value: boolean) {
    setPrefs((p) => {
      const next = { ...p, [key]: value };
      savePrefs(next);
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 1800);
      return next;
    });
  }

  if (business === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!business) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-dvh bg-background">

      {/* Modals */}
      <ChangePasswordModal open={showChangePw} onClose={() => setShowChangePw(false)} />
      <DeleteAccountModal open={showDelete} businessName={business.name} onClose={() => setShowDelete(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border/40 transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <BusinessSidebar active="settings" businessName={business.name} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">

        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/40 bg-card/80 px-4 backdrop-blur lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-card text-muted-foreground hover:text-foreground">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-foreground">Settings</p>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={smooth} className="flex flex-col gap-6 lg:gap-8">

            {/* Heading */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Settings</p>
              <h1 className="mt-1 text-2xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
                Business profile
              </h1>
            </div>

            {/* Grid */}
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">

              {/* ── 1. Business profile ── */}
              <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Business profile</h2>
                    <p className="text-xs text-muted-foreground">Your public business name</p>
                  </div>
                </div>
                <div className="border-t border-border/30 pt-5 space-y-4">
                  <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                      {business.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Current name</p>
                      <p className="truncate font-semibold text-foreground">{business.name}</p>
                    </div>
                  </div>

                  <form onSubmit={(e) => void onSaveName(e)} className="space-y-3">
                    <div>
                      <label htmlFor="biz-name" className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Business name
                      </label>
                      <input
                        id="biz-name" required minLength={2} maxLength={120}
                        value={name} onChange={(e) => setName(e.target.value)}
                        className="h-11 w-full rounded-xl border border-border/50 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                      />
                    </div>
                    <AnimatePresence>
                      {saveError && (
                        <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                          {saveError}
                        </motion.p>
                      )}
                      {saved && (
                        <motion.div key="ok" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                          className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm text-primary">
                          <CheckCircle2 className="h-4 w-4" />Saved successfully
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <button type="submit" disabled={saving || name.trim().length < 2}
                      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50">
                      {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Save changes"}
                    </button>
                  </form>
                </div>
              </div>

              {/* ── 2. Appearance ── */}
              <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
                    <p className="text-xs text-muted-foreground">Customise how RepayStream looks</p>
                  </div>
                </div>
                <div className="border-t border-border/30 pt-5">
                  <div className="grid grid-cols-2 gap-3">
                    {(["light", "dark"] as const).map((m) => (
                      <button key={m} onClick={() => { if (theme !== m) toggle(); }}
                        className={`relative flex flex-col items-center gap-3 rounded-2xl border-2 p-4 sm:p-5 transition-all ${theme === m ? "border-primary bg-primary/5" : "border-border/40 hover:border-border hover:bg-secondary/30"}`}>
                        <div className={`flex h-12 w-full items-center justify-center rounded-xl ${m === "dark" ? "bg-zinc-900 border border-zinc-700" : "bg-white border border-gray-200"}`}>
                          {m === "dark"
                            ? <Moon className="h-5 w-5 text-zinc-300" />
                            : <Sun className="h-5 w-5 text-amber-400" />}
                        </div>
                        <span className="text-sm font-semibold capitalize text-foreground">{m}</span>
                        {theme === m && (
                          <div className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">Saved in this browser.</p>
                </div>
              </div>

              {/* ── 3. Notifications ── */}
              <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Bell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Notification preferences</h2>
                      <p className="text-xs text-muted-foreground">Which events send you alerts</p>
                    </div>
                  </div>
                  <AnimatePresence>
                    {prefsSaved && (
                      <motion.span key="ps" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                        <CheckCircle2 className="h-3 w-3" />Saved
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <div className="border-t border-border/30 pt-1">
                  <NotifRow label="Payment success" description="When a debit is successfully charged" checked={prefs.paymentSuccess} onChange={(v) => updatePref("paymentSuccess", v)} />
                  <NotifRow label="Payment failed" description="When a charge attempt fails" checked={prefs.paymentFailed} onChange={(v) => updatePref("paymentFailed", v)} />
                  <NotifRow label="Plan completed" description="When all installments are paid" checked={prefs.planCompleted} onChange={(v) => updatePref("planCompleted", v)} />
                  <NotifRow label="Dispute received" description="When a customer opens a dispute" checked={prefs.disputeReceived} onChange={(v) => updatePref("disputeReceived", v)} />
                  <NotifRow label="Dispute replied" description="When a customer sends a message" checked={prefs.disputeReplied} onChange={(v) => updatePref("disputeReplied", v)} />
                  <NotifRow label="Weekly digest" description="A weekly summary of plan activity" checked={prefs.weeklyDigest} onChange={(v) => updatePref("weeklyDigest", v)} />
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/20 bg-secondary/10 px-3 py-2.5">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                    Sent via email and SMS when API keys are configured on the server. Preferences are saved in this browser.
                  </p>
                </div>
              </div>

              {/* ── 4. Account ── */}
              <div className="rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Account</h2>
                    <p className="text-xs text-muted-foreground">Your sign-in credentials</p>
                  </div>
                </div>
                <div className="border-t border-border/30 pt-5 space-y-3">
                  {accountEmail && (
                    <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
                      <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Signed in as</p>
                        <p className="truncate text-sm font-medium text-foreground">{accountEmail}</p>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowChangePw(true)}
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/40 bg-secondary/10 text-sm font-medium text-foreground hover:bg-secondary/30 transition-colors"
                  >
                    <Key className="h-4 w-4 text-muted-foreground" />Change password
                  </button>
                  <p className="text-xs text-muted-foreground/60">Use a strong, unique password. Account is tied to your email address.</p>
                </div>

                {/* Danger zone */}
                <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <p className="text-sm font-semibold text-destructive">Danger zone</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Permanently deletes your business profile, all plans, and customer data. Cannot be undone.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className="flex h-9 items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 text-xs font-semibold text-destructive hover:bg-destructive/20 transition-colors">
                    <AlertTriangle className="h-3.5 w-3.5" />Delete business account
                  </button>
                </div>
              </div>

            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
