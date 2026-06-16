// import { AgentContext, LLMContext, Tool } from "../types";
import OpenAI from 'openai'
import { LLMContext, ToolName } from '../model';


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
export async function DeepseekCall(key: string, llmMessage: LLMContext, model: string, toolList: ToolName[]){
    const client = new OpenAI({
        baseURL: 'https://api.deepseek.com',
        apiKey: key

    });
    try{
        const response = await client.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                {
                    role: 'user',
                    content: llmMessage.content + llmMessage.systemPrompt
                }
            ],
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