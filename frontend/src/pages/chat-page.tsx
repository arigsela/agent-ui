import { AgentSelector } from "@/components/agent-selector";
import { ChatView } from "@/components/chat-view";
import { SessionList } from "@/components/session-list";
import { Separator } from "@/components/ui/separator";
import { useAgents } from "@/hooks/use-agents";
import { useChat } from "@/hooks/use-chat";
import { useSessions } from "@/hooks/use-sessions";
import type { SessionInfo } from "@/types";

export function ChatPage() {
  const { agents, selectedAgent, selectAgent, card, loading } = useAgents();
  const { messages, streamState, send, setContextId, clearMessages } = useChat(selectedAgent);
  const { sessions } = useSessions();

  function handleAgentChange(name: string) {
    selectAgent(name);
    clearMessages();
  }

  function handleSessionSelect(session: SessionInfo) {
    if (session.agentName) {
      selectAgent(session.agentName);
    }
    clearMessages();
    setContextId(session.contextId);
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="flex w-72 flex-col border-r p-4">
        <h1 className="mb-4 text-lg font-semibold">kagent</h1>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading agents...</p>
        ) : (
          <AgentSelector
            agents={agents}
            selectedAgent={selectedAgent}
            onSelect={handleAgentChange}
            card={card}
          />
        )}

        <Separator className="my-4" />

        <div>
          <h3 className="mb-2 text-sm font-medium">Sessions</h3>
          <SessionList sessions={sessions} onSelect={handleSessionSelect} />
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1">
        <ChatView
          messages={messages}
          streamState={streamState}
          onSend={send}
          agentName={selectedAgent}
        />
      </div>
    </div>
  );
}
