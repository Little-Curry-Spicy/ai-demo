# ai-demo

本地 AI 示例项目：RAG、MCP、以及基于 Zilliz（Milvus）的向量库增删改查练习。

## 技术栈

- Node.js + TypeScript + tsx
- LangChain（OpenAI 兼容：千问 DashScope）
- Zilliz Cloud（Milvus 托管） + `@zilliz/milvus2-sdk-node`

## 环境变量（.env）

| 变量 | 说明 |
|------|------|
| `QIANWEN_API_KEY` | 千问 API Key，用于 RAG 与 Milvus 示例中的文本向量化 |
| `ZILLIZ_URI` | Zilliz Cloud 集群地址（例：`https://xxx.vectordb.zillizcloud.com:19530`） |
| `ZILLIZ_TOKEN` | Zilliz 认证：API Key 或 `用户名:密码` |

## 脚本

- `pnpm start`：运行 RAG 示例（`src/rag.ts`）
- `pnpm dev`：监听并运行 RAG
- `pnpm milvus`：运行 Zilliz/Milvus 日记本增删改查示例（`src/milvus.ts`）
- `pnpm exec tsx src/langgraph-examples.ts`：运行 LangGraph API 示例（见下方）
- `pnpm build`：TypeScript 编译

---

## Zilliz / Milvus 示例（`src/milvus.ts`）

使用 **Zilliz Cloud** 作为 Milvus 数据库，对「日记」数据做增删改查与向量检索。

### 配置

1. 在 [Zilliz Cloud](https://cloud.zilliz.com/) 创建集群，获取「连接」中的地址与 Token。
2. 在项目根目录 `.env` 中设置：
   - `ZILLIZ_URI`：集群公网地址（含端口，如 `:19530`）
   - `ZILLIZ_TOKEN`：API Key 或 `用户名:密码`

### 运行

```bash
pnpm milvus
```

会依次执行：

1. **增**：插入默认 5 条日记（`diaryContents`）
2. **查**：按 id 查一条、列表查全部、按文本做向量相似度搜索
3. **改**：更新 `diary_004` 内容后再查
4. **删**：删除 `diary_005` 后验证

### 默认数据集

见 `src/milvus.ts` 中的 `diaryContents`：包含 id、content、date、mood、tags，与示例中的集合 schema 一致。

### 导出的方法（可自行调用）

- `createMilvusClient()`：创建 Zilliz 客户端
- `ensureCollection(client, dim)`：若集合不存在则创建（含向量索引）
- `insertOne(client, entry)` / `insertMany(client, entries)`：插入
- `getById(client, id)` / `listAll(client, limit)`：标量查询
- `searchSimilar(client, text, topK)`：按文本向量相似度搜索
- `updateOne(client, entry)`：先删后插实现更新
- `deleteById(client, id)` / `deleteByIds(client, ids)`：按 id 删除

集合名为 `diary`；向量由千问 `text-embedding-v3` 生成，与 RAG 示例一致。

---

## LangGraph 示例（`src/langgraph-examples.ts`）

使用 **@langchain/langgraph** 的 Graph API：状态图、节点、边、条件边。

- **示例 1**：线性图 —— `StateSchema`、`addNode`、`addEdge`、`START`/`END`、`compile`、`invoke`
- **示例 2**：条件边 —— `addConditionalEdges`，根据 state 决定下一节点或结束
- **示例 3**：带 LLM —— `MessagesValue`、节点内调用 `model.invoke`、按是否 tool_calls 路由

运行：

```bash
pnpm exec tsx src/langgraph-examples.ts
```

需配置 `.env` 中的 `QIANWEN_API_KEY`（示例 3 会调 LLM）。

---

## 其他说明

- RAG 示例见 `src/rag.ts`，使用内存向量存储与千问模型。
- 若需扩展功能或接入更多数据源，可在本仓库基础上继续迭代。
