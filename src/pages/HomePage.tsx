import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Fingerprint, RotateCcw, ArrowRight,
  Zap, Lock, Users, CreditCard, Building2, BarChart3,
  Globe, Clock, TrendingUp, ShieldCheck, Landmark,
  Share2, MessageCircle, Mail, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import {
  staggerContainer, staggerSlow,
  fadeInUp, blurInUp, slideInLeft, slideInRight, popIn,
  smooth, spring,
} from "@/lib/motion";
import mainLogo from "@/assets/main_logo.png";

/* Dark professional finance image — dark enough for white text overlay */
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=85";

const features = [
  { icon: ShieldCheck,  title: "Mandate protected",   desc: "Protected by CBN Direct Debit Scheme. Customer authorises their bank — you receive status updates only. Full compliance built in." },
  { icon: Fingerprint,  title: "Idempotent charges",  desc: "Every debit carries a unique idempotency key. Duplicates are rejected at the gateway and in our ledger. Zero double charges." },
  { icon: RotateCcw,    title: "Smart retries",        desc: "Up to 3 attempts per instalment with intelligent backoff. Due date, +24h, +72h — with extra delay for insufficient funds." },
  { icon: CreditCard,   title: "Paystack-powered",     desc: "Card and bank debit payments via Paystack. Customers see only the method you choose on their plan link." },
  { icon: Building2,    title: "Non-custodial",        desc: "We never hold funds. Every debit goes directly from customer to you through licensed PSPs. Settlement stays with your provider." },
  { icon: BarChart3,    title: "Full audit trail",     desc: "Every action logged — payment attempts, retries, mandate changes, disputes. Complete compliance trail for CBN reporting." },
];

const steps = [
  { n: "01", title: "Create a plan",   desc: "Set up the repayment schedule, customer details, and payment method. Choose full payment or up to 60 installments." },
  { n: "02", title: "Share the link",  desc: "Your customer receives a secure consent page with an education flow about CBN mandates before authorizing." },
  { n: "03", title: "Auto-collect",    desc: "Charges run on schedule through Paystack. Failed payments auto-retry with smart backoff." },
  { n: "04", title: "Track & resolve", desc: "Monitor all payments from your dashboard. Handle disputes through built-in threaded messaging." },
];

const stats = [
  { value: "100%",     label: "Non-custodial",   icon: Lock      },
  { value: "Paystack", label: "Powered by",      icon: Landmark  },
  { value: "3×",       label: "Smart retries",   icon: RotateCcw },
  { value: "60",       label: "Max instalments", icon: TrendingUp},
  { value: "NGN",      label: "Nigerian Naira",  icon: Globe     },
  { value: "24/7",     label: "Automated",       icon: Clock     },
];

const testimonials = [
  { name: "Chidi Okafor",   role: "School Bursar, Greenfield Academy",               body: "RepayStream made school fee collection completely stress-free. Parents authorize once and payments come in automatically every month. We've reduced our collection backlog by over 80%." },
  { name: "Amaka Eze",      role: "Cooperative Treasurer, Lagos Civil Servants COOP", body: "We used to chase members for monthly contributions. Now with RepayStream, debits run on schedule and we get a full audit trail. It's exactly what a cooperative needs." },
  { name: "Tunde Adeyemi",  role: "CEO, SwiftFurnish SME",                            body: "Our customers now pay for appliances in installments without us worrying about follow-ups. The mandate system gives both sides confidence that everything is above board." },
  { name: "Ngozi Anyanwu",  role: "Operations Manager, RentEasy Nigeria",             body: "Collecting rent used to be our biggest headache. RepayStream's automated schedule and smart retries mean we almost never have to make a single phone call anymore." },
];

