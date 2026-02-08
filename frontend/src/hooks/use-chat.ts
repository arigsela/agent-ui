import { useCallback, useRef, useState } from "react";
import { streamMessage } from "@/api/chat";
import type { ChatMessage, HistoryMessage, StreamState, UsageMetadata } from "@/types";

export interface ChatSessionState {
  contextId: string | undefined;
  messages: ChatMessage[];
}

export function useChat(agentName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const contextIdRef = useRef<string | undefined>(undefined);

  const setContextId = useCallback((id: string | undefined) => {
    contextIdRef.current = id;
  }, []);

  /** Snapshot current state so it can be saved externally before switching agents */
  const getSessionState = useCallback((): ChatSessionState => ({
    contextId: contextIdRef.current,
    messages,
  }), [messages]);

  /** Restore a previously saved session */
  const restoreSession = useCallback((state: ChatSessionState) => {
    contextIdRef.current = state.contextId;
    setMessages(state.messages);
    setStreamState("idle");
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    contextIdRef.current = undefined;
    setStreamState("idle");
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!agentName || !text.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setStreamState("submitted");

      try {
        // Start streaming for live status updates
        let artifactText = "";
        let taskContextId = contextIdRef.current;
        let history: HistoryMessage[] = [];
        let usage: UsageMetadata | null = null;

        for await (const event of streamMessage(agentName, text, contextIdRef.current)) {
          // Handle both JSON-RPC wrapped (event.result) and unwrapped events
          const result = (event.result ?? event) as Record<string, unknown>;
          const kind = result.kind as string | undefined;
          if (!kind) continue;

          if (kind === "status-update") {
            const status = result.status as { state: string } | undefined;
            if (status) {
              setStreamState(status.state as StreamState);
            }
            if (result.contextId) {
              taskContextId = result.contextId as string;
            }
          }

          if (kind === "artifact" || kind === "artifact-update") {
            const artifact = result.artifact as {
              parts?: { kind: string; text?: string }[];
            };
            if (artifact?.parts) {
              for (const part of artifact.parts) {
                if (part.kind === "text" && part.text) {
                  artifactText += part.text;
                }
              }
            }
            if (result.contextId) {
              taskContextId = result.contextId as string;
            }
          }

          if (kind === "metadata") {
            const rawHistory = result.history as HistoryMessage[] | undefined;
            if (rawHistory) history = rawHistory;
            const meta = result.metadata as Record<string, unknown> | undefined;
            const usageRaw = meta?.kagent_usage_metadata as UsageMetadata | undefined;
            if (usageRaw) usage = usageRaw;
          }
        }

        // Update contextId for multi-turn
        if (taskContextId) {
          contextIdRef.current = taskContextId;
        }

        const agentMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          text: artifactText || "(no response)",
          history: history.length > 0 ? history : undefined,
          usage,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMsg]);
        setStreamState("completed");
      } catch (err) {
        console.error("Chat error:", err);
        setStreamState("failed");
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          text: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    },
    [agentName]
  );

  return {
    messages,
    setMessages,
    streamState,
    send,
    contextId: contextIdRef.current,
    setContextId,
    clearMessages,
    getSessionState,
    restoreSession,
  };
}
