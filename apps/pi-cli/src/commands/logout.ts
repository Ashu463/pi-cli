import { Command } from "commander"
import fs from 'fs'
import { logger } from "@repo/agent"
import { authFile, settingsFile } from "./config"
export const logout = new Command("logout")
    .description('logout')
    .action((options) => {
        logger.debug({ options }, "logout command hit")

        fs.unlink(settingsFile, (err) =>{
            if(err){
                logger.error({ err }, "error occurred while deleting settings file")
                return ;
            }

            console.log("Settings file deleted successfully")
        })

        fs.unlink(authFile, (err) =>{
            if(err){
                logger.error({ err }, "error occurred while deleting auth file")
                return ;
            }

            console.log("Auth file deleted successfully")
        })
    })
