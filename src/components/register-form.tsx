import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, setToken } from "@/lib/api";

export function RegisterForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json()) as { error?: string; token?: string };
      if (!res.ok) throw new Error(data.error ?? "Registration failed");
      if (data.token) setToken(data.token);
      navigate(nextPath.startsWith("/") ? nextPath : "/dashboard", { replace: true });
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
        <Input id="reg-email" type="email" autoComplete="email" placeholder="you@business.ng" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
        <Input id="reg-password" type="password" autoComplete="new-password" minLength={8} placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {message && (
        <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {message}
        </motion.p>
      )}
      <Button type="submit" className="h-11 w-full" disabled={loading}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Creating account...</> : "Create account"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-primary hover:underline underline-offset-4">Sign in</Link>
      </p>
    </form>
  );
}
