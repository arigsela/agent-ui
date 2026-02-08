import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CreateAgentRequest } from "@/types";

interface CreateAgentFormProps {
  onSubmit: (data: CreateAgentRequest) => void;
  isSubmitting: boolean;
  error: string | null;
}

const NAME_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/;

export function CreateAgentForm({ onSubmit, isSubmitting, error }: CreateAgentFormProps) {
  const [name, setName] = useState("");
  const [namespace, setNamespace] = useState("kagent");
  const [description, setDescription] = useState("");
  const [systemMessage, setSystemMessage] = useState("");
  const [modelConfig, setModelConfig] = useState("default-model-config");
  const [stream, setStream] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);

  function validateName(value: string): boolean {
    if (!value) {
      setNameError("Name is required");
      return false;
    }
    if (value.length < 2) {
      setNameError("Name must be at least 2 characters");
      return false;
    }
    if (!NAME_PATTERN.test(value)) {
      setNameError("Must be lowercase alphanumeric with hyphens (e.g. my-agent)");
      return false;
    }
    setNameError(null);
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateName(name)) return;
    onSubmit({ name, namespace, description, systemMessage, modelConfig, stream });
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create Declarative Agent</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="my-agent"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
            />
            {nameError && (
              <p className="text-sm text-destructive">{nameError}</p>
            )}
          </div>

          {/* Namespace */}
          <div className="space-y-2">
            <Label htmlFor="namespace">Namespace *</Label>
            <Input
              id="namespace"
              value={namespace}
              onChange={(e) => setNamespace(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="A helpful agent that..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* System Message */}
          <div className="space-y-2">
            <Label htmlFor="systemMessage">System Message</Label>
            <textarea
              id="systemMessage"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="You are a helpful assistant..."
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
            />
          </div>

          {/* Model Config */}
          <div className="space-y-2">
            <Label htmlFor="modelConfig">Model Config *</Label>
            <Input
              id="modelConfig"
              value={modelConfig}
              onChange={(e) => setModelConfig(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Name of the ModelConfig resource in the cluster
            </p>
          </div>

          {/* Stream Toggle */}
          <div className="flex items-center gap-3">
            <Switch id="stream" checked={stream} onCheckedChange={setStream} />
            <Label htmlFor="stream">Enable streaming</Label>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Agent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
