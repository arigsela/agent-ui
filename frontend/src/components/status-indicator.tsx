import { Badge } from "@/components/ui/badge";
import type { StreamState } from "@/types";

const stateConfig: Record<StreamState, { label: string; className: string }> = {
  idle: { label: "", className: "" },
  submitted: { label: "Submitted", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  working: { label: "Working...", className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Done", className: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800 border-red-200" },
};

export function StatusIndicator({ state }: { state: StreamState }) {
  if (state === "idle" || state === "completed") return null;
  const config = stateConfig[state];
  return (
    <Badge variant="outline" className={config.className}>
      {state === "working" && (
        <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
      )}
      {config.label}
    </Badge>
  );
}
