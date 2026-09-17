import { randomBytes, randomUUID } from "crypto";
import { LLMCall } from "./llm";
import { AgentResponse, message, SessionData } from "./models/clientTypes";
import { AgentRequest, ChatMessage, LLMContext, LLMRequest, LLMResponse, Message } from "./models/model";
import { bashTool, editFileTool, readFileTool, writeFileTool } from "./tools";
import { systemPrompt } from "./config/systemPrompts";
import { addMemory, searchMemory } from "./memory";
import { logger } from "./logger";
import { withRetry } from "./retry";
import { compactContext } from "./context";
import {
  MAX_TURNS,
  LLM_RETRY_ATTEMPTS,
  DESTRUCTIVE_TOOLS,
  MEMORY_ENABLED,
  AVAILABLE_TOOLS
} from "./config/systemConfig";

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

  let ToolResult :string = ""
  let finalOutput : string = ""
  let agentRes: AgentResponse

  let data: SessionData[] = []
  // messages sent to the LLM every call — this is where conversation history actually lives.
  let messages: ChatMessage[] = []
  let lastNodeId: string = "root"
  //
  // first create session
  if(req.sessionId){
    const sessionNodeId = randomUUID()
    data.push({
      id: sessionNodeId,
      parentId: lastNodeId,
      timestamp: new Date().toISOString(),
      type: "session",
      sessionId: req.sessionId,
      cwd: req.cwd
    })
    lastNodeId = sessionNodeId
  }
  const userNodeId = randomBytes(4).toString("hex")
  data.push({
    id: userNodeId,
    parentId: lastNodeId,
    type: "message",
    role: "user",
    message: {
      type: "text",
      content: req.message
    },
    timestamp: new Date().toISOString()
  })
  lastNodeId = userNodeId
  messages.push({ role: "user", content: req.message })
  let relevantMemories = ""
  if (MEMORY_ENABLED) {
    try {
      relevantMemories = searchMemory(req.message)
      logger.debug({ relevantMemories }, "fetched memory")
    } catch (e) {
      logger.warn({ err: e }, "memory search failed, continuing without it")
    }
  }

  // while (true) {
    let hasMoreToolCalls = true
    let turnCount = 0

    while (hasMoreToolCalls) {
      turnCount++
      if (turnCount > MAX_TURNS) {
        logger.warn({ maxTurns: MAX_TURNS }, "stopping after reaching max turns")
        data.push({
          id: randomBytes(4).toString("hex"),
          parentId: lastNodeId,
          type: "message",
          role: "assistant",
          message: {
            content: `Stopped: exceeded max turns (${MAX_TURNS})`
          },
          timestamp: new Date().toISOString()
        })
        return {
          message: `Stopped: exceeded max turns (${MAX_TURNS})`,
          toolResult: ToolResult,
          data: data
        }
      }

      const response: LLMResponse = await streamLLM(req, messages, relevantMemories)
      logger.debug({ response }, "LLM response received")

      const assistantNodeId = randomBytes(4).toString("hex")
      data.push({
        id: assistantNodeId,
        parentId: lastNodeId,
        type: 'message',
        role: 'assistant',
        message: {
          content: response.output,
          toolCalls: response.toolCalls
        },
        timestamp: new Date().toISOString()
      })
      lastNodeId = assistantNodeId
      messages.push({ role: "assistant", content: response.output, toolCalls: response.toolCalls })
      if (response.stopReason === 'aborted') {
        logger.warn("stopping LLM due to aborting")

        data.push({
          id: randomBytes(4).toString("hex"),
          parentId: lastNodeId, // #TODO: implement tree and store prev node id here.
          type: "message",
          role: "assistant",
          message: {
            content: "LLM call aborted"
          },
          timestamp: new Date().toISOString()
        })
        return {
          message: "LLM aborted",
          toolResult: ToolResult,
          data: data
        }
      }
      if(response.stopReason === 'error'){
        logger.error("stopping LLM due to error")
        data.push({
          id: randomBytes(4).toString("hex"),
          parentId: lastNodeId, // #TODO: implement tree and store prev node id here.
          type: "message",
          role: "assistant",
          message: {
            content: "Error occurred"
          },
          timestamp: new Date().toISOString()
        })
        return {
          message: "Error occurred",
          toolResult: ToolResult,
          data: data
        }
      }
      // var context: AgentContext[]
      if (response.stopReason === 'toolCall') {
        logger.debug({ output: response.output }, "handling tool call")
        // extract tool calls from response
        // execute each tool
        // append results to context
        // context!.push({//   role: "assistant",
        //   content: response.output_text
        // })
        // 2. execute each requested tool, in parallel — mirrors how Pi/Claude Code run tool calls.
        if(response.toolCalls){
          const results = await Promise.all(response.toolCalls.map(async (call) => {
            try{
              if (DESTRUCTIVE_TOOLS.has(call.name) && req.confirmTool) {
                const approved = await req.confirmTool(call)
                if (!approved) {
                  return { call, result: `User declined to run tool "${call.name}". Do not retry it without asking again.`, isError: true }
                }
              }
              let result: string
              switch(call.name){
                case "read":
                  result = await readFileTool.execute(call.input)
                  break;
                case "write":
                  result = await writeFileTool.execute(call.input)
                  break;
                case "edit":
                  result = await editFileTool.execute(call.input)
                  break;
                case "bash":
                  result = await bashTool.execute(call.input)
                  break;

                default:
                  result = `Unknown tool: ${call.name}`
              }
              return { call, result, isError: false }
            }
            catch(e){
              const message = e instanceof Error ? e.message : String(e)
              return { call, result: `Error executing ${call.name}: ${message}`, isError: true }
            }
          }))

          for (const { call, result, isError } of results) {
            ToolResult = result
            const toolNodeId = randomBytes(4).toString("hex")
            data.push({
              id: toolNodeId,
              parentId: lastNodeId, // #TODO: implement tree and store prev node id here.
              timestamp: new Date().toISOString(),
              type: "message",
              role: "toolCall",
              message:{
                toolName: call.name,
                content: {
                  text: result,
                  isError,
                  timestamp: new Date().getTime()
                }
              }
            })
            lastNodeId = toolNodeId
            messages.push({ role: "tool", toolCallId: call.id, name: call.name, content: result })
            logger.debug({ tool: call.name, result }, "tool call result")
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
      }
      // hasMoreToolCalls = false; // temp cond

      if (hasMoreToolCalls) {
        try {
          messages = await compactContext(messages, req)
        } catch (e) {
          logger.warn({ err: e }, "context compaction failed, continuing with uncompacted messages")
        }
      }
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
    if (MEMORY_ENABLED) {
      try {
        logger.debug({ newTurns }, "payload sent to memory")
        addMemory(newTurns)
      } catch (e) {
        logger.warn({ err: e }, "memory add failed, continuing without it")
      }
    }
  //   break;

  //   // outer loop: wait for next user input / steering / followup
  // }
  return {
    message: finalOutput,
    toolResult: ToolResult,
    data: data
  }
}
async function streamLLM(req: AgentRequest, messages: ChatMessage[], relevantMemories: string): Promise<LLMResponse> {
  // TODO: apply context if configured
  // convert to LLM compatible msgs. ~ not needed in our case.
  // build LLM context, system, user prompt and tools
  let updatedSysPrompt = systemPrompt;
  if(relevantMemories !== ""){
    updatedSysPrompt += `## Relevant context from memory: ${relevantMemories}`
  }
  const llmContext: LLMContext = {
    systemPrompt: updatedSysPrompt,
    messages,
    tools: AVAILABLE_TOOLS
  }
  const llmReq: LLMRequest = { ...req, llmContext }

  return withRetry("LLM call", LLM_RETRY_ATTEMPTS, () => LLMCall(llmReq))
}
