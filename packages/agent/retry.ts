import { logger } from "./logger"
import { LLM_RETRY_BACKOFF_MS } from "./config/systemConfig"

// retries fn on failure, linear backoff between attempts, rethrows the last error once maxAttempts is exhausted.
export async function withRetry<T>(
  label: string,
  maxAttempts: number,
  fn: () => Promise<T>,
  onRetry?: (attempt: number, maxAttempts: number, error: string) => void
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      const message = e instanceof Error ? e.message : String(e)
      logger.warn({ label, attempt, maxAttempts, error: message }, "retry attempt failed")
      if (attempt < maxAttempts) {
        onRetry?.(attempt, maxAttempts, message)
        await new Promise((resolve) => setTimeout(resolve, LLM_RETRY_BACKOFF_MS * attempt))
      }
    }
  }
  throw lastError
}
