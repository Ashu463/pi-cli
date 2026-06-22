import { Tool, ToolCall } from "./model"


export interface AgentResponse{
    message: string
    data: SessionData[]
}
export interface SessionDatabase{
    id: string
    parentId: string // #TODO: implement it when go into tree DS for storing sessions
    timestamp: string
}
export type SessionData = session | modelChange | thinkingLevelChange | message
export interface session extends SessionDatabase{
    type: "session"
    sessionId: string
    cwd: string
}
export interface modelChange extends SessionDatabase{
    type: "modelChange"
    model: string
    provider: string
}
export interface thinkingLevelChange extends SessionDatabase{
    type: "thinkingLevelChange"
    thinkingLevel: string
}
export interface message extends SessionDatabase{
    type: "message"
    role: Role
    message: user | assistant | toolResult
}
type Role = "user" | "assistant" | "toolCall"
export interface user{
    type: Type
    content: string
}
export interface assistant{
    content: string
    toolCalls?: ToolCall[]
}
export interface toolResult{
    toolName: string
    content: ToolContent
}
interface ToolContent{
    text: string
    isError: boolean
    timestamp: number
}
type Type = "text" | "thinking" 

/*

"message":{"role":"assistant","content":[{"type":"thinking","thinking":"The user wants me to create a todo app named \"demo-todo\" using TypeScript and Express.js backend in the current repository. Let me first explore the current working directory to understand the structure, then create the app.","thinkingSignature":"reasoning_content"},{"type":"toolCall","id":"call_00_toGnmGZrhxX6dyOz9jCF5854","name":"bash","arguments":{"command":"ls -la /home/ashuk/coding/super-30/projects"}}

*/