import OpenAI from 'openai'
import { LLMContext, ToolName } from '../models/model';
import { logger } from '../logger';


const deepseekTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "read",
      description: "Read file from given path",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" }
        },
        required: ["path"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write",
      description: "Write given content into a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit",
      description: "Edit a file by replacing an exact, unique occurrence of old_string with new_string",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          old_string: { type: "string" },
          new_string: { type: "string" }
        },
        required: ["path", "old_string", "new_string"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bash",
      description: "Execute bash commands",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string" }
        },
        required: ["command"]
      }
    }
  }
];
export async function DeepseekCall(key: string, llmContext: LLMContext, model: string, toolList: ToolName[], onToken?: (delta: string) => void){
    const client = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: key

    });
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: llmContext.systemPrompt },
        ...llmContext.messages.map((m): OpenAI.Chat.ChatCompletionMessageParam => {
            if (m.role === 'tool') {
                return { role: 'tool', tool_call_id: m.toolCallId, content: m.content }
            }
            if (m.role === 'assistant') {
                return {
                    role: 'assistant',
                    content: m.content,
                    tool_calls: m.toolCalls?.map(tc => ({
                        id: tc.id,
                        type: 'function',
                        function: { name: tc.name, arguments: JSON.stringify(tc.input) }
                    }))
                }
            }
            return { role: 'user', content: m.content }
        })
    ]
    try{
        const stream = await client.chat.completions.create({
            model: "deepseek-chat",
            messages,
            tools: deepseekTools,
            tool_choice: "auto",
            stream: true
        })

        let content = ""
        let finishReason: string | null = null
        const toolCallAcc: Record<number, { id: string, name: string, arguments: string }> = {}

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta
            if (delta?.content) {
                content += delta.content
                onToken?.(delta.content)
            }
            if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                    if (!toolCallAcc[tc.index]) toolCallAcc[tc.index] = { id: "", name: "", arguments: "" }
                    if (tc.id) toolCallAcc[tc.index].id = tc.id
                    if (tc.function?.name) toolCallAcc[tc.index].name += tc.function.name
                    if (tc.function?.arguments) toolCallAcc[tc.index].arguments += tc.function.arguments
                }
            }
            if (chunk.choices[0]?.finish_reason) finishReason = chunk.choices[0].finish_reason
        }

        const toolCalls = Object.values(toolCallAcc)
        logger.debug({ toolCalls }, "LLM generated tool calls")

        // shape matches the non-streaming ChatCompletion response so normalizeOpenAIResponse works unchanged.
        return {
            choices: [{
                message: {
                    content,
                    tool_calls: toolCalls.length > 0
                        ? toolCalls.map(tc => ({ id: tc.id, type: 'function' as const, function: { name: tc.name, arguments: tc.arguments } }))
                        : undefined
                },
                finish_reason: finishReason
            }]
        }
    }
    catch(e){
        logger.error({ err: e }, "error occurred calling deepseek")
    }

}