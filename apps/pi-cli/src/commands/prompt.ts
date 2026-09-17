import { Command } from "commander";
import fs from 'fs'
import { AgentCall, logger } from "@repo/agent";
import { AgentRequest, ToolCall } from "../../../../packages/agent/models/model";
import { sessionPath, settingsFile } from "./config";
import { randomUUID } from "crypto";
import process from 'process'
import { AgentResponse } from "../../../../packages/agent/models/clientTypes";
import path from 'path'
import os from 'os'
import readline from 'readline/promises'

async function confirmTool(call: ToolCall): Promise<boolean> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    try {
        const detail = call.name === "bash"
            ? `command: ${call.input.command}`
            : `path: ${call.input.path}`
        const answer = await rl.question(`\n[confirm] run tool "${call.name}" (${detail})? [y/N] `)
        return answer.trim().toLowerCase() === "y"
    } finally {
        rl.close()
    }
}
if(!fs.existsSync(sessionPath)){
    fs.mkdirSync(sessionPath, {recursive: true})
}
const cwd = process.cwd()

if(!fs.existsSync(cwd)){
    fs.mkdirSync(cwd, {recursive: true})
}
export const prompt = new Command("prompt")
    .description('new prompt')
    .option('--p <prompt>', "prompt string")
    .option('--sessionName <sessionName>', "give the session name to use while continuing this prompt")
    .action((options) =>{
        logger.debug({ options }, "prompt command hit")
        const prompt = options.p
        let sessionName: string = options.sessionName
        
        const obj = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))

        const currTime = new Date().toISOString()
        // LLMCall(prompt, defaultSettingsObj)
        if (!sessionName) {
            sessionName = new Date().toISOString().replace(/[:.]/g, "-") + "_" + randomUUID() + ".jsonl"
        }
        const onToken = (delta: string) => process.stdout.write(delta)

        let req: AgentRequest
        if(!sessionName){
            req = {
                message: prompt,
                provider: obj.defaultProvider,
                model: obj.defaultModel,
                apiKey: obj.key,
                cwd: process.cwd(),
                confirmTool,
                onToken
            }
        }
        else{
            req = {
                message: prompt,
                provider: obj.defaultProvider,
                model: obj.defaultModel,
                apiKey: obj.key,
                sessionId: randomUUID(),
                cwd: process.cwd(),
                confirmTool,
                onToken
            }
        }
        logger.debug({ provider: req.provider, model: req.model }, "calling agent")
        console.log(`\n  Q: ${prompt}`)
        process.stdout.write(`  A: `)
        const response : Promise<AgentResponse | undefined> = AgentCall(req)
        response.then((res: any) => {
            logger.debug({ res }, "agent response received")
            const sessionData = res.data

            process.stdout.write(`\n`)
            if (res.toolResult) console.log(` ToolResults: ${res.toolResult}`)

        // session write
        try {
            const relativeCwd = path.relative(os.homedir(), cwd)

            const directoryPath = path.join(sessionPath, relativeCwd)

            const filePath = path.join(directoryPath, `${sessionName}.json`)
            if (fs.existsSync(filePath)) {
                const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"))
                const arr = Array.isArray(existing) ? existing : [existing]
                arr.push(sessionData)
                fs.writeFileSync(filePath, JSON.stringify(arr, null, 2))
            } else {
                fs.mkdirSync(directoryPath, {recursive: true})
                fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2))
            }
            console.log(`[session] saved to ${directoryPath}`)
        } catch (e) {
            logger.error({ err: e }, "session failed to save")
        }

        })
        .catch((e) => {
            logger.error({ err: e }, "AgentCall failed")
        })
        
        // write into the session file by creating a new one with given timestamp
    })