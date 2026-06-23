import 'dotenv/config'
import { Memory } from "mem0ai/oss";
import os from 'os'
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
      user: "test",
      password: "123",
      host: "127.0.0.1",
      port: 5432
    }
  },
  historyDbPath: `${os.homedir()}/.pi-cli/memory-history.db`
});
const userId = os.userInfo().username;
const [,, command, payload] = process.argv;

async function main(){
    if (command === "add") {
    const messages = JSON.parse(payload);
    const result = await memory.add(messages, { userId });
    console.log(JSON.stringify({ ok: true, result }));
  } else if (command === "search") {
    const results = await memory.search(payload, {filters: {user_id: userId}});
    console.log(JSON.stringify({ ok: true, results }));
  } else {
    console.log(JSON.stringify({ ok: false, error: `Unknown command: ${command}` }));
    process.exit(1);
  }
}
main()
  .then(() => {
    console.error("done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });