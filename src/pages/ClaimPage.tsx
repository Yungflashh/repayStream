import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { LinkIcon, AlertCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ClaimForm } from "@/components/claim-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInUp, smooth } from "@/lib/motion";

export function ClaimPage() {
  const [searchParams] = useSearchParams();
  const customerId = searchParams.get("customerId") ?? "";

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
            <CardDescription>We match your sign-in email to the repayment profile your business created.</CardDescription>
          </CardHeader>
          <CardContent><ClaimForm customerId={customerId} /></CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}
