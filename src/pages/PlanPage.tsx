import { useEffect, useState, useCallback } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2, AlertCircle, Loader2, Clock, User, Building2,
  CalendarRange, ArrowRight, Home, ShieldCheck, RefreshCw,
} from "lucide-react";
import { MandateConsent } from "@/components/mandate-consent";
import { apiFetch } from "@/lib/api";
import { parseScheduleJsonForDisplay } from "@/lib/utils/schedule";
import mainLogo from "@/assets/main_logo.png";

type PlanPayload = {
  id: string; plan_name?: string | null; business_name?: string | null;
  total_amount: string | number; status: string; schedule_json: unknown;
  payment_method: "card" | "bank"; customer_id?: string;
  customers: { name?: string | null; phone?: string | null; email?: string | null } | null;
};
type VerifyResult = { planStatus: string; paymentStatus: string };

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function fmtDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

// ── Shared header ─────────────────────────────────────────────────────────────

function PageLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
        <img src={mainLogo} alt="RepayStream" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
      </div>
      <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>RepayStream</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PlanPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [plan, setPlan] = useState<PlanPayload | null | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<VerifyResult | null>(null);

  const trxref = searchParams.get("trxref") ?? searchParams.get("reference");
  const txRef  = searchParams.get("tx_ref");
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

      if (paymentRef && id) {
        setVerifying(true);
        const refParam = trxref ? `trxref=${trxref}` : `tx_ref=${txRef}`;
        let attempts = 0;

        const poll = async () => {
          if (cancelled || attempts >= 10) { if (!cancelled) setVerifying(false); return; }
          attempts++;
          try {
            const vRes = await apiFetch(`/api/public/plans/${id}/verify?${refParam}`);
            if (!vRes.ok) { setVerifying(false); return; }
            const result = (await vRes.json()) as VerifyResult;
            if (result.paymentStatus === "success" || result.paymentStatus === "failed") {
              if (!cancelled) { setVerified(result); setVerifying(false); await fetchPlan(); }
              return;
            }
            setTimeout(() => void poll(), 3000);
          } catch { if (!cancelled) setVerifying(false); }
        };
        void poll();
      }
    })();
    return () => { cancelled = true; };
  }, [id, paymentRef, trxref, txRef, fetchPlan]);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (plan === undefined && !notFound) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  // ── Not found ───────────────────────────────────────────────────────────────

  if (notFound || !plan) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 py-12 text-center">
        <PageLogo />
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">Plan not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">This plan may have been removed or the link is invalid.</p>
        </div>
        <Link to="/" className="flex items-center gap-2 rounded-xl border border-border/40 bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">
          <Home className="h-4 w-4" />Go home
        </Link>
      </div>
    );
  }

  const scheduleRows = parseScheduleJsonForDisplay(plan.schedule_json, plan.total_amount);
  const total = Number(plan.total_amount);
  const installmentCount = scheduleRows.length;
  const isMandatePayment = plan.status === "pending_mandate" || verified?.planStatus === "pending_mandate";
  const isEarlyPayment = paymentRef?.startsWith("rs_manual_") || paymentRef?.startsWith("rs_retry_");

  // ── Verifying ───────────────────────────────────────────────────────────────

  if (verifying) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center gap-7 text-center">
          <PageLogo />
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Confirming your payment…</h2>
            <p className="mt-2 text-sm text-muted-foreground">Please wait while we verify your transaction with Paystack.</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/40" />
            Secured by Paystack · CBN Direct Debit
          </div>
        </div>
      </div>
    );
  }

  // ── Payment success ──────────────────────────────────────────────────────────

  if (verified?.paymentStatus === "success") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex w-full max-w-md flex-col items-center gap-6 text-center"
        >
          {/* Logo */}
          <PageLogo />

          {/* Success icon */}
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.1, duration: 0.45, type: "spring", stiffness: 220, damping: 14 }}
            className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/10"
          >
            <CheckCircle2 className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </motion.div>

          {/* Heading */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {isEarlyPayment ? "Payment successful!" : "Mandate authorised!"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              {isEarlyPayment
                ? `Your payment to ${plan.business_name ?? "the business"} has been processed.`
                : `Your mandate with ${plan.business_name ?? "the business"} is now active. Debits will run per schedule.`}
            </p>
          </div>

          {/* Summary card */}
          <div className="w-full rounded-2xl border border-primary/20 bg-primary/6 px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/60">
              {isEarlyPayment ? "Amount paid" : "Total authorised"}
            </p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">{naira(total)}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 border-t border-primary/10 pt-3 text-xs">
              {plan.plan_name && <span className="font-medium text-foreground">{plan.plan_name}</span>}
              {plan.business_name && <span className="text-muted-foreground">{plan.business_name}</span>}
              {plan.customers?.name && <span className="text-muted-foreground">{plan.customers.name}</span>}
              {installmentCount > 1 && <span className="text-muted-foreground">{installmentCount} installments</span>}
            </div>
          </div>

          {/* Repayment schedule */}
          {scheduleRows.length > 1 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.3 }}
              className="w-full overflow-hidden rounded-2xl border border-border/40 bg-card text-left"
            >
              <div className="flex items-center gap-3 border-b border-border/30 px-5 py-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
                  <CalendarRange className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Repayment schedule</p>
              </div>
              <div className="flex justify-between border-b border-border/20 bg-secondary/20 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Due date</span><span>Amount</span>
              </div>
              {scheduleRows.map((row, i) => (
                <div
                  key={`${row.due_date}-${i}`}
                  className={`flex items-center justify-between px-5 py-3 text-sm ${i > 0 ? "border-t border-border/10" : ""}`}
                >
                  <span className="text-muted-foreground">{fmtDate(row.due_date)}</span>
                  <span className="font-mono font-semibold text-foreground">{naira(row.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-border/30 bg-secondary/20 px-5 py-3">
                <span className="text-xs font-semibold text-muted-foreground">
                  {installmentCount} installment{installmentCount !== 1 ? "s" : ""} total
                </span>
                <span className="font-mono font-bold text-foreground">{naira(total)}</span>
              </div>
            </motion.div>
          )}

          {/* Portal CTA */}
          {plan.customer_id ? (
            <Link
              to={`/portal/claim?customerId=${plan.customer_id}`}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90"
            >
              View my repayment portal
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              to="/"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card px-6 py-3.5 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
            >
              <Home className="h-4 w-4" />Back to home
            </Link>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/40" />
            Secured by Paystack · CBN Direct Debit
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Payment failed ───────────────────────────────────────────────────────────

  if (verified?.paymentStatus === "failed") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12 text-center">
        <div className="mb-10"><PageLogo /></div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex w-full max-w-md flex-col items-center gap-6"
        >
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-destructive/20 bg-destructive/10">
            <AlertCircle className="h-12 w-12 text-destructive" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Payment unsuccessful</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              The transaction was not completed. Please check your card and try again.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-border/40 bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="text-sm font-medium text-foreground">{plan.plan_name ?? "Repayment plan"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border/20 pt-2">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-mono font-bold text-foreground">{naira(total)}</span>
            </div>
          </div>
          {/* Re-show the consent / retry option */}
          {plan.status === "pending_mandate" && (
            <div className="w-full">
              <MandateConsent plan={plan} />
            </div>
          )}
          <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">
            <Home className="h-3 w-3" />Back to home
          </Link>
        </motion.div>
      </div>
    );
  }

  // ── Pre-payment: plan view + mandate consent ─────────────────────────────────

  return (
    <div className="min-h-dvh bg-background">

      {/* Sticky header */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/40 bg-background/95 px-5 backdrop-blur-xl">
        <PageLogo />
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Home className="h-3.5 w-3.5" />Home
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-8 pb-24">

        {/* "Public consent page" badge */}
        <div className="mb-6 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/6 px-4 py-1.5 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />Public consent page
          </span>
        </div>

        {/* Plan identity card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5"
        >
          <div className="grid divide-y divide-border/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex flex-col gap-1.5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Customer</p>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0 text-primary" />
                <p className="font-semibold text-foreground">{plan.customers?.name ?? "—"}</p>
              </div>
              {plan.customers?.email && <p className="text-xs text-muted-foreground truncate">{plan.customers.email}</p>}
            </div>
            <div className="flex flex-col gap-1.5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Plan</p>
              <p className="font-semibold text-foreground">{plan.plan_name ?? "Repayment plan"}</p>
              <p className="text-xs text-muted-foreground">
                {naira(total)}{installmentCount > 1 ? ` · ${installmentCount} installments` : ""}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Business</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-primary" />
                <p className="font-semibold text-foreground">{plan.business_name ?? "—"}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Repayment schedule */}
        {scheduleRows.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="mb-4 overflow-hidden rounded-2xl border border-border/40 bg-card"
          >
            <div className="flex items-center gap-3 border-b border-border/30 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <CalendarRange className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Repayment schedule</p>
                <p className="text-xs text-muted-foreground">Agreed debit schedule (NGN)</p>
              </div>
            </div>
            <div>
              <div className="flex justify-between border-b border-border/20 bg-secondary/20 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Due date</span><span>Amount</span>
              </div>
              {scheduleRows.map((row, i) => (
                <motion.div
                  key={`${row.due_date}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className={`flex items-center justify-between px-5 py-3 text-sm ${i > 0 ? "border-t border-border/10" : ""}`}
                >
                  <span className="text-muted-foreground">{fmtDate(row.due_date)}</span>
                  <span className="font-mono font-semibold text-foreground">{naira(row.amount)}</span>
                </motion.div>
              ))}
              <div className="flex items-center justify-between border-t border-border/30 bg-secondary/20 px-5 py-3">
                <span className="text-xs font-semibold text-muted-foreground">{installmentCount} installment{installmentCount !== 1 ? "s" : ""} total</span>
                <span className="font-mono font-bold text-foreground">{naira(total)}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Mandate consent — only when pending */}
        {plan.status === "pending_mandate" && !verifying && verified?.paymentStatus !== "success" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <MandateConsent plan={plan} />
          </motion.div>
        )}

        {/* Already active / completed state */}
        {["active", "completed", "paused"].includes(plan.status) && !paymentRef && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="rounded-2xl border border-primary/20 bg-primary/6 px-5 py-4"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-primary">
                  {plan.status === "completed" ? "Plan completed" : "Mandate authorised"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {plan.status === "completed"
                    ? "All installments for this plan have been paid."
                    : "This plan is active. Debits will run as per the schedule above."}
                </p>
              </div>
            </div>
            {plan.customer_id && (
              <Link
                to={`/portal/claim?customerId=${plan.customer_id}`}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
              >
                View my portal <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </motion.div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground/50">
          Questions? Contact the business that shared this link.<br />
          For disputes, use your customer portal after signing in.
        </p>
      </div>
    </div>
  );
}
