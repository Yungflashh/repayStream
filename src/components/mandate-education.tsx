import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Shield, RotateCcw, CreditCard, Building2, HelpCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: Shield,
    title: "What is a Direct Debit Mandate?",
    content: "A mandate is your formal permission for your bank to debit your account on an agreed schedule. It is protected under the Central Bank of Nigeria (CBN) Direct Debit Scheme, which means your bank must follow strict rules about how and when your money can be debited.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: CreditCard,
    title: "How does authorization work?",
    content: "When you authorize a mandate, you are redirected to Paystack to securely confirm the debit. RepayStream never sees your bank details or card number. Your credentials stay between you and your bank.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: RotateCcw,
    title: "What about retries?",
    content: "If a scheduled payment fails (e.g. insufficient funds), the system will automatically retry up to 3 times: first on the due date, then after 24 hours, and finally after 72 hours. Each attempt uses a unique reference so you are never charged twice for the same installment.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    icon: Building2,
    title: "Where does my money go?",
    content: "RepayStream is non-custodial, meaning we never hold your funds. Every debit goes directly from your bank account to the designated recipient through the licensed payment provider. Settlement, KYC, and disputes are handled by Paystack and your financial institution.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
  },
  {
    icon: HelpCircle,
    title: "Can I cancel or dispute?",
    content: "Yes. You can raise a dispute through your customer portal at any time. You can also contact your bank directly to cancel the mandate. All disputes are logged and can be tracked. If you believe an unauthorized charge was made, contact both your bank and the business.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
];

export function MandateEducation({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div className="space-y-6">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((_, i) => (
          <motion.button
            key={i}
            type="button"
            onClick={() => setCurrentStep(i)}
            className={`h-2 rounded-full transition-all duration-300 ${i === currentStep ? "w-8 bg-primary" : i < currentStep ? "w-2 bg-primary/50" : "w-2 bg-border"}`}
            whileHover={{ scale: 1.2 }}
          />
        ))}
      </div>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-border/40 bg-secondary/20 p-6"
        >
          <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${step.bg}`}>
            <step.icon className={`h-6 w-6 ${step.color}`} />
          </div>
          <h3 className="mb-3 text-lg font-semibold text-foreground">{step.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{step.content}</p>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentStep === 0}
          onClick={() => setCurrentStep((s) => s - 1)}
          className="text-muted-foreground"
        >
          Previous
        </Button>

        {isLast ? (
          <Button onClick={onComplete} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            I understand, continue
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setCurrentStep((s) => s + 1)} className="gap-1">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Skip option */}
      <div className="text-center">
        <button type="button" onClick={onComplete} className="text-xs text-muted-foreground/50 underline-offset-4 hover:text-muted-foreground hover:underline">
          Skip education and proceed
        </button>
      </div>
    </div>
  );
}
