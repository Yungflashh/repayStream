import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CalendarRange, CheckCircle2, Clock, CreditCard,
  FileText, Hash, Phone, Mail, TrendingUp, AlertCircle, XCircle, ExternalLink, UserCheck,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { parseScheduleJsonForDisplay } from "@/lib/utils/schedule";
import { staggerContainer, staggerItem, smooth } from "@/lib/motion";

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

type PlanDetail = {
  plan: {
    id: string;
    total_amount: number;
    status: string;
    payment_method: string;
    schedule_json: unknown;
    created_at: string;
    customer: { id: string; phone: string; email: string } | null;
  };
  attempts: Attempt[];
};

const statusConfig: Record<string, { color: string; bg: string; icon: typeof Clock; label: string }> = {
  pending_mandate: { color: "text-amber-400", bg: "bg-amber-400/10", icon: Clock, label: "Pending mandate" },
  active: { color: "text-primary", bg: "bg-primary/10", icon: TrendingUp, label: "Active" },
  completed: { color: "text-blue-400", bg: "bg-blue-400/10", icon: CheckCircle2, label: "Completed" },
  defaulted: { color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle, label: "Defaulted" },
};

const attemptStatusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  success: { color: "text-primary bg-primary/10", icon: CheckCircle2 },
  pending: { color: "text-amber-400 bg-amber-400/10", icon: Clock },
  failed: { color: "text-destructive bg-destructive/10", icon: XCircle },
};

export function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PlanDetail | null | undefined>(undefined);

  useEffect(() => {
    if (!id) { setData(null); return; }
    let cancelled = false;
    void (async () => {
      const res = await apiFetch(`/api/plans/${id}`);
      if (cancelled) return;
      if (!res.ok) { setData(null); return; }
      setData((await res.json()) as PlanDetail);
    })();
    return () => { cancelled = true; };
  }, [id]);

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

  // Map attempts to installments
  const successfulAttempts = attempts.filter((a) => a.status === "success");
  const paidCount = successfulAttempts.length;
  const totalPaid = successfulAttempts.reduce((s, a) => s + a.amount, 0);

  return (
    <Layout maxWidth="2xl">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
        {/* Back + header */}
        <motion.div variants={staggerItem} transition={smooth} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Plan details</h1>
              <p className="font-mono text-xs text-muted-foreground">{plan.id}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" asChild><Link to={`/plan/${plan.id}`} target="_blank"><ExternalLink className="h-3.5 w-3.5" />Mandate link</Link></Button>
            {plan.customer && (
              <Button size="sm" variant="outline" asChild><Link to={`/portal/claim?customerId=${plan.customer.id}`} target="_blank"><UserCheck className="h-3.5 w-3.5" />Claim link</Link></Button>
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

        {/* Customer info */}
        {plan.customer && (
          <motion.div variants={staggerItem} transition={smooth}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><UserCheck className="h-5 w-5 text-accent" /></div>
                  <div><CardTitle className="text-lg">Customer</CardTitle></div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                      <p className="text-xs text-muted-foreground">Method</p>
                      <p className="text-sm font-medium">Paystack</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Schedule with payment status */}
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
                    const isUpcoming = i > paidCount;
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

        {/* Payment attempts history */}
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
      </motion.div>
    </Layout>
  );
}
