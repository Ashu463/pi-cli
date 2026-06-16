export type Role = "user" | "assistant" | "tool_result"

// export interface LLMRequest{
//   prompt: string
//   settings: Settings
// }
// export interface Settings{
//   key: string
//   provider: string
//   model: string
//   thinkingLevel: string
// }




export interface ToolUseBlock {
  type: "tool_use"
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResultBlock {
  type: "tool_result"
  tool_use_id: string
  content: string
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock


export interface RunLoopOptions {
  systemPrompt: string
  messages: Message[]
  tools: Tool[]
  model: string
}








// export interface AssistantMessage {
// 	role: "assistant";
// 	content: (TextContent | ThinkingContent | ToolCall)[];
// 	api: Api;
// 	provider: Provider;
// 	model: string; 
// 	responseModel?: string; // Concrete `chunk.model` when different from the requested `model` (e.g. OpenRouter `auto` -> `anthropic/...`)
// 	responseId?: string; // Provider-specific response/message identifier when the upstream API exposes one
// 	diagnostics?: AssistantMessageDiagnostic[]; // Redacted provider/runtime diagnostics for failures and recoveries.
// 	usage: Usage;
// 	stopReason: StopReason;
// 	errorMessage?: string;
// 	timestamp: number; // Unix timestamp in milliseconds
// }
export interface Message {
  role: Role
  content: string | ContentBlock[]
}
export interface TextBlock {
  type: "text"
  text: string
}
export interface Tool {
  name: string
  description: string
  input_schema: Record<string, unknown>
  execute: (input: Record<string, unknown>) => Promise<string>
}
export interface LLMRequest{
  key: string
  provider: string
  model: string
  llmContext: LLMContext
  tools: Tool[]
}
export interface AgentRequest{
  key: string
  provider: string
  model: string
  message: AgentContext
  tools: Tool[]
}
export type stopReason = "completed" | "aborted" | "toolCall"

export interface LLMResponse{
  stopReason: stopReason // 'completed' | 'aborted' | 'toolCall'
  output_text: string
  toolCalls ?: ToolCall[]
}

export interface ToolReq{
  name: string
  input: string
  command?: string
  file?: string
}
// response of tool is string only

// context for LLM call
export interface LLMContext {
  system_prompt: string
  content: string
  tools: Tool[]
}
export interface AgentContext{
  role: Role
  content: string
}
export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}
