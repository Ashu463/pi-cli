import { spawnSync, execSync } from "child_process";
import path from "path";
import {Message}  from '../models/model'
const MEMORY_SERVICE = path.resolve(
  import.meta.dirname,
  "./memory-service.ts"
);
const PACKAGES_DIR = path.resolve(
  import.meta.dirname,   // e.g. packages/core/memory
  "../.."                // walk up to packages/
);

// resolve node path once at module load time
const NODE_BIN = (() => {
  try {
    return execSync("which node", { encoding: "utf-8" }).trim();
  } catch {
    return "node"; // fallback
  }
})();
function callMemoryService(command: string, payload: string): unknown {
    
console.log(payload, command, " are the req headers")
  const result = spawnSync(
    "bunx",
    ["tsx", MEMORY_SERVICE, command, payload],
    {
      encoding: "utf-8",
      env: {...process.env},
    //   timeout: 30000,
      cwd: PACKAGES_DIR
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
  const response = callMemoryService("search",query) as SearchResponse;

  const memories : string = response.results.results.map(
    r => r.memory
  ).join('\n')
  if (!response.ok) return "";
  // flatten relevant memories into a single string for system prompt injection
//   const finalRes: string = response.results.map(r => r.memory).join("\n")
  return memories;
}

type SearchResponse = {
  ok: boolean;
  results: {
    results: Array<{
      memory: string;
    }>;
  };
};