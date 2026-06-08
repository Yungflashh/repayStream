import { createContext, useCallback, useContext, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" shows red confirm button, "default" is primary */
  variant?: "destructive" | "default";
}

type ConfirmFn = (opts: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingConfirm {
  opts: ConfirmOptions;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((optsOrMessage) => {
    const opts: ConfirmOptions =
      typeof optsOrMessage === "string" ? { message: optsOrMessage } : optsOrMessage;

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setPending({ opts, resolve });
    });
  }, []);

  function respond(value: boolean) {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setPending(null);
  }

  const isDestructive = pending?.opts.variant === "destructive";
  const Icon = isDestructive ? AlertTriangle : Info;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      <AnimatePresence>
        {pending && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              onClick={() => respond(false)}
            />

            {/* Dialog */}
            <motion.div
              key="dialog"
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="fixed left-1/2 top-1/2 z-[201] w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-2xl shadow-black/20">
                {/* Icon + title */}
                <div className="flex items-start gap-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDestructive ? "bg-destructive/10" : "bg-primary/10"}`}>
                    <Icon className={`h-5 w-5 ${isDestructive ? "text-destructive" : "text-primary"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    {pending.opts.title && (
                      <p className="text-base font-semibold text-foreground">{pending.opts.title}</p>
                    )}
                    <p className={`text-sm text-muted-foreground ${pending.opts.title ? "mt-1" : ""}`}>
                      {pending.opts.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" size="sm" onClick={() => respond(false)}>
                    {pending.opts.cancelLabel ?? "Cancel"}
                  </Button>
                  <Button
                    variant={isDestructive ? "destructive" : "default"}
                    size="sm"
                    onClick={() => respond(true)}
                  >
                    {pending.opts.confirmLabel ?? "Confirm"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}
