import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AgentCard, AgentInfo } from "@/types";

interface AgentSelectorProps {
  agents: AgentInfo[];
  selectedAgent: string;
  onSelect: (name: string) => void;
  card: AgentCard | null;
}

export function AgentSelector({ agents, selectedAgent, onSelect, card }: AgentSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">Agent</label>
      <Select value={selectedAgent} onValueChange={onSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Select an agent" />
        </SelectTrigger>
        <SelectContent>
          {agents.map((agent) => (
            <SelectItem key={agent.name} value={agent.name}>
              <span className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    agent.ready ? "bg-green-500" : "bg-red-500"
                  }`}
                />
                {agent.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {card && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{card.description}</p>
          {card.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.skills.map((skill) => (
                <Badge key={skill.id} variant="secondary" className="text-xs">
                  {skill.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
