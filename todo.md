# AI Harness Project — Study & Build Plan


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

## Repo Refactor (2026-09-17)
- [x] Moved the context-compaction logic (`estimateTokens`, `findSafeSplitIndex`, `renderTranscript`, `summarizeMessages`, `compactContext`) out of `agent.ts` into its own `context.ts` — that file existed already (empty, unrelated leftover) and is now what its name actually implies
- [x] Extracted `withRetry` into its own `retry.ts` — it's used by both the main turn loop and by compaction, so keeping it inside `agent.ts` would've made `context.ts` depend backwards on `agent.ts`
- [x] Split `config.ts`/`systemConfig.ts` into a real `config/` folder — `config/systemPrompts.ts` (prompt text) + `config/systemConfig.ts` (tunable constants), matching the actual split used in the lovable reference, not just the idea of separating them
- [x] Renamed `packages/core` → `packages/agent`, including `package.json`'s `name` (`@repo/core` → `@repo/agent`), `apps/pi-cli/tsconfig.json`'s path alias, every `@repo/core` import and deep relative import across `apps/pi-cli/src`, and regenerated `bun.lock`. Also fixed `apps/pi-cli/package.json`, which never actually declared `@repo/core` as a dependency — it only worked via the tsconfig path alias, which is fragile; added the real workspace dependency entry while touching this file anyway
- [x] Confirmed `packages/` vs `apps/` placement is correct as-is — a Turborepo splits by "shared library" vs "deployable application," not by consumer count, so the agent engine stays under `packages/` even though only one app currently consumes it
- [x] Deleted `packages/core/types.ts`-adjacent dead file `context.ts`'s prior empty state is now real code (see above); confirmed the rest of `providers/`, `models/`, `tools/`, `memory/` were already sensibly grouped and left untouched
- [x] Verified live after every step — typecheck clean on both packages throughout, plus a real prompt run and a forced-compaction run confirmed nothing broke from the move/rename
- [ ] **Blocked, needs you to do it or grant permission**: three deletions were refused by the sandbox's auto-mode safety classifier ("Irreversible Local Destruction") even though all three are git-tracked and recoverable via history:
  - `apps/pi-cli/commander` — a 63MB PostScript file (not code, `file` identifies it as ImageMagick output), committed since the first commit, unrelated to the `commander` npm package
  - `packages/memory.db` — a SQLite file tracked in git that shouldn't be versioned at all
  - `apps/web` — never-customized `create-turbo`/Next.js scaffold, and already broken (imports `@repo/ui`, which doesn't exist anywhere in this repo)
  Run manually: `rm apps/pi-cli/commander && git rm --cached packages/memory.db && rm -rf apps/web`, then add `*.db` to `.gitignore`. Note `commander`'s 63MB blob stays in git history regardless — removing it from history entirely needs a separate, more invasive rewrite, not done here.

## Roadmap — closing the gap with real Pi / Claude Code
Ordered roughly by leverage. Goal: get this to a state where a SWE-bench Lite run is a meaningful signal, not a foregone 0%.

### Near-term (unblocks everything else)
- [x] Anthropic provider wired up properly — `providers/anthropic.ts` rewritten to match the same `(key, llmContext, model, toolList)` shape as openai/deepseek, real message conversion (tool results collapsed into `tool_result` blocks on a user message, since Anthropic forbids two consecutive same-role messages), `normalizeAnthropicResponse` fixed to actually extract `tool_use` blocks into `ToolCall[]` (was hardcoded to `[]`), uncommented in `llm.ts`. Not live-tested (no Anthropic key configured) but typechecks clean and follows the same pattern verified working for deepseek.
- [x] Max turns safety valve — `MAX_TURNS = 25` in `agent.ts`, loop returns a structured stopped-response instead of looping forever
- [x] Auto-retry with backoff on LLM call failure — `withRetry()` in `agent.ts`, 3 attempts, linear backoff, wraps `LLMCall`; real last error now surfaces instead of a swallowed generic message
- [x] Real tool-name consistency pass — `packages/core/tools/index.ts` `Tool.name` fields (`read_file`/`write_file`/`edit_file`) renamed to match the actual dispatch names (`read`/`write`/`edit`) used by agent.ts and the provider schemas
- [x] Fixed a real, previously-undetected bug found while testing streaming: deepseek/openai tool schemas told the LLM the write/edit path param was called `filePath` and edit's content param was `content`, but `tools.ts`'s actual `ReadFile`/`WriteFile`/`EditFile` read `input.path`/`input.old_string`/`input.new_string` — meaning `write`/`edit` silently got `path: undefined` through both providers and never actually worked. Fixed both schemas to match the real tool signatures; confirmed with a live write-to-file test.
- [x] Deleted genuinely dead code found during this pass: `packages/core/types.ts` (whole file, zero live imports, superseded by `models/model.ts`), unused `ReadTool`/`WriteTool`/`EditTool`/`BashTool`/`AgentContext` interfaces in `model.ts`, unused `allTools` export in `tools/index.ts`, unused `NODE_BIN` in `memory/index.ts`. Left `config.ts`'s commented-out `transformContext` idea alone (real unbuilt-feature scaffolding, not noise).
- [x] Context compaction — implemented in `agent.ts`, design adapted from a `ManageContext()` pattern in a separate project (github.com/Ashu463/lovable, `packages/agents/agent/agent.ts`), stripped of that repo's business-specific plumbing (R2 sync, BAML, Langfuse tracing, Postgres session state):
  - `estimateTokens()` — char-count heuristic (~4 chars/token), not tiktoken; tiktoken's encodings are OpenAI-specific and would be misleading given this project talks to deepseek/anthropic too, which use different tokenizers
  - `COMPACT_TOKEN_THRESHOLD = 50_000` (default), overridable via `COMPACT_TOKEN_THRESHOLD_OVERRIDE` env var since the "right" threshold really depends on the model's actual context window, which isn't tracked anywhere yet
  - Called at the end of every turn in the loop, only when another turn is about to happen. `messages[0]` (the original task instruction) is never touched. Everything after it gets split at a *safe* boundary — `findSafeSplitIndex` walks to the nearest point right before an `assistant` message, never mid-way through an assistant/tool-result exchange, since slicing there produces an invalid message sequence (Anthropic rejects it outright; every provider gets confused by it)
  - Only the older half gets summarized (dedicated LLM call, `compactSystemPrompt` in `config.ts`, asks for a dense factual record not prose); recent half stays verbatim. Falls back to summarizing everything if the older-half compaction alone wasn't enough
  - Found and fixed a real bug while testing this: the summarization call was getting the full read/write/edit/bash tool schema attached anyway, regardless of asking for no tools — `llm.ts` was silently ignoring `llmContext.tools` and always substituting its own hardcoded list before calling any provider, and each provider (`openai.ts`/`deepseek.ts`/`anthropic.ts`) unconditionally attached its own tool schema too. The model would call tools (sometimes on hallucinated paths) instead of summarizing, and `summarizeMessages` silently fell back to a placeholder. Fixed `llm.ts` to forward the caller's actual `llmContext.tools`, and all three providers to omit the tools param from their API call entirely when that list is empty. Verified live: forced compaction with a tiny threshold override, confirmed real summary text comes back, confirmed normal tool-calling (write/edit) still works unaffected afterward.
  - Known gap, not fixed: compaction only ever compacts `messages[]` on the *next* provider call — if a single turn's own content (e.g. one huge tool output) already exceeds the threshold, that's only caught after the fact.

### Steering / long-running tasks (your idea)
- [ ] followUp / steer message queue — let a user inject a new instruction mid-run without killing the loop, matches the "steer → injected at top of next turn" invariant already documented above
- [ ] Abort/interrupt handling that actually cancels an in-flight LLM stream, not just a flag checked after the fact
- [ ] Background/async task mode — kick off a long task, detach, reattach later (this is what makes "long running task" meaningfully different from a single CLI call)

### TUI (your idea)
- [x] Streaming token output to terminal — `onToken` callback threaded through `AgentRequest` → `LLMRequest` → each provider's Call function; deepseek and openai use real SSE delta accumulation (`chat.completions.create({stream:true})` / `responses.create({stream:true})`), anthropic uses the raw Messages stream events (`content_block_delta`, collapsing `text_delta`/`input_json_delta` by block index); all three still return the same shape the non-streaming normalizers already expect, so `normalizeOpenAIResponse`/`normalizeAnthropicResponse` didn't need to change. `apps/pi-cli/prompt.ts` writes deltas straight to stdout live. Verified end-to-end with the real deepseek key — text streams, tool calls still work, confirm gate still fires correctly mid-stream.
- [x] Live view of tool calls as they execute — `packages/tui` (AEON), built on `@opentui/react`. Tool blocks go pending → ok/error via new `onToolCall`/`onToolResult` callbacks on `AgentRequest`; `onRetry` surfaces LLM retries in the status line; the y/N confirm gate works through `useKeyboard` instead of blocking `readline`
- [x] AEON home screen — block ASCII logo with a teal→gold gradient, tagline, centered prompt panel, provider/model line, cwd:branch + version footer. Palette taken from the galaxy artwork (`src/theme.ts`)
- [x] Fixed prompt hiding the start of long messages — opentui's `<input>` keeps the cursor 20% from the right edge (`scrollMargin: 0.2`), so in a narrow terminal it scrolled early. Replaced with a word-wrapping `<textarea>` (enter sends, shift+enter newline); regression tests at widths 60/85/110 in `App.test.tsx`
- [ ] Session/branch picker — the JSONL tree exists conceptually (parentId chain) but nothing surfaces it to a user
- [ ] Image input + analysis — let the user attach an image (paste a path or drag a file into the prompt) and send it to a vision-capable model. Needs: an image content part in `ChatMessage`, per-provider conversion (Anthropic image blocks, OpenAI `input_image`), a check that the selected model actually supports vision, and a TUI indicator for attached images
- [ ] Launch AEON from the CLI — `packages/tui` currently runs via `bun run dev`; `apps/pi-cli` still needs a command (e.g. bare `nive`) that calls `runTui()`

### Evals / benchmarking (your idea)
- [ ] Write ~10-20 hand-picked small coding tasks first (read/edit/bash only, no SWE-bench harness yet) — cheap way to catch loop bugs before spending API credits on a real benchmark
- [ ] Then SWE-bench Lite subset once the above is stable
- [ ] Track basic eval metrics: task success rate, tool-call count per task, tokens per task, wall-clock time — these are the numbers worth putting on a resume, not just "ran SWE-bench"

### Other high-value additions
- [x] Guard rails / permission prompts before bash/write/edit — `AgentRequest.confirmTool` callback, gated in `agent.ts` for `write`/`edit`/`bash` (not `read`, non-destructive); `apps/pi-cli` wires it to a real `readline/promises` y/N terminal prompt in `prompt.ts`; decline returns a tool-result telling the LLM the user said no, doesn't throw
- [x] Exposure guardrails (`packages/agent/guardrails.ts`) — the confirm gate only covered *destructive* actions; nothing stopped the agent reading secrets or files outside the project, and `read` was never gated at all. Now: every file tool resolves its path against the session `cwd` and refuses anything outside it (traversal, absolute paths, and symlinks pointing out — resolved via `realpath` on the nearest existing ancestor); a blocklist refuses `.env*`, `*.pem/key/p12`, `id_rsa*`, `.ssh/`, `.aws/`, `.npmrc`, `credentials.json` etc. even inside the project; `bash` now ignores the model-supplied `cwd` (honouring it would undo every path guard) and blocks obvious credential snooping / `curl | sh` / fork bombs. Refusals return as normal tool results so the model adapts instead of crashing. 9 tests in `guardrails.test.ts` cover each escape route, plus a live run confirming `packages/.env` is refused end-to-end.
- [ ] Guardrail gaps worth knowing: `bash` is a blocklist, not a sandbox — a determined prompt-injection could still get around it (real fix is a container/seccomp sandbox). And the agent sends project code to the provider *by design*, so these guards stop unintended exposure, not the fundamental model. Consider: a `--yolo` flag to skip confirms, and an allowlist mode for CI.

### Release / distribution
- [ ] Publish AEON to npm as the release path. Two hard constraints, both verified: `@opentui/core` ships a native `libopentui.so` via 8 platform-specific optional deps, and the agent uses `Bun.spawnSync` (`tools/tools.ts`, `tui/src/env.ts`) — so it needs the Bun runtime and can't be flattened into one bundled file like `pi-cli` currently builds. Ship `@opentui/*` as real dependencies (not bundled), install via `bun install -g` / `bunx`.
- [x] CLI entry launches the TUI — bare `aeon` opens AEON (commander `.action()` default), `aeon tui` explicit, `aeon run --p "…"` (alias of `prompt`) stays headless for scripting/CI, config commands unchanged. The TUI is imported lazily so `login`/`set`/`--help` never boot the renderer.
- [x] Fixed the build for release — the old `--target node … --packages bundle` bundled fine but **crashed at runtime**: `@opentui/core-linux-x64` is a native `.so` loaded through FFI at runtime and cannot be bundled (failed under node *and* bun). Build is now `--target bun … --external '@opentui/*'` with `@opentui/core`/`@opentui/react`/`react` declared as real dependencies of the CLI. Verified: built bundle opens the TUI and completes a real prompt.
- [x] Removed the Bun-only APIs (`Bun.spawnSync` → `node:child_process.spawnSync` in `tools/tools.ts` and `tui/src/env.ts`) and build with `--target node --external '@opentui/*' --external react`. One artifact now serves both runtimes: headless `aeon run --p "…"` works on plain **node**, and the same bundle renders the full TUI under **bun**.
- [ ] **The UI itself requires Bun — verified, not assumed.** OpenTUI's package exports a `"node"` entry, but it's a stub that throws *"OpenTUI native FFI is not available for this runtime yet"*. So on a node-only machine `aeon` cannot draw the UI no matter how it's bundled. This is exactly why OpenCode ships 12 prebuilt platform binaries instead of a plain npm package — the compiled binary embeds the Bun runtime.
- [x] Graceful degradation instead of a stack trace — a node-only user running `aeon` now gets a short message explaining the UI needs Bun, the one-line install command, and a pointer to `aeon run --p "…"` which works for them today.
- [x] Path (a) prepared and verified: package renamed `@ashuk971/nive` → **`aeon-ai`** (name confirmed free), bin `nive` → `aeon`, version 0.3.0, MIT, repo/keywords/engines filled in, `prepublishOnly` builds. Runtime deps trimmed to just `@opentui/core`, `@opentui/react`, `react` — everything else (`openai`, `@anthropic-ai/sdk`, `commander`) is inlined by the bundler, `axios` was entirely unused, and the workspace deps moved to devDependencies since `workspace:*` would break `npm i -g`. Published README written for npm users.
- [x] Verified by installing the actual tarball into a clean directory, not just by packing it: 176 KB / 3 files; `aeon --help` works; `aeon run --p "…"` did real work (wrote a file, approval prompt fired); TUI renders under bun; guardrails still refused `~/.pi-cli/settings.json`; node-only users get the friendly Bun message.
- [ ] **Run `npm publish` — needs your npm login** (`npm whoami` currently returns 401). Nothing else is blocking.
- [x] Path (b) done — standalone compiled binaries, no Bun/node_modules required to run them. Real finding along the way: **no OS matrix needed**. `@opentui/core`'s native renderer ships as per-platform optional deps (`@opentui/core-<os>-<arch>`); `bun install --os=X --cpu=Y` force-fetches a different platform's package, and `bun build --compile --target=bun-X-Y` embeds that native library plus a matching Bun runtime into one file — verified for linux-x64 (native), and cross-compiled darwin-x64/arm64 and windows-x64, all from this one Linux machine. `scripts/build-binaries.sh` builds all 5 (linux-x64/arm64, darwin-x64/arm64, windows-x64) in one run; ran it for real, got 5 working binaries (77–115 MB each), the linux one executes standalone (`--help`, TUI boot, and a real bash-tool agent run all confirmed with zero Bun or node_modules present).
- [x] `.github/workflows/release-binaries.yml` — builds all 5 on a single `ubuntu-latest` runner via the script above, smoke-tests the linux binary the runner can actually execute, publishes everything to a GitHub Release on any `v*` tag push.
- [x] `install.sh` — `curl -fsSL .../install.sh | bash`, matching OpenCode's pattern. Detects OS/arch, downloads the matching binary from `github.com/Ashu463/pi-cli/releases/latest/download/aeon-<platform>-<cpu>` (confirmed this URL pattern is real — it 302-redirects to the exact latest-release asset, tested against `oven-sh/bun`'s own releases), installs to `~/.aeon/bin/aeon`, prints PATH setup only if needed. Windows and unsupported platforms get a clear error pointing at `npm i -g aeon-ai` instead. Syntax-checked, and every branch (PATH-set / PATH-unset / OS detection) dry-run tested locally — the one thing *not* yet tested is the actual download, since no release has been published.
- [ ] **You still need to**: commit these files, then `git tag v0.3.0 && git push origin v0.3.0` to actually trigger the workflow and produce the first real release. Nothing publishes until that tag is pushed.
- [ ] Once real, update `apps/pi-cli/README.md`'s install section to lead with `curl | bash` (binary, no Bun needed) ahead of `npm i -g aeon-ai` (needs Bun for the UI) — right now it only documents the npm path.
- [ ] Not done: musl variants (Alpine/containers) and windows-arm64 — skipped for the first release to keep the matrix small; add if someone actually needs them.
- [ ] Decide the rename: the command and npm package are still `nive` (`@ashuk971/nive`). Renaming the published package affects existing installs, so needs a deliberate call.
- [ ] Optional later: no-Bun-required install — either swap the two `Bun.spawnSync` calls for `node:child_process`, or `bun build --compile` per-platform binaries on GitHub Releases (the native `.so` makes the compile route the risky one).
- [ ] Subagent spawning — one agent call delegating a sub-task to another agent call, already scoped in the original planner.md "Future Scope"
- [ ] Re-enable memory for long-running/multi-session tasks — needs a real `.env` (`DEEPSEEK_API_KEY`) plus pgvector + ollama running, then flip `MEMORY_ENABLED=true`; worth revisiting once steering/background task mode exists, since that's when cross-session context actually starts to matter


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

