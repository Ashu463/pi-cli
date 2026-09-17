import { Command } from "commander";
import os from 'os'
import path from 'path'
import fs from 'fs'
import { logger } from "@repo/agent";
import { authFile, modelsFile, rootPath } from "./config";

fs.mkdirSync(rootPath, { recursive: true });


async function ValidateAPIKey(key: string, provider: string): Promise<boolean>{
    let url = ""
    logger.debug({ provider, keyPrefix: key?.slice(0, 4) }, "validating API key")
    // don't log the raw key — only enough to confirm one was passed.

    let obj = []

    if(fs.existsSync(modelsFile)){
        obj = JSON.parse(fs.readFileSync(modelsFile, 'utf-8'))

        if(!Array.isArray(obj)){
            obj = [obj]
        }
    }

    if(provider === "openai"){
        logger.debug("checking openai credentials")

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
                const models: any = []
                data.data.map((data: any) =>{
                    models.push(data.id)
                })
                obj.push({provider: provider, models: models})
                logger.debug({ provider, modelCount: models.length }, "fetched models")

                fs.writeFileSync(modelsFile, JSON.stringify(obj, null, 2))
                return true;
            }
        }
        catch(e){
            logger.error({ err: e }, "authentication for openai failed")
            return false
        }
    }
    else if(provider === "anthropic"){
        logger.debug("checking anthropic credentials")
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
                const models: any = []
                data.data.map((data: any) =>{
                    models.push(data.id)
                })
                obj.push({provider: provider, models: models})
                logger.debug({ provider, modelCount: models.length }, "fetched models")

                fs.writeFileSync(modelsFile, JSON.stringify(obj, null, 2))
                return true;
            }
        }
        catch(e){
            logger.error({ err: e }, "authentication for anthropic failed")
            return false
        }
    }
    else if (provider === "google") {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
        try{
            const res = await fetch(url)
            logger.debug({ ok: res.ok }, "checking google credentials")
            if(res.ok){
                const data = await res.json()
                const models: any = []
                data.data.map((data: any) =>{
                    models.push(data.id)
                })
                obj.push({provider: provider, models: models})
                logger.debug({ provider, modelCount: models.length }, "fetched models")

                fs.writeFileSync(modelsFile, JSON.stringify(obj, null, 2))
                return true;
            }
            // else return false
        }
        catch(e){
            logger.error({ err: e }, "authentication for google failed")
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
                const models: any = []
                data.data.map((data: any) =>{
                    models.push(data.id)
                })
                obj.push({provider: provider, models: models})
                logger.debug({ provider, modelCount: models.length }, "fetched models")

                fs.writeFileSync(modelsFile, JSON.stringify(obj, null, 2))
                return true;
            }
            // else return false
        }
        catch(e){
            logger.error({ err: e }, "authentication for deepseek failed")
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
        logger.debug({ provider, rootPath }, "login command hit")
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