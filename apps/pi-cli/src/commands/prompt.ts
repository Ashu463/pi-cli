import { Command } from "commander";
import fs from 'fs'
import { AgentCall } from "@repo/core";
import { AgentRequest } from "../../../../packages/core/models/model";
import { sessionPath, settingsFile } from "./config";
import { randomUUID } from "crypto";
import process from 'process'
import { AgentResponse } from "../../../../packages/core/models/clientTypes";
export const prompt = new Command("prompt")
    .description('new prompt')
    .option('--p <prompt>', "prompt string")
    .option('--sessionId <sessionId>', "give the session ID to use while continuing this prompt")
    .action((options) =>{
        console.log("prompts command hit", options)
        const prompt = options.p
        let sessionId: string = options.sessionId
        if(!sessionId){
            sessionId = randomUUID()
        }
        const obj = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))

        const currTime = new Date()
        const cwd = process.cwd()
        // LLMCall(prompt, defaultSettingsObj)
        const req: AgentRequest = {
            message: prompt,
            provider: obj.defaultProvider,
            model: obj.defaultModel,
            apiKey: obj.key,
            sessionId: sessionId,
            cwd: process.cwd()
        }
        const response : Promise<AgentResponse | undefined> = AgentCall(req)
        let sessionData;
        response.then((res: any)=>{
            if(res)
            sessionData = res.data
            console.log(`
            Q: ${prompt}
            A: ${res.message}
        `)
        })
        
        // write into the session file by creating a new one with given timestamp
        const sessionFilePath = sessionPath + cwd + currTime

        fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2))


        
        
    })