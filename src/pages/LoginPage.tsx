import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Shield,
  Zap,
  TrendingUp,
  Sun,
  Moon,
} from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { useTheme } from "@/lib/theme";
import mainLogo from "@/assets/main_logo.png";

const brandFeatures = [
  { icon: Zap,          label: "Automated payment reminders" },
  { icon: Shield,       label: "CBN-compliant direct debit" },
  { icon: TrendingUp,   label: "Real-time repayment tracking" },
  { icon: CheckCircle2, label: "Dispute resolution built-in" },
];

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const err = searchParams.get("error");
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-dvh">
      {/* ── Left brand panel ── */}
      <div
        className="relative hidden lg:flex lg:w-[46%] flex-col justify-between overflow-hidden p-10 xl:p-14"
        style={{ background: "linear-gradient(145deg, #040d07 0%, #071a0e 60%, #040d07 100%)" }}
      >
        {/* Ambient glows */}
        <div
          className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,180,70,0.13) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,180,70,0.08) 0%, transparent 70%)" }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
              <img src={mainLogo} alt="" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
            </div>
            <span className="rs-serif text-lg font-bold text-white">RepayStream</span>
          </Link>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-10">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,180,70,0.3)] bg-[rgba(0,180,70,0.1)] px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-semibold tracking-wide text-primary">CBN Compliant Platform</span>
            </div>
            <h2 className="rs-serif text-4xl xl:text-[2.75rem] leading-[1.1] text-white">
              Collect repayments.{" "}
              <span className="text-primary">Automatically.</span>
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-white/55">
              RepayStream helps Nigerian lenders automate loan repayments via direct debit — reducing defaults and eliminating manual follow-up.
            </p>
          </div>

          <ul className="space-y-3">
            {brandFeatures.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(0,180,70,0.25)] bg-[rgba(0,180,70,0.12)]">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-white/70">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Trust badge */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.04] px-4 py-3">
            <Shield className="h-4 w-4 shrink-0 text-primary" />
            <p className="text-xs text-white/40">
              RC 9344129 &middot; CBN Direct Debit Scheme &middot; We do not hold customer funds
            </p>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-1 flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 sm:px-10">
          <Link to="/" className="flex items-center gap-2 lg:invisible" aria-label="RepayStream home">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
              <img src={mainLogo} alt="" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
            </div>
            <span className="rs-serif text-sm font-bold text-foreground">RepayStream</span>
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              to="/"
              className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              ← Home
            </Link>
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-1 items-center justify-center px-6 py-8 sm:px-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-[400px]"
          >
            <div className="mb-8">
              <h1 className="rs-serif text-3xl sm:text-4xl text-foreground">Welcome back</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Sign in to your account to continue
              </p>
            </div>

            {err === "unauthorized" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-xs text-destructive leading-relaxed">
                  You don&apos;t have access to that customer portal. Sign in with the account that matches the customer email on file.
                </p>
              </motion.div>
            )}

            <LoginForm />

            <p className="mt-8 text-center text-xs text-muted-foreground/60">
              By continuing, you agree to our{" "}
              <Link to="/terms" className="underline underline-offset-2 transition-colors hover:text-foreground">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline underline-offset-2 transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
            </p>
          </motion.div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 px-6 py-4">
          <p className="text-center text-xs text-muted-foreground/50">
            &copy; 2026 RepayStream Technologies Limited
          </p>
        </div>
      </div>
    </div>
  );
}