const useCases = [
  { icon: Building2, title: "SME Repayments",        desc: "Set up repayment plans for businesses with flexible schedules and automated collection." },
  { icon: Users,     title: "Cooperatives",           desc: "Manage member contributions with ledger tracking, balance views, and reconciliation." },
  { icon: Globe,     title: "School Fees",            desc: "Installment payment plans for tuition with historical records and automated reminders." },
  { icon: Zap,       title: "Subscription Recovery",  desc: "Recover failed subscription payments with smart retry logic and customer communication." },
];

const ds = { fontFamily: "'DM Serif Display', Georgia, serif" };

export function HomePage() {
  const { theme, toggle } = useTheme();
  const dk = theme === "dark";

  /* ── Per-theme colour tokens (used throughout all non-hero sections) ── */
  const bg1    = dk ? "bg-zinc-950"  : "bg-white";
  const bg2    = dk ? "bg-zinc-900"  : "bg-slate-50";
  const bdr    = dk ? "border-zinc-800" : "border-gray-200";
  const bdrH   = dk ? "hover:border-zinc-700" : "hover:border-gray-300";
  const txt    = dk ? "text-white"   : "text-gray-900";
  const body   = dk ? "text-zinc-400": "text-gray-600";
  const bodyLt = dk ? "text-zinc-300": "text-gray-700";
  const muted  = dk ? "text-zinc-500": "text-gray-400";
  const muted2 = dk ? "text-zinc-600": "text-gray-400";
  const card   = dk ? `bg-zinc-900 ${bdr}`  : `bg-white ${bdr.replace("border-","border-")}`;
  const cardDk = dk ? `bg-zinc-950 ${bdr}`  : `bg-slate-50 ${bdr.replace("border-","border-")}`;
  const acc    = dk ? "text-emerald-400" : "text-emerald-600";
  const accBg  = dk ? "bg-emerald-500/10" : "bg-emerald-50";
  const stepBg = dk ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-400" : "border-emerald-400/40 bg-emerald-50 text-emerald-600";
  const divider = dk ? "bg-zinc-700" : "bg-gray-300";

  return (
    <div className="flex flex-col">

      {/* ══════════════════════════════════════
          HERO — always dark, image bg
      ══════════════════════════════════════ */}
      <div className="relative min-h-screen bg-black overflow-hidden flex flex-col">
        {/* Hero image */}
        <img
          src={HERO_IMAGE}
          alt=""
          loading="eager"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        {/* Heavy dark gradient — ensures text always legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/60 to-black/90 pointer-events-none" />
        {/* Extra dark halo in the text zone */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(0,0,0,0.45)_0%,transparent_100%)] pointer-events-none" />

        {/* ── Nav ── */}
        <nav className="relative z-20 px-4 pt-6 sm:px-6">
          <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-5 py-3">
            <div className="flex items-center gap-6">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
                  <img src={mainLogo} alt="RepayStream" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
                </div>
                <span className="hidden sm:inline text-base font-semibold text-white tracking-tight" style={ds}>
                  RepayStream
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-6">
                <a href="#features"    className="text-sm font-medium text-white/75 transition-colors hover:text-white">Features</a>
                <a href="#how-it-works"className="text-sm font-medium text-white/75 transition-colors hover:text-white">How it works</a>
                <a href="#about"       className="text-sm font-medium text-white/75 transition-colors hover:text-white">About</a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggle} aria-label="Toggle theme"
                className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <Link to="/register" className="hidden sm:inline text-sm font-medium text-white/80 transition-colors hover:text-white">Sign up</Link>
              <Link to="/login?next=/dashboard" className="liquid-glass rounded-full px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                Login
              </Link>
            </div>
          </div>
        </nav>

        {/* ── Hero content ── */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smooth, duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-4 py-1.5 backdrop-blur-sm"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-white/90">CBN Direct Debit Scheme Compliant</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smooth, duration: 0.85 }}
            style={ds}
            className="mb-6 max-w-4xl text-4xl leading-tight tracking-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.8)] sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Repayments on{" "}
            <em className="not-italic text-emerald-300">autopilot</em>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smooth, duration: 0.7, delay: 0.12 }}
            className="mb-8 max-w-lg text-sm leading-relaxed text-white/75 drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] sm:text-base"
          >
            Share a plan link. Your customer authorises a mandate once. Charges run on your schedule — we never touch the money.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smooth, duration: 0.7, delay: 0.2 }}
            className="w-full max-w-md space-y-4"
          >
            <div className="liquid-glass flex items-center gap-2 rounded-full py-2 pl-5 pr-2">
              <input
                type="email"
                placeholder="Enter your business email"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
              />
              <Link to="/register">
                <span className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white text-black transition-colors hover:bg-white/90">
                  <ArrowRight size={17} />
                </span>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-5">
              <Link to="/register"
                className="liquid-glass rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                Get started free
              </Link>
              <Link to="/login?next=/dashboard"
                className="text-sm text-white/55 underline underline-offset-4 transition-colors hover:text-white">
                Business sign-in
              </Link>
            </div>
          </motion.div>
        </div>

        {/* ── Social icons ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ ...smooth, delay: 0.6 }}
          className="relative z-10 flex justify-center gap-3 pb-10"
        >
          {[{ icon: Share2, label: "Share", href: "#" }, { icon: MessageCircle, label: "Message", href: "/contact" }, { icon: Mail, label: "Email", href: "/contact" }].map(({ icon: Icon, label, href }) => (
            <a key={label} href={href} aria-label={label}
              className="liquid-glass rounded-full p-3.5 text-white/70 transition-all hover:bg-white/10 hover:text-white">
              <Icon size={18} />
            </a>
          ))}
        </motion.div>
      </div>

      {/* ══════════════════════════════════════
          PRODUCT PREVIEW
      ══════════════════════════════════════ */}
      <section className={`${bg1} border-b ${bdr} overflow-hidden`}>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={blurInUp} transition={smooth} className="mb-14 text-center">
            <span className={`text-xs font-bold uppercase tracking-widest ${acc}`}>Dashboard</span>
            <h2 style={ds} className={`mt-3 text-3xl sm:text-4xl tracking-tight ${txt}`}>Everything in one place</h2>
            <p className={`mx-auto mt-4 max-w-lg text-sm leading-relaxed ${body}`}>
              Create plans, track payments, and manage disputes — all from a single clean dashboard.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 48 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ ...smooth, duration: 0.9 }}
            className="relative mx-auto max-w-4xl"
          >
            <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-emerald-500/8 blur-3xl" />
            <div className={`relative overflow-hidden rounded-2xl border ${bdr} ${bg2} shadow-2xl shadow-black/20`}>
              {/* Browser chrome */}
              <div className={`flex items-center gap-3 border-b ${bdr} ${bg1} px-5 py-3.5`}>
                <div className="flex gap-1.5">
                  {[0,1,2].map(i => <div key={i} className={`h-2.5 w-2.5 rounded-full ${dk ? "bg-zinc-700" : "bg-gray-300"}`} />)}
                </div>
                <div className={`flex-1 rounded-md border ${bdr} ${bg2} px-3 py-1 text-center`}>
                  <span className={`font-mono text-xs ${muted}`}>app.repaystream.com/dashboard</span>
                </div>
              </div>
              {/* Dashboard body */}
              <div className="space-y-5 p-5">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Active plans",    value: "12",    sub: "+2 this week",    color: acc },
                    { label: "Collected (Jul)", value: "₦2.4M", sub: "94% success rate",color: acc },
                    { label: "Pending retries", value: "3",     sub: "Due within 24 h", color: dk ? "text-amber-400" : "text-amber-600" },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-xl border ${bdr} ${cardDk} p-4`}>
                      <p className={`mb-1 text-[11px] ${muted}`}>{s.label}</p>
                      <p className={`text-2xl font-bold ${txt}`}>{s.value}</p>
                      <p className={`mt-0.5 text-[11px] ${s.color}`}>{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className={`overflow-hidden rounded-xl border ${bdr} ${cardDk}`}>
                  <div className={`flex items-center justify-between border-b ${bdr} px-4 py-3`}>
                    <p className={`text-xs font-semibold ${txt}`}>Recent plans</p>
                    <span className={`cursor-pointer text-xs ${acc}`}>View all →</span>
                  </div>
                  <div className={`divide-y ${dk ? "divide-zinc-800/60" : "divide-gray-100"}`}>
                    {[
                      { name: "Chidi Okafor",  plan: "School Fees · 12 instalments",  amount: "₦25,000/mo",  status: "Active", pct: 66 },
                      { name: "Amaka Eze",     plan: "Cooperative · Monthly",          amount: "₦10,000/mo",  status: "Active", pct: 40 },
                      { name: "Tunde Adeyemi", plan: "Appliances · 6 instalments",     amount: "₦50,000/mo",  status: "Retry",  pct: 50 },
                      { name: "Ngozi Anyanwu", plan: "Rent Collection · Quarterly",    amount: "₦80,000/qtr", status: "Active", pct: 75 },
                    ].map((p) => (
                      <div key={p.name} className="flex items-center gap-3 px-4 py-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accBg} ${acc}`}>{p.name.charAt(0)}</div>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-xs font-medium ${txt}`}>{p.name}</p>
                          <p className={`truncate text-[11px] ${muted}`}>{p.plan}</p>
                          <div className={`mt-1.5 h-1 overflow-hidden rounded-full ${dk ? "bg-zinc-800" : "bg-gray-200"}`}>
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.pct}%` }} />
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-xs font-semibold ${txt}`}>{p.amount}</p>
                          <span className={`text-[11px] ${p.status === "Active" ? acc : dk ? "text-amber-400" : "text-amber-600"}`}>{p.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          STATS
      ══════════════════════════════════════ */}
      <section className={`${bg2} border-b ${bdr}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={staggerContainer}
            className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-6"
          >
            {stats.map((s) => (
              <motion.div key={s.label} variants={popIn} transition={spring} whileHover={{ y: -4, scale: 1.06 }}
                className="flex flex-col items-center gap-2 text-center">
                <s.icon className={`h-5 w-5 ${acc}`} />
                <p className={`text-3xl font-extrabold tracking-tight ${txt}`}>{s.value}</p>
                <p className={`text-xs font-medium ${muted}`}>{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FEATURES
      ══════════════════════════════════════ */}
      <section className={`${bg1} border-b ${bdr}`} id="features">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }}
            variants={blurInUp} transition={smooth} className="text-center">
            <span className={`text-xs font-bold uppercase tracking-widest ${acc}`}>Platform features</span>
            <h2 style={ds} className={`mt-3 text-3xl sm:text-4xl tracking-tight ${txt}`}>Built for trust &amp; compliance</h2>
            <p className={`mx-auto mt-4 max-w-xl text-sm leading-relaxed ${body}`}>
              Every layer designed around CBN compliance, payment safety, and operational reliability.
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
            variants={staggerSlow} className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <motion.div key={f.title} variants={fadeInUp} transition={smooth}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={`group rounded-2xl border ${bdr} ${bdrH} ${bg2} p-7 transition-colors`}>
                <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${accBg} ${acc} transition-colors group-hover:bg-emerald-500/15`}>
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className={`text-base font-semibold ${txt}`}>{f.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${body}`}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          HOW IT WORKS
      ══════════════════════════════════════ */}
      <section className={`${bg2} border-b ${bdr}`} id="how-it-works">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={blurInUp} transition={smooth} className="text-center">
            <span className={`text-xs font-bold uppercase tracking-widest ${acc}`}>How it works</span>
            <h2 style={ds} className={`mt-3 text-3xl sm:text-4xl tracking-tight ${txt}`}>Four steps to automated collection</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
            variants={staggerSlow} className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={fadeInUp} transition={{ ...smooth, delay: i * 0.08 }} className="relative text-center">
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ ...spring, delay: i * 0.1 }}
                  style={ds}
                  className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border text-xl font-bold ${stepBg}`}
                >
                  {s.n}
                </motion.div>
                {i < steps.length - 1 && (
                  <div className={`absolute left-[calc(50%+2.5rem)] top-8 hidden h-px w-[calc(100%-5rem)] lg:block ${divider}`} />
                )}
                <h3 className={`text-sm font-semibold ${txt}`}>{s.title}</h3>
                <p className={`mt-2 text-sm ${body}`}>{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          USE CASES
      ══════════════════════════════════════ */}
      <section className={`${bg1} border-b ${bdr}`}>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={blurInUp} transition={smooth} className="text-center">
            <span className={`text-xs font-bold uppercase tracking-widest ${acc}`}>Use cases</span>
            <h2 style={ds} className={`mt-3 text-3xl sm:text-4xl tracking-tight ${txt}`}>Works for any recurring collection</h2>
          </motion.div>

          <div className="mt-16 grid gap-5 sm:grid-cols-2">
            {useCases.map((u, i) => (
              <motion.div key={u.title}
                initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
                variants={i % 2 === 0 ? slideInLeft : slideInRight}
                transition={{ ...smooth, delay: i * 0.06 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                className={`flex gap-5 rounded-2xl border ${bdr} ${bdrH} ${bg2} p-6 transition-colors`}>
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accBg} ${acc}`}>
                  <u.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className={`text-sm font-semibold ${txt}`}>{u.title}</h3>
                  <p className={`mt-1 text-sm ${body}`}>{u.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          ABOUT
      ══════════════════════════════════════ */}
      <section className={`${bg2} border-b ${bdr}`} id="about">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={staggerContainer} className="mx-auto max-w-3xl">
            <motion.div variants={blurInUp} transition={smooth} className="mb-8 text-center">
              <span className={`text-xs font-bold uppercase tracking-widest ${acc}`}>About RepayStream</span>
              <h2 style={ds} className={`mt-3 text-3xl sm:text-4xl tracking-tight ${txt}`}>What we do</h2>
            </motion.div>
            <motion.div variants={fadeInUp} transition={{ ...smooth, delay: 0.1 }}
              className={`space-y-4 rounded-2xl border ${bdr} ${cardDk} p-8 leading-relaxed ${body}`}>
              <p>
                RepayStream is a{" "}
                <span className={`font-semibold ${txt}`}>consent-based repayment orchestration platform</span>.
                We help businesses and their customers manage pre-agreed repayment schedules using licensed Nigerian payment providers.
              </p>
              <p>We do not lend money, hold customer funds, or perform collections. Our role is strictly limited to:</p>
              <ul className="space-y-2 pl-4">
                {[
                  "Capturing explicit customer consent",
                  "Scheduling and triggering authorized debits through licensed PSPs",
                  "Providing transparent visibility and status updates to all parties",
                  "All funds move directly from the payer to the payee",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          TESTIMONIALS
      ══════════════════════════════════════ */}
      <section className={`${bg1} border-b ${bdr}`}>
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={blurInUp} transition={smooth} className="text-center">
            <span className={`text-xs font-bold uppercase tracking-widest ${acc}`}>Testimonials</span>
            <h2 style={ds} className={`mt-3 text-3xl sm:text-4xl tracking-tight ${txt}`}>Trusted by businesses across Nigeria</h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
            variants={staggerSlow} className="mt-16 grid gap-5 sm:grid-cols-2">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} variants={fadeInUp} transition={{ ...smooth, delay: i * 0.07 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`flex flex-col gap-4 rounded-2xl border ${bdr} ${bg2} p-7`}>
                <p className={`text-sm leading-relaxed ${bodyLt}`}>&#8220;{t.body}&#8221;</p>
                <div className={`mt-auto flex items-center gap-3 border-t ${bdr} pt-4`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accBg} ${acc}`}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${txt}`}>{t.name}</p>
                    <p className={`text-xs ${muted}`}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          COMPLIANCE
      ══════════════════════════════════════ */}
      <section className={`${bg2} border-b ${bdr}`}>
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={slideInLeft} transition={smooth}
            className={`mx-auto flex max-w-3xl items-start gap-5 rounded-2xl border ${dk ? "border-emerald-500/20 bg-emerald-500/5" : "border-emerald-300/50 bg-emerald-50"} p-8`}>
            <motion.div initial={{ rotate: -15, scale: 0 }} whileInView={{ rotate: 0, scale: 1 }} viewport={{ once: true }} transition={spring}>
              <ShieldCheck className={`mt-0.5 h-8 w-8 shrink-0 ${acc}`} />
            </motion.div>
            <div>
              <h3 className={`font-semibold ${txt}`}>Regulatory compliance</h3>
              <p className={`mt-2 text-sm leading-relaxed ${body}`}>
                RepayStream is an orchestration layer. Settlement, KYC, and dispute handling remain with your licensed payment service
                provider and financial institution, in line with CBN guidelines. All mandate authorizations follow the CBN Direct Debit Scheme framework.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          CTA
      ══════════════════════════════════════ */}
      <section className={`${bg1} border-b ${bdr}`}>
        <div className="mx-auto max-w-6xl px-4 py-28 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}
            variants={staggerContainer} className="text-center">
            <motion.h2 variants={blurInUp} transition={smooth}
              style={ds} className={`text-3xl sm:text-4xl lg:text-5xl tracking-tight ${txt}`}>
              Ready to automate collections?
            </motion.h2>
            <motion.p variants={fadeInUp} transition={{ ...smooth, delay: 0.1 }}
              className={`mx-auto mt-4 max-w-md text-sm leading-relaxed ${body}`}>
              Set up your business in minutes. Create your first repayment plan today.
            </motion.p>
            <motion.div variants={popIn} transition={{ ...spring, delay: 0.2 }}
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/register"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-500 px-8 text-base font-semibold text-white shadow-lg shadow-emerald-500/20 transition-colors hover:bg-emerald-400">
                Create free account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login?next=/dashboard"
                className={`inline-flex h-12 items-center rounded-full border px-8 text-base font-medium transition-colors ${dk ? "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white" : "border-gray-300 text-gray-600 hover:border-gray-500 hover:text-gray-900"}`}>
                Business sign-in
              </Link>
            </motion.div>
            <motion.p variants={fadeInUp} transition={{ ...smooth, delay: 0.5 }} className={`mt-6 text-xs ${muted2}`}>
              No setup fees &middot; No transaction minimums &middot; CBN compliant
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════════
          FOOTER
      ══════════════════════════════════════ */}
      <footer className={`${dk ? "bg-black border-zinc-900" : "bg-gray-50 border-gray-200"} border-t`}>
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden">
                <img src={mainLogo} alt="" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
              </div>
              <div>
                <p className={`text-sm font-bold ${txt}`}>RepayStream Technologies Limited</p>
                <p className={`text-xs ${muted2}`}>RC 9344129 &middot; CBN Direct Debit Scheme</p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-1">
              {[
                { to: "/terms",          label: "Terms of Use"     },
                { to: "/privacy",        label: "Privacy Policy"   },
                { to: "/acceptable-use", label: "Acceptable Use"   },
                { to: "/compliance",     label: "Compliance"       },
                { to: "/contact",        label: "Contact Us"       },
              ].map((l) => (
                <Link key={l.to} to={l.to} className={`text-xs transition-colors ${muted2} hover:${txt}`}>{l.label}</Link>
              ))}
            </nav>
          </div>
          <p className={`mt-6 text-xs ${muted2}`}>
            &copy; 2026 RepayStream. RepayStream does not hold customer funds.
          </p>
        </div>
      </footer>

    </div>
  );
}
