import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, CreditCard, Wallet, ExternalLink, TrendingUp, Clock, CheckCircle2, Building2, ChevronDown, CalendarRange, AlertCircle, XCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { DisputeChat } from "@/components/dispute-chat";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { parseScheduleJsonForDisplay } from "@/lib/utils/schedule";
import { staggerContainer, staggerItem, smooth } from "@/lib/motion";

type Attempt = { id: string; attempt_number: number; amount: number; status: string; provider: string; failure_reason: string | null; created_at: string };

type PortalData = {
  customer: { id: string; phone: string; email?: string };
  plans: { id: string; total_amount: number; status: string; payment_method?: string; schedule_json?: unknown; created_at?: string; attempts?: Attempt[] }[];
};

const statusStyles: Record<string, string> = {
  pending_mandate: "text-amber-400 bg-amber-400/10",
  active: "text-primary bg-primary/10",
  completed: "text-blue-400 bg-blue-400/10",
  defaulted: "text-destructive bg-destructive/10",
};

const statusIcons: Record<string, typeof Clock> = {
  pending_mandate: Clock,
  active: TrendingUp,
  completed: CheckCircle2,
};

export function CustomerPortalPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<PortalData | null | undefined>(undefined);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

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

  async function signOut() { await apiFetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }

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

        {/* Plans with schedule + payment history */}
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

                    return (
                      <motion.div key={p.id} variants={staggerItem} transition={smooth} className="rounded-xl border border-border/40 bg-card/30 transition-all hover:border-border/60">
                        {/* Plan summary row */}
                        <button
                          onClick={() => setExpandedPlan(isExpanded ? null : p.id)}
                          className="flex w-full items-center gap-4 p-5 text-left"
                        >
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-bold tabular-nums">&#8358;{Number(p.total_amount).toLocaleString("en-NG")}</p>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[p.status] ?? "bg-secondary text-secondary-foreground"}`}>
                                <Icon className="h-3 w-3" />{p.status.replace(/_/g, " ")}
                              </span>
                              {scheduleRows.length > 1 && (
                                <span className="text-xs text-muted-foreground">{paidCount}/{scheduleRows.length} paid</span>
                              )}
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
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                              <Link to={`/plan/${p.id}`}>Pay now</Link>
                            </Button>
                            <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            </motion.div>
                          </div>
                        </button>

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
                                {/* Schedule */}
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

                                {/* Payment history */}
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
