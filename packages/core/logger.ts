import pino from "pino"

// stderr, always — memory-service.ts prints its actual result as JSON on stdout, which the
// parent process parses via JSON.parse(result.stdout). A log line landing on stdout there
// would corrupt that. Keeping all logging on stderr means it can never collide with real
// stdout output anywhere in the codebase, not just there.
// pretty output on a real terminal, structured JSON otherwise (piped/CI/log aggregation).
// level via LOG_LEVEL env var so verbosity is adjustable without a code change.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.stderr.isTTY
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname", destination: 2 } }
    : undefined
}, process.stderr.isTTY ? undefined : pino.destination(2))
