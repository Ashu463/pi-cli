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
    .option('--sessionName <sessionName>', "give the session ID to use while continuing this prompt")
    .action((options) =>{
        console.log("prompts command hit", options)
        const prompt = options.p
        let sessionName: string = options.sessionName
        
        const obj = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))

        const currTime = new Date()
        const cwd = process.cwd()
        // LLMCall(prompt, defaultSettingsObj)
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
        
        if(!sessionName){
            fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2))
        }
        else{
            let obj = []
            const file = sessionPath + sessionName;
            if(fs.existsSync(file)){
                const data = (fs.readFileSync(sessionPath+sessionName, 'utf-8'))

                obj = JSON.parse(data)
                if (!Array.isArray(obj)) {
                    obj = [obj]; // wrap existing object in an array
                }
                obj.push(sessionData)
                fs.writeFileSync(file, JSON.stringify(obj, null, 2))
            }
            // over write the content of existing file. 

        }


        
        
    })