import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { KeyRound } from "lucide-react";
import { Layout } from "@/components/Layout";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInUp, smooth } from "@/lib/motion";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const err = searchParams.get("error");

  return (
    <Layout showBack maxWidth="md" centered>
      <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={smooth} className="w-full">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account to continue</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Email and password. Customers and businesses use the same sign-in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {err === "unauthorized" && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                You don&apos;t have access to that customer portal. Sign in with the account that matches the customer email on file.
              </motion.div>
            )}
            <LoginForm />
          </CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}
