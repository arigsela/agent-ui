import { useCallback, useState } from "react";
import { createAgent } from "@/api/agents";
import type { CreateAgentRequest, CreateAgentResponse } from "@/types";

export function useCreateAgent() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitAgent = useCallback(
    async (data: CreateAgentRequest): Promise<CreateAgentResponse | null> => {
      setIsCreating(true);
      setError(null);
      try {
        const result = await createAgent(data);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create agent");
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  return { submitAgent, isCreating, error };
}
