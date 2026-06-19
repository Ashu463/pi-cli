import { getAllSessions } from '@repo/core'
import { Command } from 'commander'
import { sessionPath } from 'commands/config'
import fs from 'fs'

export const listSessions = new Command("list")
    .action((options) =>{
        if(!fs.existsSync(sessionPath)){
            console.log("No any sessions right now")
            return 
        }
        const response: Promise<string[]> = getAllSessions(sessionPath);
        console.log(response, " are all the sessions")
    })