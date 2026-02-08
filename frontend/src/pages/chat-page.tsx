import { useEffect, useRef } from "react";
import { AgentSelector } from "@/components/agent-selector";
import { ChatView } from "@/components/chat-view";
import { SessionList } from "@/components/session-list";
import { Separator } from "@/components/ui/separator";
import { useAgents } from "@/hooks/use-agents";
import { useChat } from "@/hooks/use-chat";
import type { ChatSessionState } from "@/hooks/use-chat";
import { useSessions, saveMessages, loadMessages } from "@/hooks/use-sessions";
import type { SessionInfo } from "@/types";

export function ChatPage() {
  const { agents, selectedAgent, selectAgent, card, loading } = useAgents();
  const {
    messages, streamState, send, setContextId,
    clearMessages, getSessionState, restoreSession,
  } = useChat(selectedAgent);
  const { sessions, upsertSession } = useSessions();

  // Keep a per-agent cache of chat state so switching agents doesn't lose context
  const agentStatesRef = useRef<Map<string, ChatSessionState>>(new Map());
  const prevAgentRef = useRef<string>(selectedAgent);

  // Save/restore chat state when agent changes
  useEffect(() => {
    const prev = prevAgentRef.current;
    if (prev === selectedAgent) return;

    // Save previous agent's state
    if (prev) {
      const state = getSessionState();
      if (state.contextId) {
        agentStatesRef.current.set(prev, state);
      }
    }

    // Restore new agent's state if we have one
    const saved = agentStatesRef.current.get(selectedAgent);
    if (saved) {
      restoreSession(saved);
    } else {
      clearMessages();
    }

    prevAgentRef.current = selectedAgent;
  }, [selectedAgent, getSessionState, restoreSession, clearMessages]);

  // Save session to sidebar list and persist messages whenever they change
  useEffect(() => {
    const state = getSessionState();
    if (!state.contextId || !selectedAgent || messages.length === 0) return;

    // Persist messages to localStorage
    saveMessages(state.contextId, messages);

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    upsertSession({
      id: state.contextId,
      contextId: state.contextId,
      agentName: selectedAgent,
      createdAt: new Date().toISOString(),
      lastMessage: lastUserMsg?.text,
    });
  }, [messages, selectedAgent, getSessionState, upsertSession]);

  function handleAgentChange(name: string) {
    selectAgent(name);
  }

  function handleSessionSelect(session: SessionInfo) {
    // If selecting a session for a different agent, switch agent first
    if (session.agentName && session.agentName !== selectedAgent) {
      selectAgent(session.agentName);
    }

    // Try in-memory cache first, then localStorage, then blank
    const cached = agentStatesRef.current.get(session.agentName);
    if (cached && cached.contextId === session.contextId) {
      restoreSession(cached);
    } else {
      const saved = loadMessages(session.contextId);
      if (saved.length > 0) {
        restoreSession({ contextId: session.contextId, messages: saved });
        agentStatesRef.current.set(session.agentName, { contextId: session.contextId, messages: saved });
      } else {
        clearMessages();
        setContextId(session.contextId);
      }
    }
  }

  return (
    <div className="flex h-full bg-background">
      {/* Sidebar */}
      <div className="flex w-72 flex-col border-r p-4">
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
