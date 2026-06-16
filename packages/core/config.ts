import { LLMMessage } from "./types";


export async function transformContext(
  messages: LLMMessage[],
): Promise<LLMMessage[]> {
  return messages;
}

// export transformContext?: (messages: LLMMessage[]) => Promise<LLMMessage[]>;