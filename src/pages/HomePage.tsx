import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Fingerprint, RotateCcw, ArrowRight,
  Zap, Lock, Users, CreditCard, Building2, BarChart3,
  Globe, Clock, TrendingUp, ShieldCheck, Landmark, Sun, Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  staggerContainer, staggerSlow, staggerItem,
  fadeInUp, blurInUp, slideInLeft, slideInRight, popIn,
  smooth, spring,
} from "@/lib/motion";
import { useTheme } from "@/lib/theme";
import mainLogo from "@/assets/main_logo.png";

const features = [
  { icon: ShieldCheck, title: "Mandate protected", desc: "Protected by CBN Direct Debit Scheme. Customer authorises their bank — you receive status updates only. Full compliance built in." },
  { icon: Fingerprint, title: "Idempotent charges", desc: "Every debit carries a unique idempotency key. Duplicates are rejected at the gateway and in our ledger. Zero double charges." },
  { icon: RotateCcw, title: "Smart retries", desc: "Up to 3 attempts per instalment with intelligent backoff. Due date, +24h, +72h — with extra delay for insufficient funds." },
  { icon: CreditCard, title: "Paystack-powered", desc: "Card and bank debit payments via Paystack. Customers see only the method you choose on their plan link." },
  { icon: Building2, title: "Non-custodial", desc: "We never hold funds. Every debit goes directly from customer to you through licensed PSPs. Settlement stays with your provider." },
  { icon: BarChart3, title: "Full audit trail", desc: "Every action logged — payment attempts, retries, mandate changes, disputes. Complete compliance trail for CBN reporting." },
];

const steps = [
  { n: "01", title: "Create a plan", desc: "Set up the repayment schedule, customer details, and payment method. Choose full payment or up to 60 installments." },
  { n: "02", title: "Share the link", desc: "Your customer receives a secure consent page with an education flow about CBN mandates before authorizing." },
  { n: "03", title: "Auto-collect", desc: "Charges run on schedule through Paystack. Failed payments auto-retry with smart backoff." },
  { n: "04", title: "Track & resolve", desc: "Monitor all payments from your dashboard. Handle disputes through built-in threaded messaging." },
];

const stats = [
  { value: "100%", label: "Non-custodial", icon: Lock },
  { value: "1",    label: "PSP Partner",   icon: Landmark },
  { value: "3×",   label: "Smart retries", icon: RotateCcw },
  { value: "60",   label: "Max instalments", icon: TrendingUp },
  { value: "NGN",  label: "Nigerian Naira", icon: Globe },
  { value: "24/7", label: "Automated",     icon: Clock },
];

const useCases = [
  { icon: Building2, title: "SME Repayments",        desc: "Set up repayment plans for businesses with flexible schedules and automated collection." },
  { icon: Users,     title: "Cooperatives",           desc: "Manage member contributions with ledger tracking, balance views, and reconciliation." },
  { icon: Globe,     title: "School Fees",            desc: "Installment payment plans for tuition with historical records and automated reminders." },
  { icon: Zap,       title: "Subscription Recovery",  desc: "Recover failed subscription payments with smart retry logic and customer communication." },
];

