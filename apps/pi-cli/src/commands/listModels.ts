import { Command } from "commander";
import { modelsFile } from "./login";
import fs from 'fs'
export const listModel = new Command("list")
    .action((options) =>{
        // console.log("list models command hit", options)

        if(!fs.existsSync(modelsFile)){
            console.log("models not loaded yet")
            return ;
        }
        // TODO: it's quite loose right now, might tight it later. 
        const obj = JSON.parse(fs.readFileSync(modelsFile, 'utf-8'))

        console.log(obj)
    })