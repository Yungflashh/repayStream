import { motion } from "framer-motion";
import { UserPlus } from "lucide-react";
import { Layout } from "@/components/Layout";
import { RegisterForm } from "@/components/register-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fadeInUp, smooth } from "@/lib/motion";

export function RegisterPage() {
  return (
    <Layout showBack maxWidth="md" centered>
      <motion.div initial="hidden" animate="visible" variants={fadeInUp} transition={smooth} className="w-full">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <UserPlus className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Get started with your business dashboard</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Register</CardTitle>
            <CardDescription>Register to set up your business dashboard. Customers register with the same form when they need portal access.</CardDescription>
          </CardHeader>
          <CardContent><RegisterForm /></CardContent>
        </Card>
      </motion.div>
    </Layout>
  );
}
