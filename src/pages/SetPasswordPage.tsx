import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Loader2, Eye, EyeOff, CheckCircle2,
  AlertCircle, KeyRound, Home,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fadeInUp, smooth } from "@/lib/motion";
import mainLogo from "@/assets/main_logo.png";

function PageLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
        <img src={mainLogo} alt="RepayStream" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
      </div>
      <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
        RepayStream
      </span>
    </div>
  );
}

function PwField({ id, label, value, onChange, placeholder }: {
  id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <input
          id={id} type={show ? "text" : "password"} value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          className="h-12 w-full rounded-xl border border-border/50 bg-background px-4 pr-11 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
        />
        <button
          type="button" onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

type TokenState =
  | { status: "loading" }
  | { status: "invalid"; message: string }
  | { status: "valid"; email: string; customerId: string }
  | { status: "done"; customerId: string };

export function SetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";

  const [state, setState] = useState<TokenState>({ status: "loading" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate the token on mount
  useEffect(() => {
    if (!token) {
      setState({ status: "invalid", message: "No token found in this link. Use the link sent to your email." });
      return;
    }
    void (async () => {
      try {
        const res = await apiFetch(`/api/auth/setup-info?token=${encodeURIComponent(token)}`);
        const data = (await res.json()) as { valid: boolean; email?: string; customerId?: string; error?: string };
        if (data.valid && data.email && data.customerId) {
          setState({ status: "valid", email: data.email, customerId: data.customerId });
        } else {
          setState({ status: "invalid", message: data.error ?? "Invalid or expired link." });
        }
      } catch {
        setState({ status: "invalid", message: "Could not validate your link. Try again." });
      }
    })();
  }, [token]);

  // Auto-redirect after success
  useEffect(() => {
    if (state.status === "done") {
      const t = setTimeout(() => navigate(`/customer/${state.customerId}`), 1800);
      return () => clearTimeout(t);
    }
  }, [state, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state.status !== "valid") return;
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setSaving(true); setError(null);
    try {
      const res = await apiFetch("/api/auth/setup-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { ok?: boolean; customerId?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setState({ status: "done", customerId: data.customerId ?? (state as { customerId: string }).customerId });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSaving(false); }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial="hidden" animate="visible" variants={fadeInUp} transition={smooth}
        className="flex w-full max-w-sm flex-col items-center gap-7"
      >
        <PageLogo />

        {/* Loading */}
        {state.status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Validating your link…</p>
          </div>
        )}

        {/* Invalid token */}
        {state.status === "invalid" && (
          <div className="flex w-full flex-col items-center gap-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-destructive/15 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-destructive/25 bg-destructive/10">
                <AlertCircle className="h-10 w-10 text-destructive" strokeWidth={1.5} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Link not valid</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{state.message}</p>
            </div>
            <Link to="/"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card px-6 py-3.5 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors">
              <Home className="h-4 w-4" />Back to home
            </Link>
          </div>
        )}

        {/* Success */}
        {state.status === "done" && (
          <motion.div
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
              <h2 className="text-xl font-bold text-foreground">Password set!</h2>
              <p className="mt-2 text-sm text-muted-foreground">Taking you to your portal…</p>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }} animate={{ width: "100%" }}
                transition={{ duration: 1.6, ease: "linear" }}
              />
            </div>
          </motion.div>
        )}

        {/* Valid — show form */}
        {state.status === "valid" && (
          <>
            {/* Icon */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/10">
                <KeyRound className="h-10 w-10 text-primary" strokeWidth={1.5} />
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">Set your password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Create a password to access your repayment portal
              </p>
            </div>

            <div className="w-full rounded-2xl border border-border/50 bg-card/70 p-7 shadow-2xl shadow-black/20 backdrop-blur-sm">
              {/* Email display */}
              <div className="mb-5 flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                  {state.email.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Your account</p>
                  <p className="truncate text-sm font-medium text-foreground">{state.email}</p>
                </div>
              </div>

              <form onSubmit={(e) => void submit(e)} className="space-y-4">
                <PwField id="pw" label="New password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
                <PwField id="cpw" label="Confirm password" value={confirm} onChange={setConfirm} />

                <AnimatePresence>
                  {error && (
                    <motion.p key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  type="submit" disabled={saving || !password || !confirm}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Setting password…</>
                    : "Set password & open my portal"}
                </button>
              </form>

              <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/20 bg-secondary/10 px-3 py-2.5">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                <p className="text-[11px] leading-relaxed text-muted-foreground/60">
                  Your password is hashed and never stored in plain text. You can change it anytime in your account settings.
                </p>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Already have a password?{" "}
              <Link to="/login" className="text-primary hover:underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </>
        )}

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
          <ShieldCheck className="h-3.5 w-3.5 text-primary/40" />
          Mandate protected by CBN Direct Debit Scheme
        </div>
      </motion.div>
    </div>
  );
}
