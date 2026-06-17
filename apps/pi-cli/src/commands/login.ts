import { Command } from "commander";
import os from 'os'
import path from 'path'
import fs from 'fs'
import { authFile, modelsFile, rootPath } from "./config";

fs.mkdirSync(rootPath, { recursive: true });


async function ValidateAPIKey(key: string, provider: string): Promise<boolean>{
    let url = ""
    console.log(key, " ", provider)

    let obj = []

    if(fs.existsSync(modelsFile)){
        obj = JSON.parse(fs.readFileSync(modelsFile, 'utf-8'))

        if(!Array.isArray(obj)){
            obj = [obj]
        }
    }

    if(provider === "openai"){
        console.log("inside openai checker")

        url = "https://api.openai.com/v1/models"
        try{
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json',
                    'Authorization': `Bearer ${key}`
                }
            })
            if(res.ok){
                const data = await res.json()
                console.log("inside deepseek checker and res", data)
                const models: any = []
                data.data.map((data: any) =>{
                    models.push(data.id)
                    console.log(data.id, " is the model name pushing into it")
                })
                obj.push({provider: provider, models: models})
    
                fs.writeFileSync(modelsFile, JSON.stringify(obj, null, 2))
                console.log("returning true")
                return true;
            }
        }
        catch(e){
            console.log("Authentication for openAI failed", e)
            return false
        }
    }
    else if(provider === "anthropic"){
        console.log("inside claude checker")
        url = "https://api.anthropic.com/v1/models"
        try{
            const res = await fetch(url, {
                method: 'GET',
                headers:{
                    'x-api-key': key
                }
            })
            if(res.ok){
                const data = await res.json()
                console.log("inside deepseek checker and res", data)
                const models: any = []
                data.data.map((data: any) =>{
                    models.push(data.id)
                    console.log(data.id, " is the model name pushing into it")
                })
                obj.push({provider: provider, models: models})
    
                fs.writeFileSync(modelsFile, JSON.stringify(obj, null, 2))
                console.log("returning true")
                return true;
            }
        }
        catch(e){
            console.log("Auth failed with anthropic", e)
            return false
        }
    }
    else if (provider === "google") {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        try{
            const res = await fetch(url)
            console.log("inside gemini checker and res", res.ok)
            if(res.ok){
                const data = await res.json()
                console.log("inside deepseek checker and res", data)
                const models: any = []
                data.data.map((data: any) =>{
                    models.push(data.id)
                    console.log(data.id, " is the model name pushing into it")
                })
                obj.push({provider: provider, models: models})
    
                fs.writeFileSync(modelsFile, JSON.stringify(obj, null, 2))
                console.log("returning true")
                return true;
            }
            // else return false
        }
        catch(e){
            console.log("Auth failed for gemini", e)
            return false
        }

    }
    else if(provider === "deepseek"){
        url = `https://api.deepseek.com/models`
        
        try{
            const res = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-type': 'application/json',
                    'Authorization': `Bearer ${key}`
                }
            })
            
            if(res.ok){
                const data = await res.json()
                console.log("inside deepseek checker and res", data)
                const models: any = []
                data.data.map((data: any) =>{
                    models.push(data.id)
                    console.log(data.id, " is the model name pushing into it")
                })
                obj.push({provider: provider, models: models})
    
                fs.writeFileSync(modelsFile, JSON.stringify(obj, null, 2))
                console.log("returning true")
                return true;
            }
            // else return false
        }
        catch(e){
            console.log("Auth failed for gemini", e)
            return false
        }
    }

    return false;

}

export const login = new Command("login").description('login command')
    .option('--api_key <apiKey>', 'apiKey')
    .option('--provider <providerName>', 'providerName')
    .action(async (options) =>{
        const apiKey : string = options.api_key
        const provider: string = options.provider
        console.log(options, ' is the')
        console.log("login command hit", apiKey, provider )
        console.log(rootPath, ' is the credentials path')
        const res : Promise<boolean> = ValidateAPIKey(apiKey, provider)

       

        res.then((result: boolean) =>{
            if(result === false){
                console.log("Invalid API key or provider not listed")
            }
            else {
                let obj = [];

                if (fs.existsSync(authFile)) {
                    const data = fs.readFileSync(authFile, 'utf-8');
                    obj = JSON.parse(data);

                    if (!Array.isArray(obj)) {
                        obj = [obj]; // wrap existing object in an array
                    }

                    // try {
                    // } catch {
                    //     obj = [];
                    // }
                }
                obj.push({
                    api_key: apiKey,
                    provider
                });
                // Create file if it doesn't exist, or overwrite if it does
                fs.writeFileSync(authFile, JSON.stringify(obj, null, 2), 'utf-8');
            }
        })

    })