import type { UsageMetadata } from "@/types";

function fmt(n: number): string {
  return n.toLocaleString();
}

export function TokenUsage({ usage }: { usage: UsageMetadata }) {
  return (
    <span className="text-xs text-muted-foreground">
      {fmt(usage.promptTokenCount)} in / {fmt(usage.candidatesTokenCount)} out
    </span>
  );
}
