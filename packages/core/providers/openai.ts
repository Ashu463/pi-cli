import OpenAI from 'openai'
import { LLMContext, ToolName } from '../models/model';
import { logger } from '../logger';

const availableTools: OpenAI.Responses.Tool = {
  type: "namespace",
  name: "tools",
  description: "tools",
  tools: [
    {
      type: "function",
      name: "read",
      description: "Read file from given path",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "write",
      description: "Write given content into the file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string"}
        },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "bash",
      description: "Execute shell commands in a bash terminal and return stdout, stderr, and exit code.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
    {
      type: "function",
      name: "edit",
      description: "Edit a file by replacing an exact, unique occurrence of old_string with new_string",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          old_string: { type: "string" },
          new_string: { type: "string" }
        },
        required: ["path", "old_string", "new_string"],
        additionalProperties: false,
      },
    },
  ],
};
export async function OpenAICall(key: string, llmContext: LLMContext, model: string, toolList: ToolName[], onToken?: (delta: string) => void){
    const client = new OpenAI({
        apiKey: key
    });

    const input: OpenAI.Responses.ResponseInputItem[] = llmContext.messages.flatMap((m): OpenAI.Responses.ResponseInputItem[] => {
        if (m.role === 'tool') {
            return [{ type: 'function_call_output', call_id: m.toolCallId, output: m.content }]
        }
        if (m.role === 'assistant') {
            const calls: OpenAI.Responses.ResponseInputItem[] = (m.toolCalls ?? []).map(tc => ({
                type: 'function_call',
                call_id: tc.id,
                name: tc.name,
                arguments: JSON.stringify(tc.input)
            }))
            return m.content
                ? [{ role: 'assistant', content: m.content } as OpenAI.Responses.ResponseInputItem, ...calls]
                : calls
        }
        return [{ role: 'user', content: m.content }]
    })

    try{
        const stream = await client.responses.create({
            model: model,
            input,
            instructions: llmContext.systemPrompt,
            ...(toolList.length > 0 ? { tools: [availableTools, { type: "tool_search" as const }], parallel_tool_calls: false } : {}),
            stream: true
        })

        let finalResponse: OpenAI.Responses.Response | undefined
        for await (const event of stream) {
            if (event.type === "response.output_text.delta") {
                onToken?.(event.delta)
            } else if (event.type === "response.completed") {
                finalResponse = event.response
            }
        }

        logger.debug({ response: finalResponse }, "LLM generated response")
        return finalResponse
    }catch(e){
        logger.error({ err: e }, "error occurred while generating response")
        return ;
    }
}