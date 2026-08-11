import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, Clock, Activity, CheckCircle2,
} from "lucide-react";
import { BusinessSidebar } from "@/components/BusinessSidebar";
import { BackButton } from "@/components/BackButton";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type Summary = {
  revenue: { collected: number; outstanding: number };
  plans: { active: number; completed: number; total: number };
  disputes: { total: number; open: number; resolved: number };
};

type PlanStatusItem = { status: string; count: number };
type RevenueMonthItem = { month: string; collected: number; expected: number };

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active:          "#22c55e",
  completed:       "#3b82f6",
  defaulted:       "#ef4444",
  paused:          "#f59e0b",
  pending_mandate: "#8b5cf6",
  cancelled:       "#6b7280",
};

function naira(n: number) {
  return "₦" + Number(n).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const ANIM = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton() {
  return <div className="animate-pulse bg-secondary/30 rounded-xl h-5 w-20" />;
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────

function NairaTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border/40 bg-card px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="tabular-nums">
          {p.name}: {naira(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [plansByStatus, setPlansByStatus] = useState<PlanStatusItem[]>([]);
  const [statusLoading, setStatusLoading] = useState(true);
  const [revenueByMonth, setRevenueByMonth] = useState<RevenueMonthItem[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Summary
      setSummaryLoading(true);
      try {
        const res = await apiFetch("/api/analytics/summary");
        if (!cancelled && res.ok) setSummary((await res.json()) as Summary);
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setStatusLoading(true);
      try {
        const res = await apiFetch("/api/analytics/plans-by-status");
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { data: PlanStatusItem[] } | PlanStatusItem[];
          setPlansByStatus(Array.isArray(data) ? data : (data as { data: PlanStatusItem[] }).data ?? []);
        }
      } finally {
        if (!cancelled) setStatusLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setRevenueLoading(true);
      try {
        const res = await apiFetch("/api/analytics/revenue-by-month");
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { data: RevenueMonthItem[] } | RevenueMonthItem[];
          setRevenueByMonth(Array.isArray(data) ? data : (data as { data: RevenueMonthItem[] }).data ?? []);
        }
      } finally {
        if (!cancelled) setRevenueLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalPlansInDonut = plansByStatus.reduce((s, d) => s + d.count, 0);

  return (
    <div className="flex min-h-dvh bg-background">

      {/* ── Mobile overlay ──────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 shrink-0 flex-col border-r border-border/40 bg-card transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <BusinessSidebar active="analytics" onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
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
          <p className="flex-1 text-sm font-semibold text-foreground">Analytics</p>
          <NotificationsPanel panelPosition="right" />
        </div>

        <main className="flex-1 p-6 space-y-8 max-w-6xl mx-auto w-full">

          {/* Page heading */}
          <motion.div {...ANIM} className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
              <p className="mt-1 text-sm text-muted-foreground">Revenue, plan health, and dispute overview</p>
            </div>
            <BackButton to="/dashboard" />
          </motion.div>

          {/* ── A. Stats strip ──────────────────────────────────────────────── */}
          <motion.div {...ANIM} transition={{ duration: 0.3, delay: 0.05 }}>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue Collected */}
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  {summaryLoading ? (
                    <Skeleton />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums text-green-500">
                      {naira(summary?.revenue.collected ?? 0)}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Total Revenue Collected</p>
                </div>
              </div>

              {/* Outstanding */}
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/10">
                  <Clock className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  {summaryLoading ? (
                    <Skeleton />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums text-amber-400">
                      {naira(summary?.revenue.outstanding ?? 0)}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Outstanding</p>
                </div>
              </div>

              {/* Active Plans */}
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  {summaryLoading ? (
                    <Skeleton />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums text-blue-500">
                      {summary?.plans.active ?? 0}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Active Plans</p>
                </div>
              </div>

              {/* Completed Plans */}
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  {summaryLoading ? (
                    <Skeleton />
                  ) : (
                    <p className="text-2xl font-bold tabular-nums text-green-500">
                      {summary?.plans.completed ?? 0}
                    </p>
                  )}
                  <p className="mt-1 text-xs font-medium text-muted-foreground">Completed Plans</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── B + C: Charts row ───────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* B. Plans by status — Donut */}
            <motion.div {...ANIM} transition={{ duration: 0.3, delay: 0.1 }}>
              <div className="rounded-2xl border border-border/40 bg-card p-5 h-full">
                <h2 className="text-sm font-semibold text-foreground mb-4">Plans by Status</h2>

                {statusLoading ? (
                  <div className="flex items-center justify-center h-56">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : plansByStatus.length === 0 ? (
                  <div className="flex items-center justify-center h-56 text-sm text-muted-foreground">
                    No plan data available
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    {/* Donut chart */}
                    <div className="relative shrink-0">
                      <PieChart width={180} height={180}>
                        <Pie
                          data={plansByStatus}
                          cx={85}
                          cy={85}
                          innerRadius={70}
                          outerRadius={85}
                          paddingAngle={2}
                          dataKey="count"
                        >
                          {plansByStatus.map((entry) => (
                            <Cell
                              key={entry.status}
                              fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                      {/* Center label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-foreground tabular-nums">{totalPlansInDonut}</span>
                        <span className="text-xs text-muted-foreground">plans</span>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-col gap-2 min-w-0">
                      {plansByStatus.map((entry) => (
                        <div key={entry.status} className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: STATUS_COLORS[entry.status] ?? "#6b7280" }}
                          />
                          <span className="text-xs text-muted-foreground capitalize truncate">
                            {entry.status.replace("_", " ")}
                          </span>
                          <span className="ml-auto text-xs font-semibold text-foreground tabular-nums pl-2">
                            {entry.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* C. Revenue over time — Bar chart */}
            <motion.div {...ANIM} transition={{ duration: 0.3, delay: 0.15 }}>
              <div className="rounded-2xl border border-border/40 bg-card p-5 h-full">
                <h2 className="text-sm font-semibold text-foreground mb-4">Revenue Over Time</h2>

                {revenueLoading ? (
                  <div className="flex items-center justify-center h-[280px]">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                ) : revenueByMonth.length === 0 ? (
                  <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
                    No revenue data available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={revenueByMonth} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={(v: number) => naira(v)}
                        tick={{ fontSize: 10, fill: "#6b7280" }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip content={<NairaTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        formatter={(value) => <span style={{ color: "var(--muted-foreground)" }}>{value}</span>}
                      />
                      <Bar dataKey="collected" name="collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expected" name="expected" fill="#334155" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </motion.div>
          </div>

          {/* ── D. Dispute stats ────────────────────────────────────────────── */}
          <motion.div {...ANIM} transition={{ duration: 0.3, delay: 0.2 }}>
            <div className="rounded-2xl border border-border/40 bg-card p-5">
              <h2 className="text-sm font-semibold text-foreground mb-4">Dispute Overview</h2>
              {summaryLoading ? (
                <div className="flex gap-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-secondary/30 rounded-xl h-10 w-28" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-border/40 bg-secondary/30 px-4 py-2">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="text-sm font-bold text-foreground tabular-nums">
                      {summary?.disputes.total ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2">
                    <span className="text-xs text-amber-500">Open</span>
                    <span className="text-sm font-bold text-amber-400 tabular-nums">
                      {summary?.disputes.open ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2">
                    <span className="text-xs text-green-600">Resolved</span>
                    <span className="text-sm font-bold text-green-500 tabular-nums">
                      {summary?.disputes.resolved ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

        </main>
      </div>
    </div>
  );
}
