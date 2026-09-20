# AEON

Your personal coding companion — an AI agent that lives in your terminal. It reads your files,
edits them, runs commands, and asks before it touches anything destructive.

```bash
npm i -g aeon-ai
```

## Quick start

```bash
aeon login --provider deepseek --api_key sk-...   # or openai / anthropic
aeon set --provider deepseek --model deepseek-chat
aeon                                              # opens the UI
```

## Commands

| Command | What it does |
| --- | --- |
| `aeon` | Opens the terminal UI (default) |
| `aeon run --p "..."` | One-shot prompt, prints to stdout — for scripts and CI |
| `aeon login --provider <p> --api_key <k>` | Store credentials for a provider |
| `aeon set --provider <p> --model <m>` | Choose the active provider and model |
| `aeon list` | List models available to your key |
| `aeon logout` | Remove stored credentials |

Supported providers: **deepseek**, **openai**, **anthropic**.

## The UI needs Bun

The terminal UI renders through a native library that currently only loads under the
[Bun](https://bun.sh) runtime:

```bash
curl -fsSL https://bun.sh/install | bash
```

Without Bun, `aeon` prints a short note instead of the UI — but every other command,
including `aeon run`, works on Node 18+ as normal.

## What it can do

- **Tools** — read, write, edit, and bash, executed in parallel within a turn
- **Streaming** — replies appear as they're generated
- **Approval prompts** — `write`, `edit`, and `bash` ask for confirmation before running
- **Context compaction** — long sessions are summarised automatically instead of overflowing
- **Retries** — transient provider failures are retried with backoff

## Guardrails

AEON is deliberately confined to the directory you start it in:

- File tools refuse anything outside that directory — traversal, absolute paths, and symlinks
  pointing out are all resolved and rejected
- Secret files (`.env`, `*.pem`, `id_rsa`, `.ssh/`, `.aws/`, `.npmrc`, credential JSON) are refused
  even inside the project
- `bash` ignores any working directory the model asks for, and blocks credential snooping,
  `curl | sh`, and obviously destructive commands

Two things worth knowing: `bash` uses a blocklist, not a sandbox, so treat the approval prompt as
the real control — and like any AI coding tool, the files it reads are sent to your chosen
provider's API.

## Config

Credentials and sessions live in `~/.pi-cli/`. Environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOG_LEVEL` | `info` | Log verbosity (`debug` for tool and request detail) |
| `COMPACT_TOKEN_THRESHOLD_OVERRIDE` | `50000` | When context compaction kicks in |

## License

MIT
