import { spawnSync } from "child_process";
import path from "path";
import {Message}  from '../models/model'
const MEMORY_SERVICE = path.resolve(
  import.meta.dirname,
  "memory-service.ts"
);


function callMemoryService(command: string, payload: string): unknown {
  const result = spawnSync(
    "node",
    ["--experimental-strip-types", MEMORY_SERVICE, command, payload],
    {
      encoding: "utf-8",
      env: {...process.env},
      timeout: 30000
    }
  );

  if (result.error) throw new Error(`Memory service failed to spawn: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Memory service exited with ${result.status}: ${result.stderr}`);

  return JSON.parse(result.stdout);
}

export function addMemory(messages: Message[]): void {
  // filter to only user/assistant turns, strip anything else
  const filtered = messages.filter(m => m.role === "user" || m.role === "assistant");
  if (filtered.length === 0) return;
  callMemoryService("add", JSON.stringify(filtered));
}

export function searchMemory(query: string): string {
  const response = callMemoryService("search", query) as { ok: boolean; results: Array<{ memory: string }> };
  if (!response.ok) return "";
  // flatten relevant memories into a single string for system prompt injection
  return response.results.map(r => r.memory).join("\n");
}