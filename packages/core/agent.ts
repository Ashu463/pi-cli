import { randomBytes, randomUUID } from "crypto";
import { getAllTools } from "../tools";
import { LLMCall } from "./llm";
import { AgentResponse, message, SessionData } from "./models/clientTypes";
import { AgentRequest, LLMContext, LLMRequest, LLMResponse, Message, ToolName } from "./models/model";
import { bashTool, editFileTool, readFileTool, writeFileTool } from "./tools";
import { systemPrompt } from "./config";
import { addMemory, searchMemory } from "./memory";
/*
- fetch data in form of LLMRequest
- inject system prompt to the user prompt
- run loop here with these params
- store into the sessions array
- update the memory 
- update context. 
*/

export async function AgentCall(req: AgentRequest): Promise<AgentResponse>{

  // refactoring or (mp normalizing) the prompt
  // adding this prompt into context or it's summary version
  // make the LLM call
  // judege whether the response happened due to tool call or completed
  // fetch the tool calls needed. 
  // execute the tool calls
  // save their results 
  // repeat the process. 

  let firstTurn = true;
  let ToolResult :string = ""
  let finalOutput : string = ""
  let agentRes: AgentResponse 
  
  let data: SessionData[] = []
  // 
  // first create session
  if(req.sessionId){
    data.push({
      id: randomUUID(),
      parentId: "random-abhi-ke-liye",
      timestamp: new Date().toISOString(),
      type: "session",
      sessionId: req.sessionId,
      cwd: req.cwd
    })
  }  
  data.push({
    id: randomBytes(4).toString(),
    parentId: "randome abhi ke liye", // #TODO: implement tree and store prev node id here.
    type: "message",
    role: "user",
    message: {
      type: "text",
      content: req.message
    },
    timestamp: new Date().toISOString()
  })
  const relevantMemories = searchMemory(req.message);
  console.log(relevantMemories, " is the fetched memory")
  // while (true) {
    let hasMoreToolCalls = true

    while (hasMoreToolCalls) {
      if(!firstTurn){
        req.message += ToolResult
      }
      else firstTurn = false;

      console.log(req.message, " is the message with which LLM called")
      const response: LLMResponse = await streamLLM(req)
      console.log(response, " is the reponse from LLM inside runLooop")
      data.push({
        id: randomBytes(4).toString(),
        parentId: "random id for now",
        type: 'message',
        role: 'assistant',
        message: {
          content: response.output,
          toolCalls: response.toolCalls
        },
        timestamp: new Date().toISOString()
      })
      if (response.stopReason === 'aborted') {
        console.log("stopping LLM due to aborting")
        
        data.push({
          id: randomBytes(4).toString(),
          parentId: "randome abhi ke liye", // #TODO: implement tree and store prev node id here.
          type: "message",
          role: "assistant",
          message: {
            content: "LLM call aborted"
          },
          timestamp: new Date().toISOString()
        })
        return {
          message: "LLM aborted",
          data: data
        }
      }
      if(response.stopReason === 'error'){
        console.log("stopping LLM due to error")
        data.push({
          id: randomBytes(4).toString(),
          parentId: "randome abhi ke liye", // #TODO: implement tree and store prev node id here.
          type: "message",
          role: "assistant",
          message: {
            content: "Error occurred"
          },
          timestamp: new Date().toISOString()
        })
        return {
          message: "Error occurred",
          data: data
        }
      }
      // var context: AgentContext[]
      if (response.stopReason === 'toolCall') {
        console.log("Inside tool call handling of runLoop", response.output)
        // extract tool calls from response
        // execute each tool
        // append results to context
        // context!.push({//   role: "assistant",
        //   content: response.output_text
        // })
        // 2. execute each requested tool
        if(response.toolCalls){
          for(const call of response.toolCalls){
            try{
              switch(call.name){
                case "read":
                  ToolResult = await readFileTool.execute(call.input)
                  break;
                case "write":
                  ToolResult = await writeFileTool.execute(call.input)
                  break;
                case "edit":
                  ToolResult = await editFileTool.execute(call.input)
                  break;
                case "bash":
                  ToolResult = await bashTool.execute(call.input)
                  break;
  
                default:
                  ToolResult = `Unknown tool: ${call.name}`
              }
              data.push({
                id: randomBytes(4).toString(),
                parentId: "asdf", // #TODO: implement tree and store prev node id here.
                timestamp: new Date().toISOString(),
                type: "message",
                role: "toolCall",
                message:{
                  toolName: call.name,
                  content: {
                    text: ToolResult,
                    isError: false,
                    timestamp: new Date().getTime()
                  }
                }
              })
            }
            catch(e){
              data.push({
                id: randomBytes(4).toString(),
                parentId: "asdf", // #TODO: implement tree and store prev node id here.
                timestamp: new Date().toISOString(),
                type: "message",
                role: "toolCall",
                message:{
                  toolName: call.name,
                  content: {
                    text: ToolResult,
                    isError: true,
                    timestamp: new Date().getTime()
                  }
                }
              })
            }
            console.log(ToolResult, " is the result")
            
          }
        }

        // for (const call of toolCalls) {
        //   const tool = req.tools.find(t => t.name === call.name)

        //   let result: string
        //   if (!tool) {
        //     result = `Error: tool "${call.name}" not found`
        //   } else {
        //     try {
        //       result = await tool.execute(call.input)
        //     } catch (e) {
        //       result = `Error executing ${call.name}: ${(e as Error).message}`
        //     }
        //   }

        //   // 3. append tool result into context so the next LLM call sees it
        //   context!.push({
        //     role: "tool_result",
        //     content: JSON.stringify({ tool_call_id: call.id, name: call.name, output: result })
        //   })
        // }
      } else {
          // context!.push({
          //   role: "assistant",
          //   content: response.output_text
          // })
        // 'completed' — push assistant message to context
        hasMoreToolCalls = false
        finalOutput = response.output
        data.push({
        id: randomBytes(4).toString(),
        parentId: "random id for now",
        type: 'message',
        role: 'assistant',
        message: {
          content: response.output
        },
        timestamp: new Date().toISOString()
      })
      }
      // hasMoreToolCalls = false; // temp cond
    }
    const newTurns: Message[] = data
  .filter((e): e is message => e.type === "message")
  .filter(
    (e): e is message & { role: "user" | "assistant" } =>
      e.role === "user" || e.role === "assistant"
  )
  .map((e) => ({
    role: e.role as "user" | "assistant",
    content: e.message.content as string,
  }));
    console.log(newTurns, " is the payload to send in add memory")
    const addMemoryRes = addMemory(newTurns)
    console.log(addMemoryRes, " is the memory res")
  //   break;

  //   // outer loop: wait for next user input / steering / followup
  // }
  return {
    message: ToolResult,
    data: data
  }
}
const availableTools: ToolName[] = ["bash", "edit", "read", "write"]
async function streamLLM(req: AgentRequest): Promise<LLMResponse> {
  // TODO: apply context if configured
  // convert to LLM compatible msgs. ~ not needed in our case. 
  // build LLM context, system, user prompt and tools
  const llmContext: LLMContext = {
    systemPrompt: systemPrompt,
    content: req.message,
    tools: availableTools
  }
  const llmReq: LLMRequest = { ...req, llmContext }

  try {
    const response = await LLMCall(llmReq)
    return response
  } catch (e) {
    throw new Error("Error while fetching the response")
  }
}
