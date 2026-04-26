import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { apiFetch } from "@/lib/api";

export function ProtectedRoute() {
  const location = useLocation();
  const [state, setState] = useState<"loading" | "ok" | "no">("loading");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await apiFetch("/api/auth/me");
      if (cancelled) return;
      setState(res.ok ? "ok" : "no");
    })();
    return () => { cancelled = true; };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <div className="h-1 w-20 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
              style={{ width: "50%" }}
            />
          </div>
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </motion.div>
      </div>
    );
  }

  if (state === "no") {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return <Outlet />;
}
