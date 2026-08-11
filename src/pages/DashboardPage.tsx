import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Check, Copy, ExternalLink, UserCheck,
  CreditCard, Building2, FileText, Plus, TrendingUp, Clock, CheckCircle2,
  Eye, Search, Tag, X, Wallet, PauseCircle, XCircle,
  CircleDollarSign, AlertCircle, Activity, ChevronRight,
} from "lucide-react";
import { AnimatePresence, motion as m } from "framer-motion";
import { BusinessSidebar } from "@/components/BusinessSidebar";
import { BusinessSetupForm } from "@/components/business-setup-form";
import { CreatePlanForm } from "@/components/forms/create-plan-form";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import { apiFetch } from "@/lib/api";
import { staggerContainer, staggerItem, smooth } from "@/lib/motion";

type Business = { id: string; name: string };
type MyCustomer = { id: string; phone: string; email?: string };
type PlanRow = {
  id: string;
  plan_name?: string | null;
  group?: string | null;
  total_amount: number;
  status: string;
  customer_id: string;
  payment_method?: string;
  created_at: string;
  customers: { name?: string | null; phone?: string; email?: string } | null;
};

const statusStyles: Record<string, { color: string; bg: string; icon: typeof Clock; label: string }> = {
  pending_mandate: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", icon: Clock, label: "Pending" },
  active:          { color: "text-primary",   bg: "bg-primary/10 border-primary/20",     icon: TrendingUp, label: "Active" },
  completed:       { color: "text-blue-400",  bg: "bg-blue-400/10 border-blue-400/20",   icon: CheckCircle2, label: "Completed" },
  defaulted:       { color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: AlertCircle, label: "Defaulted" },
  paused:          { color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20", icon: PauseCircle, label: "Paused" },
  cancelled:       { color: "text-muted-foreground", bg: "bg-secondary/30 border-border/30", icon: XCircle, label: "Cancelled" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function groupByDate(plans: PlanRow[]): { label: string; plans: PlanRow[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const last7 = new Date(today); last7.setDate(today.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const buckets: { label: string; plans: PlanRow[] }[] = [
    { label: "Today", plans: [] },
    { label: "Yesterday", plans: [] },
    { label: "Last 7 days", plans: [] },
    { label: "This month", plans: [] },
    { label: "Older", plans: [] },
  ];
  for (const p of plans) {
    const d = new Date(p.created_at);
    if (d >= today) buckets[0].plans.push(p);
    else if (d >= yesterday) buckets[1].plans.push(p);
    else if (d >= last7) buckets[2].plans.push(p);
    else if (d >= monthStart) buckets[3].plans.push(p);
    else buckets[4].plans.push(p);
  }
  return buckets.filter((b) => b.plans.length > 0);
}

export function DashboardPage() {
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [myCustomer, setMyCustomer] = useState<MyCustomer | null>(null);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadPlans = useCallback(async () => {
    const pRes = await apiFetch("/api/plans");
    if (pRes.ok) { const p = (await pRes.json()) as { plans: PlanRow[] }; setPlans(p.plans ?? []); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [bRes, pRes, mRes] = await Promise.all([
        apiFetch("/api/business/me"),
        apiFetch("/api/plans"),
        apiFetch("/api/customer/mine"),
      ]);
      if (cancelled) return;
      if (bRes.ok) { const b = (await bRes.json()) as { business: Business | null }; setBusiness(b.business); } else { setBusiness(null); }
      if (pRes.ok) { const p = (await pRes.json()) as { plans: PlanRow[] }; setPlans(p.plans ?? []); }
      if (mRes.ok) { const m = (await mRes.json()) as { customer: MyCustomer | null }; setMyCustomer(m.customer); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function copyLink(planId: string, type: "mandate" | "claim", customerId: string) {
    const url = type === "mandate"
      ? `${window.location.origin}/plan/${planId}`
      : `${window.location.origin}/portal/claim?customerId=${customerId}`;
    await navigator.clipboard.writeText(url);
    const key = `${planId}-${type}`;
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  }

  const allGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const p of plans) { if (p.group) groups.add(p.group); }
    return [...groups].sort();
  }, [plans]);

  const analytics = useMemo(() => {
    const total = plans.length;
    const active = plans.filter((p) => p.status === "active").length;
    const completed = plans.filter((p) => p.status === "completed").length;
    const defaulted = plans.filter((p) => p.status === "defaulted").length;
    const pending = plans.filter((p) => p.status === "pending_mandate").length;
    const totalValue = plans.reduce((sum, p) => sum + Number(p.total_amount), 0);
    const collectionRate = total > 0 ? Math.round(((active + completed) / total) * 100) : 0;
    return { total, active, completed, defaulted, pending, totalValue, collectionRate };
  }, [plans]);

  const filtered = useMemo(() => {
    let result = plans;
    if (statusFilter !== "all") result = result.filter((p) => p.status === statusFilter);
    if (groupFilter) result = result.filter((p) => p.group === groupFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) =>
        (p.plan_name ?? "").toLowerCase().includes(q) ||
        (p.customers?.name ?? "").toLowerCase().includes(q) ||
        (p.customers?.email ?? "").toLowerCase().includes(q) ||
        (p.customers?.phone ?? "").toLowerCase().includes(q) ||
        (p.group ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [plans, search, groupFilter, statusFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  // ── Sidebar shell (shared between loading + loaded states) ─────────────────

  const sidebar = (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border/40 bg-card transition-transform duration-300 lg:static lg:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <BusinessSidebar active="plans" businessName={business?.name ?? undefined} onClose={() => setSidebarOpen(false)} />
    </aside>
  );

  // ── Loading state ──────────────────────────────────────────────────────────

  if (business === undefined) {
    return (
      <div className="flex min-h-dvh bg-background">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        {sidebar}
        <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
          {/* Mobile header */}
          <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/40 bg-card/80 px-4 backdrop-blur lg:hidden">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-card text-muted-foreground hover:text-foreground"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <p className="flex-1 text-sm font-semibold text-foreground">Plans</p>
            <NotificationsPanel panelPosition="right" />
          </div>
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading dashboard…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <>
    <div className="flex min-h-dvh bg-background">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {sidebar}

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">

        {/* Mobile header */}
        <div className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/40 bg-card/80 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-card text-muted-foreground hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-semibold text-foreground">Plans</p>
        </div>

        <main className="flex-1 p-6 space-y-6 max-w-6xl mx-auto w-full">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">

            {!business ? (
              /* ── No business yet ── */
              <motion.div variants={staggerItem} transition={smooth} className="flex flex-col gap-4">
                {myCustomer && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 overflow-hidden">
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Wallet className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">Your repayment portal</p>
                          <p className="text-sm text-muted-foreground">View your schedules, payment history, and raise disputes.</p>
                        </div>
                      </div>
                      <Link
                        to={`/customer/${myCustomer.id}`}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
                      >
                        Open my portal <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                  <div className="border-b border-border/40 p-5">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-base font-semibold text-foreground">Set up your business</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {myCustomer
                        ? "You can also run a business. Set up your profile to start creating repayment plans."
                        : "One profile per account. This name appears on customer communications."}
                    </p>
                  </div>
                  <div className="p-5">
                    <BusinessSetupForm />
                    {!myCustomer && (
                      <p className="mt-4 text-center text-xs text-muted-foreground">
                        Are you a customer?{" "}
                        <Link to="/portal/claim" className="text-primary hover:underline underline-offset-4">
                          Use your claim link
                        </Link>{" "}
                        to access your repayment portal.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <>
                {/* ── Stats grid ── */}
                <motion.div variants={staggerItem} transition={smooth}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: "Total plans",
                      value: analytics.total,
                      icon: FileText,
                      accent: "text-blue-400",
                      bg: "bg-blue-400/10",
                      glow: "shadow-blue-400/5",
                    },
                    {
                      label: "Pending mandate",
                      value: analytics.pending,
                      icon: Clock,
                      accent: "text-amber-400",
                      bg: "bg-amber-400/10",
                      glow: "shadow-amber-400/5",
                    },
                    {
                      label: "Active",
                      value: analytics.active,
                      icon: TrendingUp,
                      accent: "text-primary",
                      bg: "bg-primary/10",
                      glow: "shadow-primary/5",
                    },
                    {
                      label: "Completed",
                      value: analytics.completed,
                      icon: CheckCircle2,
                      accent: "text-sky-400",
                      bg: "bg-sky-400/10",
                      glow: "shadow-sky-400/5",
                    },
                  ].map((s) => (
                    <div key={s.label}
                      className={`relative flex flex-col gap-4 rounded-2xl border border-border/40 bg-card p-5 shadow-sm ${s.glow}`}>
                      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                        <s.icon className={`h-4 w-4 ${s.accent}`} />
                      </div>
                      <div>
                        <p className={`text-3xl font-bold tabular-nums ${s.accent}`}>{s.value}</p>
                        <p className="mt-0.5 text-xs font-medium text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>

                {/* ── Analytics row ── */}
                {plans.length > 0 && (
                  <motion.div variants={staggerItem} transition={smooth}
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {/* Collection rate */}
                    <div className="flex items-center gap-5 rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
                      <div className="relative shrink-0">
                        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.9" fill="none"
                            strokeWidth="3" stroke="currentColor" className="text-primary/10" />
                          <circle cx="18" cy="18" r="15.9" fill="none"
                            strokeWidth="3" stroke="currentColor"
                            strokeLinecap="round"
                            strokeDasharray={`${analytics.collectionRate} 100`}
                            className="text-primary transition-all duration-700" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-primary rotate-90">
                          {analytics.collectionRate}%
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Activity className="h-4 w-4 text-primary" />
                          <p className="text-sm font-semibold text-foreground">Collection rate</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analytics.active + analytics.completed} of {analytics.total} plans active or completed
                        </p>
                        <div className="mt-3 h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-700"
                            style={{ width: `${analytics.collectionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Portfolio value */}
                    <div className="flex items-center gap-5 rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-400/10 border border-blue-400/20">
                        <CircleDollarSign className="h-7 w-7 text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-foreground">Portfolio value</p>
                        </div>
                        <p className="truncate text-2xl font-bold tabular-nums text-blue-400">
                          ₦{analytics.totalValue.toLocaleString("en-NG")}
                        </p>
                        <div className="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-3 w-3" />{analytics.defaulted} defaulted
                          </span>
                          <span className="flex items-center gap-1 text-sky-400">
                            <CheckCircle2 className="h-3 w-3" />{analytics.completed} completed
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── Create plan CTA ── */}
                <motion.div variants={staggerItem} transition={smooth}>
                  <button
                    type="button"
                    onClick={() => setShowCreate(true)}
                    className="group relative w-full overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/8 to-primary/5 p-5 text-left transition-all hover:border-primary/40 hover:from-primary/15 hover:via-primary/12 hover:to-primary/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <div className="pointer-events-none absolute right-4 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-primary/5 blur-2xl" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform group-hover:scale-105">
                        <Plus className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">Create a new plan</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">Set up a repayment schedule and send the mandate link to your customer</p>
                      </div>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </button>
                </motion.div>

                {/* ── Plans list ── */}
                <motion.div variants={staggerItem} transition={smooth}>
                  <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                    <div className="border-b border-border/40 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground">Repayment plans</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {plans.length > 0 ? `${plans.length} plan${plans.length !== 1 ? "s" : ""} total` : "No plans yet"}
                            </p>
                          </div>
                        </div>
                        {plans.length > 0 && (
                          <span className="rounded-full border border-border/40 bg-secondary/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {filtered.length} shown
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {plans.length > 0 && (
                        <div className="border-b border-border/40 p-4 space-y-3">
                          {/* Status tabs */}
                          <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/30 bg-secondary/20 p-1">
                            {[
                              { key: "all", label: "All", count: plans.length },
                              { key: "active", label: "Active", count: analytics.active },
                              { key: "pending_mandate", label: "Pending", count: analytics.pending },
                              { key: "defaulted", label: "Defaulted", count: analytics.defaulted },
                              { key: "completed", label: "Completed", count: analytics.completed },
                            ].map((tab) => (
                              <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                  statusFilter === tab.key
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {tab.label}
                                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                                  statusFilter === tab.key ? "bg-primary/10 text-primary" : "bg-secondary/40 text-muted-foreground"
                                }`}>{tab.count}</span>
                              </button>
                            ))}
                          </div>

                          {/* Search */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <input
                              placeholder="Search by name, customer, or group…"
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                              className="h-9 w-full rounded-xl border border-border/40 bg-background px-4 pl-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                            />
                            {search && (
                              <button onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          {/* Group filters */}
                          {allGroups.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {allGroups.map((g) => (
                                <button key={g} onClick={() => setGroupFilter(groupFilter === g ? null : g)}
                                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                                    groupFilter === g
                                      ? "border-primary bg-primary/10 text-primary"
                                      : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border hover:text-foreground"
                                  }`}>
                                  <Tag className="h-3 w-3" />{g}
                                  {groupFilter === g && <X className="h-3 w-3" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Empty states */}
                      {!plans.length ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-secondary/20">
                            <FileText className="h-6 w-6 text-muted-foreground/30" />
                          </div>
                          <p className="font-medium text-muted-foreground">No plans yet</p>
                          <p className="mt-1 text-sm text-muted-foreground/60">Create your first plan above to get started</p>
                        </div>
                      ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                          <Search className="mb-3 h-8 w-8 text-muted-foreground/20" />
                          <p className="font-medium text-muted-foreground">No plans match your search</p>
                          <button onClick={() => { setSearch(""); setGroupFilter(null); setStatusFilter("all"); }}
                            className="mt-2 text-sm text-primary hover:underline underline-offset-4">
                            Clear all filters
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0">
                          {grouped.map(({ label, plans: groupPlans }) => (
                            <div key={label}>
                              {/* Date group label */}
                              <div className="flex items-center gap-3 border-t border-border/30 bg-secondary/10 px-4 py-2.5 first:border-t-0">
                                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
                                <div className="h-px flex-1 bg-border/20" />
                                <span className="text-[11px] text-muted-foreground/60">{groupPlans.length}</span>
                              </div>

                              {/* Plan rows */}
                              <motion.ul initial="hidden" animate="visible" variants={staggerContainer}
                                className="flex flex-col gap-2 p-3 sm:gap-0 sm:p-0">
                                {groupPlans.map((p) => {
                                  const st = statusStyles[p.status] ?? statusStyles.pending_mandate;
                                  const Icon = st.icon;
                                  const customerDisplay = p.customers?.name ?? p.customers?.email ?? p.customers?.phone ?? "Unknown";
                                  const initials = customerDisplay.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "??";
                                  const mandateKey = `${p.id}-mandate`;
                                  const claimKey = `${p.id}-claim`;

                                  return (
                                    <motion.li key={p.id} variants={staggerItem} transition={smooth}
                                      className="group flex flex-col overflow-hidden rounded-xl border border-border/40 bg-card/40 transition-colors hover:bg-card/70 sm:rounded-none sm:border-x-0 sm:border-b-0 sm:border-t sm:border-border/30 sm:bg-transparent sm:hover:bg-secondary/10 sm:flex-row sm:items-center">
                                      <div className="flex flex-1 items-center gap-3 px-4 py-4 min-w-0">
                                        {/* Avatar */}
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                                          {initials}
                                        </div>

                                        {/* Primary info */}
                                        <div className="min-w-0 flex-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <span className="truncate font-semibold text-sm text-foreground">{customerDisplay}</span>
                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.bg} ${st.color}`}>
                                              <Icon className="h-3 w-3" />{st.label}
                                            </span>
                                            {p.group && (
                                              <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-border/40 bg-secondary/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                                                <Tag className="h-3 w-3" />{p.group}
                                              </span>
                                            )}
                                          </div>
                                          <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                            {p.plan_name && <span className="truncate max-w-[180px]">{p.plan_name}</span>}
                                            {p.customers?.phone && <span>{p.customers.phone}</span>}
                                            {p.created_at && <span>{formatDate(p.created_at)}</span>}
                                            <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" />Paystack</span>
                                          </div>
                                        </div>

                                        {/* Amount */}
                                        <p className="shrink-0 font-bold tabular-nums text-foreground text-sm">
                                          ₦{Number(p.total_amount).toLocaleString("en-NG")}
                                        </p>
                                      </div>

                                      {/* Actions */}
                                      <div className="flex flex-wrap items-center gap-1.5 border-t border-border/30 bg-secondary/10 px-4 py-3 sm:flex-col sm:flex-nowrap sm:min-w-[160px] sm:border-t-0 sm:border-l sm:border-l-border/20 sm:bg-transparent">
                                        {/* View details */}
                                        <Link
                                          to={`/dashboard/plan/${p.id}`}
                                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-opacity sm:h-9 sm:w-full sm:justify-start"
                                        >
                                          <Eye className="h-3.5 w-3.5" />View details
                                        </Link>

                                        {/* Mandate + copy */}
                                        <div className="flex gap-px">
                                          <Link
                                            to={`/plan/${p.id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg rounded-r-none border border-border/40 bg-card px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors sm:flex-1"
                                          >
                                            <ExternalLink className="h-3 w-3 shrink-0" />Mandate
                                          </Link>
                                          <button
                                            title="Copy mandate link"
                                            onClick={() => void copyLink(p.id, "mandate", p.customer_id)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg rounded-l-none border border-l-0 border-border/40 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                                          >
                                            {copiedKey === mandateKey ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                                          </button>
                                        </div>

                                        {/* Claim + copy */}
                                        <div className="flex gap-px">
                                          <Link
                                            to={`/portal/claim?customerId=${p.customer_id}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg rounded-r-none border border-border/40 bg-card px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors sm:flex-1"
                                          >
                                            <UserCheck className="h-3 w-3 shrink-0" />Claim
                                          </Link>
                                          <button
                                            title="Copy claim link"
                                            onClick={() => void copyLink(p.id, "claim", p.customer_id)}
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg rounded-l-none border border-l-0 border-border/40 bg-card text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                                          >
                                            {copiedKey === claimKey ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
                                          </button>
                                        </div>
                                      </div>
                                    </motion.li>
                                  );
                                })}
                              </motion.ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        </main>
      </div>
    </div>

    {/* ── Create Plan Modal ── */}
    <AnimatePresence>
      {showCreate && (
        <m.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-0 pb-0 sm:px-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
        >
          <m.div
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex w-full max-w-xl flex-col rounded-t-3xl sm:rounded-2xl border border-border/40 bg-card shadow-2xl"
            style={{ maxHeight: "92dvh" }}
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">Create a plan</h2>
                  <p className="text-xs text-muted-foreground">Set up a repayment schedule for your customer</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreate(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <CreatePlanForm onCreated={() => void loadPlans()} />
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
    </>
  );
}
