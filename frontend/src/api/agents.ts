import { apiFetch } from "./client";
import type { AgentCard, AgentInfo, CreateAgentRequest, CreateAgentResponse } from "@/types";

export function fetchAgents(): Promise<AgentInfo[]> {
  return apiFetch<AgentInfo[]>("/agents");
}

export function fetchAgentCard(name: string): Promise<AgentCard> {
  return apiFetch<AgentCard>(`/agents/${name}/card`);
}

export function createAgent(data: CreateAgentRequest): Promise<CreateAgentResponse> {
  return apiFetch<CreateAgentResponse>("/agents/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
