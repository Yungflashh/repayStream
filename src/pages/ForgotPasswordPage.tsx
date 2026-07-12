import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Mail, CheckCircle2, ArrowLeft, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fadeInUp, smooth } from "@/lib/motion";
import mainLogo from "@/assets/main_logo.png";

type State = "idle" | "loading" | "sent" | "error";

export function ForgotPasswordPage() {
  const [email, setEmail]   = useState("");
  const [state, setState]   = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    setErrMsg("");
    try {
      const res = await apiFetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Something went wrong");
      }
      setState("sent");
    } catch (err: unknown) {
      setErrMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial="hidden" animate="visible" variants={fadeInUp} transition={smooth}
        className="flex w-full max-w-sm flex-col items-center gap-7"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
            <img src={mainLogo} alt="RepayStream" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            RepayStream
          </span>
        </div>

        <AnimatePresence mode="wait">

          {/* ── Sent state ── */}
          {state === "sent" ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex w-full flex-col items-center gap-6 text-center"
            >
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/10">
                  <CheckCircle2 className="h-10 w-10 text-primary" strokeWidth={1.5} />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Check your email</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  If <strong>{email}</strong> is registered, you'll receive a password reset link shortly. Check your spam folder too.
                </p>
              </div>
              <div className="w-full rounded-2xl border border-border/40 bg-card/70 px-6 py-5 text-sm text-muted-foreground text-center">
                The link expires in <strong className="text-foreground">1 hour</strong>.
              </div>
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card px-6 py-3.5 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />Back to sign in
              </Link>
            </motion.div>
          ) : (

          /* ── Form state ── */
          <motion.div key="form" className="flex w-full flex-col items-center gap-6">
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/15 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/10">
                <Mail className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <div className="w-full rounded-2xl border border-border/50 bg-card/70 p-7 shadow-2xl shadow-black/20 backdrop-blur-sm">
              <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Email address
                  </label>
                  <input
                    id="email" type="email" required autoFocus
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="h-12 w-full rounded-xl border border-border/50 bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  />
                </div>

                <AnimatePresence>
                  {state === "error" && (
                    <motion.p
                      key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
                    >
                      {errMsg}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit" disabled={state === "loading" || !email.trim()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {state === "loading"
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Sending…</>
                    : "Send reset link"}
                </button>
              </form>
            </div>

            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />Back to sign in
            </Link>
          </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
          <ShieldCheck className="h-3.5 w-3.5 text-primary/40" />
          Secured by RepayStream
        </div>
      </motion.div>
    </div>
  );
}
