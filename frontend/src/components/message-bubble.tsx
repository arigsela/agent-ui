import { cn } from "@/lib/utils";
import { ToolCallCard } from "@/components/tool-call-card";
import { TokenUsage } from "@/components/token-usage";
import type { ChatMessage, MessagePart } from "@/types";

function extractToolCalls(history?: ChatMessage["history"]): {
  call: MessagePart;
  response?: MessagePart;
}[] {
  if (!history) return [];
  const calls: { call: MessagePart; response?: MessagePart }[] = [];
  const responses: MessagePart[] = [];

  for (const msg of history) {
    for (const part of msg.parts) {
      if (part.metadata?.kagent_type === "function_call") {
        calls.push({ call: part });
      }
      if (part.metadata?.kagent_type === "function_response") {
        responses.push(part);
      }
    }
  }

  // Match responses to calls by order
  for (let i = 0; i < calls.length && i < responses.length; i++) {
    calls[i].response = responses[i];
  }

  return calls;
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const toolCalls = extractToolCalls(message.history);

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <p className="whitespace-pre-wrap text-sm">{message.text}</p>

        {toolCalls.length > 0 && (
          <div className="mt-3 space-y-2">
            {toolCalls.map((tc, i) => (
              <ToolCallCard key={i} call={tc.call} response={tc.response} />
            ))}
          </div>
        )}

        {message.usage && (
          <div className="mt-2">
            <TokenUsage usage={message.usage} />
          </div>
        )}
      </div>
    </div>
  );
}
