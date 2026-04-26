import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageSquare, Send, Loader2, CheckCircle2, Clock, AlertCircle, XCircle,
  LayoutDashboard,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { staggerContainer, staggerItem, smooth } from "@/lib/motion";

type Thread = { id: string; subject: string; status: string; category: string; created_at: string };
type Message = { id: string; sender_type: string; body: string; created_at: string };

const statusIcon: Record<string, typeof CheckCircle2> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
};

const statusColor: Record<string, string> = {
  open: "text-amber-400 bg-amber-400/10",
  in_progress: "text-blue-400 bg-blue-400/10",
  resolved: "text-primary bg-primary/10",
  closed: "text-muted-foreground bg-secondary",
};

export function DisputesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadDetail, setThreadDetail] = useState<{ subject: string; status: string; category: string } | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadThreads(); }, []);

  async function loadThreads() {
    setLoading(true);
    const res = await apiFetch("/api/disputes");
    if (res.ok) {
      const data = (await res.json()) as { threads: Thread[] };
      setThreads(data.threads);
    }
    setLoading(false);
  }

  async function openThread(threadId: string) {
    setActiveThread(threadId);
    const res = await apiFetch(`/api/disputes/${threadId}/messages`);
    if (res.ok) {
      const data = (await res.json()) as { thread: { subject: string; status: string; category: string }; messages: Message[] };
      setMessages(data.messages);
      setThreadDetail(data.thread);
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

  async function updateStatus(status: string) {
    if (!activeThread) return;
    setUpdatingStatus(true);
    try {
      const res = await apiFetch(`/api/disputes/${activeThread}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setThreadDetail((t) => t ? { ...t, status } : t);
        setThreads((ts) => ts.map((t) => t.id === activeThread ? { ...t, status } : t));
      }
    } finally {
      setUpdatingStatus(false);
    }
  }

  const openCount = threads.filter((t) => t.status === "open" || t.status === "in_progress").length;

  // Thread list
  if (!activeThread) {
    return (
      <Layout maxWidth="xl">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
          <motion.div variants={staggerItem} transition={smooth} className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild><Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link></Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Customer disputes</h1>
              <p className="text-sm text-muted-foreground">
                {openCount > 0 ? `${openCount} open dispute${openCount > 1 ? "s" : ""}` : "All disputes resolved"}
              </p>
            </div>
          </motion.div>

          <motion.div variants={staggerItem} transition={smooth}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10"><MessageSquare className="h-5 w-5 text-amber-400" /></div>
                  <div><CardTitle className="text-lg">All threads</CardTitle><CardDescription>Click a thread to view and respond</CardDescription></div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : threads.length === 0 ? (
                  <div className="flex flex-col items-center py-10 text-center">
                    <MessageSquare className="mb-3 h-8 w-8 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground">No disputes yet</p>
                    <p className="mt-1 text-xs text-muted-foreground/50">Disputes from customers will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {threads.map((t) => {
                      const Icon = statusIcon[t.status] ?? AlertCircle;
                      return (
                        <motion.button
                          key={t.id}
                          whileHover={{ x: 4 }}
                          onClick={() => openThread(t.id)}
                          className="flex w-full items-center gap-3 rounded-xl border border-border/40 bg-secondary/10 p-4 text-left transition-colors hover:bg-secondary/20"
                        >
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${statusColor[t.status]}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">{t.subject}</p>
                            <p className="text-xs text-muted-foreground">{t.category.replace(/_/g, " ")} &middot; {t.status.replace(/_/g, " ")}</p>
                          </div>
                          <span className="text-xs text-muted-foreground/60">
                            {new Date(t.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </Layout>
    );
  }

  // Chat view
  const thread = threads.find((t) => t.id === activeThread);
  const isOpen = threadDetail?.status === "open" || threadDetail?.status === "in_progress";

  return (
    <Layout maxWidth="xl">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col gap-6">
        <motion.div variants={staggerItem} transition={smooth} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => { setActiveThread(null); setThreadDetail(null); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold">{threadDetail?.subject ?? thread?.subject ?? "Thread"}</h2>
              <p className="text-xs text-muted-foreground">{threadDetail?.category?.replace(/_/g, " ")} &middot; {threadDetail?.status?.replace(/_/g, " ")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {isOpen && (
              <Button size="sm" variant="outline" disabled={updatingStatus} onClick={() => void updateStatus("resolved")}>
                <CheckCircle2 className="h-3.5 w-3.5" />Resolve
              </Button>
            )}
            {threadDetail?.status === "resolved" && (
              <Button size="sm" variant="outline" disabled={updatingStatus} onClick={() => void updateStatus("closed")}>
                <XCircle className="h-3.5 w-3.5" />Close
              </Button>
            )}
          </div>
        </motion.div>

        <motion.div variants={staggerItem} transition={smooth}>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="max-h-96 space-y-3 overflow-y-auto rounded-xl border border-border/30 bg-background/50 p-4">
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.sender_type === "business" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      m.sender_type === "business"
                        ? "bg-primary/15 text-foreground"
                        : m.sender_type === "system"
                          ? "bg-secondary/30 text-muted-foreground italic"
                          : "bg-secondary text-foreground"
                    }`}>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{m.sender_type}</p>
                      <p className="leading-relaxed">{m.body}</p>
                      <p className="mt-1 text-right text-[10px] text-muted-foreground/50">
                        {new Date(m.created_at).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={bottomRef} />
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Type a response..."
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
        </motion.div>
      </motion.div>
    </Layout>
  );
}
