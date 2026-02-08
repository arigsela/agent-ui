import { apiFetch } from "./client";

export function fetchSessions(): Promise<unknown> {
  return apiFetch<unknown>("/sessions");
}
