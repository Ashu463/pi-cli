# AI Harness Project — Study & Build Plan

## Context
Building a minimal AI agent harness from scratch, using Pi (github.com/earendil-works/pi) as the reference architecture. Goal: deep understanding of agentic loop mechanics, not a polished product. Backend-strong, AI-new.

---

## Phase 0 — Theory (2 days max)

### LLM Fundamentals
- [ ] Read Anthropic core concepts (tokens, context window, roles, stateless API)
- [ ] Understand chat completion format: system / user / assistant message roles
- [ ] Read Anthropic tool use docs — "How tool use works" + examples section
- [ ] Read OpenAI function calling docs briefly (same concept, different naming)

### Agent Loop Theory
- [ ] Read Anthropic agentic frameworks overview (orchestrator, subagent, human-in-loop)
- [ ] Skim ReAct paper — focus on Figure 1 and examples only (20 min)
- [ ] Understand context management strategies: truncation, summarization/compaction, RAG

### Prompt Engineering (minimal)
- [ ] Read Anthropic prompt engineering: "Being clear and direct", "Using examples", "Giving Claude a role"

### Pi-specific Docs
- [ ] Read Pi's AGENTS.md at repo root
- [ ] Read pi.dev/docs/latest/sdk
- [ ] Read pi.dev/docs/latest/extensions
- [ ] Read pi.dev/docs/latest/sessions
- [ ] Read pi.dev/docs/latest/compaction

### TypeScript Patterns
- [ ] Read TypeBox readme (used for tool parameter schemas in Pi)

---

## Phase 1 — Pi Codebase Reading (in this order)

### agent-core package (most important)
- [ ] `packages/agent/src/types.ts` — AgentMessage, AgentState, AgentTool, ThinkingLevel
- [ ] `packages/agent/src/agent.ts` — THE core run loop, read every line
- [ ] `packages/agent/src/tools.ts` — tool call → execute → result cycle

### ai package
- [ ] `packages/ai/src/index.ts` — unified provider interface, StreamEvent shape
- [ ] `packages/ai/src/providers/anthropic.ts` — request building, streaming, response parsing

### coding-agent package (selective)
- [ ] `packages/coding-agent/src/session.ts` — AgentSession, event emission, message queue
- [ ] `packages/coding-agent/src/session-manager.ts` — JSONL tree, id/parentId, branch()
- [ ] `packages/coding-agent/src/extensions/api.ts` — how registerTool, on(), registerCommand wire up
- [ ] `packages/coding-agent/src/resource-loader.ts` — AGENTS.md discovery, system prompt assembly

### Examples (read last)
- [ ] `packages/coding-agent/examples/sdk/01-minimal.ts`
- [ ] `packages/coding-agent/examples/sdk/05-tools.ts`

---

## Phase 2 — Week 1 Build Plan (essential pieces only)

### Day 1-2: Minimal SDK Harness
- [ ] Node.js script using createAgentSession()
- [ ] Subscribe to events, print streaming output to stdout
- [ ] Log tool_execution_start and tool_execution_end events
- [ ] Understand the full event lifecycle end to end

### Day 2: First Custom Tool
- [ ] Write one custom tool using defineTool()
- [ ] Wire it in via customTools option
- [ ] Watch agent decide when/how to call it
- [ ] Understand tool result → LLM feedback cycle

### Day 3: Session Persistence and Branching
- [ ] Switch from SessionManager.inMemory() to SessionManager.create()
- [ ] Inspect generated JSONL file manually
- [ ] Understand id/parentId tree structure
- [ ] Call runtime.fork(), inspect branched session

### Day 4: Minimal Extension
- [ ] Extension that subscribes to agent_start and agent_end
- [ ] Register one slash command via pi.registerCommand() that injects context
- [ ] Register one tool via pi.registerTool() inside the extension
- [ ] Load via additionalExtensionPaths in DefaultResourceLoader

### Day 4-5: Context File Experiment
- [ ] Write AGENTS.md with specific constraints and domain context
- [ ] Run sessions with and without it
- [ ] Log session.agent.state.systemPrompt to observe assembly
- [ ] Understand how resource loader discovers and injects it

---

## Phase 2 — What to Skip in Week 1
- TUI package (pi-tui) — terminal rendering, not agent architecture
- Compaction implementation — understand conceptually, don't build yet
- RPC mode and AgentSessionRuntime replacement APIs
- Custom providers and OAuth flows — use env vars only
- RAG, vector databases, embeddings

---

## Future Scope

### ReAct Loop Implementation
- Build an alternate run loop that enforces explicit Reason → Act → Observe structure
- Prompt the LLM to output structured "Thought / Act / Observation" text
- Parse that text output in the loop instead of relying on native tool call API
- Compare behavior and debuggability vs Pi's native tool-call-driven loop
- Useful because: makes agent reasoning visible, works without native tool calling APIs, good learning exercise

