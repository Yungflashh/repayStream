import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CalendarRange, CheckCircle2, Clock, Copy, CreditCard,
  FileText, Hash, Mail, PauseCircle, Phone, PlayCircle, StickyNote,
  TrendingUp, AlertCircle, XCircle, ExternalLink, UserCheck, Loader2,
  Check, Send, X, Banknote, ThumbsUp, ThumbsDown, Tag, ChevronRight,
  ReceiptText, Landmark, MessageSquare, CalendarDays, ShieldCheck,
  Calendar, CircleCheck, Plus, Users, Settings, LogOut, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { DisputeChat } from "@/components/dispute-chat";
import { BackButton } from "@/components/BackButton";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { apiFetch, clearToken } from "@/lib/api";
import { parseScheduleJsonForDisplay } from "@/lib/utils/schedule";
import { useConfirm } from "@/lib/confirm";
import mainLogo from "@/assets/main_logo.png";

// ── Types ──────────────────────────────────────────────────────────────────────

type Attempt = {
  id: string; attempt_number: number; amount: number; status: string;
  provider: string; failure_reason: string | null; external_ref: string; created_at: string;
};
type PlanNote = { text: string; created_at: string };
type OfflinePmt = {
  id: string; amount: number; method: string; notes?: string; proof_url?: string;
  status: "pending_approval" | "approved" | "rejected"; recorded_by: string;
  created_at: string; approved_at?: string;
};
type PlanDetail = {
  plan: {
    id: string; plan_name: string | null; total_amount: number; status: string;
    payment_method: string; fee_strategy: string; schedule_json: unknown;
    created_at: string; notes: PlanNote[];
    customer: { id: string; name: string | null; phone: string; email: string } | null;
  };
  attempts: Attempt[];
};
type Toast = { id: string; msg: string; ok: boolean };
type Tab = "schedule" | "payments" | "offline" | "notes" | "disputes";

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, {
  color: string; bg: string; border: string; glow: string; dot: string;
  icon: typeof Clock; label: string;
}> = {
  pending_mandate: { color: "text-amber-400",       bg: "bg-amber-400/10",   border: "border-amber-400/30",   glow: "rgba(251,191,36,0.15)",  dot: "bg-amber-400",        icon: Clock,       label: "Pending mandate" },
  active:          { color: "text-primary",          bg: "bg-primary/10",     border: "border-primary/30",     glow: "rgba(0,180,70,0.15)",    dot: "bg-primary",          icon: TrendingUp,  label: "Active" },
  completed:       { color: "text-blue-400",         bg: "bg-blue-400/10",    border: "border-blue-400/30",    glow: "rgba(96,165,250,0.15)",  dot: "bg-blue-400",         icon: CircleCheck, label: "Completed" },
  defaulted:       { color: "text-rose-500",         bg: "bg-rose-500/10",    border: "border-rose-500/30",    glow: "rgba(239,68,68,0.15)",   dot: "bg-rose-500",         icon: AlertCircle, label: "Defaulted" },
  paused:          { color: "text-amber-500",        bg: "bg-amber-500/10",   border: "border-amber-500/30",   glow: "rgba(245,158,11,0.15)",  dot: "bg-amber-500",        icon: PauseCircle, label: "Paused" },
  cancelled:       { color: "text-muted-foreground", bg: "bg-secondary/30",   border: "border-border/30",      glow: "rgba(100,100,100,0.08)", dot: "bg-muted-foreground", icon: XCircle,     label: "Cancelled" },
};

