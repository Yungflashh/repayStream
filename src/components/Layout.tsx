import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import mainLogo from "@/assets/main_logo.png";

type LayoutProps = {
  children: React.ReactNode;
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "6xl" | "full";
  centered?: boolean;
  hideNav?: boolean;
  /** Optional role badge shown next to logo — "business" | "customer" */
  role?: "business" | "customer";
};

const widths: Record<NonNullable<LayoutProps["maxWidth"]>, string> = {
  sm:   "max-w-sm",
  md:   "max-w-md",
  lg:   "max-w-lg",
  xl:   "max-w-xl",
  "2xl":"max-w-2xl",
  "3xl":"max-w-3xl",
  "4xl":"max-w-4xl",
  "5xl":"max-w-5xl",
  "6xl":"max-w-6xl",
  full: "max-w-full",
};

export function Layout({
  children,
  showBack,
  backTo = "/",
  backLabel = "Back",
  maxWidth = "2xl",
  centered = false,
  hideNav = false,
  role,
}: LayoutProps) {
  const location = useLocation();
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {!hideNav && (
        <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">

            {/* Left — logo + role badge */}
            <div className="flex items-center gap-2.5">
              <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-75">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
                  <img
                    src={mainLogo}
                    alt="RepayStream"
                    className="h-full w-full object-contain"
                    style={{ transform: "scale(2)" }}
                  />
                </div>
                <span
                  className="hidden text-sm font-bold tracking-tight text-foreground sm:inline"
                  style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                >
                  RepayStream
                </span>
              </Link>
              {role === "business" && (
                <span className="hidden rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary sm:inline">
                  Business
                </span>
              )}
              {role === "customer" && (
                <span className="hidden rounded-full border border-blue-400/30 bg-blue-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400 sm:inline">
                  Customer Portal
                </span>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              {/* Theme toggle */}
              <button
                onClick={toggle}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>

              {/* Back button — desktop */}
              {showBack && (
                <Link
                  to={backTo}
                  className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {backLabel}
                </Link>
              )}

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen((o) => !o)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Mobile dropdown */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-border/30 bg-background/95 sm:hidden"
              >
                <div className="flex flex-col gap-1 px-4 py-3">
                  {showBack && (
                    <Link
                      to={backTo}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {backLabel}
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                  <Link
                    to="/dashboard/disputes"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Disputes
                  </Link>
                  <Link
                    to="/settings/business"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Settings
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      )}

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className={`mx-auto flex w-full flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 ${widths[maxWidth]} ${centered ? "items-center justify-center" : ""}`}
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-border/40 bg-background">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden">
                <img src={mainLogo} alt="" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">RepayStream Technologies Limited</p>
                <p className="text-xs text-muted-foreground/60">RC 9344129 &middot; CBN Direct Debit Scheme</p>
              </div>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-1">
              {[
                { to: "/terms",          label: "Terms"         },
                { to: "/privacy",        label: "Privacy"       },
                { to: "/acceptable-use", label: "Acceptable Use"},
                { to: "/compliance",     label: "Compliance"    },
                { to: "/contact",        label: "Contact"       },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="text-xs text-muted-foreground/70 transition-colors hover:text-foreground">
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <p className="mt-6 text-xs text-muted-foreground/40">
            &copy; 2026 RepayStream. RepayStream does not hold customer funds.
          </p>
        </div>
      </footer>
    </div>
  );
}
