
// steps 
/*
- fetch data in form of LLMRequest
- inject system prompt to the user prompt
- run loop here with these params

Run loop steps: 
- accept the user prompt
- give bunch of tools along with this 
- LLM sends you response with the tools it needed 
- run those tools and store their result somewhere
- send that result back to LLM
- along with default settings. 

that means LLM call will have list of available tools, message,(might be user + system prompt or tool response), 

*/

import { AnthropicCall } from "./providers/anthropic";
import { OpenAICall } from "./providers/openai";
import { DeepseekCall } from './providers/deepseek'
// import { LLMRequest, LLMResponse, Tool } from "./types";
import { LLMRequest, LLMResponse, ToolCall, ToolName } from "./models/model";

const availableTools: ToolName[] = ["bash", "edit", "read", "write"]

export async function LLMCall(req: LLMRequest): Promise<LLMResponse> {
  const { apiKey, provider, model, llmContext } = req
    console.log(req, " is the llm req ")

  if (provider === "openai") {
    const res = await OpenAICall(apiKey, llmContext, model, availableTools)
    return normalizeOpenAIResponse(res)
  }

  // if (provider === "anthropic") {
  //   console.log("calling anthropic")
  //   const res = await AnthropicCall(key, llmContext, model, tools)
  //   return normalizeAnthropicResponse(res)
  // }

  if (provider === "deepseek") {
    const res = await DeepseekCall(apiKey, llmContext, model, availableTools)
    return normalizeOpenAIResponse(res) // DeepSeek is OpenAI-compatible
  }

  // if (provider === "google") {
  //   console.log("calling google")
  //   const res = await Googl(key, llmContext, model, tools)
  //   return normalizeGoogleResponse(res)
  // }

  throw new Error(`Unknown provider: ${provider}`)
}


function normalizeOpenAIResponse(res: any): LLMResponse {
  const message = res.choices[0].message
  const finishReason = res.choices[0].finish_reason
  console.log(message.tool_calls, " is the message response recieved from openai/deepseek")

  const toolCalls: ToolCall[] | undefined = (message.tool_calls ?? []).map((tc: any) => ({
    id: tc.id,
    name: tc.function.name,
    input: JSON.parse(tc.function.arguments)
  }))
  

  return {
    stopReason: finishReason === "tool_calls" ? "toolCall"
      : finishReason === "stop" ? "completed"
      : "aborted",
    output: message.content ?? "",
    toolCalls: toolCalls!.length > 0 ? toolCalls : undefined
  }
}

function normalizeAnthropicResponse(res: any): LLMResponse {
  const textBlocks = res.content.filter((b: any) => b.type === "text")
  const toolBlocks = res.content.filter((b: any) => b.type === "tool_use")

  return {
    stopReason: res.stop_reason === "tool_use" ? "toolCall"
      : res.stop_reason === "end_turn" ? "completed"
      : "aborted",
    output: textBlocks.map((b: any) => b.text).join("\n"),
    toolCalls: []
   
  }
}

function normalizeGoogleResponse(res: any): LLMResponse {
  const candidate = res.candidates[0]
  const parts = candidate.content.parts

  const textParts = parts.filter((p: any) => p.text)
  const functionCalls = parts.filter((p: any) => p.functionCall)

  return {
    stopReason: functionCalls.length > 0 ? "toolCall"
      : candidate.finishReason === "STOP" ? "completed"
      : "aborted",
    output: textParts.map((p: any) => p.text).join("\n"),
    toolCalls: []
    
  }
}