const TODAY = new Date().toISOString().slice(0, 10);

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function naira(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG");
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanDetailPage() {
  const { id }   = useParams<{ id: string }>();
  const confirm  = useConfirm();
  const { theme, toggle } = useTheme();

  const [data,           setData]           = useState<PlanDetail | null | undefined>(undefined);
  const [offline,        setOffline]        = useState<OfflinePmt[]>([]);
  const [tab,            setTab]            = useState<Tab>("schedule");
  const [actionLoading,  setActionLoading]  = useState<string | null>(null);
  const [copiedM,        setCopiedM]        = useState(false);
  const [copiedC,        setCopiedC]        = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);
  const [toasts,         setToasts]         = useState<Toast[]>([]);

  // Note form
  const [noteText,      setNoteText]      = useState("");
  const [noteLoading,   setNoteLoading]   = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Offline form
  const [offlineForm,    setOfflineForm]    = useState({ amount: "", method: "transfer", notes: "", proofUrl: "" });
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError,   setOfflineError]   = useState<string | null>(null);
  const [showOfflineForm, setShowOfflineForm] = useState(false);

  function addToast(msg: string, ok: boolean) {
    const t: Toast = { id: crypto.randomUUID(), msg, ok };
    setToasts(p => [...p, t]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== t.id)), 5000);
  }

  async function load() {
    if (!id) { setData(null); return; }
    const [pr, or] = await Promise.all([apiFetch(`/api/plans/${id}`), apiFetch(`/api/offline/plans/${id}`)]);
    if (!pr.ok) { setData(null); return; }
    setData((await pr.json()) as PlanDetail);
    if (or.ok) setOffline(((await or.json()) as { payments: OfflinePmt[] }).payments ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!id) { setData(null); return; }
      const [pr, or] = await Promise.all([apiFetch(`/api/plans/${id}`), apiFetch(`/api/offline/plans/${id}`)]);
      if (cancelled) return;
      if (!pr.ok) { setData(null); return; }
      setData((await pr.json()) as PlanDetail);
      if (or.ok) setOffline(((await or.json()) as { payments: OfflinePmt[] }).payments ?? []);
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function doAction(action: "pause" | "resume" | "cancel") {
    if (!id) return;
    if (action === "cancel") {
      const ok = await confirm({ title: "Cancel this plan?", message: "The plan will be permanently cancelled. This cannot be undone.", confirmLabel: "Yes, cancel", cancelLabel: "Keep plan", variant: "destructive" });
      if (!ok) return;
    }
    setActionLoading(action);
    try {
      const res = await apiFetch(`/api/plans/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await res.json() as { error?: string };
      if (res.ok) { addToast({ pause: "Plan paused", resume: "Plan resumed", cancel: "Plan cancelled" }[action]!, true); await load(); }
      else addToast(d.error ?? "Action failed", false);
    } finally { setActionLoading(null); }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !id) return;
    setNoteLoading(true);
    try {
      const res = await apiFetch(`/api/plans/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: noteText.trim() }) });
      if (res.ok) { addToast("Note saved", true); setNoteText(""); await load(); }
      else addToast("Failed to save note", false);
    } finally { setNoteLoading(false); }
  }

  async function recordOffline(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    const amt = parseFloat(offlineForm.amount);
    if (isNaN(amt) || amt <= 0) { setOfflineError("Enter a valid amount"); return; }
    setOfflineLoading(true); setOfflineError(null);
    try {
      const res = await apiFetch(`/api/offline/plans/${id}/record`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: amt, method: offlineForm.method, notes: offlineForm.notes || undefined, proofUrl: offlineForm.proofUrl || undefined }) });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed");
      addToast("Payment recorded", true);
      setOfflineForm({ amount: "", method: "transfer", notes: "", proofUrl: "" });
      setShowOfflineForm(false);
      await load();
    } catch (err) {
      setOfflineError(err instanceof Error ? err.message : "Error");
    } finally { setOfflineLoading(false); }
  }

  async function approveOffline(pmtId: string) {
    const ok = await confirm({ title: "Approve payment?", message: "This will mark the installment as paid and update the customer's balance.", confirmLabel: "Approve", variant: "default" });
    if (!ok) return;
    const res = await apiFetch(`/api/offline/${pmtId}/approve`, { method: "POST" });
    if (res.ok) { addToast("Payment approved", true); await load(); } else addToast("Approval failed", false);
  }

  async function rejectOffline(pmtId: string) {
    const ok = await confirm({ title: "Reject payment?", message: "The customer's payment will be marked as rejected.", confirmLabel: "Reject", variant: "destructive" });
    if (!ok) return;
    const res = await apiFetch(`/api/offline/${pmtId}/reject`, { method: "POST" });
    if (res.ok) { addToast("Payment rejected", true); await load(); } else addToast("Rejection failed", false);
  }

  async function copy(type: "mandate" | "claim") {
    if (!data) return;
    const url = type === "mandate"
      ? `${window.location.origin}/plan/${data.plan.id}`
      : `${window.location.origin}/portal/claim?customerId=${data.plan.customer?.id}`;
    await navigator.clipboard.writeText(url);
    if (type === "mandate") { setCopiedM(true); setTimeout(() => setCopiedM(false), 2000); }
    else                    { setCopiedC(true); setTimeout(() => setCopiedC(false), 2000); }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (data === undefined) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading plan…</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold">Plan not found</h2>
          <p className="text-sm text-muted-foreground">This plan may have been deleted or you don't have access.</p>
          <BackButton to="/dashboard" label="Back to dashboard" />
        </div>
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const { plan, attempts } = data;
  const st                 = STATUS_CFG[plan.status] ?? STATUS_CFG.pending_mandate;
  const StatusIcon         = st.icon;
  const rows               = parseScheduleJsonForDisplay(plan.schedule_json, plan.total_amount);
  const successA           = attempts.filter(a => a.status === "success");
  const totalPaid          = successA.reduce((s, a) => s + a.amount, 0);
  // Count fully paid installments by cumulative amounts, not attempt count (supports partial offline payments)
  const paidCount          = (() => { let c = 0, rem = totalPaid; for (const r of rows) { if (rem >= r.amount) { rem -= r.amount; c++; } else break; } return c; })();
  const remaining          = Math.max(0, plan.total_amount - totalPaid);
  const pct                = plan.total_amount > 0 ? Math.min(100, Math.round((totalPaid / plan.total_amount) * 100)) : 0;
  const custName           = plan.customer?.name ?? plan.customer?.email ?? plan.customer?.phone ?? "Unknown";
  const custInitials       = custName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "??";
  const pendingOffline     = offline.filter(p => p.status === "pending_approval");
  const resolvedOffline    = offline.filter(p => p.status !== "pending_approval");
  const canPause           = plan.status === "active";
  const canResume          = plan.status === "paused";
  const canCancel          = !["completed", "cancelled"].includes(plan.status);
  const nextRow            = rows[paidCount];
  const isOverdue          = nextRow?.due_date && nextRow.due_date < TODAY && plan.status === "active";

  const tabs: { id: Tab; label: string; icon: typeof CalendarDays; badge?: number }[] = [
    { id: "schedule",  label: "Schedule",  icon: CalendarDays, badge: rows.length },
    { id: "payments",  label: "Payments",  icon: ReceiptText,  badge: attempts.length },
    { id: "offline",   label: "Offline",   icon: Landmark,     badge: pendingOffline.length || undefined },
    { id: "notes",     label: "Notes",     icon: StickyNote,   badge: plan.notes.length || undefined },
    { id: "disputes",  label: "Disputes",  icon: MessageSquare },
  ];

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-dvh bg-background">

      {/* ── Toast layer ───────────────────────────────────────────────────────── */}
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

      {/* ── Mobile sidebar overlay ────────────────────────────────────────────── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)} />
        )}
      </AnimatePresence>

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border/40 bg-card transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>

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

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 border-b border-border/40 p-2">
          <Link to="/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            <FileText className="h-3.5 w-3.5 shrink-0" />Plans
          </Link>
          <Link to="/dashboard/analytics" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />Analytics
          </Link>
          <Link to="/dashboard/customers" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />Customers
          </Link>
          <Link to="/dashboard/disputes" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            <MessageSquare className="h-3.5 w-3.5 shrink-0" />Disputes
          </Link>
          <Link to="/settings/business" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
            <Settings className="h-3.5 w-3.5 shrink-0" />Settings
          </Link>
        </nav>

        {/* Scrollable plan info */}
        <div className="flex-1 overflow-y-auto">

          {/* Status hero */}
          <div className="relative overflow-hidden border-b border-border/40 p-5">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-2xl"
              style={{ background: `radial-gradient(circle, ${st.glow} 0%, transparent 70%)` }} />
            <div className="relative">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${st.border} ${st.bg}`}>
                <StatusIcon className={`h-6 w-6 ${st.color}`} />
              </div>
              <p className="font-mono text-xs text-muted-foreground/50 mb-0.5">#{plan.id.slice(-10)}</p>
              <h2 className="font-bold text-foreground leading-tight">{plan.plan_name ?? "Untitled plan"}</h2>
              <span className={`mt-2 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.border} ${st.bg} ${st.color}`}>
                <StatusIcon className="h-3 w-3" />{st.label}
              </span>
            </div>
          </div>

          {/* Amount summary */}
          <div className="border-b border-border/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Total amount</p>
              <p className="font-bold tabular-nums text-foreground">{naira(plan.total_amount)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Amount paid</p>
              <p className={`font-bold tabular-nums ${totalPaid > 0 ? "text-primary" : "text-muted-foreground"}`}>{naira(totalPaid)}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="font-bold tabular-nums text-foreground">{naira(remaining)}</p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>{paidCount} of {rows.length} installments</span>
                <span className={`font-semibold ${pct > 0 ? st.color : ""}`}>{pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                <motion.div className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }} />
              </div>
            </div>
          </div>

          {/* Next installment */}
          {plan.status === "active" && nextRow && (
            <div className={`border-b border-border/40 p-5 ${isOverdue ? "bg-rose-500/5" : ""}`}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Next installment</p>
              <div className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${isOverdue ? "border-rose-500/30 bg-rose-500/8" : "border-border/30 bg-secondary/20"}`}>
                <Calendar className={`h-4 w-4 shrink-0 ${isOverdue ? "text-rose-500" : "text-primary"}`} />
                <div>
                  <p className="text-sm font-bold text-foreground">{naira(nextRow.amount)}</p>
                  <p className={`text-xs ${isOverdue ? "text-rose-500 font-medium" : "text-muted-foreground"}`}>
                    {isOverdue ? "Overdue · " : ""}{fmt(nextRow.due_date)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {plan.status === "completed" && (
            <div className="border-b border-border/40 p-5">
              <div className="flex items-center gap-2.5 rounded-xl border border-blue-400/25 bg-blue-400/8 px-3 py-2.5">
                <CircleCheck className="h-5 w-5 text-blue-400 shrink-0" />
                <p className="text-sm font-semibold text-blue-400">Plan complete</p>
              </div>
            </div>
          )}

          {/* Customer */}
          {plan.customer && (
            <div className="border-b border-border/40 p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{custInitials}</div>
                <p className="truncate font-semibold text-foreground text-sm">{custName}</p>
              </div>
              <div className="space-y-2">
                {plan.customer.name && <InfoRow icon={<Hash className="h-3.5 w-3.5" />} label={plan.customer.name} />}
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label={plan.customer.phone} />
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label={plan.customer.email} truncate />
              </div>
            </div>
          )}

          {/* Plan meta */}
          <div className="border-b border-border/40 p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Plan details</p>
            <div className="space-y-2">
              <InfoRow icon={<CreditCard className="h-3.5 w-3.5" />} label={plan.payment_method === "bank" ? "Bank debit" : "Card · Paystack"} />
              <InfoRow icon={<Tag className="h-3.5 w-3.5" />} label={plan.fee_strategy === "pass_to_customer" ? "Fees → customer" : "Fees absorbed"} />
              <InfoRow icon={<CalendarRange className="h-3.5 w-3.5" />} label={`Created ${fmt(plan.created_at)}`} />
            </div>
          </div>

          {/* Quick actions */}
          {(canPause || canResume || canCancel) && (
            <div className="p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</p>
              <div className="space-y-2">
                {canPause && (
                  <SidebarAction
                    icon={<PauseCircle className="h-4 w-4" />}
                    label="Pause plan" description="Suspend debits temporarily"
                    loading={actionLoading === "pause"}
                    cls="border-amber-400/25 bg-amber-400/8 hover:bg-amber-400/15 text-amber-500"
                    onClick={() => void doAction("pause")}
                  />
                )}
                {canResume && (
                  <SidebarAction
                    icon={<PlayCircle className="h-4 w-4" />}
                    label="Resume plan" description="Restart scheduled debits"
                    loading={actionLoading === "resume"}
                    cls="border-primary/25 bg-primary/8 hover:bg-primary/15 text-primary"
                    onClick={() => void doAction("resume")}
                  />
                )}
                {canCancel && (
                  <SidebarAction
                    icon={<X className="h-4 w-4" />}
                    label="Cancel plan" description="Permanently end this plan"
                    loading={actionLoading === "cancel"}
                    cls="border-rose-500/25 bg-rose-500/8 hover:bg-rose-500/15 text-rose-500"
                    onClick={() => void doAction("cancel")}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom */}
        <div className="shrink-0 border-t border-border/40 p-2 space-y-1">
          {/* Theme toggle */}
          <button
            onClick={toggle}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <div className="flex items-center gap-2.5">
              {theme === "dark" ? <Moon className="h-3.5 w-3.5 shrink-0" /> : <Sun className="h-3.5 w-3.5 shrink-0" />}
              <span>{theme === "dark" ? "Dark" : "Light"}</span>
            </div>
            <div className={`relative h-4.5 w-8 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-border"}`}>
              <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background shadow transition-transform ${theme === "dark" ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </div>
          </button>
          <button
            onClick={() => { void apiFetch("/api/auth/logout", { method: "POST" }).then(() => { clearToken(); window.location.href = "/"; }); }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />Sign out
          </button>
          <div className="flex items-center gap-1.5 px-3">
            <ShieldCheck className="h-3 w-3 text-primary/50" />
            <span className="text-[10px] text-muted-foreground/50">Secured by Paystack · CBN compliant</span>
          </div>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border/40 bg-card/50 px-5 backdrop-blur-xl">
          {/* Mobile menu toggle */}
          <button onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/50 lg:hidden">
            <FileText className="h-4 w-4" />
          </button>

          {/* Back button */}
          <BackButton to="/dashboard" label="Back" className="hidden sm:inline-flex" />

          {/* Plan identity */}
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${st.bg}`}>
              <StatusIcon className={`h-3.5 w-3.5 ${st.color}`} />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-foreground">{plan.plan_name ?? "Untitled plan"}</h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">#{plan.id.slice(-10)}</p>
            </div>
            <span className={`hidden shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:inline-flex ${st.border} ${st.bg} ${st.color}`}>
              {st.label}
            </span>
          </div>

          {/* Link / copy buttons */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex gap-px">
              <Link to={`/plan/${plan.id}`} target="_blank" rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-l-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
                <ExternalLink className="h-3.5 w-3.5" /><span className="hidden sm:inline">Mandate link</span>
              </Link>
              <button onClick={() => void copy("mandate")}
                className="flex h-8 w-8 items-center justify-center rounded-r-xl border border-l-0 border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                {copiedM ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            {plan.customer && (
              <div className="hidden gap-px sm:flex">
                <Link to={`/portal/claim?customerId=${plan.customer.id}`} target="_blank" rel="noreferrer"
                  className="flex h-8 items-center gap-1.5 rounded-l-xl border border-border/40 bg-card px-3 text-xs font-medium text-foreground hover:bg-secondary/50 transition-colors">
                  <UserCheck className="h-3.5 w-3.5" />Customer link
                </Link>
                <button onClick={() => void copy("claim")}
                  className="flex h-8 w-8 items-center justify-center rounded-r-xl border border-l-0 border-border/40 bg-card text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
                  {copiedC ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            <NotificationsPanel panelPosition="right" />
          </div>
        </header>

        {/* Mobile progress strip */}
        <div className="border-b border-border/40 bg-card/40 px-4 py-3 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${st.dot}`} />
                <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-4 text-sm">
                <span className="font-bold text-foreground">{naira(plan.total_amount)}</span>
                <span className="font-semibold text-primary">{naira(totalPaid)} paid</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">{pct}% complete</p>
              <p className="text-xs text-muted-foreground">{paidCount}/{rows.length} installments</p>
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Pending offline alert */}
        {pendingOffline.length > 0 && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-400/20 bg-amber-400/8 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0 text-amber-400" />
              <p className="text-sm font-medium text-amber-400">
                {pendingOffline.length} offline payment{pendingOffline.length > 1 ? "s" : ""} awaiting your approval
              </p>
            </div>
            <button onClick={() => setTab("offline")}
              className="shrink-0 text-xs font-semibold text-amber-400 underline underline-offset-2 hover:text-amber-300">
              Review
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex shrink-0 gap-0 overflow-x-auto border-b border-border/40 bg-card/30 px-4 sm:px-6">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-3.5 text-sm font-medium transition-colors ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  t.id === "offline" && pendingOffline.length > 0
                    ? "bg-amber-400/20 text-amber-400"
                    : "bg-secondary/60 text-muted-foreground"
                }`}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── Schedule ── */}
            {tab === "schedule" && (
              <motion.div key="schedule" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-5 sm:p-8">
                {!rows.length ? (
                  <Empty icon={<CalendarDays className="h-8 w-8" />} label="No schedule found" />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-border/40">
                    <div className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 border-b border-border/30 bg-secondary/30 px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <span>#</span><span>Due date</span><span className="text-right">Amount</span><span className="text-right w-20">Status</span>
                    </div>
                    {rows.map((row, i) => {
                      const isPaid    = i < paidCount;
                      const isOD      = !isPaid && row.due_date && row.due_date < TODAY && plan.status === "active";
                      const isCurrent = i === paidCount && plan.status === "active";
                      return (
                        <div key={i} className={`grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-4 px-4 py-3.5 text-sm ${i > 0 ? "border-t border-border/10" : ""} ${isOD ? "bg-rose-500/5" : isCurrent ? "bg-amber-400/5" : ""}`}>
                          <span className="font-mono text-xs text-muted-foreground/40">{i + 1}</span>
                          <span className={isPaid ? "text-muted-foreground/50 line-through" : "text-foreground"}>{fmt(row.due_date) || "—"}</span>
                          <span className={`font-mono font-bold text-right ${isPaid ? "text-muted-foreground/50" : "text-foreground"}`}>{naira(row.amount)}</span>
                          <span className={`w-20 text-right text-[11px] font-bold ${isPaid ? "text-primary" : isOD ? "text-rose-500" : isCurrent ? "text-amber-500" : "text-muted-foreground/40"}`}>
                            {isPaid ? "Paid" : isOD ? "Overdue" : isCurrent ? "Due next" : "Upcoming"}
                          </span>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between border-t-2 border-border/40 bg-secondary/10 px-4 py-3">
                      <span className="text-xs text-muted-foreground">{paidCount} of {rows.length} paid · {naira(totalPaid)} collected</span>
                      <span className="font-bold text-foreground">{naira(plan.total_amount)}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Payments ── */}
            {tab === "payments" && (
              <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-5 sm:p-8">
                {!attempts.length ? (
                  <Empty icon={<ReceiptText className="h-8 w-8" />} label="No payment attempts yet" sub="Attempts will appear here once the mandate is activated" />
                ) : (
                  <div className="space-y-2">
                    {[...attempts].reverse().map(a => {
                      const isSuccess  = a.status === "success";
                      const isFailed   = a.status === "failed";
                      const isRefunded = a.status === "refunded";
                      return (
                        <div key={a.id} className="flex items-start gap-4 rounded-2xl border border-border/30 bg-card p-4">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isSuccess ? "bg-primary/10 text-primary" :
                            isFailed  ? "bg-rose-500/10 text-rose-500" :
                            isRefunded ? "bg-blue-400/10 text-blue-400" :
                            "bg-amber-400/10 text-amber-400"
                          }`}>
                            {isSuccess  && <CheckCircle2 className="h-5 w-5" />}
                            {isFailed   && <XCircle className="h-5 w-5" />}
                            {isRefunded && <RefreshIcon className="h-5 w-5" />}
                            {!isSuccess && !isFailed && !isRefunded && <Clock className="h-5 w-5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold tabular-nums text-foreground">{naira(a.amount)}</span>
                              <span className={`text-xs font-semibold capitalize ${
                                isSuccess ? "text-primary" : isFailed ? "text-rose-500" : isRefunded ? "text-blue-400" : "text-amber-400"
                              }`}>{a.status}</span>
                              {a.attempt_number > 0 && <span className="text-xs text-muted-foreground/60">Attempt #{a.attempt_number}</span>}
                              <span className="text-xs text-muted-foreground capitalize">{a.provider || "offline"}</span>
                            </div>
                            {a.failure_reason && (
                              <p className="mt-0.5 text-xs text-rose-400">{a.failure_reason.replace(/_/g, " ")}</p>
                            )}
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground/50">ref: {a.external_ref}</p>
                          </div>
                          <p className="shrink-0 text-xs text-muted-foreground/60 whitespace-nowrap">{fmtTime(a.created_at)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Offline ── */}
            {tab === "offline" && (
              <motion.div key="offline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-5 sm:p-8 space-y-6">

                {/* Pending approvals */}
                {pendingOffline.length > 0 && (
                  <div>
                    <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-400">
                      <Clock className="h-4 w-4" />{pendingOffline.length} awaiting approval
                    </p>
                    <div className="space-y-3">
                      {pendingOffline.map(p => (
                        <div key={p.id} className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-foreground">{naira(p.amount)} <span className="font-normal capitalize text-muted-foreground">· {p.method}</span></p>
                              {p.notes && <p className="mt-0.5 text-sm text-muted-foreground">{p.notes}</p>}
                              <p className="mt-0.5 text-xs text-muted-foreground/60">{fmt(p.created_at)} · submitted by {p.recorded_by}</p>
                              {p.proof_url && (
                                <a href={p.proof_url} target="_blank" rel="noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                                  <FileText className="h-3 w-3" />View receipt
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={() => void approveOffline(p.id)}
                              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors">
                              <ThumbsUp className="h-3.5 w-3.5" />Approve
                            </button>
                            <button onClick={() => void rejectOffline(p.id)}
                              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors">
                              <ThumbsDown className="h-3.5 w-3.5" />Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Record new */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Record payment</p>
                    <button onClick={() => { setShowOfflineForm(v => !v); setOfflineError(null); }}
                      className="flex items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                      {showOfflineForm ? <><X className="h-3.5 w-3.5" />Cancel</> : <><Plus className="h-3.5 w-3.5" />New</>}
                    </button>
                  </div>
                  <AnimatePresence>
                    {showOfflineForm && (
                      <motion.form key="form" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        onSubmit={e => void recordOffline(e)} className="overflow-hidden mb-4">
                        <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <FieldWrap label="Amount (₦)">
                              <input type="number" min="1" step="0.01" required placeholder="5000"
                                value={offlineForm.amount} onChange={e => setOfflineForm(f => ({ ...f, amount: e.target.value }))}
                                className="input-base" />
                            </FieldWrap>
                            <FieldWrap label="Method">
                              <select value={offlineForm.method} onChange={e => setOfflineForm(f => ({ ...f, method: e.target.value }))} className="input-base">
                                <option value="transfer">Transfer</option>
                                <option value="cash">Cash</option>
                                <option value="pos">POS</option>
                                <option value="other">Other</option>
                              </select>
                            </FieldWrap>
                          </div>
                          <FieldWrap label="Notes (optional)">
                            <input type="text" placeholder="e.g. Paid at branch"
                              value={offlineForm.notes} onChange={e => setOfflineForm(f => ({ ...f, notes: e.target.value }))} className="input-base" />
                          </FieldWrap>
                          <FieldWrap label="Proof URL (optional)">
                            <input type="url" placeholder="https://..."
                              value={offlineForm.proofUrl} onChange={e => setOfflineForm(f => ({ ...f, proofUrl: e.target.value }))} className="input-base" />
                          </FieldWrap>
                          {offlineError && <p className="text-xs text-rose-500 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />{offlineError}</p>}
                          <button type="submit" disabled={offlineLoading || !offlineForm.amount}
                            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-primary text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                            {offlineLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                            Record payment
                          </button>
                        </div>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>

                {/* History */}
                {resolvedOffline.length > 0 && (
                  <div>
                    <p className="mb-3 text-sm font-semibold text-foreground">History</p>
                    <div className="space-y-2">
                      {resolvedOffline.map(p => (
                        <div key={p.id} className="flex items-center gap-4 rounded-2xl border border-border/30 bg-card p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/40 text-muted-foreground">
                            <Banknote className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-foreground">{naira(p.amount)} <span className="font-normal capitalize text-muted-foreground text-sm">· {p.method}</span></p>
                            {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                            <p className="text-xs text-muted-foreground/60">{fmt(p.created_at)}</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            p.status === "approved" ? "border-primary/25 bg-primary/10 text-primary" : "border-rose-500/25 bg-rose-500/10 text-rose-500"
                          }`}>{p.status.charAt(0).toUpperCase() + p.status.slice(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!offline.length && !showOfflineForm && (
                  <Empty icon={<Landmark className="h-8 w-8" />} label="No offline payments recorded" sub="Record cash, POS, or bank transfer payments here" />
                )}
              </motion.div>
            )}

            {/* ── Notes ── */}
            {tab === "notes" && (
              <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-5 sm:p-8 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Internal notes</p>
                  <span className="rounded-full bg-secondary/50 px-2 py-0.5 text-xs text-muted-foreground">Private · not visible to customer</span>
                </div>

                {plan.notes.length > 0 && (
                  <div className="space-y-2">
                    {[...plan.notes].reverse().map((n, i) => (
                      <div key={i} className="flex gap-4 rounded-2xl border border-border/30 bg-card p-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-500">
                          <StickyNote className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{n.text}</p>
                          <p className="mt-1.5 text-xs text-muted-foreground/60">{fmtTime(n.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={e => void addNote(e)} className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
                  <p className="text-sm font-medium text-foreground">Add note</p>
                  <textarea ref={noteRef} value={noteText} onChange={e => setNoteText(e.target.value)}
                    placeholder="Type an internal note…" rows={4}
                    className="w-full resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                  <button type="submit" disabled={noteLoading || !noteText.trim()}
                    className="flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
                    {noteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Save note
                  </button>
                </form>

                {!plan.notes.length && (
                  <Empty icon={<StickyNote className="h-8 w-8" />} label="No notes yet" sub="Internal notes are only visible to your business" />
                )}
              </motion.div>
            )}

            {/* ── Disputes ── */}
            {tab === "disputes" && (
              <motion.div key="disputes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="p-5 sm:p-8">
                {plan.customer ? (
                  <DisputeChat
                    customerId={plan.customer.id}
                    plans={[{ id: plan.id, total_amount: plan.total_amount }]}
                  />
                ) : (
                  <Empty icon={<MessageSquare className="h-8 w-8" />} label="No customer linked" sub="Disputes will appear here once a customer claims this plan" />
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SidebarAction({ icon, label, description, loading, cls, onClick }: {
  icon: React.ReactNode; label: string; description: string;
  loading: boolean; cls: string; onClick(): void;
}) {
  return (
    <button disabled={loading} onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all disabled:opacity-50 ${cls}`}>
      <div className="shrink-0">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}</div>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-[11px] text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}

function InfoRow({ icon, label, truncate }: { icon: React.ReactNode; label: string; truncate?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 text-muted-foreground">
      <span className="shrink-0 text-muted-foreground/60">{icon}</span>
      <span className={`text-xs text-foreground ${truncate ? "truncate" : ""}`}>{label}</span>
    </div>
  );
}

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Empty({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-border/50 text-muted-foreground/20">{icon}</div>
      <p className="font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 max-w-xs text-sm text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}
