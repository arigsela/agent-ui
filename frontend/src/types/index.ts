export interface AgentInfo {
  name: string;
  description: string;
  ready: boolean;
}

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  examples: string[];
  tags: string[];
}

export interface AgentCapabilities {
  pushNotifications: boolean;
  stateTransitionHistory: boolean;
  streaming: boolean;
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  skills: AgentSkill[];
  capabilities: AgentCapabilities;
}

export interface MessagePart {
  kind: string;
  text?: string;
  data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface Artifact {
  artifactId: string;
  parts: MessagePart[];
}

export interface HistoryMessage {
  kind: string;
  role: string;
  messageId: string;
  parts: MessagePart[];
}

export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

export interface TaskStatus {
  state: string;
  timestamp: string;
}

export interface ChatResponse {
  task_id: string;
  context_id: string;
  status: TaskStatus;
  artifacts: Artifact[];
  history: HistoryMessage[];
  usage: UsageMetadata | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  text: string;
  history?: HistoryMessage[];
  usage?: UsageMetadata | null;
  timestamp: Date;
}

export type StreamState = "idle" | "submitted" | "working" | "completed" | "failed";

export interface SessionInfo {
  id: string;
  contextId: string;
  agentName: string;
  createdAt: string;
  lastMessage?: string;
}
