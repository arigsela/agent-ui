import { useCallback, useEffect, useState } from "react";
import type { ChatMessage, SessionInfo } from "@/types";

const STORAGE_KEY = "kagent_sessions";
const MESSAGES_PREFIX = "kagent_msgs_";

function loadSessions(): SessionInfo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionInfo[]) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: SessionInfo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function saveMessages(contextId: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(MESSAGES_PREFIX + contextId, JSON.stringify(messages));
  } catch {
    // localStorage full — silently ignore
  }
}

export function loadMessages(contextId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_PREFIX + contextId);
    if (!raw) return [];
    const msgs = JSON.parse(raw) as ChatMessage[];
    // Restore Date objects from JSON strings
    return msgs.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [];
  }
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>(loadSessions);

  // Persist whenever sessions change
  useEffect(() => {
    saveSessions(sessions);
  }, [sessions]);

  const upsertSession = useCallback((session: SessionInfo) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.contextId === session.contextId);
      if (idx >= 0) {
        // Update existing session
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...session };
        return updated;
      }
      // Add new session at top
      return [session, ...prev];
    });
  }, []);

  const removeSession = useCallback((contextId: string) => {
    localStorage.removeItem(MESSAGES_PREFIX + contextId);
    setSessions((prev) => prev.filter((s) => s.contextId !== contextId));
  }, []);

  return { sessions, upsertSession, removeSession };
}
