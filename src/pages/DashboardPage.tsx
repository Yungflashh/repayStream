import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, LogOut, Settings, ExternalLink, UserCheck, CreditCard, Building2, FileText, Plus, TrendingUp, Clock, CheckCircle2, MessageSquare, Eye, Search, Tag, X, Wallet } from "lucide-react";
import { Layout } from "@/components/Layout";
import { BusinessSetupForm } from "@/components/business-setup-form";
import { CreatePlanForm } from "@/components/forms/create-plan-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

const statusStyles: Record<string, { color: string; icon: typeof Clock }> = {
  pending_mandate: { color: "text-amber-400 bg-amber-400/10", icon: Clock },
  active: { color: "text-primary bg-primary/10", icon: TrendingUp },
  completed: { color: "text-blue-400 bg-blue-400/10", icon: CheckCircle2 },
  defaulted: { color: "text-destructive bg-destructive/10", icon: Clock },
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

  async function signOut() { await apiFetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }

  const allGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const p of plans) { if (p.group) groups.add(p.group); }
    return [...groups].sort();
  }, [plans]);

  const filtered = useMemo(() => {
    let result = plans;
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
  }, [plans, search, groupFilter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  if (business === undefined) {
    return <Layout maxWidth="4xl"><div className="flex flex-1 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div></Layout>;
  }

  return (
    <Layout maxWidth="4xl">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-8">
        {/* Header */}
        <motion.header variants={staggerItem} transition={smooth} className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <LayoutDashboard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your repayment plans</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {business && myCustomer && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/customer/${myCustomer.id}`}><Wallet className="h-4 w-4" />My portal</Link>
              </Button>
            )}
            {business && <Button variant="outline" size="sm" asChild><Link to="/dashboard/disputes"><MessageSquare className="h-4 w-4" />Disputes</Link></Button>}
            {business && <Button variant="outline" size="sm" asChild><Link to="/settings/business"><Settings className="h-4 w-4" />Settings</Link></Button>}
            <Button variant="ghost" size="sm" onClick={() => void signOut()} className="text-muted-foreground"><LogOut className="h-4 w-4" />Sign out</Button>
          </div>
        </motion.header>

        {!business ? (
          <motion.div variants={staggerItem} transition={smooth} className="flex flex-col gap-4">
            {/* Customer portal shortcut — shown when this account has a claimed portal */}
            {myCustomer && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Wallet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Your repayment portal</p>
                      <p className="text-sm text-muted-foreground">View your schedules, payment history, and raise disputes.</p>
                    </div>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link to={`/customer/${myCustomer.id}`}>Open my portal</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Business setup */}
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
                <CardTitle className="text-xl">Set up your business</CardTitle>
                <CardDescription>
                  {myCustomer
                    ? "You can also run a business. Set up your profile to start creating repayment plans."
                    : "One profile per account. This name appears on customer communications."}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <>
            {/* Stats */}
            <motion.div variants={staggerItem} transition={smooth} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Business", value: business.name },
                { label: "Total plans", value: plans.length },
                { label: "Pending", value: plans.filter((p) => p.status === "pending_mandate").length },
                { label: "Active", value: plans.filter((p) => p.status === "active").length },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-border/40 bg-card/50 p-4">
                  <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                  <p className="mt-1 truncate text-xl font-bold">{s.value}</p>
                </div>
              ))}
            </motion.div>

            {/* Create plan modal */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <motion.div variants={staggerItem} transition={smooth}>
                <Button variant="accent" size="lg" onClick={() => setShowCreate(true)} className="w-full gap-3 py-6 text-base">
                  <Plus className="h-5 w-5" />
                  Create a plan
                </Button>
              </motion.div>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10"><Plus className="h-4 w-4 text-accent" /></div>
                    Create a plan
                  </DialogTitle>
                  <DialogDescription>Set up a new repayment schedule for your customer</DialogDescription>
                </DialogHeader>
                <CreatePlanForm />
              </DialogContent>
            </Dialog>

            {/* Plans list */}
            <motion.div variants={staggerItem} transition={smooth}>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
                    <div>
                      <CardTitle className="text-lg">Your plans</CardTitle>
                      <CardDescription>Share mandate links with customers to start collection</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Search + group filter */}
                  {plans.length > 0 && (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search by name, customer, or group..."
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          className="h-10 pl-9 pr-9"
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
                      {allGroups.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {allGroups.map((g) => (
                            <button
                              key={g}
                              onClick={() => setGroupFilter(groupFilter === g ? null : g)}
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                groupFilter === g
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border hover:text-foreground"
                              }`}
                            >
                              <Tag className="h-3 w-3" />
                              {g}
                              {groupFilter === g && <X className="h-3 w-3" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!plans.length ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-12 text-center">
                      <FileText className="mb-3 h-8 w-8 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">No plans yet</p>
                      <p className="mt-1 text-xs text-muted-foreground/50">Create your first plan above</p>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-8 text-center">
                      <Search className="mb-3 h-7 w-7 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">No plans match your search</p>
                      <button
                        onClick={() => { setSearch(""); setGroupFilter(null); }}
                        className="mt-1 text-xs text-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {grouped.map(({ label, plans: groupPlans }) => (
                        <div key={label}>
                          <div className="mb-3 flex items-center gap-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
                            <div className="h-px flex-1 bg-border/30" />
                            <span className="text-xs text-muted-foreground/60">{groupPlans.length}</span>
                          </div>
                          <motion.ul initial="hidden" animate="visible" variants={staggerContainer} className="space-y-3">
                            {groupPlans.map((p) => {
                              const st = statusStyles[p.status] ?? statusStyles.pending_mandate;
                              const Icon = st.icon;
                              const customerDisplay = p.customers?.name ?? p.customers?.email ?? p.customers?.phone ?? "Unknown customer";
                              return (
                                <motion.li key={p.id} variants={staggerItem} transition={smooth} whileHover={{ scale: 1.005 }}
                                  className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card/30 p-4 transition-all hover:border-border/60 hover:bg-card/50 sm:p-5">
                                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                                    {/* Plan info */}
                                    <div className="min-w-0 space-y-1.5">
                                      <p className="truncate font-bold text-foreground text-base">{customerDisplay}</p>
                                      <p className={`truncate text-sm ${p.plan_name ? "font-medium text-foreground" : "italic text-muted-foreground/40"}`}>
                                        {p.plan_name ?? "No plan name"}
                                      </p>
                                      {p.group && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-secondary/30 px-2 py-0.5 text-xs text-muted-foreground">
                                          <Tag className="h-3 w-3" />{p.group}
                                        </span>
                                      )}
                                      <div className="flex items-center gap-1.5">
                                        <Building2 className="h-3.5 w-3.5 shrink-0 text-accent" />
                                        <p className="text-sm font-medium text-accent">{business.name}</p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-lg font-bold tabular-nums">&#8358;{Number(p.total_amount).toLocaleString("en-NG")}</p>
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
                                          <Icon className="h-3 w-3" />{p.status.replace(/_/g, " ")}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                        {p.customers?.phone && <span>{p.customers.phone}</span>}
                                        {p.customers?.email && <span className="hidden sm:inline">{p.customers.email}</span>}
                                        {p.created_at && <span>{formatDate(p.created_at)}</span>}
                                        <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Paystack</span>
                                      </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                                      <Button size="sm" className="w-full sm:w-auto" asChild>
                                        <Link to={`/dashboard/plan/${p.id}`}><Eye className="h-3.5 w-3.5" />View details</Link>
                                      </Button>
                                      <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none" asChild>
                                          <Link to={`/plan/${p.id}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />Mandate</Link>
                                        </Button>
                                        <Button size="sm" variant="outline" className="flex-1 sm:flex-none" asChild>
                                          <Link to={`/portal/claim?customerId=${p.customer_id}`} target="_blank" rel="noreferrer"><UserCheck className="h-3.5 w-3.5" />Claim</Link>
                                        </Button>
                                      </div>
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
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </motion.div>
    </Layout>
  );
}
