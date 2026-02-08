import { useCallback, useEffect, useState } from "react";
import { fetchAgentCard, fetchAgents } from "@/api/agents";
import type { AgentCard, AgentInfo } from "@/types";

export function useAgents() {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [card, setCard] = useState<AgentCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents()
      .then((data) => {
        setAgents(data);
        if (data.length > 0 && !selectedAgent) {
          setSelectedAgent(data[0].name);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedAgent) {
      setCard(null);
      return;
    }
    fetchAgentCard(selectedAgent).then(setCard).catch(() => setCard(null));
  }, [selectedAgent]);

  const selectAgent = useCallback((name: string) => {
    setSelectedAgent(name);
  }, []);

  const refresh = useCallback(() => {
    setLoading(true);
    fetchAgents()
      .then((data) => {
        setAgents(data);
        if (data.length > 0 && !selectedAgent) {
          setSelectedAgent(data[0].name);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedAgent]);

  return { agents, selectedAgent, selectAgent, card, loading, refresh };
}
