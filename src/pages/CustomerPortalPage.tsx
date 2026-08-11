import { useEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, CreditCard, Wallet, TrendingUp, Clock, CheckCircle2,
  AlertCircle, XCircle, Loader2, RefreshCw, ArrowUpRight, Banknote,
  Plus, ShieldCheck, Calendar, Landmark, ReceiptText, CircleCheck,
  Building2, ChevronRight, MessageSquare, StickyNote, X,
  CalendarDays, FileText, Bell, Home, Sun, Moon, User, Mail, Key,
  Eye, EyeOff,
} from "lucide-react";
import { DisputeChat } from "@/components/dispute-chat";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { apiFetch, clearToken } from "@/lib/api";
import { parseScheduleJsonForDisplay } from "@/lib/utils/schedule";
import { useTheme } from "@/lib/theme";
import mainLogo from "@/assets/main_logo.png";

// ── Types ─────────────────────────────────────────────────────────────────────

type Attempt = {
  id: string; attempt_number: number; amount: number;
  status: string; provider: string | null; failure_reason: string | null; created_at: string;
};
type OfflinePmt = {
  id: string; amount: number; method: string; notes?: string;
  proof_url?: string; status: string; recorded_by: string; created_at: string;
};
type PlanNote = { text: string; created_at: string };
type Plan = {
  id: string; plan_name?: string | null; business_name?: string | null;
  total_amount: number; status: string; payment_method?: string;
  fee_strategy?: string; schedule_json?: unknown; created_at?: string;
  attempts?: Attempt[]; offline_payments?: OfflinePmt[]; notes?: PlanNote[];
};
type PortalData = {
  customer: { id: string; phone: string; email?: string };
  plans: Plan[];
};
type Toast = { id: string; msg: string; ok: boolean };
type Section = "overview" | "plans" | "disputes" | "account";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10);