export function HomePage() {
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-dvh flex-col bg-background">

      {/* ── Nav ── */}
      <motion.nav
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ ...smooth, duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
              <img src={mainLogo} alt="" className="h-full w-full object-contain" style={{ transform: "scale(3)" }} />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground">
              <span className="hidden sm:inline">RepayStream Technologies Limited</span>
              <span className="sm:hidden">RepayStream</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="sm" asChild className="text-foreground">
              <Link to="/login?next=/dashboard">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </motion.nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Background orbs */}
        <motion.div
          className="pointer-events-none absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="pointer-events-none absolute bottom-[-10%] right-[-5%] h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl"
          animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />

        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:py-40">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="mx-auto max-w-3xl text-center">

            {/* Badge */}
            <motion.div variants={popIn} transition={spring}>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-4 py-1.5 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Nigeria &middot; CBN Direct Debit Scheme
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={blurInUp}
              transition={{ ...smooth, duration: 0.7 }}
              className="mt-8 text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Repayment orchestration,{" "}
              <span className="text-primary">without holding funds</span>
            </motion.h1>

            {/* Sub */}
            <motion.p
              variants={fadeInUp}
              transition={{ ...smooth, delay: 0.1 }}
              className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl"
            >
              Share a plan link. Your customer authorises a mandate on Paystack.
              Charges run on your schedule — we never touch the money.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={staggerContainer}
              transition={{ staggerChildren: 0.1, delayChildren: 0.3 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
            >
              <motion.div variants={popIn} transition={spring}>
                <Button size="lg" asChild className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                  <Link to="/register">Start for free <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
              </motion.div>
              <motion.div variants={popIn} transition={spring}>
                <Button variant="outline" size="lg" asChild className="h-12 px-8 text-base">
                  <Link to="/login?next=/dashboard">Business sign-in</Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.p
              variants={fadeInUp}
              transition={{ ...smooth, delay: 0.5 }}
              className="mt-6 text-xs text-muted-foreground"
            >
              No setup fees &middot; No transaction minimums &middot; CBN compliant
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-b border-border bg-muted/50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6"
          >
            {stats.map((s) => (
              <motion.div
                key={s.label}
                variants={popIn}
                transition={spring}
                whileHover={{ y: -4, scale: 1.06 }}
                className="flex flex-col items-center gap-2 text-center"
              >
                <s.icon className="h-5 w-5 text-primary" />
                <p className="text-3xl font-extrabold tracking-tight text-foreground">{s.value}</p>
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={blurInUp}
            transition={smooth}
            className="text-center"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-accent">Platform features</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Built for trust &amp; compliance
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Every layer designed around CBN compliance, payment safety, and operational reliability.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerSlow}
            className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeInUp}
                transition={smooth}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group rounded-2xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-lg hover:shadow-primary/8"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={blurInUp}
            transition={smooth}
            className="text-center"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-accent">How it works</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Four steps to automated collection
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={staggerSlow}
            className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                variants={fadeInUp}
                transition={{ ...smooth, delay: i * 0.08 }}
                className="relative text-center"
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ ...spring, delay: i * 0.1 }}
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-primary/30 bg-primary/8 text-xl font-extrabold text-primary"
                >
                  {s.n}
                </motion.div>
                {i < steps.length - 1 && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ ...smooth, delay: i * 0.15 + 0.3 }}
                    style={{ originX: 0 }}
                    className="absolute left-[calc(50%+2.5rem)] top-8 hidden h-0.5 w-[calc(100%-5rem)] bg-primary/25 lg:block"
                  />
                )}
                <h3 className="text-base font-semibold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Use cases ── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={blurInUp}
            transition={smooth}
            className="text-center"
          >
            <span className="text-xs font-bold uppercase tracking-widest text-accent">Use cases</span>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Works for any recurring collection
            </h2>
          </motion.div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2">
            {useCases.map((u, i) => (
              <motion.div
                key={u.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={i % 2 === 0 ? slideInLeft : slideInRight}
                transition={{ ...smooth, delay: i * 0.06 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className="flex gap-5 rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/12 text-accent">
                  <u.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">{u.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{u.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Compliance ── */}
      <section className="border-b border-border bg-muted/40">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={slideInLeft}
            transition={smooth}
            className="mx-auto flex max-w-3xl items-start gap-5 rounded-2xl border border-primary/20 bg-primary/6 p-8"
          >
            <motion.div
              initial={{ rotate: -15, scale: 0 }}
              whileInView={{ rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={spring}
            >
              <ShieldCheck className="mt-0.5 h-8 w-8 shrink-0 text-primary" />
            </motion.div>
            <div>
              <h3 className="font-semibold text-foreground">Regulatory compliance</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                RepayStream is an orchestration layer. Settlement, KYC, and dispute handling remain with your
                licensed payment service provider and financial institution, in line with CBN guidelines. All
                mandate authorizations follow the CBN Direct Debit Scheme framework.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center"
          >
            <motion.h2
              variants={blurInUp}
              transition={smooth}
              className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
            >
              Ready to automate collections?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              transition={{ ...smooth, delay: 0.1 }}
              className="mx-auto mt-4 max-w-md text-muted-foreground"
            >
              Set up your business in minutes. Create your first repayment plan today.
            </motion.p>
            <motion.div
              variants={popIn}
              transition={{ ...spring, delay: 0.2 }}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            >
              <Button size="lg" asChild className="h-12 px-8 text-base shadow-lg shadow-primary/25">
                <Link to="/register">Create free account <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <motion.footer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ ...smooth, duration: 0.6 }}
        className="bg-muted/50"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden">
                <img src={mainLogo} alt="" className="h-full w-full object-contain" style={{ transform: "scale(3)" }} />
              </div>
              <span className="text-sm font-bold text-foreground">RepayStream Technologies Limited</span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:items-end">
              <p className="text-xs text-muted-foreground">CBN Direct Debit Scheme Protected</p>
              <p className="text-xs text-muted-foreground">RepayStream does not hold customer funds</p>
            </div>
          </div>
        </div>
      </motion.footer>

    </div>
  );
}
