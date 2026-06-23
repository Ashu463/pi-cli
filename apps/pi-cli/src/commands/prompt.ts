import { Command } from "commander";
import fs from 'fs'
import { AgentCall } from "@repo/core";
import { AgentRequest } from "../../../../packages/core/models/model";
import { sessionPath, settingsFile } from "./config";
import { randomUUID } from "crypto";
import process from 'process'
import { AgentResponse } from "../../../../packages/core/models/clientTypes";
import path from 'path'
import os from 'os'
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
        console.log("prompts command hit", options)
        const prompt = options.p
        let sessionName: string = options.sessionName
        
        const obj = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))

        const currTime = new Date().toISOString()
        // LLMCall(prompt, defaultSettingsObj)
        if (!sessionName) {
            sessionName = new Date().toISOString().replace(/[:.]/g, "-") + "_" + randomUUID() + ".jsonl"
        }
        let req: AgentRequest
        if(!sessionName){
            req = {
                message: prompt,
                provider: obj.defaultProvider,
                model: obj.defaultModel,
                apiKey: obj.key,
                cwd: process.cwd()
            }
        }
        else{
            req = {
                message: prompt,
                provider: obj.defaultProvider,
                model: obj.defaultModel,
                apiKey: obj.key,
                sessionId: randomUUID(),
                cwd: process.cwd()
            }
        }
        console.log("calling agent")
        const response : Promise<AgentResponse | undefined> = AgentCall(req)
        response.then((res: any) => {
            console.log(res, " is the llm response")
            const sessionData = res.data

            console.log(`\n  Q: ${prompt}\n  A: ${res.message}\n ToolResults: ${res.toolResult}`)

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
            console.error(`[session] failed to save:`, e)
        }

        })
        .catch((e) => {
        console.error(`[agent] AgentCall failed:`, e)
        })
        
        // write into the session file by creating a new one with given timestamp
    })