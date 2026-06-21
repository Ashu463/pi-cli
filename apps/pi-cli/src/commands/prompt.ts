import { Command } from "commander";
import fs from 'fs'
import path from 'path'
import { AgentCall } from "@repo/core";
import { AgentRequest } from "../../../../packages/core/models/model";
import { sessionPath, settingsFile } from "./config";
import { randomUUID } from "crypto";
import process from 'process'
import { AgentResponse } from "../../../../packages/core/models/clientTypes";

if(!fs.existsSync(sessionPath)){
    fs.mkdirSync(sessionPath, {recursive: true})
}
export const prompt = new Command("prompt")
    .description('new prompt')
    .option('--p <prompt>', "prompt string")
    .option('--sessionName <sessionName>', "give the session ID to use while continuing this prompt")
    .action((options) =>{
        console.log("prompts command hit", options)
        const prompt = options.p
        let sessionName: string = options.sessionName
        
        const obj = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))

        const currTime = new Date().toISOString()
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
        response.then((res: any)=>{
            let sessionData;
            console.log(res, " is the final llm response recieved")
            sessionData = res.data
            console.log(`
            Q: ${prompt}
            A: ${res.message}
            `)
            const sessionFilePath = path.basename(cwd) + "-" + Date.now() + ".json"
            
            if(!sessionName){
                console.log("file doesn't exists and creating new file and saving in, ", sessionFilePath)
                fs.writeFileSync(sessionFilePath, JSON.stringify(sessionData, null, 2))
            }
            else{
                let obj = []
                const file = sessionPath + sessionName;
                if(fs.existsSync(file)){
                console.log("going to read content from sessionPath")

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
        .catch((e) =>{
            throw new Error(`${e} Error occurred on saving side`)
        })
        
        // write into the session file by creating a new one with given timestamp


        
        
    })