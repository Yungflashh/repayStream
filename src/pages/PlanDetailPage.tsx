import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CalendarRange, CheckCircle2, Clock, Copy, CreditCard,
  FileText, Hash, Mail, PauseCircle, Phone, PlayCircle,
  StickyNote, TrendingUp, AlertCircle, XCircle, ExternalLink, UserCheck,
  Loader2, Check, Send, X, Banknote, ThumbsUp, ThumbsDown,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { parseScheduleJsonForDisplay } from "@/lib/utils/schedule";
import { staggerContainer, staggerItem, smooth } from "@/lib/motion";
import { useToast } from "@/lib/toast";
import { useConfirm } from "@/lib/confirm";

type Attempt = {
  id: string;
  attempt_number: number;
  amount: number;
  status: string;
  provider: string;
  failure_reason: string | null;
  external_ref: string;
  created_at: string;
};

type PlanNote = { text: string; created_at: string };

type OfflinePmt = {
  id: string;
  amount: number;
  method: string;
  notes?: string;
  proof_url?: string;
  status: "pending_approval" | "approved" | "rejected";
  recorded_by: string;
  created_at: string;
  approved_at?: string;
};

type PlanDetail = {
  plan: {
    id: string;
    plan_name: string | null;
    total_amount: number;
    status: string;
    payment_method: string;
    fee_strategy: string;
    schedule_json: unknown;
    created_at: string;
    notes: PlanNote[];
    customer: { id: string; name: string | null; phone: string; email: string } | null;
  };
  attempts: Attempt[];
};

const statusConfig: Record<string, { color: string; bg: string; icon: typeof Clock; label: string }> = {
  pending_mandate: { color: "text-amber-400", bg: "bg-amber-400/10", icon: Clock, label: "Pending mandate" },
  active: { color: "text-primary", bg: "bg-primary/10", icon: TrendingUp, label: "Active" },
  completed: { color: "text-blue-400", bg: "bg-blue-400/10", icon: CheckCircle2, label: "Completed" },
  defaulted: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle, label: "Defaulted" },
  paused: { color: "text-amber-500", bg: "bg-amber-500/10", icon: PauseCircle, label: "Paused" },
  cancelled: { color: "text-muted-foreground", bg: "bg-secondary/30", icon: XCircle, label: "Cancelled" },
};

const attemptStatusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  success: { color: "text-primary bg-primary/10", icon: CheckCircle2 },
  pending: { color: "text-amber-400 bg-amber-400/10", icon: Clock },
  failed: { color: "text-destructive bg-destructive/10", icon: XCircle },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<PlanDetail | null | undefined>(undefined);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [copiedMandate, setCopiedMandate] = useState(false);
  const [copiedClaim, setCopiedClaim] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Offline payments
  const [offlinePayments, setOfflinePayments] = useState<OfflinePmt[]>([]);
  const [offlineForm, setOfflineForm] = useState({ amount: "", method: "transfer", notes: "", proofUrl: "" });
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  async function loadPlan() {
    if (!id) { setData(null); return; }
    const [planRes, offlineRes] = await Promise.all([
      apiFetch(`/api/plans/${id}`),
      apiFetch(`/api/offline/plans/${id}`),
    ]);
    if (!planRes.ok) { setData(null); return; }
    setData((await planRes.json()) as PlanDetail);
    if (offlineRes.ok) {
      const od = (await offlineRes.json()) as { payments: OfflinePmt[] };
      setOfflinePayments(od.payments ?? []);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!id) { setData(null); return; }
      const [planRes, offlineRes] = await Promise.all([
        apiFetch(`/api/plans/${id}`),
        apiFetch(`/api/offline/plans/${id}`),
      ]);
      if (cancelled) return;
      if (!planRes.ok) { setData(null); return; }
      setData((await planRes.json()) as PlanDetail);
      if (offlineRes.ok) {
        const od = (await offlineRes.json()) as { payments: OfflinePmt[] };
        setOfflinePayments(od.payments ?? []);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function doAction(action: "pause" | "resume" | "cancel") {
    if (!id) return;
    if (action === "cancel") {
      const ok = await confirm({
        title: "Cancel this plan?",
        message: "The plan will be marked as cancelled. This cannot be undone.",
        confirmLabel: "Yes, cancel plan",
        cancelLabel: "Keep plan",
        variant: "destructive",
      });
      if (!ok) return;
    }
    setActionLoading(action);
    try {
      const res = await apiFetch(`/api/plans/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const d = await res.json() as { error?: string };
      if (res.ok) {
        const labels: Record<string, string> = { pause: "Plan paused", resume: "Plan resumed", cancel: "Plan cancelled" };
        toast.success(labels[action] ?? "Done");
        await loadPlan();
      } else {
        toast.error(d.error ?? "Action failed");
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim() || !id) return;
    setNoteLoading(true);
    try {
      const res = await apiFetch(`/api/plans/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: noteText.trim() }),
      });
      if (res.ok) {
        toast.success("Note saved");
        setNoteText("");
        await loadPlan();
      } else {
        toast.error("Failed to save note");
      }
    } finally {
      setNoteLoading(false);
    }
  }

  async function recordOfflinePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !offlineForm.amount) return;
    const amt = parseFloat(offlineForm.amount);
    if (isNaN(amt) || amt <= 0) { setOfflineError("Enter a valid amount"); return; }
    setOfflineLoading(true);
    setOfflineError(null);
    try {
      const res = await apiFetch(`/api/offline/plans/${id}/record`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, method: offlineForm.method, notes: offlineForm.notes || undefined, proofUrl: offlineForm.proofUrl || undefined }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast.success("Offline payment recorded");
      setOfflineForm({ amount: "", method: "transfer", notes: "", proofUrl: "" });
      await loadPlan();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      setOfflineError(msg);
      toast.error(msg);
    } finally {
      setOfflineLoading(false);
    }
  }

  async function approveOfflinePayment(paymentId: string) {
    const ok = await confirm({ title: "Approve payment?", message: "This will mark the installment as paid and update the customer's balance.", confirmLabel: "Approve", variant: "default" });
    if (!ok) return;
    const res = await apiFetch(`/api/offline/${paymentId}/approve`, { method: "POST" });
    if (res.ok) { toast.success("Payment approved — balance updated"); await loadPlan(); }
    else toast.error("Approval failed");
  }

  async function rejectOfflinePayment(paymentId: string) {
    const ok = await confirm({ title: "Reject payment?", message: "The customer's submitted payment will be marked as rejected.", confirmLabel: "Reject", variant: "destructive" });
    if (!ok) return;
    const res = await apiFetch(`/api/offline/${paymentId}/reject`, { method: "POST" });
    if (res.ok) { toast.info("Payment rejected"); await loadPlan(); }
    else toast.error("Rejection failed");
  }

  async function copyLink(type: "mandate" | "claim") {
    if (!data) return;
    const url = type === "mandate"
      ? `${window.location.origin}/plan/${data.plan.id}`
      : `${window.location.origin}/portal/claim?customerId=${data.plan.customer?.id}`;
    await navigator.clipboard.writeText(url);
    if (type === "mandate") { setCopiedMandate(true); setTimeout(() => setCopiedMandate(false), 2000); }
    else { setCopiedClaim(true); setTimeout(() => setCopiedClaim(false), 2000); }
  }

  if (data === undefined) {
    return <Layout maxWidth="2xl" centered><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></Layout>;
  }

  if (!data) {
    return (
      <Layout maxWidth="md" centered>
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <h2 className="text-xl font-semibold">Plan not found</h2>
          <Button asChild variant="outline"><Link to="/dashboard"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link></Button>
        </div>
      </Layout>
    );
  }

  const { plan, attempts } = data;
  const scheduleRows = parseScheduleJsonForDisplay(plan.schedule_json, plan.total_amount);
  const total = plan.total_amount;
  const st = statusConfig[plan.status] ?? statusConfig.pending_mandate;
  const StatusIcon = st.icon;

  const successfulAttempts = attempts.filter((a) => a.status === "success");
  const paidCount = successfulAttempts.length;
  const totalPaid = successfulAttempts.reduce((s, a) => s + a.amount, 0);

  const canPause = plan.status === "active";
  const canResume = plan.status === "paused";
  const canCancel = !["completed", "cancelled"].includes(plan.status);

  return (
    <Layout maxWidth="2xl">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
        {/* Back + header */}
        <motion.div variants={staggerItem} transition={smooth} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div>
              {plan.plan_name && (
                <h1 className="text-2xl font-bold tracking-tight">{plan.plan_name}</h1>
              )}
              <p className={`font-mono text-xs text-muted-foreground ${!plan.plan_name ? "mt-1" : ""}`}>{plan.id}</p>
              {!plan.plan_name && <p className="text-lg font-semibold text-muted-foreground">Plan details</p>}
            </div>
          </div>

          {/* Link buttons */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              <Button size="sm" asChild>
                <Link to={`/plan/${plan.id}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" />Mandate</Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => void copyLink("mandate")} title="Copy mandate link">
                {copiedMandate ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {plan.customer && (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/portal/claim?customerId=${plan.customer.id}`} target="_blank"><UserCheck className="h-3.5 w-3.5" />Claim</Link>
                </Button>
                <Button size="sm" variant="outline" onClick={() => void copyLink("claim")} title="Copy claim link">
                  {copiedClaim ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Status + stats */}
        <motion.div variants={staggerItem} transition={smooth} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/40 bg-card/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${st.color} ${st.bg}`}>
                <StatusIcon className="h-3 w-3" />{st.label}
              </span>
            </div>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="mt-1 text-xl font-bold tabular-nums">&#8358;{total.toLocaleString("en-NG")}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">Paid</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-primary">&#8358;{totalPaid.toLocaleString("en-NG")}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/50 p-4">
            <p className="text-xs font-medium text-muted-foreground">Installments</p>
            <p className="mt-1 text-xl font-bold">{paidCount} <span className="text-sm font-normal text-muted-foreground">/ {scheduleRows.length}</span></p>
          </div>
        </motion.div>

        {/* Plan actions — pause / resume / cancel */}
        {(canPause || canResume || canCancel) && (
          <motion.div variants={staggerItem} transition={smooth}>
            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 py-4">
                <p className="text-sm font-medium text-muted-foreground">Plan actions:</p>
                {canPause && (
                  <Button size="sm" variant="outline" disabled={actionLoading === "pause"} onClick={() => void doAction("pause")}>
                    {actionLoading === "pause" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PauseCircle className="h-3.5 w-3.5" />}
                    Pause
                  </Button>
                )}
                {canResume && (
                  <Button size="sm" variant="outline" disabled={actionLoading === "resume"} onClick={() => void doAction("resume")}>
                    {actionLoading === "resume" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                    Resume
                  </Button>
                )}
                {canCancel && (
                  <Button size="sm" variant="outline" className="text-destructive hover:text-destructive border-destructive/30 hover:border-destructive/60" disabled={actionLoading === "cancel"} onClick={() => void doAction("cancel")}>
                    {actionLoading === "cancel" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
                    Cancel plan
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Customer info */}
        {plan.customer && (
          <motion.div variants={staggerItem} transition={smooth}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><UserCheck className="h-5 w-5 text-accent" /></div>
                  <div>
                    <CardTitle className="text-lg">
                      {plan.customer.name ?? "Customer"}
                    </CardTitle>
                    {plan.customer.name && (
                      <CardDescription>Customer details</CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {plan.customer.name && (
                    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 p-4">
                      <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Name</p>
                        <p className="truncate text-sm font-medium">{plan.customer.name}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 p-4">
                    <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="truncate text-sm font-medium">{plan.customer.phone}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 p-4">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="truncate text-sm font-medium" title={plan.customer.email}>{plan.customer.email}</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 p-4">
                    <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Payment method</p>
                      <p className="text-sm font-medium">Paystack</p>
                    </div>
                  </div>
                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 p-4">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Fee strategy</p>
                      <p className="text-sm font-medium capitalize">
                        {plan.fee_strategy === "pass_to_customer" ? "Passed to customer" : "Absorbed by business"}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Schedule */}
        <motion.div variants={staggerItem} transition={smooth}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><CalendarRange className="h-5 w-5 text-accent" /></div>
                <div><CardTitle className="text-lg">Repayment schedule</CardTitle><CardDescription>Installment-by-installment status</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border/30 bg-secondary/10">
                <div className="flex items-center border-b border-border/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="w-10">#</span>
                  <span className="flex-1">Due date</span>
                  <span className="w-32 text-right">Amount</span>
                  <span className="w-28 text-right">Status</span>
                </div>
                <ul className="divide-y divide-border/20">
                  {scheduleRows.map((row, i) => {
                    const isPaid = i < paidCount;
                    const isCurrent = i === paidCount && plan.status === "active";
                    const today = new Date().toISOString().slice(0, 10);
                    const isOverdue = !isPaid && row.due_date && row.due_date < today && plan.status === "active";

                    let statusLabel = "Upcoming";
                    let statusClass = "text-muted-foreground bg-secondary/30";
                    if (isPaid) { statusLabel = "Paid"; statusClass = "text-primary bg-primary/10"; }
                    else if (isOverdue) { statusLabel = "Overdue"; statusClass = "text-destructive bg-destructive/10"; }
                    else if (isCurrent) { statusLabel = "Due"; statusClass = "text-amber-400 bg-amber-400/10"; }

                    return (
                      <motion.li
                        key={`${row.due_date}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03, duration: 0.3 }}
                        className={`flex items-center px-4 py-3 text-sm transition-colors hover:bg-secondary/20 ${isCurrent ? "bg-amber-400/5" : ""}`}
                      >
                        <span className="w-10 font-mono text-xs text-muted-foreground">{i + 1}</span>
                        <span className={`flex-1 ${isPaid ? "text-muted-foreground line-through" : ""}`}>{row.due_date || "—"}</span>
                        <span className={`w-32 text-right font-mono font-semibold ${isPaid ? "text-muted-foreground" : ""}`}>
                          &#8358;{row.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="w-28 text-right">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
                <div className="flex items-center justify-between border-t border-border/40 bg-secondary/20 px-4 py-3 text-sm font-bold">
                  <span>Total</span>
                  <span className="font-mono">&#8358;{total.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Payment history */}
        <motion.div variants={staggerItem} transition={smooth}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
                <div><CardTitle className="text-lg">Payment history</CardTitle><CardDescription>All payment attempts for this plan</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent>
              {!attempts.length ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-10 text-center">
                  <FileText className="mb-3 h-8 w-8 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">No payment attempts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attempts.map((a) => {
                    const cfg = attemptStatusConfig[a.status] ?? attemptStatusConfig.pending;
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={a.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-2 rounded-xl border border-border/40 bg-card/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tabular-nums">&#8358;{a.amount.toLocaleString("en-NG")}</span>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                              <Icon className="h-3 w-3" />{a.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="capitalize">{a.provider}</span>
                            <span className="font-mono">{a.external_ref.slice(-12)}</span>
                            {a.failure_reason && <span className="text-destructive">{a.failure_reason.replace(/_/g, " ")}</span>}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Offline payments */}
        <motion.div variants={staggerItem} transition={smooth}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/40"><Banknote className="h-5 w-5 text-muted-foreground" /></div>
                <div><CardTitle className="text-lg">Offline payments</CardTitle><CardDescription>Cash, POS, or bank transfer payments received outside Paystack</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Pending approvals */}
              {offlinePayments.filter((p) => p.status === "pending_approval").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Awaiting your approval</p>
                  {offlinePayments.filter((p) => p.status === "pending_approval").map((p) => (
                    <div key={p.id} className="flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-bold">&#8358;{p.amount.toLocaleString("en-NG")} <span className="font-normal text-muted-foreground capitalize">— {p.method}</span></p>
                        {p.notes && <p className="text-xs text-muted-foreground">{p.notes}</p>}
                        {p.proof_url && <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View proof</a>}
                        <p className="text-xs text-muted-foreground">{fmt(p.created_at)} · customer submitted</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-primary border-primary/30" onClick={() => void approveOfflinePayment(p.id)}>
                          <ThumbsUp className="h-3.5 w-3.5" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-destructive border-destructive/30" onClick={() => void rejectOfflinePayment(p.id)}>
                          <ThumbsDown className="h-3.5 w-3.5" />Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* History */}
              {offlinePayments.filter((p) => p.status !== "pending_approval").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</p>
                  {offlinePayments.filter((p) => p.status !== "pending_approval").map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/30 bg-secondary/10 px-4 py-3 text-xs">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">&#8358;{p.amount.toLocaleString("en-NG")} <span className="capitalize font-normal text-muted-foreground">— {p.method}</span></p>
                        {p.notes && <p className="text-muted-foreground">{p.notes}</p>}
                        {p.proof_url && <a href={p.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">View proof</a>}
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${p.status === "approved" ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                          {p.status}
                        </span>
                        <p className="text-muted-foreground">{fmt(p.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Record new */}
              <form onSubmit={(e) => void recordOfflinePayment(e)} className="space-y-3 rounded-xl border border-border/30 bg-secondary/10 p-4">
                <p className="text-sm font-medium">Record offline payment</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Amount (₦)</label>
                    <input
                      type="number" min="1" step="0.01" required placeholder="5000"
                      value={offlineForm.amount}
                      onChange={(e) => setOfflineForm((f) => ({ ...f, amount: e.target.value }))}
                      className="flex h-10 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Method</label>
                    <select
                      value={offlineForm.method}
                      onChange={(e) => setOfflineForm((f) => ({ ...f, method: e.target.value }))}
                      className="flex h-10 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="transfer">Bank transfer</option>
                      <option value="cash">Cash</option>
                      <option value="pos">POS</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Notes (optional)</label>
                  <input
                    type="text" placeholder="e.g. Paid at office"
                    value={offlineForm.notes}
                    onChange={(e) => setOfflineForm((f) => ({ ...f, notes: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Proof URL (optional — Google Drive, Dropbox, etc.)</label>
                  <input
                    type="url" placeholder="https://..."
                    value={offlineForm.proofUrl}
                    onChange={(e) => setOfflineForm((f) => ({ ...f, proofUrl: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                {offlineError && <p className="text-xs text-destructive">{offlineError}</p>}
                <Button type="submit" size="sm" disabled={offlineLoading || !offlineForm.amount}>
                  {offlineLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                  Record payment
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Business notes */}
        <motion.div variants={staggerItem} transition={smooth}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/40"><StickyNote className="h-5 w-5 text-muted-foreground" /></div>
                <div><CardTitle className="text-lg">Internal notes</CardTitle><CardDescription>Private notes — not visible to customers</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {plan.notes.length > 0 && (
                <ul className="space-y-2">
                  {plan.notes.map((n, i) => (
                    <li key={i} className="rounded-xl border border-border/30 bg-secondary/10 px-4 py-3">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{n.text}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground">{fmt(n.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={(e) => void addNote(e)} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <textarea
                  ref={noteRef}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a private note..."
                  rows={2}
                  className="flex-1 resize-none rounded-xl border border-border/40 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button type="submit" size="sm" disabled={noteLoading || !noteText.trim()} className="shrink-0">
                  {noteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Save note
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
