import { LLMCall } from "./llm"
import { AgentRequest, ChatMessage, LLMContext, LLMRequest } from "./models/model"
import { compactSystemPrompt } from "./config/systemPrompts"
import { logger } from "./logger"
import { withRetry } from "./retry"
import { CHARS_PER_TOKEN_ESTIMATE, COMPACT_TOKEN_THRESHOLD, LLM_RETRY_ATTEMPTS } from "./config/systemConfig"

function estimateTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce((sum, m) => {
    const toolCallChars = m.role === "assistant" && m.toolCalls ? JSON.stringify(m.toolCalls).length : 0
    return sum + m.content.length + toolCallChars
  }, 0)
  return Math.ceil(chars / CHARS_PER_TOKEN_ESTIMATE)
}

function findSafeSplitIndex(messages: ChatMessage[], naiveMid: number): number {
  for (let i = naiveMid; i < messages.length; i++) {
    if (messages[i].role === "assistant") return i
  }
  for (let i = naiveMid - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") return i
  }
  return -1
}

function renderTranscript(messages: ChatMessage[]): string {
  return messages.map(m => {
    if (m.role === "user") return `User: ${m.content}`
    if (m.role === "assistant") {
      const toolPart = m.toolCalls?.length ? ` [called: ${m.toolCalls.map(tc => tc.name).join(", ")}]` : ""
      return `Assistant: ${m.content}${toolPart}`
    }
    return `Tool result (${m.name}): ${m.content}`
  }).join("\n\n")
}

async function summarizeMessages(messages: ChatMessage[], req: AgentRequest): Promise<string> {
  const llmContext: LLMContext = {
    systemPrompt: compactSystemPrompt,
    messages: [{ role: "user", content: renderTranscript(messages) }],
    tools: []
  }
  const llmReq: LLMRequest = { provider: req.provider, model: req.model, apiKey: req.apiKey, llmContext }
  const response = await withRetry("context compaction", LLM_RETRY_ATTEMPTS, () => LLMCall(llmReq))
  return response.output || "(compaction produced no summary)"
}

export async function compactContext(messages: ChatMessage[], req: AgentRequest): Promise<ChatMessage[]> {
  const tokens = estimateTokens(messages)
  if (tokens <= COMPACT_TOKEN_THRESHOLD) return messages

  const [head, ...rest] = messages
  if (rest.length < 4) return messages // too small to safely split, let it ride

  const splitIndex = findSafeSplitIndex(rest, Math.floor(rest.length / 2))
  if (splitIndex === -1) return messages // no safe boundary found, skip this round

  logger.info({ tokens, threshold: COMPACT_TOKEN_THRESHOLD }, "context exceeds threshold, compacting older half")

  const olderHalf = rest.slice(0, splitIndex)
  const recentHalf = rest.slice(splitIndex)
  const summary = await summarizeMessages(olderHalf, req)
  const compacted: ChatMessage[] = [
    head,
    { role: "user", content: `[Summary of earlier progress in this task]\n${summary}` },
    ...recentHalf
  ]

  const newTokens = estimateTokens(compacted)
  if (newTokens <= COMPACT_TOKEN_THRESHOLD) {
    logger.info({ before: tokens, after: newTokens }, "compaction brought context under threshold")
    return compacted
  }

  logger.warn({ tokens: newTokens }, "compacting the older half wasn't enough, summarizing full context")
  const fullSummary = await summarizeMessages(rest, req)
  return [head, { role: "user", content: `[Summary of earlier progress in this task]\n${fullSummary}` }]
}