### Other Future Items
- [ ] Context compaction — token counting, summarization trigger, branch on compact
- [ ] Steer/followUp message queue — proper mid-stream interruption
- [ ] Auto-retry with exponential backoff on tool failure or malformed LLM response
- [ ] Max turns safety valve
- [ ] Multi-agent pattern — one agent spawning subagents as tools
- [ ] Session branching UI
- [ ] RAG for long-term memory beyond context window

---

## Run Loop Mental Model (reference)

```
OUTER LOOP (followUp handler):
  currentMessage = initialPrompt or followUp from previous iteration

  INNER LOOP (turn cycle):
    if steer messages pending → inject as user messages, clear queue
    stream LLM response with current messages + tools
      text delta → emit to subscriber immediately
      tool call delta → buffer and accumulate
      abort signal → break if fired
    append assistant message (text + tool_calls) to messages and newMessages
    if no tool calls OR abort OR shouldStopAfterTurn OR maxTurns exceeded → break
    execute all tool calls in parallel (Promise.all)
    append tool results to messages and newMessages
    emit tool events
    increment turn counter
    loop back

  check followUp queue
  if followUp exists → set as currentMessage, continue outer loop
  else → break outer loop

emit agent_end
return newMessages
```

### Key invariants to never forget
- messages array = full history sent to LLM every call (statefulness lives here)
- newMessages array = only what this runLoop() call produced (returned to caller, persisted)
- steer → injected at top of next turn (interrupts)
- followUp → delivered only after inner loop exits completely (queues after)
- tool execution is always parallel (Promise.all)
- tool failure returns error as tool result content, does not throw (LLM decides recovery)
- loop exit condition = no tool calls in last response (not user intent, not time)

---

## API Key Strategy (student)
- Primary: Anthropic API — free credits on signup, use claude-haiku-4-5 (~$0.25/million tokens)
- Free alternative: Google Gemini Flash API — free tier, no billing required under quota
- Set via env var: ANTHROPIC_API_KEY or GEMINI_API_KEY
- Do not use expensive models (Opus, Sonnet) for loop testing — Haiku is sufficient

---

