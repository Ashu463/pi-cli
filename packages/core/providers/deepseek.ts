// import { AgentContext, LLMContext, Tool } from "../types";
import OpenAI from 'openai'
import { LLMContext, ToolName } from '../models/model';


const deepseekTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "read",
      description: "Read file from given path",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" }
        },
        required: ["filePath"]
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
          filePath: { type: "string" },
          content: { type: "string" }
        },
        required: ["filePath", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "edit",
      description: "Edit file",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string" },
          content: { type: "string" }
        },
        required: ["filePath", "content"]
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
export async function DeepseekCall(key: string, llmContext: LLMContext, model: string, toolList: ToolName[]){
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
        const response = await client.chat.completions.create({
            model: "deepseek-chat",
            messages,
            tools: deepseekTools,
            tool_choice: "auto"
        })
        console.log("LLM generated these tool calls ", response.choices[0].message.tool_calls)
        
        if(!response){
            console.log("error occurred in responding")
            return;
        }
        return response
    }
    catch(e){
        console.log(e, " is the error occurred")
    }
    
}