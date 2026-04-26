import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export function ClaimForm({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClaim() {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch("/api/customer/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customerId }) });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      navigate(`/customer/${customerId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {error && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</motion.p>}
      <Button className="h-11 w-full" disabled={loading} onClick={() => void onClaim()}>
        {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Linking...</> : "Confirm and open my portal"}
      </Button>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
        <Shield className="h-3.5 w-3.5" /><span>Mandate protected by CBN Direct Debit Scheme</span>
      </div>
    </div>
  );
}
