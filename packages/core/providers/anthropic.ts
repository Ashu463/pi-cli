import Anthropic from "@anthropic-ai/sdk";
import { Tool } from "@anthropic-ai/sdk/resources";


export async function AnthropicCall(key: string, message: string, model: string, thinkingLevel: string, toolList: Tool[]){
    const client = new Anthropic({
        apiKey: key
    });

    try{
        const response = await client.messages.create({
            model: model,
            max_tokens: 1024,
            messages: [
                {
                role: "user",
                content: message
                }
            ]
        });
        const output = response.content.filter(block => block.type === 'text').map(block => block.text).join("")
        console.log("LLM generated, ", output)
        
        return response
    }catch(e){
        console.log(e, " is the error occured while generating response")
        return ;
    }

}

