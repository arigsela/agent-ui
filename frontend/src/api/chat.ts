import { apiFetch } from "./client";
import type { ChatResponse } from "@/types";

export function sendMessage(
  agentName: string,
  text: string,
  contextId?: string
): Promise<ChatResponse> {
  return apiFetch<ChatResponse>("/chat/send", {
    method: "POST",
    body: JSON.stringify({
      agent_name: agentName,
      text,
      context_id: contextId ?? null,
    }),
  });
}

export async function* streamMessage(
  agentName: string,
  text: string,
  contextId?: string
): AsyncGenerator<Record<string, unknown>> {
  const resp = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agent_name: agentName,
      text,
      context_id: contextId ?? null,
    }),
  });

  if (!resp.ok) {
    throw new Error(`Stream error ${resp.status}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    while (buffer.includes("\n")) {
      const idx = buffer.indexOf("\n");
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);

      if (line.startsWith("data:")) {
        const data = line.slice(5).trim();
        if (data) {
          try {
            yield JSON.parse(data);
          } catch {
            // skip malformed
          }
        }
      }
    }
  }
}
