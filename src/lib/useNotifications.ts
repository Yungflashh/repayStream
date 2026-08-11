import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export type Notification = {
  id: string;
  action: string;
  title: string;
  body: string;
  plan_id: string | null;
  entity_type: string;
  created_at: string;
  read: boolean;
};

export type NotificationsFeed = {
  notifications: Notification[];
  unread: number;
  is_business: boolean;
  is_customer: boolean;
  customer_id: string | null;
};

const POLL_MS = 60_000;

// Module-level singleton so multiple bells share one poll cycle and cache.
let cached: NotificationsFeed | null = null;
let pending: Promise<NotificationsFeed | null> | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let focusHandler: (() => void) | null = null;
const subscribers = new Set<(feed: NotificationsFeed | null) => void>();

async function fetchOnce(): Promise<NotificationsFeed | null> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const res = await apiFetch("/api/notifications");
      if (!res.ok) return cached;
      const data = (await res.json()) as NotificationsFeed;
      cached = data;
      subscribers.forEach((cb) => cb(data));
      return data;
    } catch {
      return cached;
    } finally {
      pending = null;
    }
  })();
  return pending;
}

function ensurePolling() {
  if (interval) return;
  interval = setInterval(() => void fetchOnce(), POLL_MS);
  focusHandler = () => void fetchOnce();
  window.addEventListener("focus", focusHandler);
}

function stopPolling() {
  if (subscribers.size > 0) return;
  if (interval) { clearInterval(interval); interval = null; }
  if (focusHandler) { window.removeEventListener("focus", focusHandler); focusHandler = null; }
}

export function useNotifications() {
  const [feed, setFeed] = useState<NotificationsFeed | null>(cached);

  useEffect(() => {
    subscribers.add(setFeed);
    ensurePolling();
    void fetchOnce();
    return () => {
      subscribers.delete(setFeed);
      stopPolling();
    };
  }, []);

  const markAllRead = useCallback(async () => {
    await apiFetch("/api/notifications/mark-read", { method: "POST" });
    if (cached) {
      cached = { ...cached, unread: 0, notifications: cached.notifications.map((n) => ({ ...n, read: true })) };
      subscribers.forEach((cb) => cb(cached));
    }
  }, []);

  const refresh = useCallback(() => void fetchOnce(), []);

  return { feed, markAllRead, refresh };
}
