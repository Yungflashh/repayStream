import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarRange, FileText, CreditCard, Phone, Hash, AlertCircle, CheckCircle2, Loader2, Clock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { MandateConsent } from "@/components/mandate-consent";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { parseScheduleJsonForDisplay } from "@/lib/utils/schedule";
import { staggerContainer, staggerItem, fadeInUp, smooth } from "@/lib/motion";

type PlanPayload = { id: string; total_amount: string | number; status: string; schedule_json: unknown; payment_method: "card" | "bank"; customers: { phone?: string | null; email?: string | null } | null };
type VerifyResult = { planStatus: string; paymentStatus: string };

export function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [plan, setPlan] = useState<PlanPayload | null | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<VerifyResult | null>(null);

  // Detect if returning from payment gateway
  const trxref = searchParams.get("trxref") ?? searchParams.get("reference");
  const txRef = searchParams.get("tx_ref");
  const paymentRef = trxref ?? txRef;

  const fetchPlan = useCallback(async () => {
    if (!id) { setNotFound(true); setPlan(null); return; }
    const res = await apiFetch(`/api/public/plans/${id}`);
    if (!res.ok) { setNotFound(true); setPlan(null); return; }
    const data = (await res.json()) as { plan: PlanPayload };
    setPlan(data.plan);
    setNotFound(false);
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await fetchPlan();
      if (cancelled) return;

      // If returning from payment gateway, poll verification endpoint
      if (paymentRef && id) {
        setVerifying(true);
        const refParam = trxref ? `trxref=${trxref}` : `tx_ref=${txRef}`;
        let attempts = 0;
        const maxAttempts = 10;

        const poll = async () => {
          if (cancelled || attempts >= maxAttempts) {
            if (!cancelled) setVerifying(false);
            return;
          }
          attempts++;
          try {
            const vRes = await apiFetch(`/api/public/plans/${id}/verify?${refParam}`);
            if (!vRes.ok) { setVerifying(false); return; }
            const result = (await vRes.json()) as VerifyResult;

            if (result.paymentStatus === "success" || result.paymentStatus === "failed") {
              if (!cancelled) {
                setVerified(result);
                setVerifying(false);
                // Refresh plan data to get updated status
                await fetchPlan();
              }
              return;
            }
            // Still pending — wait and retry
            setTimeout(() => void poll(), 3000);
          } catch {
            if (!cancelled) setVerifying(false);
          }
        };
        void poll();
      }
    })();
    return () => { cancelled = true; };
  }, [id, paymentRef, trxref, txRef, fetchPlan]);

  if (plan === undefined && !notFound) {
    return <Layout maxWidth="xl" centered><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></Layout>;
  }

  if (notFound || !plan) {
    return (
      <Layout maxWidth="md" centered>
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={smooth} className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10"><AlertCircle className="h-8 w-8 text-destructive" /></div>
          <h2 className="text-xl font-semibold">Plan not found</h2>
          <p className="text-sm text-muted-foreground">This plan may have been removed or the link is invalid.</p>
          <Button asChild variant="outline"><Link to="/">Go home</Link></Button>
        </motion.div>
      </Layout>
    );
  }

  const scheduleRows = parseScheduleJsonForDisplay(plan.schedule_json, plan.total_amount);
  const total = Number(plan.total_amount);

  return (
    <Layout maxWidth="2xl" showBack backLabel="Home">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
        <motion.div variants={staggerItem} transition={smooth} className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">Public consent page</span>
        </motion.div>

        {/* Payment status banner */}
        {(verifying || verified) && (
          <motion.div variants={staggerItem} transition={smooth}>
            {verifying && (
              <Card className="border-amber-400/30 bg-amber-400/5">
                <CardContent className="flex items-center gap-4 py-5">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
                  <div>
                    <p className="font-semibold text-amber-400">Verifying your payment...</p>
                    <p className="text-sm text-muted-foreground">Please wait while we confirm your transaction with the payment provider.</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {verified?.paymentStatus === "success" && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex items-center gap-4 py-5">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-semibold text-primary">Payment confirmed</p>
                    <p className="text-sm text-muted-foreground">Your mandate has been authorised. Scheduled debits will begin as per the plan below.</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {verified?.paymentStatus === "failed" && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="flex items-center gap-4 py-5">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">Payment unsuccessful</p>
                    <p className="text-sm text-muted-foreground">The transaction was not completed. You can try again below.</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {verified?.paymentStatus === "pending" && (
              <Card className="border-amber-400/30 bg-amber-400/5">
                <CardContent className="flex items-center gap-4 py-5">
                  <Clock className="h-6 w-6 text-amber-400" />
                  <div>
                    <p className="font-semibold text-amber-400">Payment processing</p>
                    <p className="text-sm text-muted-foreground">Your transaction is still being processed. This page will update automatically.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Summary */}
        <motion.div variants={staggerItem} transition={smooth}>
          <Card>
            <CardHeader>
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><FileText className="h-6 w-6 text-primary" /></div>
              <CardTitle className="text-xl">Repayment summary</CardTitle>
              <CardDescription>
                Complete authorization with Paystack to proceed with this plan. RepayStream does not hold your funds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Hash, label: "Plan ID", value: plan.id, mono: true, truncate: true },
                  { icon: FileText, label: "Status", value: plan.status.replace(/_/g, " ") },
                  { icon: CreditCard, label: "Method", value: "Paystack" },
                  ...(plan.customers?.phone ? [{ icon: Phone, label: "Phone", value: plan.customers.phone }] : []),
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 p-4 min-w-0">
                    <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className={`text-sm font-medium ${(item as { mono?: boolean; truncate?: boolean }).truncate ? "truncate" : ""} ${(item as { mono?: boolean }).mono ? "font-mono text-xs" : "capitalize"}`}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Schedule */}
        <motion.div variants={staggerItem} transition={smooth}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10"><CalendarRange className="h-5 w-5 text-accent" /></div>
                <div><CardTitle className="text-lg">Schedule</CardTitle><CardDescription>Agreed debit schedule (NGN)</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border/30 bg-secondary/10">
                <div className="flex justify-between border-b border-border/30 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Due date</span><span>Amount</span>
                </div>
                <ul className="divide-y divide-border/20">
                  {scheduleRows.map((row, i) => (
                    <motion.li key={`${row.due_date}-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04, duration: 0.3 }}
                      className="flex items-center justify-between px-4 py-3 text-sm transition-colors hover:bg-secondary/20">
                      <span className="text-muted-foreground">{row.due_date || "—"}</span>
                      <span className="font-mono font-semibold">&#8358;{row.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </motion.li>
                  ))}
                </ul>
                <div className="flex justify-between border-t border-border/40 bg-secondary/20 px-4 py-3 text-sm font-bold">
                  <span>Total</span>
                  <span className="font-mono">&#8358;{total.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {plan.status === "pending_mandate" && !verifying && verified?.paymentStatus !== "success" && (
          <motion.div variants={staggerItem} transition={smooth}><MandateConsent plan={plan} /></motion.div>
        )}

        <motion.p variants={staggerItem} transition={smooth} className="text-center text-xs text-muted-foreground/50">
          Questions? Contact the business that shared this link. For disputes, use your customer portal after signing in.
        </motion.p>
      </motion.div>
    </Layout>
  );
}
