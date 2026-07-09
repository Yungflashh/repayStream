import {
  CalendarDays, Check, Copy, Info, Loader2, Plus, Trash2, Sparkles, User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { newIdempotencyKey } from "@/lib/utils/idempotency";
import {
  generateEqualSchedule, koboToAmount, parseAmountToKobo, type ScheduleRow,
} from "@/lib/utils/schedule";
import { validateScheduleBusinessRules } from "@/lib/validators/plan";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type PaymentType = "full" | "installments";
type Frequency = "weekly" | "monthly" | "custom";
type FeeStrategy = "absorb" | "pass_to_customer";

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

function calcFee(amount: number): number {
  return Math.min(amount * 0.015 + 100, 2000);
}

// ── Reusable field components ──────────────────────────────────────────────────

function Field({ id, label, hint, children }: { id?: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/60">{hint}</p>}
    </div>
  );
}

const inputCls = "h-11 w-full rounded-xl border border-border/50 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-50";
const selectCls = inputCls + " cursor-pointer";

// ── Section header ─────────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-secondary/10 p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {children}
    </div>
  );
}

export function CreatePlanForm({ onCreated }: { onCreated?: () => void }) {
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  const [customerName, setCustomerName] = useState("");
  const [planName, setPlanName] = useState("");
  const [group, setGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("full");
  const [dueDate, setDueDate] = useState("");
  const [installmentCount, setInstallmentCount] = useState("2");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [customRows, setCustomRows] = useState<{ amount: string; due_date: string }[]>([
    { amount: "", due_date: "" },
    { amount: "", due_date: "" },
  ]);
  const [feeStrategy, setFeeStrategy] = useState<FeeStrategy>("absorb");

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ planId: string; customerId: string; idempotentReplay: boolean } | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedClaim, setCopiedClaim] = useState(false);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const dirty = useMemo(() => {
    if (paymentType === "installments") return true;
    if (customerName.trim() || planName.trim()) return true;
    if (phone.trim() || email.trim() || amount.trim()) return true;
    if (dueDate || firstDueDate) return true;
    if (customRows.some((r) => r.amount.trim() || r.due_date)) return true;
    return false;
  }, [paymentType, customerName, planName, phone, email, amount, dueDate, firstDueDate, customRows]);

  const builtSchedule = useMemo((): ScheduleRow[] | null => {
    const totalK = parseAmountToKobo(amount);
    if (totalK === null || totalK <= 0) return null;
    if (paymentType === "full") {
      if (!dueDate) return null;
      return [{ amount: koboToAmount(totalK), due_date: dueDate }];
    }
    if (frequency === "custom") {
      const rows: ScheduleRow[] = [];
      for (const row of customRows) {
        const k = parseAmountToKobo(row.amount);
        if (k === null || k <= 0) return null;
        if (!row.due_date) return null;
        rows.push({ amount: koboToAmount(k), due_date: row.due_date });
      }
      return rows.length ? rows : null;
    }
    const n = parseInt(installmentCount, 10);
    if (!Number.isFinite(n) || n < 2 || n > 60) return null;
    if (!firstDueDate) return null;
    return generateEqualSchedule(totalK, n, firstDueDate, frequency);
  }, [amount, paymentType, dueDate, frequency, installmentCount, firstDueDate, customRows]);

  const finalSchedule = useMemo((): ScheduleRow[] | null => {
    if (!builtSchedule) return null;
    if (feeStrategy === "absorb") return builtSchedule;
    return builtSchedule.map((row) => ({
      ...row,
      amount: Math.round((row.amount + calcFee(row.amount)) * 100) / 100,
    }));
  }, [builtSchedule, feeStrategy]);

  const validationMessage = useMemo(() => {
    if (customerName.trim().length < 2) return "Enter the customer's full name (at least 2 characters).";
    if (phone.trim().length < 8) return "Enter a valid customer phone.";
    if (!emailOk(email)) return "Enter a valid customer email.";
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) return "Enter total amount (NGN) with up to 2 decimal places.";
    if (paymentType === "full" && !dueDate) return "Choose a due date.";
    if (paymentType === "installments") {
      if (frequency !== "custom") {
        const n = parseInt(installmentCount, 10);
        if (!Number.isFinite(n) || n < 2 || n > 60) return "Installment count must be between 2 and 60.";
        if (!firstDueDate) return "Choose the first due date.";
      } else if (customRows.length < 1) {
        return "Add at least one installment row.";
      }
    }
    if (!builtSchedule) {
      if (paymentType === "installments" && frequency === "custom") return "Fill amount and date for each custom installment.";
      return "Complete the schedule.";
    }
    return validateScheduleBusinessRules(builtSchedule, amount.trim());
  }, [customerName, phone, email, amount, paymentType, dueDate, frequency, installmentCount, firstDueDate, customRows, builtSchedule]);

  const canSubmit = validationMessage === null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !finalSchedule) return;
    setLoading(true);
    setSubmitError(null);
    try {
      const totalFinal = finalSchedule.reduce((s, r) => s + r.amount, 0);
      const res = await apiFetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          planName: planName.trim() || undefined,
          group: group.trim() || undefined,
          totalAmount: String(Math.round(totalFinal * 100) / 100),
          paymentMethod: "card",
          schedule: finalSchedule,
          feeStrategy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create plan");
      setSuccess({
        planId: data.plan.id as string,
        customerId: data.plan.customerId as string,
        idempotentReplay: Boolean(data.idempotentReplay),
      });
      onCreated?.();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error");
    } finally { setLoading(false); }
  }

  async function copyLink() {
    if (!success) return;
    await navigator.clipboard.writeText(`${window.location.origin}/plan/${success.planId}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  async function copyClaimLink() {
    if (!success) return;
    await navigator.clipboard.writeText(`${window.location.origin}/portal/claim?customerId=${success.customerId}`);
    setCopiedClaim(true); setTimeout(() => setCopiedClaim(false), 2000);
  }

  function resetForAnother() {
    setSuccess(null); setCopied(false); setCopiedClaim(false); setSubmitError(null);
    setIdempotencyKey(newIdempotencyKey()); setCustomerName(""); setPlanName(""); setGroup("");
    setPhone(""); setEmail(""); setAmount(""); setPaymentType("full"); setDueDate("");
    setInstallmentCount("2"); setFrequency("monthly"); setFirstDueDate("");
    setCustomRows([{ amount: "", due_date: "" }, { amount: "", due_date: "" }]);
    setFeeStrategy("absorb");
  }

  // ── Success state ─────────────────────────────────────────────────────────────

  if (success) {
    const shareUrl = `${window.location.origin}/plan/${success.planId}`;
    const claimUrl = `${window.location.origin}/portal/claim?customerId=${success.customerId}`;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="space-y-5"
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-primary/25 bg-primary/5 px-6 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Plan created!</p>
            {success.idempotentReplay && (
              <p className="text-xs text-muted-foreground">Matched a previous submission</p>
            )}
            <p className="mt-1 text-sm text-muted-foreground">Share the links below with your customer.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1. Mandate link</p>
            <p className="text-[11px] text-muted-foreground/70">Customer authorizes the repayment plan here</p>
            <div className="flex gap-2">
              <code className="flex-1 truncate rounded-xl border border-border/30 bg-secondary/20 px-3 py-2 text-xs text-foreground">{shareUrl}</code>
              <button type="button" onClick={() => void copyLink()}
                className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors",
                  copied ? "border-primary/30 bg-primary/10 text-primary" : "border-border/40 bg-secondary/20 text-muted-foreground hover:text-foreground"
                )}>
                {copied ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">2. Customer portal link</p>
            <p className="text-[11px] text-muted-foreground/70">Send after mandate is authorized — they claim their portal here</p>
            <div className="flex gap-2">
              <code className="flex-1 truncate rounded-xl border border-border/30 bg-secondary/20 px-3 py-2 text-xs text-foreground">{claimUrl}</code>
              <button type="button" onClick={() => void copyClaimLink()}
                className={cn("flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors",
                  copiedClaim ? "border-primary/30 bg-primary/10 text-primary" : "border-border/40 bg-secondary/20 text-muted-foreground hover:text-foreground"
                )}>
                {copiedClaim ? <><Check className="h-3.5 w-3.5" />Copied</> : <><Copy className="h-3.5 w-3.5" />Copy</>}
              </button>
            </div>
          </div>
        </div>

        <button type="button" onClick={resetForAnother}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/40 bg-secondary/20 text-sm font-semibold text-foreground hover:bg-secondary/40 transition-colors">
          <Plus className="h-4 w-4" />Create another plan
        </button>
      </motion.div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">

      {/* ── Plan details ── */}
      <Section icon={<CalendarDays className="h-4 w-4" />} title="Plan details">
        <Field id="planName" label="Plan name" hint="Optional — helps you identify this plan later">
          <input id="planName" type="text" placeholder='e.g. "Q2 School Fees"' value={planName}
            onChange={(e) => setPlanName(e.target.value)} className={inputCls} />
        </Field>
        <Field id="group" label="Group / Batch" hint="Optional — group related plans together">
          <input id="group" type="text" placeholder='e.g. "Term 1 2025"' value={group}
            onChange={(e) => setGroup(e.target.value)} className={inputCls} />
        </Field>
      </Section>

      {/* ── Customer info ── */}
      <Section icon={<User className="h-4 w-4" />} title="Customer">
        <Field id="customerName" label="Full name">
          <input id="customerName" type="text" required placeholder='e.g. "John Chukwudi Okoro"' value={customerName}
            onChange={(e) => setCustomerName(e.target.value)} className={inputCls} />
          {customerName.length > 0 && customerName.trim().length < 2 && (
            <p className="mt-1 text-xs text-destructive">Minimum 2 characters.</p>
          )}
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="phone" label="Phone">
            <input id="phone" type="tel" required placeholder="+234..." value={phone}
              onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </Field>
          <Field id="email" label="Email" hint="Used for portal access">
            <input id="email" type="email" required placeholder="customer@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </Field>
        </div>
      </Section>

      {/* ── Amount ── */}
      <Field id="amount" label="Total amount (NGN)">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">₦</span>
          <input id="amount" type="text" required inputMode="decimal" placeholder="50,000.00" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls + " pl-8"} />
        </div>
      </Field>

      {/* ── Payment schedule ── */}
      <div className="rounded-2xl border border-border/40 bg-secondary/10 p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">Payment schedule</p>

        {/* Payment type toggle */}
        <div className="flex gap-1 rounded-xl border border-border/40 bg-background p-1">
          {(["full", "installments"] as const).map((type) => (
            <button key={type} type="button"
              onClick={() => setPaymentType(type)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                paymentType === type ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}>
              {type === "full" ? "Full payment" : "Installments"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {paymentType === "full" ? (
            <motion.div key="full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
              <Field id="due" label="Due date">
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input id="due" type="date" required min={minDate} value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)} className={inputCls + " pl-9"} />
                </div>
              </Field>
            </motion.div>
          ) : (
            <motion.div key="installments" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="count" label="Number of installments">
                  <input id="count" type="number" min={2} max={60} inputMode="numeric" value={installmentCount}
                    onChange={(e) => setInstallmentCount(e.target.value)} disabled={frequency === "custom"} className={inputCls} />
                </Field>
                <Field id="freq" label="Frequency">
                  <select id="freq" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className={selectCls}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </select>
                </Field>
              </div>

              {frequency !== "custom" && (
                <Field id="firstDue" label="First installment due">
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input id="firstDue" type="date" min={minDate} value={firstDueDate}
                      onChange={(e) => setFirstDueDate(e.target.value)} className={inputCls + " pl-9"} />
                  </div>
                </Field>
              )}

              {frequency === "custom" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custom schedule</p>
                    <button type="button"
                      onClick={() => setCustomRows((r) => [...r, { amount: "", due_date: "" }])}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-border/40 bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <Plus className="h-3.5 w-3.5" />Add row
                    </button>
                  </div>
                  <ul className="space-y-2">
                    {customRows.map((row, i) => (
                      <motion.li key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="flex items-end gap-2 rounded-xl border border-border/30 bg-background p-3">
                        <div className="grid flex-1 gap-2 sm:grid-cols-2">
                          <Field label={`#${i + 1} Amount (₦)`}>
                            <input type="text" inputMode="decimal" placeholder="25000.00" value={row.amount}
                              onChange={(e) => { const n = [...customRows]; n[i] = { ...n[i], amount: e.target.value }; setCustomRows(n); }}
                              className={inputCls + " h-10"} />
                          </Field>
                          <Field label="Due date">
                            <input type="date" min={minDate} value={row.due_date}
                              onChange={(e) => { const n = [...customRows]; n[i] = { ...n[i], due_date: e.target.value }; setCustomRows(n); }}
                              className={inputCls + " h-10"} />
                          </Field>
                        </div>
                        <button type="button" disabled={customRows.length <= 1}
                          onClick={() => setCustomRows((r) => r.filter((_, j) => j !== i))}
                          className="mb-0.5 flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-30">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              )}

              {builtSchedule && frequency !== "custom" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border/30 bg-background p-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Schedule preview</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto">
                    {builtSchedule.map((row, i) => (
                      <li key={`${row.due_date}-${i}`} className="flex justify-between gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-secondary/30">
                        <span className="font-mono text-muted-foreground">{row.due_date}</span>
                        <span className="font-mono font-semibold text-foreground">₦{row.amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {frequency === "custom" && builtSchedule && (
                <div className="flex items-center justify-between rounded-xl border border-border/30 bg-background px-4 py-3 text-sm">
                  <span className="text-muted-foreground">Row total</span>
                  <span className="font-mono font-semibold text-foreground">
                    ₦{builtSchedule.reduce((a, r) => a + r.amount, 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Fee estimator ── */}
      {builtSchedule && builtSchedule.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/40 bg-secondary/10 p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Paystack fee handling</p>
            <p className="text-xs text-muted-foreground mt-0.5">1.5% + ₦100 per installment, capped at ₦2,000</p>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-border/40 bg-background p-1">
            {([["absorb", "I absorb the fee"], ["pass_to_customer", "Pass to customer"]] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setFeeStrategy(val)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-xs font-medium transition-all duration-150",
                  feeStrategy === val ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                {label}
              </button>
            ))}
          </div>

          <p className="rounded-xl border border-border/20 bg-background px-3 py-2.5 text-xs text-muted-foreground">
            {feeStrategy === "absorb"
              ? "You cover fees — customers pay exactly the installment amount."
              : "Customers pay fees on top of each installment amount."}
          </p>

          <div className="overflow-hidden rounded-xl border border-border/30 bg-background">
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr] border-b border-border/20 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>#</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Fee</span>
              <span className="text-right">{feeStrategy === "pass_to_customer" ? "Customer pays" : "You receive"}</span>
            </div>
            <ul className="max-h-44 divide-y divide-border/10 overflow-y-auto">
              {builtSchedule.slice(0, 12).map((row, i) => {
                const fee = calcFee(row.amount);
                const outcome = feeStrategy === "pass_to_customer" ? row.amount + fee : row.amount - fee;
                return (
                  <li key={i} className={cn("grid grid-cols-[2rem_1fr_1fr_1fr] items-center px-4 py-2.5 text-xs", i % 2 === 1 && "bg-secondary/5")}>
                    <span className="font-mono text-muted-foreground/60">{i + 1}</span>
                    <span className="text-right font-mono">₦{row.amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                    <span className="text-right font-mono text-amber-400">₦{fee.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                    <span className={cn("text-right font-mono font-semibold", feeStrategy === "pass_to_customer" ? "text-foreground" : "text-primary")}>
                      ₦{outcome.toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                    </span>
                  </li>
                );
              })}
              {builtSchedule.length > 12 && (
                <li className="px-4 py-2.5 text-center text-xs italic text-muted-foreground">
                  +{builtSchedule.length - 12} more not shown
                </li>
              )}
            </ul>
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr] items-center border-t border-border/20 bg-secondary/20 px-4 py-2.5 text-xs font-semibold">
              <span className="text-muted-foreground">∑</span>
              <span className="text-right font-mono">₦{builtSchedule.reduce((s, r) => s + r.amount, 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
              <span className="text-right font-mono text-amber-400">₦{builtSchedule.reduce((s, r) => s + calcFee(r.amount), 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
              <span className={cn("text-right font-mono", feeStrategy === "pass_to_customer" ? "text-foreground" : "text-primary")}>
                ₦{builtSchedule.reduce((s, r) => { const f = calcFee(r.amount); return s + (feeStrategy === "pass_to_customer" ? r.amount + f : r.amount - f); }, 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border/20 bg-background/50 px-3 py-2.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-50" />
            Fees are estimates based on Paystack's current pricing. Actual fees are charged by Paystack at transaction time. RepayStream does not collect these fees.
          </div>
        </motion.div>
      )}

      {/* ── Validation / errors ── */}
      <AnimatePresence>
        {dirty && validationMessage && (
          <motion.p key="val" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-400" role="alert">
            {validationMessage}
          </motion.p>
        )}
        {submitError && (
          <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {submitError}
          </motion.p>
        )}
      </AnimatePresence>

      <button type="submit" disabled={loading || !canSubmit}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating…</> : "Create plan & get link"}
      </button>
    </form>
  );
}
