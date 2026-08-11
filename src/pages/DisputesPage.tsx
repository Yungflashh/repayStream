import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageSquare, Send, Loader2, CheckCircle2,
  Clock, AlertCircle, XCircle, Menu, X,
  FileText, TrendingUp, Users, Settings, LogOut, Sun, Moon,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { apiFetch, clearToken } from "@/lib/api";
import { BackButton } from "@/components/BackButton";
import { NotificationsPanel } from "@/components/NotificationsPanel";
import mainLogo from "@/assets/main_logo.png";

// ── Types ─────────────────────────────────────────────────────────────────────

type Thread = {
  id: string;
  subject: string;
  status: string;
  category: string;
  created_at: string;
  customer_name?: string;
  customer_email?: string;
};
type Message = { id: string; sender_type: string; body: string; created_at: string };
type ThreadDetail = {
  subject: string;
  status: string;
  category: string;
  customer_name?: string;
  customer_email?: string;
};

// ── Status config ─────────────────────────────────────────────────────────────

const statusMeta: Record<string, {
  icon: typeof AlertCircle;
  color: string;
  bg: string;
  border: string;
  label: string;
}> = {
  open:        { icon: AlertCircle,  color: "text-amber-400",       bg: "bg-amber-400/10",   border: "border-amber-400/25",   label: "Open" },
  in_progress: { icon: Clock,        color: "text-blue-400",         bg: "bg-blue-400/10",    border: "border-blue-400/25",    label: "In progress" },
  resolved:    { icon: CheckCircle2, color: "text-primary",          bg: "bg-primary/10",     border: "border-primary/20",     label: "Resolved" },
  closed:      { icon: XCircle,      color: "text-muted-foreground", bg: "bg-secondary/30",   border: "border-border/30",      label: "Closed" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

// ── Sidebar logo ──────────────────────────────────────────────────────────────

function SidebarLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden">
        <img
          src={mainLogo}
          alt="RepayStream"
          className="h-full w-full object-contain"
          style={{ transform: "scale(2)" }}
        />
      </div>
      <span
        className="text-sm font-bold tracking-tight"
        style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
      >
        RepayStream
      </span>
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta[status] ?? statusMeta.open;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.border} ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// ── Category chip ─────────────────────────────────────────────────────────────

function CategoryChip({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/30 bg-secondary/30 px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
      {category.replace(/_/g, " ")}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DisputesPage() {
  const { theme, toggle } = useTheme();
  const [threads,        setThreads]        = useState<Thread[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeId,       setActiveId]       = useState<string | null>(null);
  const [messages,       setMessages]       = useState<Message[]>([]);
  const [threadDetail,   setThreadDetail]   = useState<ThreadDetail | null>(null);
  const [messagesLoading,setMessagesLoading]= useState(false);
  const [newMsg,         setNewMsg]         = useState("");
  const [sending,        setSending]        = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [sidebarOpen,    setSidebarOpen]    = useState(false);

  // Inline resolution form
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [resolveNote,     setResolveNote]     = useState("");
  const [resolvingNote,   setResolvingNote]   = useState(false);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { void loadThreads(); }, []);

  async function loadThreads() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/disputes");
      if (res.ok) {
        const data = (await res.json()) as { threads: Thread[] };
        setThreads(data.threads);
      }
    } finally {
      setLoading(false);
    }
  }

  async function openThread(threadId: string) {
    setActiveId(threadId);
    setMessages([]);
    setThreadDetail(null);
    setShowResolveForm(false);
    setResolveNote("");
    setMessagesLoading(true);
    setSidebarOpen(false);
    try {
      const res = await apiFetch(`/api/disputes/${threadId}/messages`);
      if (res.ok) {
        const data = (await res.json()) as { thread: ThreadDetail; messages: Message[] };
        setMessages(data.messages);
        setThreadDetail(data.thread);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } finally {
      setMessagesLoading(false);
    }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeId) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/disputes/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newMsg.trim() }),
      });
      if (res.ok) {
        const data = (await res.json()) as { message: Message };
        setMessages((m) => [...m, data.message]);
        setNewMsg("");
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: string, resolutionNote?: string) {
    if (!activeId) return;
    setUpdatingStatus(true);
    try {
      const body: Record<string, string> = { status };
      if (resolutionNote) body.resolutionNote = resolutionNote;
      const res = await apiFetch(`/api/disputes/${activeId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setThreadDetail((t) => (t ? { ...t, status } : t));
        setThreads((ts) => ts.map((t) => (t.id === activeId ? { ...t, status } : t)));
        setShowResolveForm(false);
        setResolveNote("");
      }
    } finally {
      setUpdatingStatus(false);
      setResolvingNote(false);
    }
  }

  async function handleConfirmResolve() {
    setResolvingNote(true);
    await updateStatus("resolved", resolveNote.trim() || undefined);
  }

  const activeThread = threads.find((t) => t.id === activeId);
  const currentStatus = threadDetail?.status ?? activeThread?.status ?? "open";
  const isOpen = currentStatus === "open" || currentStatus === "in_progress";
  const isClosed = currentStatus === "closed";
  const isResolved = currentStatus === "resolved";

  // ── Sidebar content ────────────────────────────────────────────────────────

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 px-4">
        <SidebarLogo />
        <button
          onClick={() => setSidebarOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 border-b border-border/40 p-2">
        <Link to="/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
          <FileText className="h-3.5 w-3.5 shrink-0" />Plans
        </Link>
        <Link to="/dashboard/analytics" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
          <TrendingUp className="h-3.5 w-3.5 shrink-0" />Analytics
        </Link>
        <Link to="/dashboard/customers" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
          <Users className="h-3.5 w-3.5 shrink-0" />Customers
        </Link>
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium bg-secondary/50 text-foreground">
          <MessageSquare className="h-3.5 w-3.5 shrink-0 text-primary" />Disputes
        </div>
        <Link to="/settings/business" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground">
          <Settings className="h-3.5 w-3.5 shrink-0" />Settings
        </Link>
      </nav>

      {/* Thread count header */}
      <div className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/10">
            <MessageSquare className="h-3 w-3 text-amber-400" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Customer disputes
          </p>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <MessageSquare className="mb-2 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm text-muted-foreground">No disputes yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">Customer disputes will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-border/20">
            {threads.map((t) => {
              const meta = statusMeta[t.status] ?? statusMeta.open;
              const isActive = t.id === activeId;
              return (
                <button
                  key={t.id}
                  onClick={() => void openThread(t.id)}
                  className={`group flex w-full flex-col gap-1.5 px-4 py-3.5 text-left transition-colors hover:bg-secondary/30 ${
                    isActive ? "border-l-2 border-primary bg-primary/10" : "border-l-2 border-transparent"
                  }`}
                >
                  {/* Customer name */}
                  {t.customer_name && (
                    <p className="text-xs font-semibold text-foreground">{t.customer_name}</p>
                  )}
                  {/* Subject */}
                  <p className="truncate text-sm font-medium text-foreground leading-snug">{t.subject}</p>
                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <StatusBadge status={t.status} />
                    <CategoryChip category={t.category} />
                  </div>
                  {/* Date */}
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">{fmt(t.created_at)}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Sign out */}
      <div className="shrink-0 border-t border-border/40 p-2">
        {/* Theme toggle */}
        <button
          onClick={toggle}
          className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <div className="flex items-center gap-2.5">
            {theme === "dark" ? <Moon className="h-3.5 w-3.5 shrink-0" /> : <Sun className="h-3.5 w-3.5 shrink-0" />}
            <span>{theme === "dark" ? "Dark" : "Light"}</span>
          </div>
          <div className={`relative h-4.5 w-8 rounded-full transition-colors ${theme === "dark" ? "bg-primary" : "bg-border"}`}>
            <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-background shadow transition-transform ${theme === "dark" ? "translate-x-3.5" : "translate-x-0.5"}`} />
          </div>
        </button>
        <button
          onClick={() => { void apiFetch("/api/auth/logout", { method: "POST" }).then(() => { clearToken(); window.location.href = "/"; }); }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />Sign out
        </button>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-dvh bg-background">

      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/60 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 shrink-0 border-r border-border/40 bg-card transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/40 bg-card/50 px-4 backdrop-blur-xl lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/50"
          >
            <Menu className="h-4 w-4" />
          </button>
          <span className="flex-1 truncate text-sm font-semibold text-foreground">
            {activeId && threadDetail ? threadDetail.subject : "Customer disputes"}
          </span>
          <NotificationsPanel panelPosition="right" />
          <BackButton to="/dashboard" label="" className="!px-2" />
        </header>

        {/* Content area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {!activeId ? (
            /* Empty state */
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-dashed border-border/50 bg-secondary/20">
                <MessageSquare className="h-6 w-6 text-muted-foreground/30" />
              </div>
              <p className="font-medium text-muted-foreground">Select a dispute to view the conversation</p>
              <p className="text-sm text-muted-foreground/60">
                {threads.length > 0
                  ? `${threads.length} thread${threads.length !== 1 ? "s" : ""} in the sidebar`
                  : "No disputes yet"}
              </p>
            </div>
          ) : (
            /* Thread detail */
            <div className="flex flex-1 flex-col overflow-hidden">

              {/* Sticky header */}
              <div className="shrink-0 border-b border-border/40 bg-card/50 px-5 py-4 backdrop-blur-xl">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Mobile back */}
                  <button
                    onClick={() => { setActiveId(null); setThreadDetail(null); }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>

                  {/* Subject */}
                  <div className="min-w-0 flex-1">
                    <h2
                      className="truncate text-lg font-bold text-foreground"
                      style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                    >
                      {threadDetail?.subject ?? activeThread?.subject ?? "Dispute"}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={currentStatus} />
                      <CategoryChip category={threadDetail?.category ?? activeThread?.category ?? ""} />
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {isOpen && !showResolveForm && (
                      <button
                        onClick={() => setShowResolveForm(true)}
                        disabled={updatingStatus}
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition-opacity hover:bg-primary/20 disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark resolved
                      </button>
                    )}
                    {isResolved && (
                      <button
                        onClick={() => void updateStatus("closed")}
                        disabled={updatingStatus}
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-border/40 bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground disabled:opacity-50"
                      >
                        {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                        Close thread
                      </button>
                    )}
                    {(isResolved || isClosed) && (
                      <button
                        onClick={() => void updateStatus("in_progress")}
                        disabled={updatingStatus}
                        className="flex h-8 items-center gap-1.5 rounded-xl border border-blue-400/30 bg-blue-400/10 px-3 text-xs font-semibold text-blue-400 transition-opacity hover:bg-blue-400/20 disabled:opacity-50"
                      >
                        {updatingStatus ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        Re-open
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline resolve form */}
                <AnimatePresence>
                  {showResolveForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                        <p className="mb-2 text-sm font-medium text-foreground">Resolution note (optional)</p>
                        <textarea
                          rows={2}
                          maxLength={500}
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          placeholder="Add an optional note for the customer…"
                          className="w-full resize-none rounded-xl border border-border/40 bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                        />
                        <div className="mt-2.5 flex gap-2">
                          <button
                            onClick={() => void handleConfirmResolve()}
                            disabled={resolvingNote}
                            className="flex h-8 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                          >
                            {resolvingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                            Confirm resolution
                          </button>
                          <button
                            onClick={() => { setShowResolveForm(false); setResolveNote(""); }}
                            className="flex h-8 items-center rounded-xl border border-border/40 bg-card px-3 text-xs font-medium text-muted-foreground hover:bg-secondary/50"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Customer info strip */}
                {(threadDetail?.customer_name || threadDetail?.customer_email) && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/30 bg-secondary/20 px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">Customer</span>
                    {threadDetail.customer_name && (
                      <span className="text-xs font-medium text-foreground">{threadDetail.customer_name}</span>
                    )}
                    {threadDetail.customer_email && (
                      <span className="text-xs text-muted-foreground">{threadDetail.customer_email}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Message list */}
              <div className="flex-1 overflow-y-auto p-4">
                {messagesLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <AnimatePresence initial={false}>
                      {messages.map((m) => {
                        const isCustomer = m.sender_type === "customer";
                        const isBusiness = m.sender_type === "business";
                        const isSystem   = m.sender_type === "system";
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                            className={`flex ${isBusiness ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}
                          >
                            {isSystem ? (
                              <div className="max-w-[85%] rounded-full border border-border/20 bg-secondary/20 px-4 py-1.5">
                                <p className="text-center text-[11px] italic text-muted-foreground/60">{m.body}</p>
                              </div>
                            ) : (
                              <div className={`max-w-[72%] rounded-2xl px-4 py-3 ${
                                isBusiness
                                  ? "rounded-br-sm border border-primary/20 bg-primary/10"
                                  : "rounded-bl-sm border border-border/30 bg-secondary/30"
                              }`}>
                                <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-widest ${
                                  isBusiness ? "text-primary/60" : "text-muted-foreground"
                                }`}>
                                  {isBusiness ? "You" : (threadDetail?.customer_name ?? "Customer")}
                                </p>
                                <p className="text-sm leading-relaxed text-foreground">{m.body}</p>
                                <p className={`mt-1.5 text-[10px] text-muted-foreground/50 ${isBusiness ? "text-right" : ""}`}>
                                  {fmtTime(m.created_at)}
                                </p>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                    <div ref={bottomRef} />
                  </div>
                )}
              </div>

              {/* Message composer */}
              <div className="shrink-0 border-t border-border/40 bg-card/50 p-3">
                {isClosed ? (
                  <p className="py-2 text-center text-xs text-muted-foreground">
                    This thread is closed — no new replies can be sent.
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <textarea
                      ref={composerRef}
                      rows={3}
                      value={newMsg}
                      onChange={(e) => setNewMsg(e.target.value)}
                      placeholder="Type a response…"
                      className="flex-1 resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendMessage();
                        }
                      }}
                      disabled={isClosed}
                    />
                    <button
                      disabled={sending || !newMsg.trim() || isClosed}
                      onClick={() => void sendMessage()}
                      className="flex h-10 w-10 shrink-0 self-end items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {sending
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
