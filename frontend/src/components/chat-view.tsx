import { ChatInput } from "@/components/chat-input";
import { MessageList } from "@/components/message-list";
import { StatusIndicator } from "@/components/status-indicator";
import type { ChatMessage, StreamState } from "@/types";

interface ChatViewProps {
  messages: ChatMessage[];
  streamState: StreamState;
  onSend: (text: string) => void;
  agentName: string;
}

export function ChatView({ messages, streamState, onSend, agentName }: ChatViewProps) {
  const isBusy = streamState === "submitted" || streamState === "working";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-medium">
          {agentName ? `Chat with ${agentName}` : "Select an agent"}
        </h2>
        <StatusIndicator state={streamState} />
      </div>
      <MessageList messages={messages} />
      <ChatInput onSend={onSend} disabled={isBusy || !agentName} />
    </div>
  );
}
