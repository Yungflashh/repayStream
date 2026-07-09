import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LinkIcon, AlertCircle, Mail, ShieldCheck, Shield, Loader2, ArrowRight, Home } from "lucide-react";
import { fadeInUp, smooth } from "@/lib/motion";
import { apiFetch } from "@/lib/api";
import mainLogo from "@/assets/main_logo.png";

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

export function ClaimPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const customerId = searchParams.get("customerId") ?? "";
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = (await res.json()) as { user: { email: string } };
        setUserEmail(data.user.email);
      }
    })();
  }, []);

  async function onClaim() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/customer/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      navigate(`/customer/${customerId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!customerId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={smooth}
          className="flex w-full max-w-sm flex-col items-center gap-7 text-center"
        >
          <PageLogo />

          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-400/15 blur-2xl" />
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-400/25 bg-amber-400/10">
              <AlertCircle className="h-12 w-12 text-amber-400" strokeWidth={1.5} />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">Missing link</h2>
            <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Open the claim URL your provider sent, or ask them to resend it.
            </p>
          </div>

          <Link
            to="/"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border/40 bg-card px-6 py-3.5 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors"
          >
            <Home className="h-4 w-4" />Back to home
          </Link>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/40" />
            Secured by Paystack · CBN Direct Debit
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeInUp}
        transition={smooth}
        className="flex w-full max-w-sm flex-col items-center gap-7"
      >
        {/* Logo */}
        <PageLogo />

        {/* Icon */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/25 bg-primary/10">
            <LinkIcon className="h-12 w-12 text-primary" strokeWidth={1.5} />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Link your portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">Connect your account to view your repayment plans</p>
        </div>

        {/* Card */}
        <div className="w-full rounded-2xl border border-border/50 bg-card/70 p-7 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <p className="mb-1 text-base font-semibold text-foreground">Confirm your identity</p>
          <p className="mb-5 text-xs text-muted-foreground">
            We match your sign-in email to the repayment profile your business created.
          </p>

          {userEmail && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
              <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="truncate text-sm font-medium">{userEmail}</p>
              </div>
            </div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}

          <button
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
            onClick={() => void onClaim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Linking…
              </>
            ) : (
              <>
                Confirm and open my portal
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/20 bg-secondary/10 px-3 py-2.5">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
            <p className="text-[11px] leading-relaxed text-muted-foreground/60">
              Make sure this email matches what the business used when creating your plan. If it doesn&apos;t, sign out and sign in with the correct account.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
          <Shield className="h-3.5 w-3.5 text-primary/40" />
          Mandate protected by CBN Direct Debit Scheme
        </div>
      </motion.div>
    </div>
  );
}
