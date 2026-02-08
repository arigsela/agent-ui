import { useCallback, useEffect, useState } from "react";
import { fetchSessions } from "@/api/sessions";
import type { SessionInfo } from "@/types";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchSessions()
      .then((data) => {
        // Parse sessions from controller response
        // The controller returns { error: false, data: [...] }
        const raw = data as { data?: unknown[] };
        const items = raw.data ?? (Array.isArray(data) ? data : []);
        const parsed: SessionInfo[] = (items as Record<string, unknown>[]).map((s) => ({
          id: (s.id as string) ?? "",
          contextId: (s.contextId as string) ?? (s.id as string) ?? "",
          agentName: (s.agentName as string) ?? "",
          createdAt: (s.createdAt as string) ?? "",
          lastMessage: s.lastMessage as string | undefined,
        }));
        setSessions(parsed);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { sessions, loading, refresh };
}
