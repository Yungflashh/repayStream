import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, TrendingUp, Users, MessageSquare, Settings, LogOut, Sun, Moon, X } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { apiFetch, clearToken } from "@/lib/api";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import mainLogo from "@/assets/main_logo.png";

export type BusinessNavItem = "plans" | "analytics" | "customers" | "disputes" | "settings";

const NAV = [
  { key: "plans",     label: "Plans",     Icon: FileText,     to: "/dashboard" },
  { key: "analytics", label: "Analytics", Icon: TrendingUp,   to: "/dashboard/analytics" },
  { key: "customers", label: "Customers", Icon: Users,        to: "/dashboard/customers" },
  { key: "disputes",  label: "Disputes",  Icon: MessageSquare,to: "/dashboard/disputes" },
  { key: "settings",  label: "Settings",  Icon: Settings,     to: "/settings/business" },
] as const;

interface Props {
  active: BusinessNavItem;
  onClose?: () => void;
  /** Pre-loaded business name — if omitted, component fetches it */
  businessName?: string | null;
}

export function BusinessSidebar({ active, onClose, businessName: nameProp }: Props) {
  const { theme, toggle } = useTheme();
  const [name, setName] = useState<string | null>(nameProp ?? null);

  useEffect(() => {
    if (nameProp !== undefined) { setName(nameProp); return; }
    void apiFetch("/api/business/me").then(async (res) => {
      if (!res.ok) return;
      const d = (await res.json()) as { business: { name: string } | null };
      if (d.business) setName(d.business.name);
    });
  }, [nameProp]);

  async function signOut() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clearToken();
    window.location.href = "/";
  }

  return (
    <div className="flex h-full flex-col bg-card">

      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
            <img src={mainLogo} alt="RepayStream" className="h-full w-full object-contain" style={{ transform: "scale(2)" }} />
          </div>
          <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}>
            RepayStream
          </span>
        </div>
        {onClose && (
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground lg:hidden">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Business avatar */}
      {name && (
        <div className="flex items-center gap-3 border-b border-border/40 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm shadow-primary/25">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{name}</p>
            <p className="text-[11px] text-muted-foreground">Business account</p>
          </div>
          <NotificationsPanel panelPosition="left" />
        </div>
      )}

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {NAV.map(({ key, label, Icon, to }) =>
          key === active ? (
            <div key={key} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium bg-secondary/50 text-foreground">
              <Icon className="h-4 w-4 shrink-0 text-primary" />{label}
            </div>
          ) : (
            <Link key={key} to={to} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
              <Icon className="h-4 w-4 shrink-0" />{label}
            </Link>
          )
        )}
      </nav>

      {/* Bottom: theme toggle + sign out */}
      <div className="shrink-0 border-t border-border/40 p-3 space-y-1">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <div className="flex items-center gap-3">
            {theme === "dark"
              ? <Moon className="h-4 w-4 shrink-0" />
              : <Sun className="h-4 w-4 shrink-0" />}
            <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>
          </div>
          <div className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-primary" : "bg-border"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform duration-200 ${theme === "dark" ? "translate-x-4" : "translate-x-0.5"}`} />
          </div>
        </button>

        {/* Sign out */}
        <button
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />Sign out
        </button>
      </div>
    </div>
  );
}
