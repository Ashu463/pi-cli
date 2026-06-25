import { Command } from "commander"
import fs from 'fs'
import { authFile, settingsFile } from "./config"
export const logout = new Command("logout")
    .description('logout')
    .action((options) => {
        console.log("logout command hit", options)

        fs.unlink(settingsFile, (err) =>{
            if(err){
                console.log("error occurred while deleting settings the file")
                return ;
            }

            console.log("Settings file deleted successfully")
        })

        fs.unlink(authFile, (err) =>{
            if(err){
                console.log("error occurred while deleting auth the file")
                return ;
            }

            console.log("Auth file deleted successfully")
        })
    })
