import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LayoutDashboard, LogOut, Settings, ExternalLink, UserCheck, CreditCard, Building2, FileText, Plus, TrendingUp, Clock, CheckCircle2, MessageSquare, Eye } from "lucide-react";
import { Layout } from "@/components/Layout";
import { BusinessSetupForm } from "@/components/business-setup-form";
import { CreatePlanForm } from "@/components/forms/create-plan-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { staggerContainer, staggerItem, smooth } from "@/lib/motion";

type Business = { id: string; name: string };
type PlanRow = { id: string; total_amount: number; status: string; customer_id: string; payment_method?: string; customers: { phone?: string; email?: string } | null };

const statusStyles: Record<string, { color: string; icon: typeof Clock }> = {
  pending_mandate: { color: "text-amber-400 bg-amber-400/10", icon: Clock },
  active: { color: "text-primary bg-primary/10", icon: TrendingUp },
  completed: { color: "text-blue-400 bg-blue-400/10", icon: CheckCircle2 },
  defaulted: { color: "text-destructive bg-destructive/10", icon: Clock },
};

export function DashboardPage() {
  const [business, setBusiness] = useState<Business | null | undefined>(undefined);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [bRes, pRes] = await Promise.all([apiFetch("/api/business/me"), apiFetch("/api/plans")]);
      if (cancelled) return;
      if (bRes.ok) { const b = (await bRes.json()) as { business: Business | null }; setBusiness(b.business); } else { setBusiness(null); }
      if (pRes.ok) { const p = (await pRes.json()) as { plans: PlanRow[] }; setPlans(p.plans ?? []); }
    })();
    return () => { cancelled = true; };
  }, []);

  async function signOut() { await apiFetch("/api/auth/logout", { method: "POST" }); window.location.href = "/"; }

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
            {business && <Button variant="outline" size="sm" asChild><Link to="/dashboard/disputes"><MessageSquare className="h-4 w-4" />Disputes</Link></Button>}
            {business && <Button variant="outline" size="sm" asChild><Link to="/settings/business"><Settings className="h-4 w-4" />Settings</Link></Button>}
            <Button variant="ghost" size="sm" onClick={() => void signOut()} className="text-muted-foreground"><LogOut className="h-4 w-4" />Sign out</Button>
          </div>
        </motion.header>

        {!business ? (
          <motion.div variants={staggerItem} transition={smooth}>
            <Card>
              <CardHeader>
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><Building2 className="h-6 w-6 text-primary" /></div>
                <CardTitle className="text-xl">Set up your business</CardTitle>
                <CardDescription>One profile per account. This name appears on customer communications.</CardDescription>
              </CardHeader>
              <CardContent><BusinessSetupForm /></CardContent>
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
                <CardContent>
                  {!plans.length ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/40 py-12 text-center">
                      <FileText className="mb-3 h-8 w-8 text-muted-foreground/20" />
                      <p className="text-sm text-muted-foreground">No plans yet</p>
                      <p className="mt-1 text-xs text-muted-foreground/50">Create your first plan above</p>
                    </div>
                  ) : (
                    <motion.ul initial="hidden" animate="visible" variants={staggerContainer} className="space-y-3">
                      {plans.map((p) => {
                        const st = statusStyles[p.status] ?? statusStyles.pending_mandate;
                        const Icon = st.icon;
                        return (
                          <motion.li key={p.id} variants={staggerItem} transition={smooth} whileHover={{ scale: 1.005 }}
                            className="flex flex-col gap-4 rounded-xl border border-border/40 bg-card/30 p-5 transition-all hover:border-border/60 hover:bg-card/50 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1.5">
                              <p className="truncate font-semibold text-foreground">
                                {p.customers?.email ?? p.customers?.phone ?? "Unknown customer"}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-lg font-bold tabular-nums">&#8358;{Number(p.total_amount).toLocaleString("en-NG")}</p>
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${st.color}`}>
                                  <Icon className="h-3 w-3" />{p.status.replace(/_/g, " ")}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {p.customers?.phone && <span>{p.customers.phone}</span>}
                                <span className="flex items-center gap-1"><CreditCard className="h-3.5 w-3.5" /> Paystack</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                              <Button size="sm" asChild><Link to={`/dashboard/plan/${p.id}`}><Eye className="h-3.5 w-3.5" />View details</Link></Button>
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" asChild><Link to={`/plan/${p.id}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />Mandate</Link></Button>
                                <Button size="sm" variant="outline" asChild><Link to={`/portal/claim?customerId=${p.customer_id}`} target="_blank" rel="noreferrer"><UserCheck className="h-3.5 w-3.5" />Claim</Link></Button>
                              </div>
                            </div>
                          </motion.li>
                        );
                      })}
                    </motion.ul>
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
