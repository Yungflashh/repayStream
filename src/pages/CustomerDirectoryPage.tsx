import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Users, X } from "lucide-react";
import { BusinessSidebar } from "@/components/BusinessSidebar";
import { apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────────

type PlanRow = {
  id: string;
  plan_name?: string | null;
  total_amount: number;
  status: string;
  customer_id: string;
  created_at: string;
  customers: { name?: string | null; phone?: string; email?: string } | null;
};

type CustomerEntry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  plans: PlanRow[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusSummary(plans: PlanRow[]): string {
  const counts: Record<string, number> = {};
  for (const p of plans) {
    counts[p.status] = (counts[p.status] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([status, count]) => `${count} ${status.replace("_", " ")}`)
    .join(" · ");
}

function initials(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase() || "??";
}

const ANIM = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

// ── Component ─────────────────────────────────────────────────────────────────

export function CustomerDirectoryPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        const res = await apiFetch("/api/plans");
        if (!cancelled && res.ok) {
          const data = (await res.json()) as { plans: PlanRow[] };
          setPlans(data.plans ?? []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Group plans by customer_id into CustomerEntry objects
  const customers = useMemo<CustomerEntry[]>(() => {
    const map = new Map<string, CustomerEntry>();
    for (const plan of plans) {
      const cid = plan.customer_id;
      if (!map.has(cid)) {
        const c = plan.customers;
        map.set(cid, {
          id: cid,
          name: c?.name ?? c?.email ?? c?.phone ?? "Unknown",
          email: c?.email ?? "",
          phone: c?.phone ?? "",
          plans: [],
        });
      }
      map.get(cid)!.plans.push(plan);
    }
    // Sort by name
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [plans]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [customers, search]);

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
        <BusinessSidebar active="customers" onClose={() => setSidebarOpen(false)} />
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
          <p className="text-sm font-semibold text-foreground">Customers</p>
        </div>

        <main className="flex-1 p-6 space-y-6 max-w-4xl mx-auto w-full">

          {/* Page heading */}
          <motion.div {...ANIM}>
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Loading…" : `${customers.length} customer${customers.length !== 1 ? "s" : ""} found`}
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div {...ANIM} transition={{ duration: 0.3, delay: 0.05 }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-card py-2.5 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.div>

          {/* Customer list */}
          <motion.div {...ANIM} transition={{ duration: 0.3, delay: 0.1 }}>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse rounded-2xl border border-border/40 bg-card p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-secondary/30" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 rounded bg-secondary/30" />
                        <div className="h-3 w-48 rounded bg-secondary/30" />
                      </div>
                      <div className="h-5 w-16 rounded-full bg-secondary/30" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border/60 bg-secondary/20">
                  <Users className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <p className="font-medium text-muted-foreground">
                  {search ? "No customers match your search" : "No customers yet"}
                </p>
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="mt-2 text-sm text-primary hover:underline underline-offset-4"
                  >
                    Clear search
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((customer, idx) => {
                  const firstPlan = customer.plans[0];
                  const activeCount = customer.plans.filter((p) => p.status === "active").length;
                  const completedCount = customer.plans.filter((p) => p.status === "completed").length;

                  return (
                    <motion.div
                      key={customer.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: idx * 0.04 }}
                    >
                      <Link
                        to={firstPlan ? `/dashboard/plan/${firstPlan.id}` : "/dashboard"}
                        className="block rounded-2xl border border-border/40 bg-card p-5 transition-colors hover:bg-card/80 hover:border-border/60"
                      >
                        <div className="flex items-start gap-4">
                          {/* Avatar */}
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                            {initials(customer.name)}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-foreground truncate">{customer.name}</p>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                              {customer.email && <span>{customer.email}</span>}
                              {customer.phone && <span>{customer.phone}</span>}
                            </div>
                            {customer.plans.length > 0 && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                {statusSummary(customer.plans)}
                              </p>
                            )}
                          </div>

                          {/* Plan count badge */}
                          <div className="shrink-0 flex flex-col items-end gap-1.5">
                            <span className="rounded-full border border-border/40 bg-secondary/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                              {customer.plans.length} plan{customer.plans.length !== 1 ? "s" : ""}
                            </span>
                            <div className="flex gap-1.5">
                              {activeCount > 0 && (
                                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[11px] font-medium text-primary">
                                  {activeCount} active
                                </span>
                              )}
                              {completedCount > 0 && (
                                <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[11px] font-medium text-blue-400">
                                  {completedCount} done
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>

        </main>
      </div>
    </div>
  );
}
