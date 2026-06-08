import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut, CreditCard, Wallet, TrendingUp, Clock, CheckCircle2, Building2,
  ChevronDown, CalendarRange, AlertCircle, XCircle, Loader2, RefreshCw,
  ArrowUpRight, CreditCard as CardIcon, Banknote, Plus,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { DisputeChat } from "@/components/dispute-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, clearToken } from "@/lib/api";
import { parseScheduleJsonForDisplay } from "@/lib/utils/schedule";
import { staggerContainer, staggerItem, smooth } from "@/lib/motion";

type Attempt = { id: string; attempt_number: number; amount: number; status: string; provider: string; failure_reason: string | null; created_at: string };

type OfflinePmt = { id: string; amount: number; method: string; notes?: string; proof_url?: string; status: string; recorded_by: string; created_at: string };

type PortalData = {
  customer: { id: string; phone: string; email?: string };
  plans: {
    id: string;
    plan_name?: string | null;
    total_amount: number;
    status: string;
    payment_method?: string;
    schedule_json?: unknown;
    created_at?: string;
    attempts?: Attempt[];
  }[];
};

const statusStyles: Record<string, string> = {
  pending_mandate: "text-amber-400 bg-amber-400/10",
  active: "text-primary bg-primary/10",
  completed: "text-blue-400 bg-blue-400/10",
  defaulted: "text-destructive bg-destructive/10",
  paused: "text-amber-500 bg-amber-500/10",
  cancelled: "text-muted-foreground bg-secondary/30",
};

const statusIcons: Record<string, typeof Clock> = {
  pending_mandate: Clock,
  active: TrendingUp,
  completed: CheckCircle2,
  defaulted: AlertCircle,
};

