import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MandateEducation } from "@/components/mandate-education";
import { apiFetch } from "@/lib/api";

type PlanSummary = {
  id: string;
  total_amount: string | number;
  status: string;
  payment_method?: "card" | "bank";
  customer?: { phone?: string | null; email?: string | null } | null;
};

export function MandateConsent({ plan }: { plan: PlanSummary }) {
  const [educated, setEducated] = useState(false);
  const [cbn, setCbn] = useState(false);
  const [debit, setDebit] = useState(false);
  const [nonCustodial, setNonCustodial] = useState(false);
  const [busy, setBusy] = useState<"paystack" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = cbn && debit && nonCustodial;
  const amount = Number(plan.total_amount);

  async function goPaystack() {
    if (!ready) return;
    setBusy("paystack");
    setError(null);
    try {
      const res = await apiFetch("/api/mandate/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start Paystack");
      window.location.href = data.authorizationUrl as string;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
      setBusy(null);
    }
  }

  const progressCount = [cbn, debit, nonCustodial].filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg">Authorise mandate</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-semibold text-foreground">
                &#8358;{amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <AnimatePresence mode="wait">
          {!educated ? (
            <motion.div
              key="edu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="overflow-hidden"
            >
              <MandateEducation onComplete={() => setEducated(true)} />
            </motion.div>
          ) : (
            <motion.div
              key="consent"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Progress bar */}
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    animate={{
                      backgroundColor:
                        i < progressCount ? "hsl(155, 100%, 33%)" : "hsl(220, 15%, 18%)",
                    }}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </div>

              {/* Consent checkboxes */}
              <div className="space-y-3">
                {[
                  {
                    id: "cbn",
                    checked: cbn,
                    onChange: setCbn,
                    label:
                      "I understand this mandate is protected by the CBN Direct Debit Scheme and will allow my bank to debit my account according to the schedule.",
                  },
                  {
                    id: "debit",
                    checked: debit,
                    onChange: setDebit,
                    label:
                      "I authorise recurring or scheduled debits for this repayment plan through Paystack.",
                  },
                  {
                    id: "nc",
                    checked: nonCustodial,
                    onChange: setNonCustodial,
                    label:
                      "I understand RepayStream does not hold my money; charges are initiated by the business via licensed PSP mandates only.",
                  },
                ].map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ x: 2 }}
                    className="flex items-start gap-3 rounded-xl border border-border/40 bg-secondary/20 p-4 transition-colors hover:bg-secondary/30 cursor-pointer"
                    onClick={() => item.onChange(!item.checked)}
                  >
                    <Checkbox
                      id={item.id}
                      checked={item.checked}
                      className="mt-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                      onCheckedChange={(v) => item.onChange(v === true)}
                    />
                    <span className="text-sm font-normal leading-relaxed text-foreground/80 select-none">
                      {item.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </motion.p>
              )}

              <motion.div animate={{ opacity: ready ? 1 : 0.5 }} className="w-full">
                <Button
                  className="h-12 w-full text-base"
                  disabled={!ready || busy !== null}
                  onClick={() => void goPaystack()}
                >
                  {busy === "paystack" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Redirecting...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Continue with Paystack
                    </>
                  )}
                </Button>
              </motion.div>

              <p className="text-center text-xs text-muted-foreground/60">
                Having trouble?{" "}
                <Link to="/login" className="text-primary hover:underline underline-offset-4">
                  Sign in
                </Link>{" "}
                to message support.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
