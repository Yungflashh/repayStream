import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Settings } from "lucide-react";
import { Layout } from "@/components/Layout";
import { BusinessSettingsForm } from "@/components/forms/business-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { fadeInUp, smooth } from "@/lib/motion";

export function BusinessSettingsPage() {
  const [business, setBusiness] = useState<{ id: string; name: string } | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await apiFetch("/api/business/me");
      if (cancelled) return;
      if (!res.ok) { setBusiness(null); return; }
      const data = (await res.json()) as { business: { id: string; name: string } | null };
      setBusiness(data.business);
    })();
    return () => { cancelled = true; };
  }, []);

  if (business === undefined) {
    return <Layout maxWidth="2xl" centered><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></Layout>;
  }
  if (!business) return <Navigate to="/dashboard" replace />;

  return (
    <Layout maxWidth="2xl" showBack backTo="/dashboard" backLabel="Dashboard">
      <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={smooth} className="flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><Settings className="h-5 w-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Business settings</h1>
            <p className="text-sm text-muted-foreground">This name appears on customer-facing flows.</p>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile</CardTitle>
            <CardDescription>Update your business display name. Changes apply to new plans immediately.</CardDescription>
          </CardHeader>
          <CardContent><BusinessSettingsForm initialName={business.name} /></CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}
