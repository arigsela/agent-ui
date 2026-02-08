import { apiFetch } from "./client";
import type { AgentCard, AgentInfo } from "@/types";

export function fetchAgents(): Promise<AgentInfo[]> {
  return apiFetch<AgentInfo[]>("/agents");
}

export function fetchAgentCard(name: string): Promise<AgentCard> {
  return apiFetch<AgentCard>(`/agents/${name}/card`);
}
