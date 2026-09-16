// import { AgentContext, LLMContext, Tool } from "../types";
import OpenAI from 'openai'
import { LLMContext, ToolName } from '../models/model';

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
          filePath: { type: "string" },
        },
        required: ["filePath"],
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
          filePath: { type: "string" },
          content: { type: "string"}
        },
        required: ["filePath", "content"],
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
      description: "Edit file with given content",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          content: { type: "string"}
        },
        required: ["filePath", "content"],
        additionalProperties: false,
      },
    },
  ],
};
export async function OpenAICall(key: string, llmContext: LLMContext, model: string, toolList: ToolName[]){
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
        const response = await client.responses.create({
            model: model,
            input,
            instructions: llmContext.systemPrompt,
            tools:[availableTools, {type: "tool_search"}],
            parallel_tool_calls: false
        })
        
        console.log("LLM generated, ", response)
        console.log("Tools calls demanded are", response.tools)
        return response
    }catch(e){
        console.log(e, " is the error occured while generating response")
        return ;
    }
}