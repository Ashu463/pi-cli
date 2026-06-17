import path from 'path'
import os from 'os'

export const rootPath = path.join(os.homedir(), ".pi-cli")
export const sessionPath = `${rootPath}/sessions`

export const authFile = path.join(rootPath, 'auth.json')
export const settingsFile = path.join(rootPath, 'settings.json')
export const modelsFile = path.join(rootPath, 'models.json')




/*
- sessions 
{
    {
        "session"
    }
}




*/