import pino from "pino"
import pretty from "pino-pretty"
import { LOG_LEVEL } from "./config/systemConfig"

// pino-pretty is passed in as a stream rather than via `transport: { target: "pino-pretty" }`.
// The transport form resolves the module by name inside a worker thread at runtime, which no
// bundler or `bun build --compile` can see — so it crashed in every built artifact whenever
// stderr was a real terminal, while working fine in the repo where node_modules exists.
const stream = process.stderr.isTTY
  ? pretty({ colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname", destination: 2 })
  : pino.destination(2)

export const logger = pino({ level: LOG_LEVEL }, stream)