function naira(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0 });
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}
function fmtDateShort(d: string) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m)-1]} ${parseInt(day)}`;
}
function daysFromNow(d: string) {
  if (!d) return 0;
  const [y, mo, day] = d.split("-").map(Number);
  const due = new Date(Date.UTC(y, mo - 1, day));
  const now = new Date(); now.setUTCHours(0,0,0,0);
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; dot: string; icon: typeof Clock }> = {
  pending_mandate: { label: "Pending",   color: "text-amber-500",        bg: "bg-amber-400/10 border-amber-400/25",     dot: "bg-amber-400",     icon: Clock },
  active:          { label: "Active",    color: "text-emerald-500",      bg: "bg-emerald-400/10 border-emerald-400/25", dot: "bg-emerald-400",   icon: TrendingUp },
  completed:       { label: "Completed", color: "text-blue-400",         bg: "bg-blue-400/10 border-blue-400/25",       dot: "bg-blue-400",      icon: CircleCheck },
  defaulted:       { label: "Defaulted", color: "text-rose-500",         bg: "bg-rose-500/10 border-rose-500/25",       dot: "bg-rose-500",      icon: AlertCircle },
  paused:          { label: "Paused",    color: "text-amber-500",        bg: "bg-amber-400/10 border-amber-400/25",     dot: "bg-amber-400",     icon: Clock },
  cancelled:       { label: "Cancelled", color: "text-muted-foreground", bg: "bg-secondary/30 border-border/30",        dot: "bg-muted-foreground", icon: XCircle },
};

function planStats(p: Plan) {
  const rows = parseScheduleJsonForDisplay(p.schedule_json, p.total_amount);
  const successAttempts = (p.attempts ?? []).filter(a => a.status === "success");
  const totalPaid = successAttempts.reduce((s, a) => s + a.amount, 0);
  const remaining = Math.max(0, p.total_amount - totalPaid);
  const pct = p.total_amount > 0 ? Math.min(100, (totalPaid / p.total_amount) * 100) : 0;
  // Count fully paid installments by cumulative amounts (supports partial offline payments)
  const paidCount = (() => { let c = 0, rem = totalPaid; for (const r of rows) { if (rem >= r.amount) { rem -= r.amount; c++; } else break; } return c; })();
  const next = rows[paidCount];
  const isOverdue = next?.due_date && next.due_date < TODAY && p.status === "active";
  const daysLeft = next?.due_date ? daysFromNow(next.due_date) : null;
  const needsAction = (isOverdue || p.status === "defaulted" || (p.attempts ?? []).some(a => a.status === "failed"))
    && !["completed","cancelled"].includes(p.status);
  return { rows, paidCount, totalPaid, remaining, pct, next, isOverdue, daysLeft, needsAction };
}

// ── Portal Page ───────────────────────────────────────────────────────────────

export function CustomerPortalPage() {
  const { id } = useParams<{ id: string }>();
  const { theme, toggle } = useTheme();
  const [data, setData] = useState<PortalData | null | undefined>(undefined);
  const [section, setSection] = useState<Section>("overview");
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [disputeUnread, setDisputeUnread] = useState(0);

  // offline form state
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineForm, setOfflineForm] = useState({ amount: "", method: "transfer", notes: "", proofUrl: "" });
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  function addToast(msg: string, ok: boolean) {
    const t: Toast = { id: crypto.randomUUID(), msg, ok };
    setToasts(p => [...p, t]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 5000);
  }

  async function reload() {
    if (!id) return;
    const res = await apiFetch(`/api/customer/${id}/portal`);
    if (res.ok) setData((await res.json()) as PortalData);
  }

  useEffect(() => {
    if (!id) { setData(null); return; }
    let cancelled = false;
    void (async () => {
      const res = await apiFetch(`/api/customer/${id}/portal`);
      if (cancelled) return;
      if (!res.ok) { setData(null); return; }
      const d = (await res.json()) as PortalData;
      setData(d);
      // auto-open first plan that needs action
      const urgent = d.plans.find(p => planStats(p).needsAction);
      if (urgent) { setActivePlan(urgent.id); setSection("plans"); }
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Fetch dispute count for unread badge (non-blocking, runs once on mount)
  useEffect(() => {
    void (async () => {
      try {
        const res = await apiFetch("/api/disputes");
        if (res.ok) {
          const d = (await res.json()) as { threads: { status: string }[] };
          const count = d.threads.filter(
            (t) => t.status === "open" || t.status === "in_progress"
          ).length;
          setDisputeUnread(count);
        }
      } catch {
        // silently ignore — badge just stays at 0
      }
    })();
  }, []);

  async function signOut() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clearToken(); window.location.href = "/";
  }

  async function retryDebit(planId: string) {
    if (!id) return;
    setActionLoading(`retry-${planId}`);
    try {
      const res = await apiFetch(`/api/customer/${id}/plans/${planId}/retry-debit`, { method: "POST" });
      const d = await res.json() as { status?: string; message?: string; error?: string };
      if (res.ok) {
        addToast(d.status === "success" ? "Payment successful! Balance updated." :
          d.status === "pending" ? "Payment processing — we'll notify you." :
          `Charge failed: ${d.message ?? "try another method"}`, d.status === "success");
        if (d.status === "success") await reload();
      } else addToast(d.error ?? "Retry failed", false);
    } finally { setActionLoading(null); }
  }

  async function payNow(planId: string) {
    if (!id) return;
    setActionLoading(`paynow-${planId}`);
    try {
      const res = await apiFetch(`/api/customer/${id}/plans/${planId}/pay-now`, { method: "POST" });
      const d = await res.json() as { authorizationUrl?: string; error?: string };
      if (res.ok && d.authorizationUrl) window.location.href = d.authorizationUrl;
      else { addToast(d.error ?? "Could not start payment", false); setActionLoading(null); }
    } catch { addToast("Could not start payment", false); setActionLoading(null); }
  }

  async function updateMethod(planId: string) {
    if (!id) return;
    setActionLoading(`update-${planId}`);
    try {
      const res = await apiFetch(`/api/customer/${id}/plans/${planId}/update-payment-method`, { method: "POST" });
      const d = await res.json() as { authorizationUrl?: string; error?: string };
      if (res.ok && d.authorizationUrl) window.location.href = d.authorizationUrl;
      else { addToast(d.error ?? "Could not start card update", false); setActionLoading(null); }
    } catch { addToast("Could not start card update", false); setActionLoading(null); }
  }

  async function submitOffline(e: React.FormEvent, planId: string) {
    e.preventDefault();
    if (!id) return;
    const amt = parseFloat(offlineForm.amount);
    if (isNaN(amt) || amt <= 0) { setOfflineError("Enter a valid amount"); return; }
    setOfflineLoading(true); setOfflineError(null);
    try {
      const res = await apiFetch(`/api/offline/customer/${id}/plans/${planId}/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, method: offlineForm.method, notes: offlineForm.notes || undefined, proofUrl: offlineForm.proofUrl || undefined }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setOfflineForm({ amount: "", method: "transfer", notes: "", proofUrl: "" });
      setShowOfflineForm(false);
      await reload();
      addToast("Payment submitted for business review.", true);
    } catch (err) {
      setOfflineError(err instanceof Error ? err.message : "Error");
    } finally { setOfflineLoading(false); }
  }

  // ── Loading / auth ────────────────────────────────────────────────────────

  if (data === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading your portal…</p>
        </div>
      </div>
    );
  }
  if (!data) return <Navigate to="/login?error=unauthorized" replace />;

  // ── Aggregate stats ───────────────────────────────────────────────────────

  let totalRemaining = 0, totalPaidAll = 0;
  let nextDueDate = "", nextDueAmount = 0;
  let overdueCount = 0;

  for (const p of data.plans) {
    const s = planStats(p);
    totalPaidAll += s.totalPaid;
    if (!["completed","cancelled"].includes(p.status)) totalRemaining += s.remaining;
    if (p.status === "active" && s.next?.due_date) {
      if (!nextDueDate || s.next.due_date < nextDueDate) { nextDueDate = s.next.due_date; nextDueAmount = s.next.amount; }
    }
    if (s.needsAction) overdueCount++;
  }

  const currentPlan = data.plans.find(p => p.id === activePlan) ?? null;

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-dvh bg-background">

      {/* ── Toast layer ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[400] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl shadow-black/30 max-w-xs
                ${t.ok ? "border-emerald-400/30 bg-card text-foreground" : "border-rose-500/30 bg-card text-foreground"}`}
            >
              {t.ok
                ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-400" />
                : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-rose-500" />}
              <p className="text-sm leading-snug">{t.msg}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Mobile overlay ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border/40 bg-card transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
              <img src={mainLogo} alt="RepayStream" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
            </div>
            <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>RepayStream</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Customer identity */}
        <div className="border-b border-border/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
              {(data.customer.email ?? data.customer.phone).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{data.customer.email ?? data.customer.phone}</p>
              {data.customer.phone && data.customer.email && (
                <p className="truncate text-xs text-muted-foreground">{data.customer.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {[
            { id: "overview" as Section, label: "Overview", icon: Home },
            { id: "plans" as Section, label: "My Plans", icon: CreditCard, badge: overdueCount > 0 ? overdueCount : undefined },
            { id: "disputes" as Section, label: "Disputes & Messages", icon: MessageSquare, badge: disputeUnread > 0 ? disputeUnread : undefined },
            { id: "account" as Section, label: "My Account", icon: User },
          ].map(item => (
            <button key={item.id} onClick={() => { setSection(item.id); setSidebarOpen(false); }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                section === item.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge != null && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </button>
          ))}

          {/* Plan list */}
          {data.plans.length > 0 && section === "plans" && (
            <div className="mt-2">
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Plans</p>
              {data.plans.map(p => {
                const s = planStats(p);
                const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pending_mandate;
                return (
                  <button key={p.id} onClick={() => setActivePlan(p.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      activePlan === p.id ? "bg-secondary/60 text-foreground" : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                    }`}
                  >
                    <div className={`flex h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{p.plan_name ?? "Untitled plan"}</p>
                      <p className="text-[11px] text-muted-foreground/60">{naira(p.total_amount)} · {cfg.label}</p>
                    </div>
                    {s.needsAction && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />}
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        {/* Bottom controls */}
        <div className="shrink-0 border-t border-border/40 p-3 space-y-1">
          <div className="flex items-center justify-between rounded-xl px-3 py-2">
            <span className="text-xs text-muted-foreground">Theme</span>
            <button onClick={toggle} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground">
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          </div>
          <button onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            <LogOut className="h-4 w-4 shrink-0" />Sign out
          </button>
          <div className="flex items-center gap-1.5 px-3 py-2">
            <ShieldCheck className="h-3 w-3 text-primary/50" />
            <span className="text-[10px] text-muted-foreground/50">CBN Direct Debit · Secured by Paystack</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 bg-card/50 px-5 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/50 lg:hidden">
              <FileText className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {section === "overview" && "Overview"}
                {section === "plans" && (currentPlan ? (currentPlan.plan_name ?? "Repayment plan") : "My Plans")}
                {section === "disputes" && "Disputes & Messages"}
                {section === "account" && "My Account"}
              </h1>
              {section === "plans" && currentPlan && (
                <p className="text-xs text-muted-foreground">{currentPlan.business_name ?? "Business"} · #{currentPlan.id.slice(-8)}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <div className="hidden items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 sm:flex">
                <Bell className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-xs font-medium text-rose-500">{overdueCount} plan{overdueCount > 1 ? "s" : ""} need attention</span>
              </div>
            )}
            <NotificationsPanel panelPosition="right" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ══ OVERVIEW ═══════════════════════════════════════════════════ */}
            {section === "overview" && (
              <motion.div key="overview"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-8 p-6 sm:p-8"
              >
                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  {[
                    { label: "Total outstanding", value: naira(totalRemaining), sub: "across all plans", accent: "text-foreground" },
                    { label: "Total paid", value: naira(totalPaidAll), sub: "all time", accent: "text-primary" },
                    { label: "Active plans", value: String(data.plans.filter(p => p.status === "active").length), sub: "currently running", accent: "text-blue-400" },
                    { label: "Completed", value: String(data.plans.filter(p => p.status === "completed").length), sub: "fully paid off", accent: "text-emerald-400" },
                  ].map(s => (
                    <div key={s.label} className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-card p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className={`text-2xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground/60">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Next payment callout */}
                {nextDueDate && (
                  <div className={`flex items-center gap-4 rounded-2xl border p-5 ${
                    nextDueDate < TODAY
                      ? "border-rose-500/25 bg-rose-500/8"
                      : daysFromNow(nextDueDate) <= 3
                      ? "border-amber-400/25 bg-amber-400/8"
                      : "border-border/40 bg-card"
                  }`}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {nextDueDate < TODAY ? "Overdue payment" : daysFromNow(nextDueDate) === 0 ? "Due today" : `Next payment due ${fmtDateShort(nextDueDate)}`}
                      </p>
                      <p className="text-2xl font-bold tabular-nums text-foreground">{naira(nextDueAmount)}</p>
                    </div>
                    {nextDueDate < TODAY ? (
                      <span className="shrink-0 rounded-xl bg-rose-500/15 px-3 py-1.5 text-sm font-semibold text-rose-500">
                        {Math.abs(daysFromNow(nextDueDate))}d overdue
                      </span>
                    ) : daysFromNow(nextDueDate) <= 7 ? (
                      <span className="shrink-0 rounded-xl bg-amber-400/15 px-3 py-1.5 text-sm font-semibold text-amber-500">
                        {daysFromNow(nextDueDate) === 0 ? "Today" : `${daysFromNow(nextDueDate)}d`}
                      </span>
                    ) : null}
                  </div>
                )}

                {/* Plans summary cards */}
                <div>
                  <h2 className="mb-4 text-sm font-semibold text-foreground">Your repayment plans</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.plans.map(p => {
                      const s = planStats(p);
                      const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pending_mandate;
                      return (
                        <button key={p.id}
                          onClick={() => { setSection("plans"); setActivePlan(p.id); }}
                          className={`group flex flex-col gap-4 rounded-2xl border p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm ${
                            s.needsAction ? "border-rose-500/30 bg-rose-500/4" : p.status === "pending_mandate" ? "border-amber-400/30 bg-amber-400/4" : "border-border/40 bg-card"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">{p.plan_name ?? "Repayment plan"}</p>
                              {p.business_name && <p className="text-xs text-muted-foreground">{p.business_name}</p>}
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>
                              <cfg.icon className="h-3 w-3" />{cfg.label}
                            </span>
                          </div>
                          <div>
                            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                              <span>{naira(s.totalPaid)} paid</span>
                              <span className="font-medium text-foreground">{naira(p.total_amount)}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.pct}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            {s.next?.due_date ? (
                              <p className={`text-xs ${s.isOverdue ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                                {s.isOverdue ? `Overdue · ${fmtDateShort(s.next.due_date)}` : `Next · ${fmtDateShort(s.next.due_date)}`}
                              </p>
                            ) : <span />}
                            <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                              View details <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══ PLANS ══════════════════════════════════════════════════════ */}
            {section === "plans" && (
              <motion.div key="plans"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex h-full flex-col"
              >
                {!currentPlan ? (
                  /* Plan picker */
                  <div className="p-6 sm:p-8">
                    <p className="mb-5 text-sm font-semibold text-muted-foreground">Your repayment plans</p>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {data.plans.map(p => {
                      const s = planStats(p);
                      const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pending_mandate;
                      return (
                        <button key={p.id} onClick={() => setActivePlan(p.id)}
                          className={`group flex w-full flex-col gap-4 rounded-2xl border p-5 text-left transition-all hover:border-primary/40 hover:shadow-sm ${
                            s.needsAction ? "border-rose-500/30 bg-rose-500/4" : p.status === "pending_mandate" ? "border-amber-400/30 bg-amber-400/4" : "border-border/40 bg-card"
                          }`}>
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}>
                                <cfg.icon className={`h-5 w-5 ${cfg.color}`} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-foreground truncate">{p.plan_name ?? "Repayment plan"}</p>
                                {p.business_name && <p className="text-xs text-muted-foreground">{p.business_name}</p>}
                              </div>
                            </div>
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.bg} ${cfg.color}`}>
                              <cfg.icon className="h-3 w-3" />{cfg.label}
                            </span>
                          </div>
                          {/* Progress */}
                          <div>
                            <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                              <span>{naira(s.totalPaid)} paid</span>
                              <span className="font-medium text-foreground">{naira(p.total_amount)}</span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.pct}%` }} />
                            </div>
                          </div>
                          {/* Bottom row */}
                          <div className="flex items-center justify-between">
                            <div>
                              {s.next?.due_date ? (
                                <p className={`text-xs font-medium ${s.isOverdue ? "text-rose-500" : "text-muted-foreground"}`}>
                                  {s.isOverdue
                                    ? `${Math.abs(s.daysLeft ?? 0)}d overdue · ${naira(s.next.amount)}`
                                    : s.daysLeft === 0
                                    ? `Due today · ${naira(s.next.amount)}`
                                    : `Next ${fmtDateShort(s.next.due_date)} · ${naira(s.next.amount)}`}
                                </p>
                              ) : p.status === "completed" ? (
                                <p className="text-xs font-medium text-blue-400">Fully paid off</p>
                              ) : <span />}
                            </div>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors">
                              View details <ChevronRight className="h-3 w-3" />
                            </span>
                          </div>
                        </button>
                      );
                    })}
                    </div>
                  </div>
                ) : (
                  <PlanDetailView
                    plan={currentPlan}
                    customerId={id!}
                    actionLoading={actionLoading}
                    showOfflineForm={showOfflineForm}
                    offlineForm={offlineForm}
                    offlineLoading={offlineLoading}
                    offlineError={offlineError}
                    onRetry={retryDebit}
                    onPayNow={payNow}
                    onUpdateMethod={updateMethod}
                    onShowOfflineForm={setShowOfflineForm}
                    onOfflineFormChange={setOfflineForm}
                    onOfflineSubmit={submitOffline}
                    onOfflineErrorClear={() => setOfflineError(null)}
                    onBack={() => setActivePlan(null)}
                  />
                )}
              </motion.div>
            )}

            {/* ══ DISPUTES ═══════════════════════════════════════════════════ */}
            {section === "disputes" && (
              <motion.div key="disputes"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-8"
              >
                <DisputeChat
                  customerId={data.customer.id}
                  plans={data.plans.map(p => ({ id: p.id, total_amount: p.total_amount, plan_name: p.plan_name ?? null }))}
                />
              </motion.div>
            )}

            {/* ══ ACCOUNT ════════════════════════════════════════════════════ */}
            {section === "account" && (
              <motion.div key="account"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="p-6 sm:p-8"
              >
                <CustomerAccountSection customerId={data.customer.id} customer={data.customer} />
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

// ── Customer Account Section ──────────────────────────────────────────────────

function PwField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          className="h-11 w-full rounded-xl border border-border/50 bg-background px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
        <button type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function CustomerAccountSection({ customerId, customer }: { customerId: string; customer: { phone: string; email?: string } }) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) { setPwError("New passwords do not match"); return; }
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters"); return; }
    setPwSaving(true); setPwError(null);
    try {
      const res = await apiFetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const d = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setPwDone(true);
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwDone(false), 3000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed");
    } finally { setPwSaving(false); }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Account</p>
        <h2 className="mt-1 text-xl font-bold text-foreground" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>My Account</h2>
      </div>

      {/* Identity card */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Identity</h3>
            <p className="text-xs text-muted-foreground">Your registered contact info</p>
          </div>
        </div>
        <div className="border-t border-border/30 pt-4 space-y-3">
          {customer.email && (
            <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Email</p>
                <p className="text-sm font-medium text-foreground">{customer.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Phone</p>
              <p className="text-sm font-medium text-foreground">{customer.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Customer ID</p>
              <p className="font-mono text-sm text-muted-foreground">#{customerId.slice(-12)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="rounded-2xl border border-border/40 bg-card p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Key className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Change password</h3>
            <p className="text-xs text-muted-foreground">Keep your account secure</p>
          </div>
        </div>
        <div className="border-t border-border/30 pt-4">
          {pwDone ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-primary">Password updated successfully!</p>
            </motion.div>
          ) : (
            <form onSubmit={(e) => void changePw(e)} className="space-y-3">
              <PwField id="c-cur-pw" label="Current password" value={currentPw} onChange={setCurrentPw} />
              <PwField id="c-new-pw" label="New password" value={newPw} onChange={setNewPw} />
              <PwField id="c-con-pw" label="Confirm new password" value={confirmPw} onChange={setConfirmPw} />
              <AnimatePresence>
                {pwError && (
                  <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500">
                    {pwError}
                  </motion.p>
                )}
              </AnimatePresence>
              <button type="submit" disabled={pwSaving || !currentPw || !newPw || !confirmPw}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50">
                {pwSaving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Security info */}
      <div className="flex items-start gap-2 rounded-xl border border-border/20 bg-secondary/10 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground/60 leading-relaxed">
          Your account is secured by CBN Direct Debit standards. Contact your business provider if you need to update your phone number or email.
        </p>
      </div>
    </div>
  );
}

// ── Plan Detail View ──────────────────────────────────────────────────────────

interface PlanDetailViewProps {
  plan: Plan; customerId: string; actionLoading: string | null;
  showOfflineForm: boolean; offlineLoading: boolean; offlineError: string | null;
  offlineForm: { amount: string; method: string; notes: string; proofUrl: string };
  onRetry(id: string): void; onPayNow(id: string): void; onUpdateMethod(id: string): void;
  onShowOfflineForm(v: boolean): void;
  onOfflineFormChange(f: { amount: string; method: string; notes: string; proofUrl: string }): void;
  onOfflineSubmit(e: React.FormEvent, planId: string): void;
  onOfflineErrorClear(): void; onBack(): void;
}

function PlanDetailView({ plan: p, customerId, actionLoading, showOfflineForm, offlineForm, offlineLoading, offlineError,
  onRetry, onPayNow, onUpdateMethod, onShowOfflineForm, onOfflineFormChange, onOfflineSubmit, onOfflineErrorClear, onBack }: PlanDetailViewProps) {

  const [tab, setTab] = useState<"schedule"|"history"|"offline"|"notes">("schedule");
  const s = planStats(p);
  const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.pending_mandate;

  const tabs = [
    { id: "schedule" as const, label: "Schedule", icon: CalendarDays },
    { id: "history" as const, label: "Payments", icon: ReceiptText, badge: (p.attempts ?? []).length },
    { id: "offline" as const, label: "Offline", icon: Landmark, badge: (p.offline_payments ?? []).length || undefined },
    { id: "notes" as const, label: "Notes", icon: StickyNote, badge: (p.notes ?? []).length || undefined },
  ];

  return (
    <div className="flex h-full flex-col">

      {/* Plan hero */}
      <div className="border-b border-border/40 bg-card/50 px-6 py-5 sm:px-8">
        {/* Back on mobile */}
        <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground lg:hidden">
          <ChevronRight className="h-3 w-3 rotate-180" />Back to plans
        </button>

        {/* Pending mandate banner */}
        {p.status === "pending_mandate" && (
          <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-400/8 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold text-amber-400">Mandate authorization required</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Your payment method hasn't been authorized yet. Authorize your card/account to activate this plan and enable automatic debits — or pay the full amount now via Paystack checkout.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <a
                  href={`/plan/${p.id}`}
                  className="flex h-8 items-center gap-1.5 rounded-xl bg-amber-500 px-3 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />Authorize mandate
                </a>
                <QuickBtn
                  label="Pay now"
                  loading={actionLoading === `paynow-${p.id}`}
                  disabled={!!actionLoading}
                  cls="border border-border/40 bg-card text-foreground hover:bg-secondary/50"
                  icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                  onClick={() => onPayNow(p.id)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action banner */}
        {s.needsAction && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/8 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <p className="text-sm font-medium text-rose-400">
                {p.status === "defaulted" ? "Plan defaulted — action required" : `Overdue installment · ${s.next?.due_date ? fmtDate(s.next.due_date) : ""}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickBtn label="Retry debit" loading={actionLoading === `retry-${p.id}`} disabled={!!actionLoading}
                cls="bg-primary text-primary-foreground hover:opacity-90"
                icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => onRetry(p.id)} />
              <QuickBtn label="Pay manually" loading={actionLoading === `paynow-${p.id}`} disabled={!!actionLoading}
                cls="border border-border/40 bg-card text-foreground hover:bg-secondary/50"
                icon={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={() => onPayNow(p.id)} />
              <QuickBtn label="Update card" loading={actionLoading === `update-${p.id}`} disabled={!!actionLoading}
                cls="border border-border/40 bg-card text-foreground hover:bg-secondary/50"
                icon={<CreditCard className="h-3.5 w-3.5" />} onClick={() => onUpdateMethod(p.id)} />
            </div>
          </div>
        )}

        {/* Plan summary row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${cfg.bg}`}>
              <cfg.icon className={`h-6 w-6 ${cfg.color}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{p.plan_name ?? "Repayment plan"}</h2>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${cfg.bg} ${cfg.color}`}>
                  <cfg.icon className="h-3 w-3" />{cfg.label}
                </span>
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {p.business_name && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{p.business_name}</span>}
                <span className="font-mono">#{p.id.slice(-8)}</span>
                {p.created_at && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />Created {fmtDate(p.created_at)}</span>}
                <span className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {p.payment_method === "bank" ? "Bank debit" : "Card"} ·{" "}
                  {p.fee_strategy === "pass_to_customer" ? "Fees passed to you" : "Fees absorbed"}
                </span>
              </div>
            </div>
          </div>

          {/* Amount summary */}
          <div className="flex flex-wrap gap-6">
            <Stat label="Total" value={naira(p.total_amount)} valueClass="text-foreground" />
            <Stat label="Paid" value={naira(s.totalPaid)} valueClass="text-primary" />
            <Stat label="Remaining" value={naira(s.remaining)} valueClass={s.remaining > 0 ? "text-foreground" : "text-muted-foreground"} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{s.paidCount} of {s.rows.length} installment{s.rows.length !== 1 ? "s" : ""} paid</span>
            <span className={s.pct >= 100 ? "font-semibold text-primary" : ""}>{Math.round(s.pct)}% complete</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary/40">
            <motion.div className={`h-full rounded-full ${s.pct >= 100 ? "bg-blue-400" : "bg-primary"}`}
              initial={{ width: 0 }} animate={{ width: `${s.pct}%` }}
              transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }} />
          </div>
        </div>

        {/* Next installment strip */}
        {p.status === "active" && s.next && (
          <div className={`mt-4 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
            s.isOverdue ? "border-rose-500/25 bg-rose-500/8" :
            s.daysLeft !== null && s.daysLeft <= 3 ? "border-amber-400/25 bg-amber-400/8" :
            "border-border/30 bg-secondary/20"
          }`}>
            <Calendar className={`h-4 w-4 shrink-0 ${s.isOverdue ? "text-rose-500" : "text-primary"}`} />
            <p className="text-sm text-foreground">
              {s.isOverdue ? "Overdue:" : s.daysLeft === 0 ? "Due today:" : `Next due ${fmtDate(s.next.due_date)}:`}
              <span className="ml-2 font-bold">{naira(s.next.amount)}</span>
            </p>
            {s.isOverdue
              ? <span className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-xs font-semibold text-rose-500">{Math.abs(s.daysLeft ?? 0)}d overdue</span>
              : s.daysLeft !== null && s.daysLeft <= 7
              ? <span className="rounded-lg bg-amber-400/15 px-2.5 py-1 text-xs font-semibold text-amber-500">{s.daysLeft === 0 ? "Today" : `${s.daysLeft}d`}</span>
              : null}
            {/* Early payment button — always available for active plans */}
            {!s.needsAction && (
              <QuickBtn
                label="Pay early"
                loading={actionLoading === `paynow-${p.id}`}
                disabled={!!actionLoading}
                cls="ml-auto border border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                icon={<ArrowUpRight className="h-3.5 w-3.5" />}
                onClick={() => onPayNow(p.id)}
              />
            )}
          </div>
        )}

        {/* Quick actions row for active plans (not overdue) */}
        {p.status === "active" && !s.needsAction && s.next && (
          <div className="mt-3 flex flex-wrap gap-2">
            <QuickBtn
              label="Retry auto-debit"
              loading={actionLoading === `retry-${p.id}`}
              disabled={!!actionLoading}
              cls="border border-border/40 bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              onClick={() => onRetry(p.id)}
            />
            <QuickBtn
              label="Update card"
              loading={actionLoading === `update-${p.id}`}
              disabled={!!actionLoading}
              cls="border border-border/40 bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              icon={<CreditCard className="h-3.5 w-3.5" />}
              onClick={() => onUpdateMethod(p.id)}
            />
          </div>
        )}

        {p.status === "completed" && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-blue-400/25 bg-blue-400/8 px-4 py-3">
            <CircleCheck className="h-5 w-5 text-blue-400" />
            <p className="text-sm font-medium text-blue-400">All installments paid — plan complete!</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-border/40 bg-card/30 px-6 sm:px-8">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="rounded-full bg-secondary/60 px-1.5 py-0.5 text-[10px] font-semibold">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* Schedule */}
          {tab === "schedule" && (
            <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-6 sm:p-8">
              {s.rows.length === 0 ? (
                <EmptyState icon={<CalendarDays className="h-8 w-8" />} label="No schedule found" />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/40">
                  <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 border-b border-border/30 bg-secondary/30 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span>#</span><span>Due date</span><span className="text-right">Amount</span><span className="text-right w-20">Status</span>
                  </div>
                  {s.rows.map((row, i) => {
                    const isPaid = i < s.paidCount;
                    const isOD = !isPaid && row.due_date && row.due_date < TODAY && p.status === "active";
                    const isCur = i === s.paidCount && p.status === "active";
                    return (
                      <div key={i} className={`grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 px-4 py-3.5 text-sm ${i > 0 ? "border-t border-border/10" : ""} ${isOD ? "bg-rose-500/5" : isCur ? "bg-amber-400/5" : ""}`}>
                        <span className="font-mono text-xs text-muted-foreground/40">{i + 1}</span>
                        <span className={isPaid ? "text-muted-foreground/50 line-through" : "text-foreground"}>{fmtDate(row.due_date)}</span>
                        <span className={`font-mono font-semibold text-right ${isPaid ? "text-muted-foreground/50" : "text-foreground"}`}>{naira(row.amount)}</span>
                        <span className={`w-20 text-right text-[11px] font-semibold ${isPaid ? "text-primary" : isOD ? "text-rose-500" : isCur ? "text-amber-500" : "text-muted-foreground/40"}`}>
                          {isPaid ? "Paid" : isOD ? "Overdue" : isCur ? "Due next" : "Upcoming"}
                        </span>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between border-t border-border/30 bg-secondary/10 px-4 py-3">
                    <span className="text-xs text-muted-foreground">{s.paidCount} of {s.rows.length} paid</span>
                    <span className="text-sm font-bold text-foreground">{naira(p.total_amount)}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Payment history */}
          {tab === "history" && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-6 sm:p-8">
              {!(p.attempts ?? []).length ? (
                <EmptyState icon={<ReceiptText className="h-8 w-8" />} label="No payment attempts yet" />
              ) : (
                <div className="space-y-2">
                  {[...(p.attempts ?? [])].reverse().map(a => (
                    <div key={a.id} className="flex items-center gap-4 rounded-2xl border border-border/30 bg-card p-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        a.status === "success" ? "bg-primary/10 text-primary" :
                        a.status === "pending" ? "bg-amber-400/10 text-amber-500" :
                        a.status === "refunded" ? "bg-blue-400/10 text-blue-400" :
                        "bg-rose-500/10 text-rose-500"
                      }`}>
                        {a.status === "success" && <CheckCircle2 className="h-5 w-5" />}
                        {a.status === "pending" && <Clock className="h-5 w-5" />}
                        {a.status === "failed" && <XCircle className="h-5 w-5" />}
                        {a.status === "refunded" && <RefreshCw className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold tabular-nums text-foreground">{naira(a.amount)}</span>
                          <span className={`text-xs font-semibold capitalize ${
                            a.status === "success" ? "text-primary" :
                            a.status === "pending" ? "text-amber-500" :
                            a.status === "refunded" ? "text-blue-400" : "text-rose-500"
                          }`}>{a.status}</span>
                          {a.attempt_number > 0 && <span className="text-xs text-muted-foreground/60">Attempt #{a.attempt_number}</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {a.provider === "paystack" ? "Card · Paystack" : a.provider === null ? "Offline / manual" : a.provider}
                          {a.failure_reason && <> · <span className="text-rose-400">{a.failure_reason.replace(/_/g, " ")}</span></>}
                        </p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground/60">{fmtDate(a.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Offline payments */}
          {tab === "offline" && (
            <motion.div key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-6 sm:p-8">

              {/* Submit button */}
              {!["completed","cancelled"].includes(p.status) && (
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Paid outside the platform? Submit it here.</p>
                  <button onClick={() => { onShowOfflineForm(!showOfflineForm); onOfflineErrorClear(); }}
                    className="flex items-center gap-2 rounded-xl border border-border/40 bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">
                    {showOfflineForm ? <><X className="h-4 w-4" />Cancel</> : <><Plus className="h-4 w-4" />Record payment</>}
                  </button>
                </div>
              )}

              {/* Form */}
              <AnimatePresence>
                {showOfflineForm && (
                  <motion.form key="form" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                    onSubmit={e => void onOfflineSubmit(e, p.id)} className="overflow-hidden mb-4">
                    <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
                      <h3 className="font-semibold text-foreground">Submit offline payment</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount (₦)</label>
                          <input type="number" min="1" step="0.01" required placeholder="5000"
                            value={offlineForm.amount} onChange={e => onOfflineFormChange({ ...offlineForm, amount: e.target.value })}
                            className="input-base" />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-muted-foreground">Method</label>
                          <select value={offlineForm.method} onChange={e => onOfflineFormChange({ ...offlineForm, method: e.target.value })} className="input-base">
                            <option value="transfer">Bank transfer</option>
                            <option value="cash">Cash</option>
                            <option value="pos">POS</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Notes (optional)</label>
                        <input type="text" placeholder="e.g. Paid at Zenith Bank branch"
                          value={offlineForm.notes} onChange={e => onOfflineFormChange({ ...offlineForm, notes: e.target.value })}
                          className="input-base" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-muted-foreground">Receipt / proof URL (optional)</label>
                        <input type="url" placeholder="https://drive.google.com/..."
                          value={offlineForm.proofUrl} onChange={e => onOfflineFormChange({ ...offlineForm, proofUrl: e.target.value })}
                          className="input-base" />
                      </div>
                      {offlineError && (
                        <p className="flex items-center gap-1.5 text-sm text-rose-500"><AlertCircle className="h-4 w-4" />{offlineError}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60">The business will review your submission before it updates your balance.</p>
                      <button type="submit" disabled={offlineLoading || !offlineForm.amount}
                        className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                        {offlineLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                        Submit for approval
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Existing offline payments */}
              {!(p.offline_payments ?? []).length && !showOfflineForm ? (
                <EmptyState icon={<Landmark className="h-8 w-8" />} label="No offline payments recorded" sub="Cash, POS, or bank transfer payments can be submitted here" />
              ) : (
                <div className="space-y-2">
                  {(p.offline_payments ?? []).map(op => (
                    <div key={op.id} className="flex items-center gap-4 rounded-2xl border border-border/30 bg-card p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/40 text-muted-foreground">
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold tabular-nums text-foreground">{naira(op.amount)}</span>
                          <span className="capitalize text-xs text-muted-foreground">{op.method.replace(/_/g, " ")}</span>
                          {op.recorded_by === "business" && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Recorded by business</span>}
                        </div>
                        {op.notes && <p className="mt-0.5 text-xs text-muted-foreground">{op.notes}</p>}
                        {op.proof_url && <a href={op.proof_url} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 text-xs text-primary hover:underline"><FileText className="h-3 w-3" />View receipt</a>}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                          op.status === "approved" ? "border-primary/25 bg-primary/10 text-primary" :
                          op.status === "rejected" ? "border-rose-500/25 bg-rose-500/10 text-rose-500" :
                          "border-amber-400/25 bg-amber-400/10 text-amber-500"
                        }`}>
                          {op.status === "pending_approval" ? "Awaiting review" : op.status.charAt(0).toUpperCase() + op.status.slice(1)}
                        </span>
                        <p className="text-[11px] text-muted-foreground/60">{fmtDate(op.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Notes from business */}
          {tab === "notes" && (
            <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-6 sm:p-8">
              {!(p.notes ?? []).length ? (
                <EmptyState icon={<StickyNote className="h-8 w-8" />} label="No notes from business" sub="The business can leave notes on your plan that will appear here" />
              ) : (
                <div className="space-y-3">
                  {(p.notes ?? []).map((n, i) => (
                    <div key={i} className="flex gap-4 rounded-2xl border border-border/30 bg-card p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-500">
                        <StickyNote className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground leading-relaxed">{n.text}</p>
                        <p className="mt-1.5 text-xs text-muted-foreground/60">{fmtDate(n.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function QuickBtn({ label, loading, disabled, cls, icon, onClick }: {
  label: string; loading: boolean; disabled: boolean; cls: string; icon: React.ReactNode; onClick(): void;
}) {
  return (
    <button disabled={disabled} onClick={onClick}
      className={`flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-opacity disabled:opacity-50 ${cls}`}>
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}{label}
    </button>
  );
}

function EmptyState({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border/50 text-muted-foreground/30">{icon}</div>
      <p className="font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 max-w-xs text-sm text-muted-foreground/60">{sub}</p>}
    </div>
  );
}
