import { Command } from "commander";
import { listSessions } from "./list_session";
import fs from 'fs'
import { sessionPath } from "commands/config";

if(!fs.existsSync(sessionPath)){
    fs.mkdirSync(sessionPath)
}
export const Session = new Command("session")
    .addCommand(listSessions)