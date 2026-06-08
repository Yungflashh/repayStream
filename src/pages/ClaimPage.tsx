import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LinkIcon, AlertCircle, Mail } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ClaimForm } from "@/components/claim-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInUp, smooth } from "@/lib/motion";
import { apiFetch } from "@/lib/api";

export function ClaimPage() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customerId") ?? "";
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await apiFetch("/api/auth/me");
      if (res.ok) {
        const data = (await res.json()) as { user: { email: string } };
        setUserEmail(data.user.email);
      }
    })();
  }, []);

  if (!customerId) {
    return (
      <Layout maxWidth="md" centered>
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={smooth} className="w-full">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/10">
                <AlertCircle className="h-7 w-7 text-amber-400" />
              </div>
              <CardTitle>Missing link</CardTitle>
              <CardDescription>Open the claim URL your provider sent, or ask them to resend it.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center"><Button asChild variant="outline"><Link to="/">Go home</Link></Button></CardContent>
          </Card>
        </motion.div>
      </Layout>
    );
  }

  return (
    <Layout maxWidth="md" centered>
      <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={smooth} className="w-full">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10"><LinkIcon className="h-7 w-7 text-primary" /></div>
          <h1 className="text-2xl font-bold tracking-tight">Link your portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">Connect your account to view your repayment plans</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Confirm your identity</CardTitle>
            <CardDescription>
              We match your sign-in email to the repayment profile your business created.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {userEmail && (
              <div className="flex items-center gap-3 rounded-xl border border-border/30 bg-secondary/20 px-4 py-3">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="truncate text-sm font-medium">{userEmail}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground/70">
              Make sure this email matches what the business used when creating your plan. If it doesn't, sign out and sign in with the correct account.
            </p>
            <ClaimForm customerId={customerId} />
          </CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}
