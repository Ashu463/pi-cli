import fs from "fs"
import path from "path"

const SENSITIVE_PATTERNS: RegExp[] = [
  /(^|\/)\.env($|\.)/,
  /(^|\/)\.npmrc$/,
  /(^|\/)\.netrc$/,
  /(^|\/)\.git-credentials$/,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
  /\.(pem|key|p12|pfx|keystore)$/,
  /(^|\/)credentials(\.json)?$/,
  /(^|\/)service-account.*\.json$/,
  /(^|\/)\.aws\//,
  /(^|\/)\.ssh\//,
  /(^|\/)\.gnupg\//,
  /(^|\/)\.pi-cli\//
]

export class GuardrailError extends Error {}

export function isSensitivePath(absPath: string): boolean {
  const normalized = absPath.split(path.sep).join("/")
  return SENSITIVE_PATTERNS.some(re => re.test(normalized))
}

export function resolveWithinCwd(inputPath: string, cwd: string): string {
  if (!inputPath) throw new GuardrailError("No path provided")

  const root = fs.realpathSync(path.resolve(cwd))
  const target = path.resolve(root, inputPath)

  let existing = target
  while (!fs.existsSync(existing) && path.dirname(existing) !== existing) {
    existing = path.dirname(existing)
  }
  const realExisting = fs.realpathSync(existing)
  const real = path.join(realExisting, path.relative(existing, target))

  if (real !== root && !real.startsWith(root + path.sep)) {
    throw new GuardrailError(
      `Refused: ${inputPath} is outside the working directory (${root}). Only files inside the project can be accessed.`
    )
  }
  if (isSensitivePath(real)) {
    throw new GuardrailError(`Refused: ${inputPath} looks like a secret or credential file, so it can't be read or written.`)
  }
  return real
}

const BLOCKED_COMMANDS: { pattern: RegExp; reason: string }[] = [
  { pattern: /rm\s+(-[a-zA-Z]*\s+)*-[a-zA-Z]*[rf][a-zA-Z]*\s+\/(\s|$)/, reason: "recursive delete of /" },
  { pattern: /(^|[;&|]\s*)(shutdown|reboot|halt|mkfs|fdisk)\b/, reason: "destructive system command" },
  { pattern: /:\(\)\s*\{.*\}\s*;\s*:/, reason: "fork bomb" },
  { pattern: /\b(curl|wget)\b[^|;]*\|\s*(sudo\s+)?(ba)?sh\b/, reason: "piping a remote script straight into a shell" },
  { pattern: /(^|\/)\.(env|ssh|aws|gnupg|npmrc|git-credentials)\b/, reason: "reading credential files" },
  { pattern: /\bid_(rsa|dsa|ecdsa|ed25519)\b/, reason: "reading private keys" }
]

export function assertBashAllowed(command: string): void {
  for (const { pattern, reason } of BLOCKED_COMMANDS) {
    if (pattern.test(command)) {
      throw new GuardrailError(`Refused: command blocked (${reason}). Ask the user to run it themselves if it's genuinely needed.`)
    }
  }
}
