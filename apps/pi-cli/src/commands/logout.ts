import { Command } from "commander"

export const logout = new Command("logout")
    .description('logout')
    .action((options) => {
        console.log("logout command hit", options)

    })