export function CustomerPortalPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PortalData | null | undefined>(undefined);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<{ planId: string; msg: string; ok: boolean } | null>(null);
  const [offlineByPlan, setOfflineByPlan] = useState<Record<string, OfflinePmt[]>>({});
  const [showOfflineForm, setShowOfflineForm] = useState<string | null>(null);
  const [offlineForm, setOfflineForm] = useState({ amount: "", method: "transfer", notes: "", proofUrl: "" });
  const [offlineLoading, setOfflineLoading] = useState(false);
  const [offlineError, setOfflineError] = useState<string | null>(null);

  async function loadPortal() {
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
      setData((await res.json()) as PortalData);
    })();
    return () => { cancelled = true; };
  }, [id]);

  async function signOut() { await apiFetch("/api/auth/logout", { method: "POST" }); clearToken(); window.location.href = "/"; }

  async function retryDebit(planId: string) {
    if (!id) return;
    setActionLoading(`retry-${planId}`);
    setActionResult(null);
    try {
      const res = await apiFetch(`/api/customer/${id}/plans/${planId}/retry-debit`, { method: "POST" });
      const data = await res.json() as { ok?: boolean; status?: string; message?: string; error?: string };
      if (res.ok) {
        const statusMsg = data.status === "success" ? "Payment successful!" : data.status === "pending" ? "Payment pending — we'll update you soon." : `Retry failed: ${data.message ?? ""}`;
        setActionResult({ planId, msg: statusMsg, ok: data.status === "success" });
        await loadPortal();
      } else {
        setActionResult({ planId, msg: data.error ?? "Retry failed", ok: false });
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function payNow(planId: string) {
    if (!id) return;
    setActionLoading(`paynow-${planId}`);
    try {
      const res = await apiFetch(`/api/customer/${id}/plans/${planId}/pay-now`, { method: "POST" });
      const data = await res.json() as { authorizationUrl?: string; error?: string };
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setActionResult({ planId, msg: data.error ?? "Could not start payment", ok: false });
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function updatePaymentMethod(planId: string) {
    if (!id) return;
    setActionLoading(`update-${planId}`);
    try {
      const res = await apiFetch(`/api/customer/${id}/plans/${planId}/update-payment-method`, { method: "POST" });
      const data = await res.json() as { authorizationUrl?: string; error?: string };
      if (res.ok && data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        setActionResult({ planId, msg: data.error ?? "Could not start update", ok: false });
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function loadOffline(planId: string) {
    if (!id) return;
    const res = await apiFetch(`/api/offline/customer/${id}/plans/${planId}`);
    if (res.ok) {
      const od = (await res.json()) as { payments: OfflinePmt[] };
      setOfflineByPlan((prev) => ({ ...prev, [planId]: od.payments ?? [] }));
    }
  }

  async function submitOffline(e: React.FormEvent, planId: string) {
    e.preventDefault();
    if (!id) return;
    const amt = parseFloat(offlineForm.amount);
    if (isNaN(amt) || amt <= 0) { setOfflineError("Enter a valid amount"); return; }
    setOfflineLoading(true);
    setOfflineError(null);
    try {
      const res = await apiFetch(`/api/offline/customer/${id}/plans/${planId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amt, method: offlineForm.method, notes: offlineForm.notes || undefined, proofUrl: offlineForm.proofUrl || undefined }),
      });
      const d = await res.json() as { error?: string };
      if (!res.ok) throw new Error(d.error ?? "Failed");
      setOfflineForm({ amount: "", method: "transfer", notes: "", proofUrl: "" });
      setShowOfflineForm(null);
      await loadOffline(planId);
    } catch (err) {
      setOfflineError(err instanceof Error ? err.message : "Error");
    } finally {
      setOfflineLoading(false);
    }
  }

  if (data === undefined) {
    return <Layout maxWidth="xl" centered><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></Layout>;
  }
  if (!data) return <Navigate to="/login?error=unauthorized" replace />;

  return (
    <Layout maxWidth="xl">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-8">
        <motion.header variants={staggerItem} transition={smooth} className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Wallet className="h-5 w-5 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Your repayments</h1>
              <p className="text-sm text-muted-foreground">Mandate protected by CBN Direct Debit Scheme</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void signOut()} className="text-muted-foreground"><LogOut className="h-4 w-4" />Sign out</Button>
        </motion.header>

        {/* Plans */}
        <motion.div variants={staggerItem} transition={smooth}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><CreditCard className="h-5 w-5 text-primary" /></div>
                <div><CardTitle className="text-lg">Your plans</CardTitle><CardDescription>Click a plan to view schedule and payment history</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent>
              {!data.plans.length ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-12 text-center">
                  <CreditCard className="mb-3 h-8 w-8 text-muted-foreground/20" /><p className="text-sm text-muted-foreground">No plans linked yet</p>
                </div>
              ) : (
                <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-3">
                  {data.plans.map((p) => {
                    const Icon = statusIcons[p.status] ?? Clock;
                    const isExpanded = expandedPlan === p.id;
                    const scheduleRows = p.schedule_json ? parseScheduleJsonForDisplay(p.schedule_json, p.total_amount) : [];
                    const successAttempts = (p.attempts ?? []).filter((a) => a.status === "success");
                    const paidCount = successAttempts.length;
                    const totalPaid = successAttempts.reduce((s, a) => s + a.amount, 0);
                    const today = new Date().toISOString().slice(0, 10);

                    const hasOverdue = scheduleRows.some((row, i) => {
                      const isPaid = i < paidCount;
                      return !isPaid && row.due_date && row.due_date < today && p.status === "active";
                    });
                    const hasFailedAttempt = (p.attempts ?? []).some((a) => a.status === "failed");
                    const showActions = (hasOverdue || hasFailedAttempt || p.status === "defaulted") && p.status !== "completed" && p.status !== "cancelled";

                    return (
                      <motion.div key={p.id} variants={staggerItem} transition={smooth} className="rounded-xl border border-border/40 bg-card/30 transition-all hover:border-border/60">
                        {/* Plan summary */}
                        <button
                          onClick={() => setExpandedPlan(isExpanded ? null : p.id)}
                          className="flex w-full items-center gap-4 p-5 text-left"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {p.plan_name && <p className="truncate text-sm font-semibold text-foreground">{p.plan_name}</p>}
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-bold tabular-nums">&#8358;{Number(p.total_amount).toLocaleString("en-NG")}</p>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[p.status] ?? "bg-secondary text-secondary-foreground"}`}>
                                <Icon className="h-3 w-3" />{p.status.replace(/_/g, " ")}
                              </span>
                              {scheduleRows.length > 1 && <span className="text-xs text-muted-foreground">{paidCount}/{scheduleRows.length} paid</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono">{p.id.slice(-8)}</span>
                              <span className="flex items-center gap-1">
                                {p.payment_method === "bank" ? <Building2 className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                                {p.payment_method === "bank" ? "Bank" : "Card"}
                              </span>
                              {totalPaid > 0 && <span className="text-primary">&#8358;{totalPaid.toLocaleString("en-NG")} paid</span>}
                            </div>
                          </div>
                          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </motion.div>
                        </button>

                        {/* Action buttons for overdue/failed */}
                        {showActions && (
                          <div className="border-t border-border/20 px-5 pb-4 pt-3">
                            {actionResult?.planId === p.id && (
                              <p className={`mb-3 text-xs rounded-lg px-3 py-2 ${actionResult.ok ? "text-primary bg-primary/10" : "text-destructive bg-destructive/10"}`}>
                                {actionResult.msg}
                              </p>
                            )}
                            <p className="mb-2 text-xs font-medium text-muted-foreground">
                              {p.status === "defaulted" ? "Payment defaulted — take action:" : "Overdue installment — what would you like to do?"}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm" variant="outline"
                                disabled={actionLoading === `retry-${p.id}`}
                                onClick={() => void retryDebit(p.id)}
                              >
                                {actionLoading === `retry-${p.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                Retry auto-debit
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                disabled={actionLoading === `paynow-${p.id}`}
                                onClick={() => void payNow(p.id)}
                              >
                                {actionLoading === `paynow-${p.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                                Pay now (transfer/card)
                              </Button>
                              <Button
                                size="sm" variant="outline"
                                disabled={actionLoading === `update-${p.id}`}
                                onClick={() => void updatePaymentMethod(p.id)}
                              >
                                {actionLoading === `update-${p.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CardIcon className="h-3.5 w-3.5" />}
                                Update payment method
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Expanded schedule + history */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border/30 px-5 pb-5 pt-4 space-y-4">
                                {scheduleRows.length > 0 && (
                                  <div>
                                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                      <CalendarRange className="h-3.5 w-3.5" />Schedule
                                    </div>
                                    <div className="overflow-hidden rounded-lg border border-border/30 bg-secondary/10">
                                      <div className="flex items-center border-b border-border/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        <span className="w-8">#</span>
                                        <span className="flex-1">Due</span>
                                        <span className="w-24 text-right">Amount</span>
                                        <span className="w-20 text-right">Status</span>
                                      </div>
                                      {scheduleRows.map((row, i) => {
                                        const isPaid = i < paidCount;
                                        const isOverdue = !isPaid && row.due_date && row.due_date < today && p.status === "active";
                                        const isCurrent = i === paidCount && p.status === "active";

                                        let badge = "Upcoming";
                                        let badgeCls = "text-muted-foreground/60";
                                        if (isPaid) { badge = "Paid"; badgeCls = "text-primary"; }
                                        else if (isOverdue) { badge = "Overdue"; badgeCls = "text-destructive"; }
                                        else if (isCurrent) { badge = "Due"; badgeCls = "text-amber-400"; }

                                        return (
                                          <div key={`${row.due_date}-${i}`} className={`flex items-center px-3 py-2 text-xs ${i > 0 ? "border-t border-border/10" : ""} ${isCurrent ? "bg-amber-400/5" : ""}`}>
                                            <span className="w-8 font-mono text-muted-foreground/50">{i + 1}</span>
                                            <span className={`flex-1 ${isPaid ? "line-through text-muted-foreground/50" : ""}`}>{row.due_date || "—"}</span>
                                            <span className={`w-24 text-right font-mono font-medium ${isPaid ? "text-muted-foreground/50" : ""}`}>
                                              &#8358;{row.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                                            </span>
                                            <span className={`w-20 text-right text-[11px] font-medium ${badgeCls}`}>{badge}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {(p.attempts ?? []).length > 0 && (
                                  <div>
                                    <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                      <CreditCard className="h-3.5 w-3.5" />Payment history
                                    </div>
                                    <div className="space-y-2">
                                      {(p.attempts ?? []).map((a) => (
                                        <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/20 bg-secondary/10 px-3 py-2 text-xs">
                                          <div className="flex items-center gap-2">
                                            {a.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                                            {a.status === "pending" && <Clock className="h-3.5 w-3.5 text-amber-400" />}
                                            {a.status === "failed" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                                            <span className="font-medium">&#8358;{a.amount.toLocaleString("en-NG")}</span>
                                            <span className="capitalize text-muted-foreground">{a.provider}</span>
                                            {a.failure_reason && <span className="text-destructive">{a.failure_reason.replace(/_/g, " ")}</span>}
                                          </div>
                                          <span className="text-muted-foreground/60">
                                            {new Date(a.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Offline payment section */}
                                <div>
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                                      <Banknote className="h-3.5 w-3.5" />Offline payments
                                    </div>
                                    <button
                                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                                      onClick={() => {
                                        if (showOfflineForm !== p.id) {
                                          void loadOffline(p.id);
                                          setShowOfflineForm(p.id);
                                        } else {
                                          setShowOfflineForm(null);
                                        }
                                      }}
                                    >
                                      {showOfflineForm === p.id ? "Cancel" : <><Plus className="h-3 w-3" />Record payment</>}
                                    </button>
                                  </div>

                                  {/* Existing offline payments */}
                                  {(offlineByPlan[p.id] ?? []).length > 0 && (
                                    <div className="mb-2 space-y-1.5">
                                      {(offlineByPlan[p.id] ?? []).map((op) => (
                                        <div key={op.id} className="flex items-center justify-between rounded-lg border border-border/20 bg-secondary/10 px-3 py-2 text-xs">
                                          <div className="flex items-center gap-2">
                                            <span className="font-medium">&#8358;{op.amount.toLocaleString("en-NG")}</span>
                                            <span className="capitalize text-muted-foreground">{op.method}</span>
                                            {op.notes && <span className="text-muted-foreground/70">{op.notes}</span>}
                                            {op.proof_url && <a href={op.proof_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">Proof</a>}
                                          </div>
                                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${op.status === "approved" ? "text-primary bg-primary/10" : op.status === "rejected" ? "text-destructive bg-destructive/10" : "text-amber-400 bg-amber-400/10"}`}>
                                            {op.status === "pending_approval" ? "Awaiting approval" : op.status}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Record form */}
                                  {showOfflineForm === p.id && (
                                    <form onSubmit={(e) => void submitOffline(e, p.id)} className="space-y-2 rounded-lg border border-border/30 bg-secondary/10 p-3">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[10px] text-muted-foreground">Amount (₦)</label>
                                          <input type="number" min="1" step="0.01" required placeholder="5000" value={offlineForm.amount} onChange={(e) => setOfflineForm((f) => ({ ...f, amount: e.target.value }))} className="mt-0.5 flex h-9 w-full rounded-lg border border-border/40 bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-muted-foreground">Method</label>
                                          <select value={offlineForm.method} onChange={(e) => setOfflineForm((f) => ({ ...f, method: e.target.value }))} className="mt-0.5 flex h-9 w-full rounded-lg border border-border/40 bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                            <option value="transfer">Bank transfer</option>
                                            <option value="cash">Cash</option>
                                            <option value="pos">POS</option>
                                            <option value="other">Other</option>
                                          </select>
                                        </div>
                                      </div>
                                      <input type="text" placeholder="Notes (optional)" value={offlineForm.notes} onChange={(e) => setOfflineForm((f) => ({ ...f, notes: e.target.value }))} className="flex h-9 w-full rounded-lg border border-border/40 bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                      <input type="url" placeholder="Receipt URL (optional — Google Drive, etc.)" value={offlineForm.proofUrl} onChange={(e) => setOfflineForm((f) => ({ ...f, proofUrl: e.target.value }))} className="flex h-9 w-full rounded-lg border border-border/40 bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                      {offlineError && <p className="text-xs text-destructive">{offlineError}</p>}
                                      <p className="text-[10px] text-muted-foreground/70">Your submission will be reviewed by the business before it updates your balance.</p>
                                      <button type="submit" disabled={offlineLoading || !offlineForm.amount} className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50">
                                        {offlineLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Banknote className="h-3 w-3" />}Submit for approval
                                      </button>
                                    </form>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Dispute chat */}
        <motion.div variants={staggerItem} transition={smooth}>
          <DisputeChat customerId={data.customer.id} plans={data.plans.map((p) => ({ id: p.id, total_amount: p.total_amount }))} />
        </motion.div>
      </motion.div>
    </Layout>
  );
}
