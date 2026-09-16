import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam, MessageParam, Tool } from "@anthropic-ai/sdk/resources/messages/messages";
import { LLMContext, ToolName } from "../models/model";
import { logger } from "../logger";

const anthropicTools: Tool[] = [
  {
    name: "read",
    description: "Read the contents of a file at the given path. Returns the file content as text.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"]
    }
  },
  {
    name: "write",
    description: "Write content to a file, creating it if it doesn't exist or overwriting it if it does.",
    input_schema: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"]
    }
  },
  {
    name: "edit",
    description: "Edit a file by replacing an exact, unique occurrence of old_string with new_string.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string" },
        old_string: { type: "string" },
        new_string: { type: "string" }
      },
      required: ["path", "old_string", "new_string"]
    }
  },
  {
    name: "bash",
    description: "Execute a shell command and return its stdout/stderr output.",
    input_schema: {
      type: "object",
      properties: { command: { type: "string" }, cwd: { type: "string" } },
      required: ["command"]
    }
  }
];

// Anthropic requires tool results back as user-role messages with tool_result blocks,
// and forbids two consecutive same-role messages — so consecutive "tool" ChatMessages
// (multiple results from one turn's parallel tool calls) must collapse into one user message.
function toAnthropicMessages(llmContext: LLMContext): MessageParam[] {
  const messages: MessageParam[] = [];

  for (const m of llmContext.messages) {
    if (m.role === "user") {
      messages.push({ role: "user", content: m.content });
      continue;
    }

    if (m.role === "assistant") {
      const blocks: ContentBlockParam[] = [];
      if (m.content) blocks.push({ type: "text", text: m.content });
      for (const tc of m.toolCalls ?? []) {
        blocks.push({ type: "tool_use", id: tc.id, name: tc.name, input: tc.input });
      }
      messages.push({ role: "assistant", content: blocks });
      continue;
    }

    // m.role === "tool"
    const block: ContentBlockParam = { type: "tool_result", tool_use_id: m.toolCallId, content: m.content };
    const last = messages[messages.length - 1];
    if (last && last.role === "user" && Array.isArray(last.content) && last.content[0]?.type === "tool_result") {
      (last.content as ContentBlockParam[]).push(block);
    } else {
      messages.push({ role: "user", content: [block] });
    }
  }

  return messages;
}

type StreamedBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; jsonAcc: string };

export async function AnthropicCall(key: string, llmContext: LLMContext, model: string, toolList: ToolName[], onToken?: (delta: string) => void) {
  const client = new Anthropic({ apiKey: key });

  try {
    const stream = await client.messages.create({
      model,
      max_tokens: 4096,
      system: llmContext.systemPrompt,
      messages: toAnthropicMessages(llmContext),
      tools: anthropicTools,
      stream: true
    });

    const blocks: Record<number, StreamedBlock> = {};
    let stopReason: string | null = null;

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const cb = event.content_block;
        blocks[event.index] = cb.type === "text"
          ? { type: "text", text: cb.text ?? "" }
          : cb.type === "tool_use"
            ? { type: "tool_use", id: cb.id, name: cb.name, jsonAcc: "" }
            : { type: "text", text: "" }; // other block types (thinking, etc.) — not surfaced to the agent loop
      } else if (event.type === "content_block_delta") {
        const b = blocks[event.index];
        if (!b) continue;
        if (event.delta.type === "text_delta" && b.type === "text") {
          b.text += event.delta.text;
          onToken?.(event.delta.text);
        } else if (event.delta.type === "input_json_delta" && b.type === "tool_use") {
          b.jsonAcc += event.delta.partial_json;
        }
      } else if (event.type === "message_delta") {
        stopReason = event.delta.stop_reason;
      }
    }

    // shape matches the non-streaming Messages response so normalizeAnthropicResponse works unchanged.
    const content = Object.values(blocks).map(b =>
      b.type === "text"
        ? { type: "text", text: b.text }
        : { type: "tool_use", id: b.id, name: b.name, input: b.jsonAcc ? JSON.parse(b.jsonAcc) : {} }
    );

    logger.debug({ content, stopReason }, "LLM generated response");
    return { content, stop_reason: stopReason };
  } catch (e) {
    logger.error({ err: e }, "error occurred while generating response");
    return;
  }
}
