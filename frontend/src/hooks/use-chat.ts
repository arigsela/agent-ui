import { useCallback, useRef, useState } from "react";
import { sendMessage, streamMessage } from "@/api/chat";
import type { ChatMessage, HistoryMessage, StreamState, UsageMetadata } from "@/types";

export function useChat(agentName: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const contextIdRef = useRef<string | undefined>(undefined);

  const setContextId = useCallback((id: string | undefined) => {
    contextIdRef.current = id;
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

        for await (const event of streamMessage(agentName, text, contextIdRef.current)) {
          const result = event.result as Record<string, unknown> | undefined;
          if (!result) continue;

          const kind = result.kind as string;

          if (kind === "status-update") {
            const status = result.status as { state: string } | undefined;
            if (status) {
              setStreamState(status.state as StreamState);
            }
            if (result.contextId) {
              taskContextId = result.contextId as string;
            }
          }

          if (kind === "artifact") {
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
        }

        // Update contextId for multi-turn
        if (taskContextId) {
          contextIdRef.current = taskContextId;
        }

        // Now fetch full response (with history + usage) via sync call
        let history: HistoryMessage[] = [];
        let usage: UsageMetadata | null = null;

        try {
          const full = await sendMessage(agentName, text, contextIdRef.current);
          history = full.history;
          usage = full.usage;
          if (full.context_id) {
            contextIdRef.current = full.context_id;
          }
          // Use the artifact text from sync if streaming didn't capture it
          if (!artifactText && full.artifacts.length > 0) {
            for (const a of full.artifacts) {
              for (const p of a.parts) {
                if (p.kind === "text" && p.text) {
                  artifactText += p.text;
                }
              }
            }
          }
        } catch {
          // sync fetch failed, use streaming artifact text
        }

        const agentMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "agent",
          text: artifactText || "(no response)",
          history,
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
  };
}
