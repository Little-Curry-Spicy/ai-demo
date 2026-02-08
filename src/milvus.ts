import "dotenv/config";
import { env } from "node:process";
import { MilvusClient, MetricType, IndexType } from "@zilliz/milvus2-sdk-node";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { diaryContents, getSchema } from "./example/milvus_data";
import chalk from "chalk";
// ============ 配置 ============
const ZILLIZ_URI = env.ZILLIZ_URI ?? "";
const ZILLIZ_TOKEN = env.ZILLIZ_TOKEN;
const COLLECTION_NAME = "diary";
const VECTOR_DIMENSIONS = 1024;

const model = new ChatOpenAI({
  modelName: "qwen-plus",
  apiKey: env.QIANWEN_API_KEY,
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  temperature: 0.7,
});

const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-v3",
  apiKey: env.QIANWEN_API_KEY,
  configuration: {
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  dimensions: VECTOR_DIMENSIONS,
});

function createMilvusClient(): MilvusClient {
  const client = new MilvusClient({
    address: ZILLIZ_URI,
    token: ZILLIZ_TOKEN,
    ssl: true,
  });
  return client;
}
/**
 * 获取文本的向量嵌入
 */
async function getEmbeddingVector(text: string): Promise<number[]> {
  const vec = await embeddings.embedQuery(text);
  return vec;
}

/**
 * 确保集合存在且向量维度正确；不存在则创建，维度不符则删除后重建。
 */
async function ensureCollection(client: MilvusClient, dim: number): Promise<void> {
  const exists = await client.hasCollection({ collection_name: COLLECTION_NAME });
  if (exists.value) {
    return;
  }

  await client.createCollection({
    collection_name: COLLECTION_NAME,
    fields: getSchema(dim),
  });

  await client.createIndex({
    collection_name: COLLECTION_NAME,
    field_name: "vector",
    index_type: IndexType.HNSW,
    metric_type: MetricType.COSINE,
    params: { M: 8, efConstruction: 128 },
  });
}

/** 查询全部日记（标量查询，limit 限制条数） */
export async function listAll(
  client: MilvusClient,
  limit = 100
): Promise<Record<string, unknown>[]> {
  const res = await client.query({
    collection_name: COLLECTION_NAME,
    filter: "",
    output_fields: ["id", "content", "date", "mood", "tags"],
    limit,
  })
  return (res as { data?: Record<string, unknown>[] }).data ?? [];
}


async function main() {

  const client = createMilvusClient();
  await client.connectPromise;
 // 确保集合存在
  await ensureCollection(client, VECTOR_DIMENSIONS);

  const vectors = await Promise.all(diaryContents.map(async (entry) => {
    return {
      ...entry,
      tags: JSON.stringify(entry.tags), // Milvus JSON 字段需要传字符串
      vector: await getEmbeddingVector(entry.content),
    };
  }));

  // console.log(chalk.green("vectors"), vectors);

  const res = await client.insert({
    collection_name: COLLECTION_NAME,
    data: vectors,
  });
  if (res.status.code === 0) {
    try {
      await client.flushSync({ collection_names: [COLLECTION_NAME] });
      await client.releaseCollection({ collection_name: COLLECTION_NAME });
    } catch (_) {}
    await client.loadCollectionSync({ collection_name: COLLECTION_NAME });
  } else {
    console.log(chalk.red("插入失败"), res.status);
  }

  const query = "我想看看关于吃饭的日记";
  const queryVector = await getEmbeddingVector(query);

  const searchRes = await client.search({
    collection_name: COLLECTION_NAME,
    vector: queryVector,
    metric_type: MetricType.COSINE,
    data: [queryVector],
    limit: 2,
    output_fields: ["id", "content", "date", "mood", "tags"],
  });

  if (searchRes.results?.length > 0) {
    const context = searchRes.results
      .map((diary, i) => {
        return `[日记 ${i + 1}]
日期: ${diary.date}
心情: ${diary.mood}
标签: ${Array.isArray(diary.tags) ? diary.tags.join(', ') : diary.tags}
内容: ${diary.content}`;
      })
      .join('\n\n━━━━━\n\n');

    // 4. 构建 prompt
    const prompt = `你是一个温暖贴心的 AI 日记助手。基于用户的日记内容回答问题，用亲切自然的语言。

请根据以下日记内容回答问题：
${context}

用户问题: ${query}

回答要求：
1. 如果日记中有相关信息，请结合日记内容给出详细、温暖的回答
2. 可以总结多篇日记的内容，找出共同点或趋势
3. 如果日记中没有相关信息，请温和地告知用户
4. 用第一人称"你"来称呼日记的作者
5. 回答要有同理心，让用户感到被理解和关心

AI 助手的回答:`;
    const response = await model.invoke(prompt);
    console.log(chalk.green("response"), response.content);
  }
}

main()
