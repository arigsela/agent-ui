import type { UsageMetadata } from "@/types";

function fmt(n: number): string {
  return n.toLocaleString();
}

export function TokenUsage({ usage }: { usage: UsageMetadata }) {
  return (
    <span
      className="text-xs text-muted-foreground"
      title={`Input: ${fmt(usage.promptTokenCount)} tokens\nOutput: ${fmt(usage.candidatesTokenCount)} tokens\nTotal: ${fmt(usage.totalTokenCount)} tokens`}
    >
      {fmt(usage.promptTokenCount)} in / {fmt(usage.candidatesTokenCount)} out / {fmt(usage.totalTokenCount)} total
    </span>
  );
}
