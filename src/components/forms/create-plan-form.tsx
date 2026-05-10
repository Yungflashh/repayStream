"use client";

import {
  CalendarDays,
  Check,
  Copy,
  Loader2,
  Plus,
  Trash2,
  Sparkles,
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

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export function CreatePlanForm() {
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    newIdempotencyKey()
  );

  const [customerName, setCustomerName] = useState("");
  const [planName, setPlanName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentType, setPaymentType] = useState<PaymentType>("full");
  const [dueDate, setDueDate] = useState("");
  const [installmentCount, setInstallmentCount] = useState("2");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [customRows, setCustomRows] = useState<
    { amount: string; due_date: string }[]
  >([
    { amount: "", due_date: "" },
    { amount: "", due_date: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    planId: string;
    idempotentReplay: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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
  }, [
    amount,
    paymentType,
    dueDate,
    frequency,
    installmentCount,
    firstDueDate,
    customRows,
  ]);

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
  }, [
    customerName,
    phone,
    email,
    amount,
    paymentType,
    dueDate,
    frequency,
    installmentCount,
    firstDueDate,
    customRows,
    builtSchedule,
  ]);

  const canSubmit = validationMessage === null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !builtSchedule) return;
    setLoading(true);
    setSubmitError(null);
    try {
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
          totalAmount: amount.trim(),
          paymentMethod: "card",
          schedule: builtSchedule,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create plan");
      setSuccess({
        planId: data.plan.id as string,
        idempotentReplay: Boolean(data.idempotentReplay),
      });
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!success) return;
    const url = `${window.location.origin}/plan/${success.planId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  function resetForAnother() {
    setSuccess(null);
    setCopied(false);
    setSubmitError(null);
    setIdempotencyKey(newIdempotencyKey());
    setCustomerName("");
    setPlanName("");
  }

  if (success) {
    const shareUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/plan/${success.planId}`
        : `/plan/${success.planId}`;
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
            <p className="text-lg font-semibold tracking-tight text-foreground">
              Plan created
            </p>
            {success.idempotentReplay && (
              <p className="text-xs text-muted-foreground">
                Idempotent replay — matched a previous submission
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Share link</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-xl border border-border/40 bg-background px-4 py-2.5 text-xs font-medium text-foreground">
              {shareUrl}
            </code>
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => void copyLink()}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={resetForAnother}
        >
          Create another plan
        </Button>
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
        <Input
          id="planName"
          placeholder='e.g. "Q2 School Fees" or "Q2 Rent Payment Plan"'
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Customer info */}
      <div className="space-y-2">
        <Label htmlFor="customerName">Customer Full Name</Label>
        <Input
          id="customerName"
          required
          placeholder='e.g. "John Chukwudi Okoro"'
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          className="h-11"
          aria-invalid={customerName.length > 0 && customerName.trim().length < 2}
        />
        {customerName.length > 0 && customerName.trim().length < 2 && (
          <p className="text-xs text-destructive">Minimum 2 characters.</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Customer phone</Label>
          <Input
            id="phone"
            required
            placeholder="+234..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11"
            aria-invalid={phone.length > 0 && phone.trim().length < 8}
          />
          {phone.length > 0 && phone.trim().length < 8 && (
            <p className="text-xs text-destructive">Minimum 8 characters.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Customer email</Label>
          <Input
            id="email"
            type="email"
            required
            placeholder="customer@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
          <p className="text-xs text-muted-foreground">
            Used for portal claiming
          </p>
        </div>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Total amount (NGN)</Label>
        <Input
          id="amount"
          required
          inputMode="decimal"
          placeholder="50000.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-11"
        />
      </div>

      {/* Payment type toggle */}
      <div className="rounded-2xl border border-border/40 bg-secondary/20 p-5">
        <p className="mb-3 text-sm font-medium text-foreground">Payment type</p>
        <div className="flex gap-1 rounded-xl border border-border/40 bg-background p-1">
          {(["full", "installments"] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                paymentType === type
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
          <motion.div
            key="full"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="due" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Due date
            </Label>
            <Input
              id="due"
              required
              type="date"
              min={minDate}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="h-11"
            />
          </motion.div>
        ) : (
          <motion.div
            key="installments"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 rounded-2xl border border-border/40 bg-secondary/20 p-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="count">Number of installments</Label>
                <Input
                  id="count"
                  type="number"
                  min={2}
                  max={60}
                  inputMode="numeric"
                  value={installmentCount}
                  onChange={(e) => setInstallmentCount(e.target.value)}
                  disabled={frequency === "custom"}
                  className="h-11"
                />
                {frequency === "custom" && (
                  <p className="text-xs text-muted-foreground">
                    Set by your custom rows below.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="freq">Frequency</Label>
                <select
                  id="freq"
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as Frequency)
                  }
                  className="flex h-11 w-full rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>

            {frequency !== "custom" && (
              <div className="space-y-2">
                <Label htmlFor="firstDue" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  First installment due
                </Label>
                <Input
                  id="firstDue"
                  type="date"
                  min={minDate}
                  value={firstDueDate}
                  onChange={(e) => setFirstDueDate(e.target.value)}
                  className="h-11"
                />
              </div>
            )}

            {frequency === "custom" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Custom schedule</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCustomRows((r) => [...r, { amount: "", due_date: "" }])
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add row
                  </Button>
                </div>
                <ul className="space-y-3">
                  {customRows.map((row, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex flex-col gap-2 rounded-xl border border-border/40 bg-background p-4 sm:flex-row sm:items-end"
                    >
                      <div className="grid flex-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Amount (NGN)</Label>
                          <Input
                            inputMode="decimal"
                            placeholder="25000.00"
                            value={row.amount}
                            onChange={(e) => {
                              const next = [...customRows];
                              next[i] = { ...next[i], amount: e.target.value };
                              setCustomRows(next);
                            }}
                            className="h-10"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Due date</Label>
                          <Input
                            type="date"
                            min={minDate}
                            value={row.due_date}
                            onChange={(e) => {
                              const next = [...customRows];
                              next[i] = { ...next[i], due_date: e.target.value };
                              setCustomRows(next);
                            }}
                            className="h-10"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={customRows.length <= 1}
                        onClick={() =>
                          setCustomRows((r) => r.filter((_, j) => j !== i))
                        }
                        aria-label="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* Schedule preview */}
            {builtSchedule && frequency !== "custom" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-border/40 bg-background p-4"
              >
                <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Schedule preview
                </p>
                <ul className="max-h-48 space-y-1 overflow-y-auto">
                  {builtSchedule.map((row, i) => (
                    <li
                      key={`${row.due_date}-${i}`}
                      className="flex justify-between gap-2 rounded-md px-2 py-1.5 text-xs transition-colors hover:bg-secondary/30"
                    >
                      <span className="font-mono text-muted-foreground">{row.due_date}</span>
                      <span className="font-mono font-medium text-foreground">
                        &#8358;
                        {row.amount.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Custom total check */}
            {frequency === "custom" && builtSchedule && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-xl border border-border/40 bg-background p-4"
              >
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Total check
                </p>
                <p className="text-sm text-foreground">
                  Sum of rows:{" "}
                  <span className="font-mono font-semibold">
                    &#8358;
                    {builtSchedule
                      .reduce((a, r) => a + r.amount, 0)
                      .toLocaleString("en-NG", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </span>{" "}
                  &middot; Plan total:{" "}
                  <span className="font-mono font-semibold">
                    &#8358;
                    {parseFloat(amount || "0").toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation messages */}
      <AnimatePresence>
        {dirty && validationMessage && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-400"
            role="alert"
          >
            {validationMessage}
          </motion.p>
        )}
        {submitError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            role="alert"
          >
            {submitError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Submit */}
      <Button
        type="submit"
        disabled={loading || !canSubmit}
        className="h-12 w-full text-base"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Create plan & get link"
        )}
      </Button>
    </form>
  );
}
