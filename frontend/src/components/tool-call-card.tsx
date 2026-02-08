import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import type { MessagePart } from "@/types";

interface ToolCallCardProps {
  call: MessagePart;
  response?: MessagePart;
}

export function ToolCallCard({ call, response }: ToolCallCardProps) {
  const [open, setOpen] = useState(false);
  const fnName = call.data?.name as string | undefined;
  const fnArgs = call.data?.args as Record<string, unknown> | undefined;
  const respData = response?.data;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-md border bg-muted/50">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted">
        <ChevronRight
          className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`}
        />
        <span className="font-mono text-xs font-medium">{fnName ?? "tool call"}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {fnArgs && (
          <div className="mt-1">
            <p className="text-xs font-medium text-muted-foreground">Arguments:</p>
            <pre className="mt-1 overflow-x-auto rounded bg-background p-2 text-xs">
              {JSON.stringify(fnArgs, null, 2)}
            </pre>
          </div>
        )}
        {respData && (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground">Response:</p>
            <pre className="mt-1 max-h-60 overflow-auto rounded bg-background p-2 text-xs">
              {typeof respData === "string" ? respData : JSON.stringify(respData, null, 2)}
            </pre>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
