import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, Loader2, Plus, ArrowLeft, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";

type Thread = { id: string; subject: string; status: string; category: string; created_at: string };
type Message = { id: string; sender_type: string; body: string; created_at: string };

const statusIcon: Record<string, typeof CheckCircle2> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: CheckCircle2,
};

const statusColor: Record<string, string> = {
  open: "text-amber-400 bg-amber-400/10",
  in_progress: "text-blue-400 bg-blue-400/10",
  resolved: "text-primary bg-primary/10",
  closed: "text-muted-foreground bg-secondary",
};

export function DisputeChat({ customerId, plans }: { customerId: string; plans: { id: string; total_amount: number }[] }) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newPlanId, setNewPlanId] = useState(plans[0]?.id ?? "");
  const [newMessage, setNewMessage] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadThreads(); }, []);

  async function loadThreads() {
    const res = await apiFetch("/api/disputes");
    if (res.ok) {
      const data = (await res.json()) as { threads: Thread[] };
      setThreads(data.threads);
    }
  }

  async function openThread(threadId: string) {
    setActiveThread(threadId);
    const res = await apiFetch(`/api/disputes/${threadId}/messages`);
    if (res.ok) {
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeThread) return;
    setSending(true);
    try {
      const res = await apiFetch(`/api/disputes/${activeThread}/messages`, {
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

  async function createThread() {
    if (!newSubject.trim() || !newMessage.trim() || !newPlanId) return;
    setCreating(true);
    try {
      const res = await apiFetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: newPlanId, subject: newSubject, category: newCategory, message: newMessage }),
      });
      if (res.ok) {
        const data = (await res.json()) as { thread: { id: string } };
        setShowCreate(false);
        setNewSubject("");
        setNewMessage("");
        await loadThreads();
        openThread(data.thread.id);
      }
    } finally {
      setCreating(false);
    }
  }

  // Thread list view
  if (!activeThread) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10">
                <MessageSquare className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Disputes & Messages</CardTitle>
                <CardDescription>Report issues or communicate with the business</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1">
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <AnimatePresence>
            {showCreate && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-3 rounded-xl border border-border/40 bg-secondary/20 p-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input placeholder="Brief description of the issue" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="flex h-11 w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground">
                        <option value="general">General</option>
                        <option value="payment_issue">Payment Issue</option>
                        <option value="wrong_amount">Wrong Amount</option>
                        <option value="unauthorized_debit">Unauthorized Debit</option>
                        <option value="refund_request">Refund Request</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Plan</Label>
                      <select value={newPlanId} onChange={(e) => setNewPlanId(e.target.value)} className="flex h-11 w-full rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground">
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>&#8358;{p.total_amount.toLocaleString("en-NG")} — {p.id.slice(-6)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Describe your issue in detail..." className="flex min-h-[100px] w-full rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30" />
                  </div>
                  <div className="flex gap-2">
                    <Button disabled={creating || !newSubject.trim() || !newMessage.trim()} onClick={() => void createThread()}>
                      {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit dispute"}
                    </Button>
                    <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {threads.length === 0 && !showCreate && (
            <div className="flex flex-col items-center py-8 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">No disputes yet</p>
            </div>
          )}

          {threads.map((t) => {
            const Icon = statusIcon[t.status] ?? AlertCircle;
            return (
              <motion.button
                key={t.id}
                whileHover={{ x: 4 }}
                onClick={() => openThread(t.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-border/40 bg-secondary/10 p-4 text-left transition-colors hover:bg-secondary/20"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${statusColor[t.status]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{t.subject}</p>
                  <p className="text-xs text-muted-foreground">{t.category.replace(/_/g, " ")} &middot; {t.status.replace(/_/g, " ")}</p>
                </div>
              </motion.button>
            );
          })}
        </CardContent>
      </Card>
    );
  }

  // Chat view
  const thread = threads.find((t) => t.id === activeThread);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveThread(null)} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{thread?.subject ?? "Thread"}</CardTitle>
            <CardDescription>{thread?.category?.replace(/_/g, " ") ?? ""} &middot; {thread?.status?.replace(/_/g, " ")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="max-h-80 space-y-3 overflow-y-auto rounded-xl border border-border/30 bg-background/50 p-4">
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.sender_type === "customer" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                m.sender_type === "customer"
                  ? "bg-primary/15 text-foreground"
                  : m.sender_type === "system"
                    ? "bg-secondary/30 text-muted-foreground italic"
                    : "bg-secondary text-foreground"
              }`}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">{m.sender_type}</p>
                <p className="leading-relaxed">{m.body}</p>
              </div>
            </motion.div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }}
            className="flex-1"
          />
          <Button size="icon" disabled={sending || !newMsg.trim()} onClick={() => void sendMessage()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
