import { Command } from "commander";
import { settingsFile } from "./setModel";
import fs from 'fs'
import axios from 'axios'
import { AgentCall } from "@repo/core";
import { AgentRequest } from "../../../../packages/core/model";

export const prompt = new Command("prompt")
    .description('new prompt')
    .option('--p <prompt>', "prompt string")
    .action((options) =>{
        console.log("prompts command hit", options)
        const prompt = options.p
        const obj = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))

        // LLMCall(prompt, defaultSettingsObj)
        const req: AgentRequest = {
            message: prompt,
            provider: obj.defaultProvider,
            model: obj.defaultModel,
            apiKey: obj.key,

        }
        const response : Promise<string | undefined> = AgentCall(req)

        response.then((res)=>{
            console.log(`
            Q: ${prompt}
            A: ${res}
        `)
        })

        
        
    })