import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import mainLogo from "@/assets/main_logo.png";

type LayoutProps = {
  children: React.ReactNode;
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "5xl" | "6xl";
  centered?: boolean;
  hideNav?: boolean;
};

const widths = {
  sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl",
  "2xl": "max-w-2xl", "4xl": "max-w-4xl", "5xl": "max-w-5xl", "6xl": "max-w-6xl",
};

export function Layout({ children, showBack, backTo = "/", backLabel = "Back", maxWidth = "2xl", centered = false, hideNav = false }: LayoutProps) {
  const location = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {!hideNav && (
        <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
                <img src={mainLogo} alt="" className="h-full w-full object-contain" style={{ transform: 'scale(3)' }} />
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                <span className="hidden sm:inline">RepayStream Technologies Limited</span>
                <span className="sm:hidden">RepayStream</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={toggle} className="h-8 w-8 text-muted-foreground" aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {showBack && (
                <Button variant="ghost" size="sm" asChild className="gap-1.5 text-muted-foreground">
                  <Link to={backTo}><ArrowLeft className="h-4 w-4" />{backLabel}</Link>
                </Button>
              )}
            </div>
          </div>
        </nav>
      )}

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className={`mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 ${widths[maxWidth]} ${centered ? "items-center justify-center" : ""}`}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-border/30 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden">
                <img src={mainLogo} alt="" className="h-full w-full object-contain" style={{ transform: 'scale(3)' }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">RepayStream Technologies Limited</p>
                <p className="text-xs text-muted-foreground/60">RC 9344129 &middot; CBN Direct Debit Scheme</p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-1">
              {[
                { to: "/terms",          label: "Terms of Use" },
                { to: "/privacy",        label: "Privacy Policy" },
                { to: "/acceptable-use", label: "Acceptable Use" },
                { to: "/compliance",     label: "Compliance" },
                { to: "/contact",        label: "Contact Us" },
              ].map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="text-xs text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="mt-6 text-xs text-muted-foreground/50">
            &copy; 2026 RepayStream. RepayStream does not hold customer funds.
          </p>
        </div>
      </footer>
    </div>
  );
}
