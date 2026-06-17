import { Command } from "commander";
import fs from  'fs'
import path from 'path'
import { authFile, modelsFile, rootPath, settingsFile } from "./config";


export const setModel = new Command("set")
    .description('set')
    .option('--provider <providerName>')
    .option('--model <modelName>')
    .action((options) =>{
        // console.log("set model command hit", options)

        const provider = options.provider
        const model = options.model
        if(!provider || !model){
            console.log("missing provider or model")
            return ;
        }
        // this object might be empty, handle that case
        const obj = JSON.parse(fs.readFileSync(modelsFile, 'utf-8'))
        const authObj = JSON.parse(fs.readFileSync(authFile, 'utf-8'))

        var key
        authObj.map((o: any) =>{
            if(o.provider === provider){
                key = o.api_key
            }
        })
        const data = {key: key, defaultProvider: provider, defaultModel: model, defaultThinkingLevel: 'high'}

        fs.writeFileSync(settingsFile, JSON.stringify(data, null, 2))

        console.log("written into the file")



        // TODO
        // verify whether the model and provider exists or not. 
        // if yes then only update else throw error



        // console.log(obj)
        // for (const [p, models] of Object.entries(obj)) {
        //     if (!Array.isArray(models)) continue;

        //     const modelList = models as string[];

        //     if (p === provider && modelList.includes(model)) {
        //         fs.writeFileSync(settingsFile,JSON.stringify({defaultProvider: p,defaultModel: model,defaultThinkingLevel: "high",},null,2));
        //         break;
        //     }
        //     }
        // console.log("failed to set model")
    })