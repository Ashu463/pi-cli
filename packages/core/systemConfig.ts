import { ToolName } from "./models/model"

// Central place for every tunable constant in the agent loop — limits, timeouts, thresholds.
// Prompt text lives separately in ./config.ts (systemPrompt, compactSystemPrompt) — prompts
// aren't "config" in the tunable-constant sense, they're content.

// agent.ts — turn loop
export const MAX_TURNS = 25
export const LLM_RETRY_ATTEMPTS = 3
export const LLM_RETRY_BACKOFF_MS = 500
export const DESTRUCTIVE_TOOLS = new Set(["write", "edit", "bash"])
export const MEMORY_ENABLED = process.env.MEMORY_ENABLED === "true"
export const AVAILABLE_TOOLS: ToolName[] = ["bash", "edit", "read", "write"]

export const CHARS_PER_TOKEN_ESTIMATE = 4
export const COMPACT_TOKEN_THRESHOLD = Number(process.env.COMPACT_TOKEN_THRESHOLD_OVERRIDE) || 50_000

export const BASH_TIMEOUT_MS = 30_000
export const BASH_MAX_OUTPUT_LEN = 20_000

// logger.ts
export const LOG_LEVEL = process.env.LOG_LEVEL ?? "info"
