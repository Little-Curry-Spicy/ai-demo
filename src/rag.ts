import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { env } from "node:process";
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
    }
});

// 故事：喜羊羊与灰太狼 —— 青青草原上的智斗
const documents = [
    new Document({
        pageContent: `在青青草原上有一个羊村，村里住着喜羊羊、懒羊羊、美羊羊、沸羊羊等小羊，村长是慢羊羊。喜羊羊是羊村里最聪明、跑得最快的小羊，他机智勇敢，每当灰太狼来抓羊，总是他想到办法带领大家化险为夷。`,
        metadata: {
            chapter: 1,
            character: "喜羊羊与羊村",
            type: "角色介绍",
            mood: "欢乐",
        },
    }),
    new Document({
        pageContent: `灰太狼住在狼堡里，和老婆红太狼一起生活。灰太狼整天想着抓羊给红太狼吃，可每次都被喜羊羊他们整得灰头土脸。红太狼经常用平底锅敲灰太狼的头，骂他"没用的东西"，灰太狼总会说一句："我一定会回来的！"`,
        metadata: {
            chapter: 2,
            character: "灰太狼与红太狼",
            type: "角色介绍",
            mood: "搞笑",
        },
    }),
    new Document({
        pageContent: `有一天，灰太狼发明了一台"吸羊机"，想用机器把羊村里的羊一口气吸进狼堡。喜羊羊从望远镜里看到灰太狼在调试机器，赶紧叫上懒羊羊、沸羊羊一起商量。懒羊羊吓得想躲起来睡觉，喜羊羊说："别怕，我们只要让吸力反过来，灰太狼就会把自己吸进去。"`,
        metadata: {
            chapter: 3,
            character: "喜羊羊、灰太狼",
            type: "冲突",
            mood: "紧张",
        },
    }),
    new Document({
        pageContent: `喜羊羊带着大家把吸羊机的管道悄悄调了方向，出口对准了狼堡。灰太狼一按开关，不但没吸到羊，反而把狼堡里的家具、红太狼的平底锅全吸进了管道，最后灰太狼自己也被吸了进去，摔进了羊村的陷阱里。红太狼气得又拿起了备用平底锅。`,
        metadata: {
            chapter: 4,
            character: "喜羊羊、灰太狼、红太狼",
            type: "智斗",
            mood: "搞笑",
        },
    }),
    new Document({
        pageContent: `还有一次，灰太狼扮成羊混进羊村，想从内部抓羊。喜羊羊发现这只"羊"的尾巴又长又灰，而且总盯着大家流口水，就故意请他去吃"超级辣草"，灰太狼辣得现出原形，被大家用绳子捆起来扔出了羊村。灰太狼在空中大喊："喜羊羊，我一定会回来的！"`,
        metadata: {
            chapter: 5,
            character: "喜羊羊与灰太狼",
            type: "智斗",
            mood: "机智",
        },
    }),
    new Document({
        pageContent: `懒羊羊最爱睡觉和吃青草蛋糕，经常在草地上睡着后被灰太狼盯上。每次都是喜羊羊及时赶到，用各种办法救回懒羊羊。懒羊羊醒来后总说："喜羊羊，你又救了我，下次我请你吃青草蛋糕！"喜羊羊笑着说："你还是先别在村外睡觉啦。"`,
        metadata: {
            chapter: 6,
            character: "喜羊羊与懒羊羊",
            type: "友情",
            mood: "温馨",
        },
    }),
    new Document({
        pageContent: `羊村和狼堡就这样日复一日地斗智斗勇。灰太狼永远在发明新招数抓羊，喜羊羊永远能想到办法破解。虽然灰太狼总说"我一定会回来的"，但小羊们团结在一起，从来没有让灰太狼得逞。青青草原上每天都上演着这样有趣又热闹的故事。`,
        metadata: {
            chapter: 7,
            character: "羊村与灰太狼",
            type: "结局",
            mood: "欢乐",
        },
    }),
];

// 内存向量存储
const vectorStore = new MemoryVectorStore(embeddings);
const main = async () => {
    console.log("开始RAG");

 /** 向量化文档 */
    await vectorStore.addDocuments(documents);

    // 创建检索器，k = 3，返回相似度最高的 3 个文档
    const retriever = vectorStore.asRetriever({ k: 3 });

    // 要问的问题（可改成任意与故事相关的问题）
    const question = "喜羊羊是怎么对付灰太狼的吸羊机的？灰太狼最爱说哪句话？";

    console.log("用检索器获取相关文档");
    const retrievedDocs = await retriever.invoke(question);

    // /** 用 similaritySearchWithScore 拿到前3个文档的相似度评分 */
    // const scoredResults = await vectorStore.similaritySearchWithScore(question, 3);

    // // scoredResults 里的第一项是 Document 对象本身（原文），第二项是分数
    // // 下面演示输出每个文档的原文内容和相似度分数（score），score 越低表示相似度越高
    // scoredResults.forEach(([doc, score], idx) => {
    //     console.log(`\n【检索结果${idx + 1}】`);
    //     console.log("原文：", doc.pageContent);
    //     console.log("元数据：", doc.metadata);
    //     console.log("相似度评分（score）：", score);
    //     // 也可以显示相似度: (1-score)，score越低相似度越高
    //     console.log("相似度 (1-score)：", (1 - score).toFixed(4));
    // });

    // /** 遍历检索到的文档，并打印相似度评分 */
    // retrievedDocs.forEach((doc: Document, i: number) => {
        
    //     // 这一步是：根据内容匹配，找到当前检索文档对应的相似度评分条目（即在 scoredResults 数组中查找与当前 doc.pageContent 相同的文档，
    //     // 用于后面展示该文档的相似度得分）
    //     const scoredResult = scoredResults.find(
    //         ([scoredDoc]) => scoredDoc.pageContent === doc.pageContent
    //     );

    //     const score = scoredResult ? scoredResult[1] : null;
    //     // 这里用 1 - score 是因为相似度分数 score 越低表示越相似，(1-score) 就把它映射为“相似度越高数值越大”，更直观
    //     const similarity = score !== null ? (1 - score).toFixed(4) : "N/A";

    //     console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`);
    //     console.log(`内容: ${doc.pageContent}`);
    //     console.log(
    //         `元数据: 章节=${doc.metadata.chapter}, 角色=${doc.metadata.character}, 类型=${doc.metadata.type}, 心情=${doc.metadata.mood}`
    //     );
    // });

    // 把检索到的内容拼成上下文
    const context = retrievedDocs
        .map((doc: Document, i: number) => `[片段${i + 1}]\n${doc.pageContent}`)
        .join("\n\n━━━━━\n\n");

    const prompt = `你是一个讲故事的老师。请根据下面给出的故事片段回答问题，用温暖、简洁的语言。如果片段里没有提到，就老实说"故事里还没有提到这一点"。

故事片段:
${context}

问题: ${question}

老师的回答:`;

    console.log("\n【AI 回答】");
    const response = await model.invoke(prompt);
    console.log(response.content);
    console.log("\n");
}

main();