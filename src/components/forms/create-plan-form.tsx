"use client";

import {
  CalendarDays,
  Check,
  Copy,
  Info,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { newIdempotencyKey } from "@/lib/utils/idempotency";
import {
  generateEqualSchedule,
  koboToAmount,
  parseAmountToKobo,
  type ScheduleRow,
} from "@/lib/utils/schedule";
import { validateScheduleBusinessRules } from "@/lib/validators/plan";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

type PaymentType = "full" | "installments";
type Frequency = "weekly" | "monthly" | "custom";
type FeeStrategy = "absorb" | "pass_to_customer";

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

/** Paystack fee: 1.5% + ₦100, capped at ₦2000 */
function calcFee(amount: number): number {
  return Math.min(amount * 0.015 + 100, 2000);
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
  const [success, setSuccess] = useState<{
    planId: string;
    customerId: string;
    idempotentReplay: boolean;
  } | null>(null);
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

  // Fee-adjusted schedule (what actually gets stored / charged)
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
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) {
      return "Enter total amount (NGN) with up to 2 decimal places.";
    }
    if (paymentType === "full" && !dueDate) return "Choose a due date.";
    if (paymentType === "installments") {
      if (frequency !== "custom") {
        const n = parseInt(installmentCount, 10);
        if (!Number.isFinite(n) || n < 2 || n > 60) {
          return "Installment count must be between 2 and 60.";
        }
        if (!firstDueDate) return "Choose the first due date.";
      } else if (customRows.length < 1) {
        return "Add at least one installment row.";
      }
    }
    if (!builtSchedule) {
      if (paymentType === "installments" && frequency === "custom") {
        return "Fill amount and date for each custom installment.";
      }
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
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
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
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!success) return;
    await navigator.clipboard.writeText(`${window.location.origin}/plan/${success.planId}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  async function copyClaimLink() {
    if (!success) return;
    await navigator.clipboard.writeText(`${window.location.origin}/portal/claim?customerId=${success.customerId}`);
    setCopiedClaim(true);
    window.setTimeout(() => setCopiedClaim(false), 2000);
  }

  function resetForAnother() {
    setSuccess(null);
    setCopied(false);
    setCopiedClaim(false);
    setSubmitError(null);
    setIdempotencyKey(newIdempotencyKey());
    setCustomerName("");
    setPlanName("");
    setGroup("");
    setPhone("");
    setEmail("");
    setAmount("");
    setPaymentType("full");
    setDueDate("");
    setInstallmentCount("2");
    setFrequency("monthly");
    setFirstDueDate("");
    setCustomRows([{ amount: "", due_date: "" }, { amount: "", due_date: "" }]);
    setFeeStrategy("absorb");
  }

  if (success) {
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/plan/${success.planId}` : `/plan/${success.planId}`;
    const claimUrl = typeof window !== "undefined" ? `${window.location.origin}/portal/claim?customerId=${success.customerId}` : `/portal/claim?customerId=${success.customerId}`;
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="space-y-5 rounded-2xl border border-primary/30 bg-primary/5 p-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-foreground">Plan created</p>
            {success.idempotentReplay && (
              <p className="text-xs text-muted-foreground">Idempotent replay — matched a previous submission</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">1. Mandate link — send to customer to authorize</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-xl border border-border/40 bg-background px-4 py-2.5 text-xs font-medium text-foreground">{shareUrl}</code>
            <Button type="button" variant="outline" className="shrink-0" onClick={() => void copyLink()}>
              {copied ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy</>}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">2. Portal link — send after mandate is authorized</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-xl border border-border/40 bg-background px-4 py-2.5 text-xs font-medium text-foreground">{claimUrl}</code>
            <Button type="button" variant="outline" className="shrink-0" onClick={() => void copyClaimLink()}>
              {copiedClaim ? <><Check className="h-4 w-4" />Copied!</> : <><Copy className="h-4 w-4" />Copy</>}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/70">Customer signs up or logs in with the same email used on this plan, then claims their portal.</p>
        </div>

        <Button type="button" variant="secondary" onClick={resetForAnother}>Create another plan</Button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Plan Name */}
      <div className="space-y-2">
        <Label htmlFor="planName">
          Plan Name / Description{" "}
          <span className="text-xs font-normal text-muted-foreground">(optional but recommended)</span>
        </Label>
        <Input id="planName" placeholder='e.g. "Q2 School Fees"' value={planName} onChange={(e) => setPlanName(e.target.value)} className="h-11" />
      </div>

      {/* Group */}
      <div className="space-y-2">
        <Label htmlFor="group">
          Group / Batch{" "}
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Input id="group" placeholder='e.g. "Term 1 2025"' value={group} onChange={(e) => setGroup(e.target.value)} className="h-11" />
      </div>

      {/* Customer info */}
      <div className="space-y-2">
        <Label htmlFor="customerName">Customer Full Name</Label>
        <Input id="customerName" required placeholder='e.g. "John Chukwudi Okoro"' value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="h-11" aria-invalid={customerName.length > 0 && customerName.trim().length < 2} />
        {customerName.length > 0 && customerName.trim().length < 2 && (
          <p className="text-xs text-destructive">Minimum 2 characters.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Customer phone</Label>
          <Input id="phone" required placeholder="+234..." value={phone} onChange={(e) => setPhone(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Customer email</Label>
          <Input id="email" type="email" required placeholder="customer@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          <p className="text-xs text-muted-foreground">Used for portal claiming</p>
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Total amount (NGN)</Label>
        <Input id="amount" required inputMode="decimal" placeholder="50000.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-11" />
      </div>

      {/* Payment type */}
      <div className="rounded-2xl border border-border/40 bg-secondary/20 p-5">
        <p className="mb-3 text-sm font-medium text-foreground">Payment type</p>
        <div className="flex gap-1 rounded-xl border border-border/40 bg-background p-1">
          {(["full", "installments"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                paymentType === type ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setPaymentType(type)}
            >
              {type === "full" ? "Full payment" : "Installments"}
            </button>
          ))}
        </div>
      </div>

      {/* Schedule config */}
      <AnimatePresence mode="wait">
        {paymentType === "full" ? (
          <motion.div key="full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-2">
            <Label htmlFor="due" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />Due date
            </Label>
            <Input id="due" required type="date" min={minDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11" />
          </motion.div>
        ) : (
          <motion.div key="installments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="space-y-4 rounded-2xl border border-border/40 bg-secondary/20 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="count">Number of installments</Label>
                <Input id="count" type="number" min={2} max={60} inputMode="numeric" value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} disabled={frequency === "custom"} className="h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="freq">Frequency</Label>
                <select id="freq" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)} className="flex h-11 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {frequency !== "custom" && (
              <div className="space-y-2">
                <Label htmlFor="firstDue" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />First installment due
                </Label>
                <Input id="firstDue" type="date" min={minDate} value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} className="h-11" />
              </div>
            )}

            {frequency === "custom" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Custom schedule</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setCustomRows((r) => [...r, { amount: "", due_date: "" }])}>
                    <Plus className="h-4 w-4" />Add row
                  </Button>
                </div>
                <ul className="space-y-3">
                  {customRows.map((row, i) => (
                    <motion.li key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background p-4 sm:flex-row sm:items-end">
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Amount (NGN)</Label>
                          <Input inputMode="decimal" placeholder="25000.00" value={row.amount} onChange={(e) => { const next = [...customRows]; next[i] = { ...next[i], amount: e.target.value }; setCustomRows(next); }} className="h-10" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Due date</Label>
                          <Input type="date" min={minDate} value={row.due_date} onChange={(e) => { const next = [...customRows]; next[i] = { ...next[i], due_date: e.target.value }; setCustomRows(next); }} className="h-10" />
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-destructive" disabled={customRows.length <= 1} onClick={() => setCustomRows((r) => r.filter((_, j) => j !== i))} aria-label="Remove row">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {builtSchedule && frequency !== "custom" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border/40 bg-background p-4">
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Schedule preview</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {builtSchedule.map((row, i) => (
                    <li key={`${row.due_date}-${i}`} className="flex justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-secondary/30">
                      <span className="font-mono text-muted-foreground">{row.due_date}</span>
                      <span className="font-mono font-medium text-foreground">
                        &#8358;{row.amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {frequency === "custom" && builtSchedule && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border/40 bg-background p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Total check</p>
                <p className="text-sm text-foreground">
                  Sum of rows:{" "}
                  <span className="font-mono font-semibold">&#8358;{builtSchedule.reduce((a, r) => a + r.amount, 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  {" "}·{" "}Plan total:{" "}
                  <span className="font-mono font-semibold">&#8358;{parseFloat(amount || "0").toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Paystack fee estimator */}
      {builtSchedule && builtSchedule.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border/40 bg-secondary/10 p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Paystack fee handling</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Est. fee: 1.5% + ₦100, capped at ₦2,000 per installment
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeeStrategy((s) => s === "absorb" ? "pass_to_customer" : "absorb")}
              className={cn("flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors", feeStrategy === "pass_to_customer" ? "border-primary/40 bg-primary/10 text-primary" : "border-border/40 bg-background text-muted-foreground hover:text-foreground")}
            >
              {feeStrategy === "pass_to_customer"
                ? <><ToggleRight className="h-4 w-4" />Pass to customer</>
                : <><ToggleLeft className="h-4 w-4" />Absorb fee</>}
            </button>
          </div>

          {/* Fee breakdown table */}
          <div className="overflow-hidden rounded-xl border border-border/30 bg-background">
            <div className="grid grid-cols-4 gap-2 border-b border-border/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span>#</span>
              <span className="text-right">Original</span>
              <span className="text-right">Est. fee</span>
              <span className="text-right">{feeStrategy === "pass_to_customer" ? "Customer pays" : "You receive"}</span>
            </div>
            <ul className="divide-y divide-border/10 max-h-40 overflow-y-auto">
              {builtSchedule.slice(0, 12).map((row, i) => {
                const fee = calcFee(row.amount);
                const customerPays = feeStrategy === "pass_to_customer" ? row.amount + fee : row.amount;
                const bizReceives = feeStrategy === "pass_to_customer" ? row.amount : row.amount - fee;
                return (
                  <li key={i} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs">
                    <span className="font-mono text-muted-foreground">{i + 1}</span>
                    <span className="text-right font-mono">₦{row.amount.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                    <span className="text-right font-mono text-amber-400">₦{fee.toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
                    <span className={cn("text-right font-mono font-medium", feeStrategy === "pass_to_customer" ? "text-foreground" : "text-primary")}>
                      ₦{(feeStrategy === "pass_to_customer" ? customerPays : bizReceives).toLocaleString("en-NG", { minimumFractionDigits: 0 })}
                    </span>
                  </li>
                );
              })}
              {builtSchedule.length > 12 && (
                <li className="px-3 py-2 text-center text-xs text-muted-foreground">+{builtSchedule.length - 12} more installments</li>
              )}
            </ul>
            <div className="grid grid-cols-4 gap-2 border-t border-border/20 bg-secondary/20 px-3 py-2 text-xs font-bold">
              <span>Total</span>
              <span className="text-right font-mono">₦{builtSchedule.reduce((s, r) => s + r.amount, 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
              <span className="text-right font-mono text-amber-400">₦{builtSchedule.reduce((s, r) => s + calcFee(r.amount), 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}</span>
              <span className={cn("text-right font-mono", feeStrategy === "pass_to_customer" ? "text-foreground" : "text-primary")}>
                ₦{builtSchedule.reduce((s, r) => {
                  const fee = calcFee(r.amount);
                  return s + (feeStrategy === "pass_to_customer" ? r.amount + fee : r.amount - fee);
                }, 0).toLocaleString("en-NG", { minimumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground/70">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            Fees are estimated. Final fees are determined by Paystack at the time of debit.
          </p>
        </motion.div>
      )}

      {/* Validation messages */}
      <AnimatePresence>
        {dirty && validationMessage && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-400" role="alert">
            {validationMessage}
          </motion.p>
        )}
        {submitError && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
            {submitError}
          </motion.p>
        )}
      </AnimatePresence>

      <Button type="submit" disabled={loading || !canSubmit} className="h-12 w-full text-base">
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating...</> : "Create plan & get link"}
      </Button>
    </form>
  );
}
