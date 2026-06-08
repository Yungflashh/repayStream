import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, { bar: string; icon: string; bg: string; border: string }> = {
  success: { bar: "bg-primary", icon: "text-primary", bg: "bg-card", border: "border-primary/20" },
  error:   { bar: "bg-destructive", icon: "text-destructive", bg: "bg-card", border: "border-destructive/20" },
  warning: { bar: "bg-amber-400", icon: "text-amber-400", bg: "bg-card", border: "border-amber-400/20" },
  info:    { bar: "bg-blue-400", icon: "text-blue-400", bg: "bg-card", border: "border-blue-400/20" },
};

let _counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = `toast-${++_counter}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error   = useCallback((m: string) => toast(m, "error"),   [toast]);
  const warning = useCallback((m: string) => toast(m, "warning"), [toast]);
  const info    = useCallback((m: string) => toast(m, "info"),    [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}

      {/* Renderer — fixed bottom-right */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))]">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const s = styles[t.type];
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className={`relative overflow-hidden rounded-xl border ${s.border} ${s.bg} shadow-lg shadow-black/10`}
              >
                {/* Accent bar */}
                <div className={`absolute left-0 top-0 h-full w-1 ${s.bar}`} />

                <div className="flex items-start gap-3 px-4 py-3 pl-5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${s.icon}`} />
                  <p className="flex-1 text-sm font-medium text-foreground leading-snug">{t.message}</p>
                  <button
                    onClick={() => dismiss(t.id)}
                    className="ml-1 shrink-0 rounded-md p-0.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <motion.div
                  className={`absolute bottom-0 left-0 h-0.5 ${s.bar} opacity-40`}
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 4.5, ease: "linear" }}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
