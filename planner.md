# Pi — Agentic Loop from Scratch
## Architecture Planner

---

## What is Pi?

Pi is a minimal, production-aware agentic loop built to deeply understand how AI agents work under the hood. It is not a framework — it is a harness. Every abstraction is intentional and replaceable.

The mental model: Pi is a while-loop that thinks, acts, and observes until it either has an answer or hits a wall.

---

## MVP Scope

| Dimension       | MVP Decision                            | Future                         |
|----------------|------------------------------------------|--------------------------------|
| Loop           | Single agent, ReAct pattern              | Multi-agent orchestration      |
| Tools          | Static registry                          | Dynamic loading, MCP           |
| Context        | Naive full-history → sliding window      | Summarization, full memory     |
| State          | In-memory + Postgres persistence         | —                              |
| Execution      | CLI only                                 | REST API                       |
| Streaming      | None                                     | SSE / token streaming          |
| Observability  | Structured JSON logs per step            | Run replay, dashboard          |
| LLM Provider   | Gemini only                              | Anthropic, OpenAI              |

---

## Monorepo Package Layout

```
pi-agent/
├── packages/
│   ├── core/        # Agent loop, LLM interface, context manager, shared types
│   ├── tools/       # Tool definitions, static registry, built-in tools
│   ├── db/          # Postgres client, run persistence, schema
│   └── cli/         # Entry point, argument parsing, wiring
├── docs/
│   ├── planner.md   # This file
│   └── todos.md     # Task tracker
├── package.json     # Workspace root
└── tsconfig.json    # Root TS config
```

Package dependency graph (no cycles):

```
cli → core, tools, db
tools → core
db → core
core → (no internal deps)
```

`core` is the kernel. It defines all shared types and interfaces. Nothing inside `core` depends on anything else in the monorepo.

---

## The ReAct Loop (core mental model)

```
user input
    │
    ▼
┌─────────────────────────────────┐
│  add user message to context    │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│     call LLM with context       │  ◄──────────────────────┐
└──────────────┬──────────────────┘                         │
               │                                            │
       ┌───────┴────────┐                                   │
       │                │                                   │
   finish=stop     finish=tool_use                          │
       │                │                                   │
       ▼                ▼                                   │
   return         execute tool(s)                           │
   answer         add result to context ───────────────────►┘
                  (or hit max_iterations → return error)
```

Each iteration consists of exactly one LLM call. Tool results are fed back as messages. The loop exits when:
- LLM returns a final answer (finish_reason = stop)
- Max iteration count is exceeded
- An unrecoverable error occurs

---

## Core Abstractions

### LLMProvider (interface)
Wraps the LLM API. Accepts a message array + tool definitions. Returns content and/or tool calls.
Concrete implementation: GeminiProvider.
The interface exists so swapping providers later requires zero changes to the loop.

### ContextManager
Owns the conversation history. Decides what subset of messages to pass to each LLM call.
Two strategies:
- `naive`: pass everything (simple, works until context window fills)
- `sliding-window`: pass last N messages (protects against overflow, loses early context)

Context strategy is injected at agent construction — the loop doesn't care which one is active.

### ToolDefinition
A tool is a name, a description, a JSON Schema for parameters, and an async execute function.
The LLM sees the name + description + schema. The agent runtime calls execute() with parsed args.

### ToolRegistry
A Map from tool name → ToolDefinition. Statically populated at startup.
The agent is given a list of ToolDefinitions at construction (from the registry). It does not query the registry at runtime — the set of tools is fixed per run.

### Agent
Owns the run loop. Stateless between runs (each `run()` call starts fresh context unless state is restored from DB).
Constructor takes: AgentConfig (systemPrompt, maxIterations, tools, contextStrategy) + LLMProvider.

### Run Persistence (db package)
Each run gets a UUID. Steps are persisted as JSONB rows in Postgres.
Schema: runs table (id, status, config, created_at) + steps table (run_id, iteration, role, content, tool_calls, tool_results, timestamp).
In-memory is the hot path. Postgres writes happen after each step (async, non-blocking to the loop).

---

## JSON Log Format (observability)

Every step emits one structured log line to stdout:

```json
{
  "ts": "2026-06-09T10:00:00.000Z",
  "runId": "abc123",
  "iteration": 2,
  "event": "tool_call",
  "tool": "readFile",
  "args": { "path": "./src/index.ts" },
  "durationMs": 45
}
```

Events: `run_start`, `llm_call`, `llm_response`, `tool_call`, `tool_result`, `run_end`, `run_error`

---

## Key Design Decisions and Rationale

**Why TypeScript and not Go (for MVP)?**
The MVP has no parallelism requirements (single agent, no concurrent tool calls). Go's goroutines would add no value here. TS lets us stay in a familiar environment and focus on the agentic logic. When parallel tool execution is added (future scope), Promise.all is sufficient for I/O-bound tools. Go can be introduced as a tool executor microservice if CPU-bound bottlenecks emerge.

**Why Gemini first?**
Provider-agnostic interface is defined from day one, so switching costs are near zero. Gemini is used concretely to force real integration work rather than abstraction-first design.

**Why static tool registry?**
Dynamic loading adds plugin architecture complexity that is not needed for the learning goal. Static registry keeps the tool system dead simple — add a file, register it in index.ts, done.

**Why naive context first, then sliding window?**
Naive works correctly for short runs. It will visibly break on long runs (context overflow errors from the LLM). That failure is the lesson — you see exactly why context management matters, then implement the fix.

**Why in-memory + Postgres and not Redis?**
In-memory is the latency-optimal path for the hot loop. Postgres is append-only writes for durability. Redis would add a third data store with no clear benefit at this scale. Redis can be added later as a pub/sub layer for streaming or multi-agent coordination.