import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X, Inbox, CheckCheck } from "lucide-react";
import { useNotifications, type Notification } from "@/lib/useNotifications";

function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

// Notifications bell + dropdown. Data is shared across all instances via
// useNotifications() so multiple bells on the page cost one poll cycle.
// `panelPosition` controls which edge of the bell the dropdown anchors to:
// "left" opens right (use for bells in a left sidebar), "right" opens left
// (use for bells in a top-right position).
export function NotificationsPanel({
  panelPosition = "right",
}: {
  panelPosition?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const { feed, markAllRead } = useNotifications();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function hrefFor(n: Notification): string | null {
    if (!n.plan_id) return null;
    if (feed?.is_business) return `/dashboard/plan/${n.plan_id}`;
    if (feed?.is_customer && feed.customer_id) return `/portal/${feed.customer_id}`;
    return null;
  }

  const unread = feed?.unread ?? 0;
  const notifications = feed?.notifications ?? [];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/40 bg-card text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 mt-2 w-[min(360px,90vw)] overflow-hidden rounded-2xl border border-border/40 bg-card shadow-xl ${panelPosition === "right" ? "right-0" : "left-0"}`}
          >
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Notifications</p>
              </div>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <button
                    onClick={() => void markAllRead()}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />Mark read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  aria-label="Close notifications"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[min(70vh,480px)] overflow-y-auto">
              {!feed ? (
                <div className="flex items-center justify-center px-4 py-10 text-sm text-muted-foreground">Loading…</div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-10 text-center">
                  <Inbox className="mb-2 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">You're all caught up</p>
                  <p className="mt-0.5 text-xs text-muted-foreground/60">New activity will show up here</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/30">
                  {notifications.map((n) => {
                    const href = hrefFor(n);
                    const inner = (
                      <div className="flex items-start gap-3 px-4 py-3 hover:bg-secondary/30">
                        <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-primary"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                          {n.body && <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>}
                          <p className="mt-1 text-[11px] text-muted-foreground/60">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    );
                    return (
                      <li key={n.id}>
                        {href ? (
                          <Link to={href} onClick={() => setOpen(false)}>{inner}</Link>
                        ) : inner}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
