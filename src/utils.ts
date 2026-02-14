import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import "dotenv/config";
import { env } from "node:process";
import { MilvusClient, MetricType, IndexType } from "@zilliz/milvus2-sdk-node";
export const VECTOR_DIMENSIONS = 1024;



 export const model = new ChatOpenAI({
    modelName: "qwen-plus",
    apiKey: env.QIANWEN_API_KEY,
    configuration: {
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    temperature: 0.7,
  });
  
  export const embeddings = new OpenAIEmbeddings({
    modelName: "text-embedding-v3",
    apiKey: env.QIANWEN_API_KEY,
    configuration: {
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    dimensions: VECTOR_DIMENSIONS,
  });

  
 export const createMilvusClient = (): MilvusClient => {
    const client = new MilvusClient({
      address: env.ZILLIZ_URI ?? '',
      token: env.ZILLIZ_TOKEN,
      ssl: true,
    });
    return client;
  }