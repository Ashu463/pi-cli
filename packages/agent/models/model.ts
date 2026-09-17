
export interface AgentRequest{
    message: string,
    provider: string
    model: string,
    apiKey: string,
    sessionId?: string,
    cwd: string,
    confirmTool?: (call: ToolCall) => Promise<boolean>
    onToken?: (delta: string) => void
    // tool call lifecycle — lets a UI show pending/success/error per call, not just the final result.
    onToolCall?: (call: ToolCall) => void
    onToolResult?: (call: ToolCall, result: string, isError: boolean) => void
    onRetry?: (attempt: number, maxAttempts: number, error: string) => void
}

export interface LLMRequest{
    provider: string,
    model: string,
    apiKey: string,
    llmContext: LLMContext
    onToken?: (delta: string) => void
}
export interface LLMContext{
    messages: ChatMessage[],
    systemPrompt: string,
    tools: ToolName[]
}

export type ChatMessage =
    | { role: "user"; content: string }
    | { role: "assistant"; content: string; toolCalls?: ToolCall[] }
    | { role: "tool"; toolCallId: string; name: string; content: string }

export type ToolName = "read" | "write" | "edit" | "bash"
type stopReason = "completed" | "toolCall" | "aborted" | "error"
export interface LLMResponse{
    output: string
    stopReason: stopReason
    toolCalls: ToolCall[] | undefined
    // tools?: Tool[] this to be made on agent side 
    // before calling tool
}
export interface ToolCall{
    id: string
    name: string
    input: Record<string, unknown>
}
export interface Tool {
  name: string
  description: string
  input_schema: Record<string, unknown>
  execute: (input: Record<string, unknown>, cwd: string) => Promise<string>
}
export type Message = {
    role: "user" | "assistant"; 
    content: string 
};
