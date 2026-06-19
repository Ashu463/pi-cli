import { getAllSessionByID, getAllSessions } from '@repo/core'
import { Command } from 'commander'
import { sessionPath } from 'commands/config'
import fs from 'fs'

export const listSessions = new Command("show")
    .option("--name <sessionName>", "Note that please share the sesion name here, not the session id")
    .action((options) =>{
        const sessionName = options.sessionName;
        if(!sessionName){
            console.log("Please give sessionName")
        }
        const data: Promise<string> = getAllSessionByID(sessionPath, sessionName)
        
        console.log(data)
        return;
    })