import { ScrollArea } from "@/components/ui/scroll-area";
import type { SessionInfo } from "@/types";

interface SessionListProps {
  sessions: SessionInfo[];
  onSelect: (session: SessionInfo) => void;
}

export function SessionList({ sessions, onSelect }: SessionListProps) {
  if (sessions.length === 0) {
    return <p className="px-2 py-4 text-xs text-muted-foreground">No sessions yet</p>;
  }

  return (
    <ScrollArea className="max-h-60">
      <div className="space-y-1">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect(session)}
            className="flex w-full flex-col items-start rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
          >
            <span className="font-medium">{session.agentName || "Unknown"}</span>
            {session.lastMessage && (
              <span className="truncate text-xs text-muted-foreground">
                {session.lastMessage}
              </span>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
