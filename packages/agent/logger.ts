import pino from "pino"
import { LOG_LEVEL } from "./config/systemConfig"

export const logger = pino({
  level: LOG_LEVEL,
  transport: process.stderr.isTTY
    ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname", destination: 2 } }
    : undefined
}, process.stderr.isTTY ? undefined : pino.destination(2))
