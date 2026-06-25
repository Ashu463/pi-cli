import { Command } from "commander"

export const logout = new Command("help")
    .description('logout')
    .action((options) => {
        console.log("help command hit", options)

    })
