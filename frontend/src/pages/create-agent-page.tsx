import { useNavigate } from "react-router-dom";
import { CreateAgentForm } from "@/components/create-agent-form";
import { useCreateAgent } from "@/hooks/use-create-agent";
import type { CreateAgentRequest } from "@/types";

export function CreateAgentPage() {
  const navigate = useNavigate();
  const { submitAgent, isCreating, error } = useCreateAgent();

  async function handleSubmit(data: CreateAgentRequest) {
    const result = await submitAgent(data);
    if (result) {
      navigate("/");
    }
  }

  return (
    <div className="flex h-full items-start justify-center overflow-y-auto p-8">
      <CreateAgentForm
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
        error={error}
      />
    </div>
  );
}
