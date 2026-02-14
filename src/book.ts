import "dotenv/config";
import { MilvusClient, MetricType, IndexType, DataType } from "@zilliz/milvus2-sdk-node";
import chalk from "chalk";
import { parse } from 'path';
import { EPubLoader } from "@langchain/community/document_loaders/fs/epub";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { model } from "./utils";


const CHUNK_SIZE = 500; // 拆分到 500 个字符
const EPUB_FILE = './天龙八部.epub';
// 从文件名提取书名（去掉扩展名）
const BOOK_NAME = parse(EPUB_FILE).name;
const COLLECTION_NAME = "book";
import { embeddings, VECTOR_DIMENSIONS } from "./utils";
import { createMilvusClient } from "./utils";
const client = createMilvusClient();
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
async function ensureCollection(client: MilvusClient): Promise<void> {
    const exists = await client.hasCollection({ collection_name: COLLECTION_NAME });
    if (exists.value) {
        return;
    }

    await client.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
            {
                name: "id",
                description: "主键",
                data_type: DataType.VarChar,
                is_primary_key: true,
                max_length: 64,
            },
            {
                name: "book_id",
                description: "书本主键",
                data_type: DataType.VarChar,
                max_length: 64,
            },
            {
                name: "book_name",
                description: "书本名称",
                data_type: DataType.VarChar,
                max_length: 256,
            },

            {
                name: "index",
                description: "书本内容",
                data_type: DataType.Int32,
            },
            {
                name: "chapter_num",
                description: "章节数",
                data_type: DataType.Int32,
            },
            {
                name: "chapter_name",
                description: "章节名称",
                data_type: DataType.VarChar,
                max_length: 256,
            },
            {
                name: "chapter_content",
                description: "章节内容",
                data_type: DataType.VarChar,
                max_length: 10000,
            },
            {
                name: "vector",
                description: "章节内容的向量",
                data_type: DataType.FloatVector,
                dim: VECTOR_DIMENSIONS,
            }
        ]
    });

    await client.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: "vector",
        index_type: IndexType.HNSW,
        metric_type: MetricType.COSINE,
    });

    await client.loadCollection({ collection_name: COLLECTION_NAME });
}

const loadAndProcessEPubStreaming = async (bookId: number) => {
    // 使用 EPubLoader 加载文件，按章节拆分
    const loader = new EPubLoader(
        EPUB_FILE,
        {
            splitChapters: true,
        }
    );

    const documents = await loader.load();
    console.log(chalk.green(`✓ 加载完成，共 ${documents.length} 个章节\n`));
    // 创建文本拆分器，拆分到 500 个字符
    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: CHUNK_SIZE,
        chunkOverlap: 50, // 重叠 50 个字符，保持上下文连贯性
    });

    let totalInserted = 0;

    for (let chapterIndex = 0; chapterIndex < documents.length; chapterIndex++) {
        const chapter = documents[chapterIndex];
        const chapterContent = chapter.pageContent;
        const chapterName =
            (chapter.metadata?.chapter as string) || `第${chapterIndex + 1}章`;
        console.log(chalk.red(`处理第 ${chapterIndex + 1}/${documents.length} 章: ${chapterName}`));

        // 使用 splitter 进行二次拆分
        const chunks = await textSplitter.splitText(chapterContent);

        if (chunks.length === 0) {
            console.log(`  跳过空章节\n`);
            continue;
        }


        // 立即生成向量并插入该章节的所有片段
        const insertedCount = await insertChunksBatch(
            chunks,
            bookId,
            chapterIndex + 1,
            chapterName
        );
        totalInserted += insertedCount;

    }
    return totalInserted;

}

/**
 * 检查指定 bookId 的书是否已在集合中加载过（是否有该 book_id 的数据）
 */
async function isBookLoaded(client: MilvusClient, bookId: number): Promise<boolean> {
    try {
        const res = await client.query({
            collection_name: COLLECTION_NAME,
            filter: `book_id == "${bookId}"`,
            output_fields: ["id"],
            limit: 1,
        });
        const data = (res as { data?: unknown[] }).data;
        return Array.isArray(data) && data.length > 0;
    } catch {
        return false;
    }
}

const insertChunksBatch = async (
    chunks: string[],
    bookId: number,
    chapterNum: number,
    chapterName: string
) => {
    const vectors = await Promise.all(
        chunks.map(async (chunk, index) => {
            const vector = await getEmbeddingVector(chunk);
            return {
                id: `${bookId}-${chapterNum}-${index}`,
                book_id: bookId,
                book_name: BOOK_NAME,
                index: chapterNum,
                chapter_num: chapterNum,
                chapter_name: `${chapterName} - 片段${index + 1}`,
                chapter_content: chunk,
                vector,
            };
        })
    );

    const res = await client.insert({
        collection_name: COLLECTION_NAME,
        data: vectors,
    });
    console.log(chalk.green(`✓ 已插入 ${res.insert_cnt} 条记录`));
    return Number(res.insert_cnt) || 0;
}

async function main() {

    const client = createMilvusClient();
    await client.connectPromise;
    // 确保集合存在
    await ensureCollection(client);
    const bookId = 1;

    // 若该书已加载过则跳过，避免重复加载
    if (await isBookLoaded(client, bookId)) {
        console.log(chalk.blue(`书本 id=${bookId} 已加载过，跳过本次加载。`));
    } else {
    }
    await loadAndProcessEPubStreaming(bookId);


    const query = "最厉害的武功是什么";
    const queryVector = await getEmbeddingVector(query);

    const searchRes = await client.search({
        collection_name: COLLECTION_NAME,
        metric_type: MetricType.COSINE,
        data: [queryVector],
        limit: 2,
        output_fields: ["id", "book_id", "book_name", "index", "chapter_num", "chapter_name", "chapter_content", "vector"],
    });

    if (searchRes.results?.length > 0) {
        const context = searchRes.results
            .map((book, i) => {
                return `[书本 ${i + 1}]
书本名称: ${book.book_name}
章节名称: ${book.chapter_name}
章节内容: ${book.chapter_content}`;
            })
            .join('\n\n━━━━━\n\n');

        // 4. 构建 prompt
        const prompt = `你是一个温暖贴心的 AI 书本助手。基于用户的书本内容回答问题，用亲切自然的语言。

请根据以下书本内容回答问题：
${context}

用户问题: ${query}

回答要求：
1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
2. 可以综合多个片段的内容，提供完整的答案
3. 如果片段中没有相关信息，请如实告知用户
4. 回答要准确，符合小说的情节和人物设定
5. 可以引用原文内容来支持你的回答

AI 助手的回答:`;
        const response = await model.invoke(prompt);
        console.log(chalk.green("response"), response.content);
    }
}

main()
