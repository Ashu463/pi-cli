import 'dotenv/config'
import { Memory } from "mem0ai/oss";

const memory = new Memory({
  llm: {
    provider: "deepseek",
    config: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: "deepseek-v4-flash",
      baseURL: "https://api.deepseek.com"
    
    }
  },
  embedder: {
    provider: "ollama",
    config: { model: "nomic-embed-text:latest", url: "http://localhost:11434" }
  },
  vectorStore: {
    provider: "pgvector",
    config: {
      dbname: "vector_store",
      collectionName: "memories",
      embeddingModelDims: 768,
      user: "postgres",
      password: "postgres",
      host: "127.0.0.1",
      port: 5432
    }
  },
  // historyDbPath: "memory.db"
});


async function main(){
    const addResult = await memory.add(
        [
            { role: "user", content: "I'm building a CLI agent harness called pi-cli using TypeScript and Bun." },
            { role: "assistant", content: "Got it, noted that you're using TypeScript and Bun for pi-cli." }
        ],
        {userId: "Ashutosh"}
    )
      console.log("Add result:", JSON.stringify(addResult, null, 2));
      console.log("\nSearching memory...");
  const searchResult = await memory.search("what is pi-cli built with?", {filters: {user_id: "Ashutosh"}});
  console.log("Search result:", JSON.stringify(searchResult, null, 2));

}

main().catch((err) => {
  console.error("FAILED:", err);
  process.exit(1);
});