## Post-MVP: Correctness Fixes (2026-09-16)
Found while reviewing the published MVP against real agent-loop mechanics. All fixed:
- [x] `ReadFile`/`EditFile` called `JSON.parse` on raw file content — broke on any non-JSON file
- [x] Agent loop had no real `messages[]` history — was mutating `req.message` with string concat each turn instead of threading conversation state
- [x] OpenAI/Deepseek providers now send full message history (including tool results) instead of one flattened string
- [x] Session tree `id`/`parentId` were hardcoded placeholder strings (`"random id for now"` etc.) — now a real chain
- [x] Tool calls executed sequentially in a loop — now `Promise.all` (parallel, matches real Pi/Claude Code loop)
- [x] `bash` tool had no timeout — a hung command hung the whole agent forever; added 30s timeout + output truncation
- [x] `packages/core/tsconfig.json` extended a root `tsconfig.json` that didn't exist — check-types was silently broken; gave it its own base config
- [x] `apps/pi-cli/tsconfig.json` had a dead `express` path mapping and an invalid `ignoreDeprecations` value blocking typecheck — removed
- [x] Replaced raw `console.log`/`console.warn`/`console.error` debug spam across `packages/core` and `apps/pi-cli` with a real pino logger (`packages/core/logger.ts`); routed to stderr (not pino's stdout default) since `memory-service.ts` relies on a clean stdout for its `JSON.parse`d subprocess protocol; kept genuine user-facing CLI output (Q/A printout, confirm prompts, session-saved messages) as plain output, not logging
- [x] `memory-service.ts` was failing with `ERR_MODULE_NOT_FOUND: dotenv` — root cause was `bunx tsx` (real Node.js) not resolving bun's workspace `node_modules/.bun` store; fixed by ensuring the package link exists, not by switching runtimes (tried `bun run` instead of `bunx tsx` first — reverted, since `mem0ai`'s history DB uses `better-sqlite3`, a native addon bun can't `dlopen`, so Node is required here)
- [x] Memory unplugged by default (`MEMORY_ENABLED` env var, off unless set) — it spawned a subprocess per turn and needed `DEEPSEEK_API_KEY` + pgvector + ollama configured to even work; not worth the latency or failure surface for short-running tasks. Calls are also wrapped in try/catch now so a future re-enable with a bad config degrades to "no memory" instead of killing the whole agent run (this is literally what just happened — a misconfigured memory service took down an otherwise-working prompt)

## Roadmap — closing the gap with real Pi / Claude Code
Ordered roughly by leverage. Goal: get this to a state where a SWE-bench Lite run is a meaningful signal, not a foregone 0%.

### Near-term (unblocks everything else)
- [x] Anthropic provider wired up properly — `providers/anthropic.ts` rewritten to match the same `(key, llmContext, model, toolList)` shape as openai/deepseek, real message conversion (tool results collapsed into `tool_result` blocks on a user message, since Anthropic forbids two consecutive same-role messages), `normalizeAnthropicResponse` fixed to actually extract `tool_use` blocks into `ToolCall[]` (was hardcoded to `[]`), uncommented in `llm.ts`. Not live-tested (no Anthropic key configured) but typechecks clean and follows the same pattern verified working for deepseek.
- [x] Max turns safety valve — `MAX_TURNS = 25` in `agent.ts`, loop returns a structured stopped-response instead of looping forever
- [x] Auto-retry with backoff on LLM call failure — `withRetry()` in `agent.ts`, 3 attempts, linear backoff, wraps `LLMCall`; real last error now surfaces instead of a swallowed generic message
- [x] Real tool-name consistency pass — `packages/core/tools/index.ts` `Tool.name` fields (`read_file`/`write_file`/`edit_file`) renamed to match the actual dispatch names (`read`/`write`/`edit`) used by agent.ts and the provider schemas
- [x] Fixed a real, previously-undetected bug found while testing streaming: deepseek/openai tool schemas told the LLM the write/edit path param was called `filePath` and edit's content param was `content`, but `tools.ts`'s actual `ReadFile`/`WriteFile`/`EditFile` read `input.path`/`input.old_string`/`input.new_string` — meaning `write`/`edit` silently got `path: undefined` through both providers and never actually worked. Fixed both schemas to match the real tool signatures; confirmed with a live write-to-file test.
- [x] Deleted genuinely dead code found during this pass: `packages/core/types.ts` (whole file, zero live imports, superseded by `models/model.ts`), unused `ReadTool`/`WriteTool`/`EditTool`/`BashTool`/`AgentContext` interfaces in `model.ts`, unused `allTools` export in `tools/index.ts`, unused `NODE_BIN` in `memory/index.ts`. Left `config.ts`'s commented-out `transformContext` idea alone (real unbuilt-feature scaffolding, not noise).
- [ ] Context compaction — right now `messages[]` grows unbounded; will blow context window on any real multi-step SWE task

### Steering / long-running tasks (your idea)
- [ ] followUp / steer message queue — let a user inject a new instruction mid-run without killing the loop, matches the "steer → injected at top of next turn" invariant already documented above
- [ ] Abort/interrupt handling that actually cancels an in-flight LLM stream, not just a flag checked after the fact
- [ ] Background/async task mode — kick off a long task, detach, reattach later (this is what makes "long running task" meaningfully different from a single CLI call)

### TUI (your idea)
- [x] Streaming token output to terminal — `onToken` callback threaded through `AgentRequest` → `LLMRequest` → each provider's Call function; deepseek and openai use real SSE delta accumulation (`chat.completions.create({stream:true})` / `responses.create({stream:true})`), anthropic uses the raw Messages stream events (`content_block_delta`, collapsing `text_delta`/`input_json_delta` by block index); all three still return the same shape the non-streaming normalizers already expect, so `normalizeOpenAIResponse`/`normalizeAnthropicResponse` didn't need to change. `apps/pi-cli/prompt.ts` writes deltas straight to stdout live. Verified end-to-end with the real deepseek key — text streams, tool calls still work, confirm gate still fires correctly mid-stream.
- [ ] Live view of tool calls as they execute, not just post-hoc debug logs
- [ ] Session/branch picker — the JSONL tree exists conceptually (parentId chain) but nothing surfaces it to a user

### Evals / benchmarking (your idea)
- [ ] Write ~10-20 hand-picked small coding tasks first (read/edit/bash only, no SWE-bench harness yet) — cheap way to catch loop bugs before spending API credits on a real benchmark
- [ ] Then SWE-bench Lite subset once the above is stable
- [ ] Track basic eval metrics: task success rate, tool-call count per task, tokens per task, wall-clock time — these are the numbers worth putting on a resume, not just "ran SWE-bench"

### Other high-value additions
- [x] Guard rails / permission prompts before bash/write/edit — `AgentRequest.confirmTool` callback, gated in `agent.ts` for `write`/`edit`/`bash` (not `read`, non-destructive); `apps/pi-cli` wires it to a real `readline/promises` y/N terminal prompt in `prompt.ts`; decline returns a tool-result telling the LLM the user said no, doesn't throw
- [ ] Subagent spawning — one agent call delegating a sub-task to another agent call, already scoped in the original planner.md "Future Scope"
- [ ] Re-enable memory for long-running/multi-session tasks — needs a real `.env` (`DEEPSEEK_API_KEY`) plus pgvector + ollama running, then flip `MEMORY_ENABLED=true`; worth revisiting once steering/background task mode exists, since that's when cross-session context actually starts to matter