import fs from 'fs'

export async function getAllSessions(dirPath: string){
    let sessionName: string[] = []

    fs.readdir(dirPath, function(err, filenames){
        
        filenames.map((filename: string) =>{
            sessionName.push(filename)
        })
    })

    return sessionName
}
export async function getAllSessionByID(dirPath: string, name: string): Promise<string>{
    let data: string = ""

    fs.readdir(dirPath, function(err, filenames){
        
        filenames.map((filename: string) =>{
            if(filename === name){
                data = fs.readFileSync(dirPath+name, 'utf-8')
                return data;
            }
        })
    })

    return data
}