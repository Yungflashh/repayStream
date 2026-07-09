import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Loader2, Plus, ArrowLeft,
  CheckCircle2, Clock, AlertCircle, XCircle, X,
} from "lucide-react";
import { apiFetch } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

type Thread = {
  id: string;
  subject: string;
  status: string;
  category: string;
  plan_name?: string | null;
  created_at: string;
};
type Message = { id: string; sender_type: string; body: string; created_at: string };

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_META: Record<string, {
  icon: typeof CheckCircle2;
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  open:        { icon: AlertCircle,  label: "Open",        color: "text-amber-500", bg: "bg-amber-400/10",  border: "border-amber-400/25" },
  in_progress: { icon: Clock,        label: "In progress", color: "text-blue-400",  bg: "bg-blue-400/10",   border: "border-blue-400/25" },
  resolved:    { icon: CheckCircle2, label: "Resolved",    color: "text-primary",   bg: "bg-primary/10",    border: "border-primary/20" },
  closed:      { icon: XCircle,      label: "Closed",      color: "text-muted-foreground", bg: "bg-secondary/30", border: "border-border/30" },
};

const CATEGORIES = [
  { value: "general",            label: "General" },
  { value: "payment_issue",      label: "Payment Issue" },
  { value: "wrong_amount",       label: "Wrong Amount" },
  { value: "unauthorized_debit", label: "Unauthorized Debit" },
  { value: "refund_request",     label: "Refund Request" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.open;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.bg} ${meta.border} ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

function CategoryChip({ category }: { category: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/30 bg-secondary/30 px-2 py-0.5 text-[11px] text-muted-foreground capitalize">
      {category.replace(/_/g, " ")}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DisputeChat({
  customerId,
  plans,
}: {
  customerId: string;
  plans: { id: string; plan_name?: string | null; total_amount: number }[];
}) {
  const [threads,     setThreads]     = useState<Thread[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [newMsg,      setNewMsg]      = useState("");
  const [sending,     setSending]     = useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [creating,    setCreating]    = useState(false);

  // Create form fields
  const [newSubject,  setNewSubject]  = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPlanId,   setNewPlanId]   = useState(plans[0]?.id ?? "");
  const [newMessage,  setNewMessage]  = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

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
    const t = threads.find((x) => x.id === threadId) ?? null;
    setActiveId(threadId);
    setActiveThread(t);
    setMessages([]);
    setMsgsLoading(true);
    try {
      const res = await apiFetch(`/api/disputes/${threadId}/messages`);
      if (res.ok) {
        const data = (await res.json()) as {
          thread?: Thread;
          messages: Message[];
        };
        setMessages(data.messages);
        if (data.thread) setActiveThread(data.thread);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } finally {
      setMsgsLoading(false);
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
        // Re-fetch thread status in case it was re-opened
        void loadThreads();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } finally {
      setSending(false);
    }
  }

  async function createThread() {
    if (!newSubject.trim() || !newMessage.trim() || !newPlanId) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: newPlanId,
          subject: newSubject,
          category: newCategory,
          message: newMessage,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { thread: { id: string } };
        setShowCreate(false);
        setNewSubject(""); setNewMessage(""); setNewCategory("general");
        await loadThreads();
        void openThread(data.thread.id);
      }
    } finally {
      setCreating(false);
    }
  }

  const currentStatus = activeThread?.status ?? "open";
  const isClosed   = currentStatus === "closed";
  const isResolved = currentStatus === "resolved";
  const isThreadDone = isClosed || isResolved;
  const canSend = !isClosed; // resolved threads: sending will re-open per backend

  // ── Thread list view ─────────────────────────────────────────────────────

  if (!activeId) {
    return (
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/20">
              <MessageSquare className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Disputes & Messages</p>
              <p className="text-xs text-muted-foreground">Report issues or communicate with the business</p>
            </div>
          </div>

          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              New dispute
            </button>
          )}
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-border/40 bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Open a dispute</h3>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {/* Subject */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Subject</label>
                    <input
                      type="text"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      placeholder="Brief description of the issue"
                      className="flex h-10 w-full rounded-xl border border-border/40 bg-secondary/20 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Category */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Category</label>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="flex h-10 w-full rounded-xl border border-border/40 bg-secondary/20 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Plan */}
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Plan</label>
                      <select
                        value={newPlanId}
                        onChange={(e) => setNewPlanId(e.target.value)}
                        className="flex h-10 w-full rounded-xl border border-border/40 bg-secondary/20 px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.plan_name ?? `Plan …${p.id.slice(-6)}`} — ₦{p.total_amount.toLocaleString("en-NG")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Message</label>
                    <textarea
                      rows={4}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Describe your issue in detail…"
                      className="flex w-full resize-none rounded-xl border border-border/40 bg-secondary/20 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </div>

                  {/* Submit */}
                  <button
                    disabled={creating || !newSubject.trim() || !newMessage.trim() || !newPlanId}
                    onClick={() => void createThread()}
                    className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit dispute"}
                  </button>

                  <button
                    onClick={() => setShowCreate(false)}
                    className="text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thread list */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 && !showCreate ? (
          <div className="flex flex-col items-center py-12 text-center">
            <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/20" />
            <p className="text-sm font-medium text-muted-foreground">No disputes yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground/60">Open a dispute to get help from the business</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {threads.map((t) => {
              const meta = STATUS_META[t.status] ?? STATUS_META.open;
              return (
                <motion.button
                  key={t.id}
                  whileHover={{ x: 2 }}
                  onClick={() => void openThread(t.id)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border/40 bg-secondary/10 p-4 text-left transition-colors hover:bg-secondary/20"
                >
                  <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${meta.bg} ${meta.border}`}>
                    <meta.icon className={`h-4 w-4 ${meta.color}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{t.subject}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={t.status} />
                      <CategoryChip category={t.category} />
                      {t.plan_name && (
                        <span className="text-[11px] text-muted-foreground/60">· {t.plan_name}</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Chat view ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* Chat header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setActiveId(null); setActiveThread(null); }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/40 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-base font-bold text-foreground"
            style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
          >
            {activeThread?.subject ?? "Dispute thread"}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge status={currentStatus} />
            {activeThread?.category && <CategoryChip category={activeThread.category} />}
          </div>
        </div>
      </div>

      {/* Status banner */}
      {isResolved && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/8 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-medium text-primary">This dispute has been resolved.</p>
        </div>
      )}
      {isClosed && (
        <div className="flex items-center gap-2 rounded-xl border border-border/30 bg-secondary/30 px-4 py-3">
          <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">This thread is closed.</p>
        </div>
      )}

      {/* Message area */}
      <div className="overflow-hidden rounded-2xl border border-border/40 bg-card">
        <div className="flex max-h-[420px] min-h-[260px] flex-col gap-3 overflow-y-auto p-4">
          {msgsLoading ? (
            <div className="flex flex-1 items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
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
                    className={`flex ${isCustomer ? "justify-end" : isSystem ? "justify-center" : "justify-start"}`}
                  >
                    {isSystem ? (
                      <div className="max-w-[85%] rounded-full border border-border/20 bg-secondary/20 px-4 py-1.5">
                        <p className="text-center text-[11px] italic text-muted-foreground/60">{m.body}</p>
                      </div>
                    ) : (
                      <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                        isCustomer
                          ? "rounded-br-sm border border-primary/20 bg-primary/10"
                          : "rounded-bl-sm border border-border/30 bg-secondary/30"
                      }`}>
                        <p className={`mb-1.5 text-[10px] font-bold uppercase tracking-widest ${
                          isCustomer ? "text-primary/60" : "text-muted-foreground"
                        }`}>
                          {isCustomer ? "You" : "Business"}
                        </p>
                        <p className="text-sm leading-relaxed text-foreground">{m.body}</p>
                        <p className={`mt-1.5 text-[10px] text-muted-foreground/50 ${isCustomer ? "text-right" : ""}`}>
                          {fmtTime(m.created_at)}
                        </p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className={`border-t border-border/40 p-3 ${isThreadDone ? "opacity-70" : ""}`}>
          {isResolved && (
            <p className="mb-2 text-center text-[11px] text-muted-foreground/70">
              Sending a message will re-open this dispute.
            </p>
          )}
          {isClosed ? (
            <p className="py-2 text-center text-xs text-muted-foreground">
              Thread is closed — re-open by contacting the business.
            </p>
          ) : (
            <div className="flex gap-2">
              <textarea
                rows={3}
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                placeholder={canSend ? "Type a message…" : "Thread is closed"}
                disabled={!canSend}
                className="flex-1 resize-none rounded-xl border border-border/40 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button
                disabled={sending || !newMsg.trim() || !canSend}
                onClick={() => void sendMessage()}
                className="flex h-10 w-10 shrink-0 self-end items-center justify-center rounded-xl bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
