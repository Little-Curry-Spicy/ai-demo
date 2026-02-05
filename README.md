# LangChain 问答机器人 Monorepo

这是一个基于 LangChain 和 React 的问答机器人项目，采用 monorepo 架构。

## 项目结构

```
langchain-monorepo/
├── packages/
│   ├── backend/          # 后端服务（LangChain Agent）
│   │   ├── src/
│   │   │   ├── index.ts  # 原始测试代码
│   │   │   └── server.ts # Express API 服务
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── frontend/         # 前端应用（React + Ant Design）
│       ├── src/
│       │   ├── App.tsx   # 主应用组件
│       │   ├── main.tsx  # 入口文件
│       │   └── ...
│       ├── package.json
│       └── vite.config.ts
├── pnpm-workspace.yaml   # pnpm workspace 配置
└── package.json          # 根 package.json
```

## 技术栈

### 后端
- **LangChain**: AI Agent 框架
- **LangGraph MemorySaver**: 对话历史记忆管理（基于 checkpointer）
- **DeepSeek Chat**: 大语言模型
- **Express**: Web 服务器
- **TypeScript**: 类型安全

### 前端
- **React 19**: UI 框架
- **Ant Design**: UI 组件库
- **Vite**: 构建工具
- **TypeScript**: 类型安全

## 安装依赖

```bash
pnpm install
```

## 文件类 Tool 示例（src/tools.ts）

基于 **fs-extra** 的简单文件工具，支持创建目录、读文件、写文件、列目录，类似 Cursor 生成文件的能力。所有路径相对于**当前工作目录**（运行脚本时的目录）。

### 运行

```bash
pnpm dev    # 监听并运行
pnpm start  # 直接运行
```

### 工具说明

| 工具 | 说明 | 参数 |
|------|------|------|
| `create_directory` | 创建目录（父目录不存在会一并创建） | `dirPath` 相对路径 |
| `read_file` | 读取文件内容（UTF-8） | `filePath` 相对路径 |
| `write_file` | 写入文件（目录不存在会先创建，可生成新文件） | `filePath`, `content` |
| `list_directory` | 列出一层目录下的文件名 | `dirPath`，传 `.` 或空表示当前目录 |

### 示例

- 「列出当前目录」→ `list_directory`
- 「读一下 src/tools.ts 的前 50 行」→ `read_file` 后模型总结
- 「在 output 下建一个 hello.txt，内容写 Hello World」→ `create_directory` + `write_file` 或直接 `write_file`（会先建目录）
- 「在 src 下生成一个 foo.ts，内容是 export const x = 1」→ `write_file`

依赖：需先执行 `pnpm install`（含 fs-extra）。

---

## 开发

### 同时启动前后端
```bash
pnpm dev
```

### 单独启动后端
```bash
pnpm dev:backend
```

### 单独启动前端
```bash
pnpm dev:frontend
```

## 构建

### 构建所有包
```bash
pnpm build
```

### 单独构建
```bash
pnpm build:backend
pnpm build:frontend
```

## 使用说明

1. **启动后端服务**：后端服务运行在 `http://localhost:3001`
2. **启动前端应用**：前端应用运行在 `http://localhost:3000`
3. **访问应用**：在浏览器中打开 `http://localhost:3000`
4. **开始对话**：在输入框中输入问题，点击发送按钮

## 功能特性

### 1. 文本对话
支持与 AI 进行文本对话，使用 LangChain 的 MemorySaver 自动管理对话历史。每个会话通过 `thread_id` 标识，后端会自动保存和恢复对话上下文。

### 2. 图片解析（视觉功能）
支持上传图片并使用 AI 模型解析图片内容。

**使用方法：**
1. 点击输入框左侧的"图片"按钮
2. 选择要上传的图片
3. （可选）输入对图片的提问
4. 点击"发送"按钮
5. AI 会分析图片并返回描述

**注意：** 图片解析功能需要使用支持视觉的模型（如 GPT-4o）。需要在后端配置 `OPENAI_API_KEY` 环境变量。

### 3. 数据库查询功能
支持使用自然语言查询 Supabase 电影数据库。

**使用方法：**
1. 在输入框中输入关于电影的查询问题，例如：
   - "查询所有电影"
   - "评分最高的电影"
   - "查询2023年的电影"
   - "有多少部电影"
2. 点击"发送"按钮
3. AI 会自动生成 SQL 查询并执行，返回实际的电影数据（而不是 SQL 语句）

**功能特点：**
- 使用 LangChain SQL Agent 自动生成和执行 SQL 查询
- 智能检测数据库查询意图，自动调用数据库 Agent
- 如果 Agent 只返回 SQL 语句，系统会自动提取并执行 SQL，然后格式化返回实际数据
- 查询结果会用自然语言格式化，便于阅读

**技术实现：**
- 后端使用 `@langchain/community` 的 `createSqlAgent` 创建 SQL Agent
- 通过优化 Agent 的 prompt，确保 Agent 执行查询而不仅仅是生成 SQL
- 在 `server.ts` 中实现了 SQL 代码检测和强制执行机制，确保即使 Agent 返回 SQL，也能正确执行并返回数据

## API 接口

### POST /api/chat

发送文本消息并获取 AI 回复

**请求体：**
```json
{
  "message": "你的问题",
  "thread_id": "thread_1234567890_abc" // 可选，如果不提供则创建新会话
}
```

**响应：**
```json
{
  "response": "AI 的回复",
  "thread_id": "thread_1234567890_abc" // 会话 ID，用于后续对话
}
```

**说明：**
- 使用 LangChain 的 `MemorySaver` (checkpointer) 自动管理对话历史
- 首次请求不需要提供 `thread_id`，后端会自动生成
- 后续请求使用相同的 `thread_id` 可以继续之前的对话
- 对话历史由后端自动保存和恢复，前端无需传递历史记录

## 配置

### DeepSeek API Key

在 `packages/backend/src/server.ts` 中配置你的 DeepSeek API Key：

```typescript
const deepseekModel = new ChatOpenAI({
    modelName: "deepseek-chat",
    apiKey: "your-api-key-here",
    // ...
})
```

## 项目特点

- ✅ Monorepo 架构，代码组织清晰
- ✅ TypeScript 全栈类型安全
- ✅ 现代化 UI 设计（Ant Design）
- ✅ 实时对话体验
- ✅ 使用 LangChain MemorySaver 自动管理对话历史
- ✅ 基于 thread_id 的会话管理
- ✅ 响应式设计
- ✅ 自然语言数据库查询，自动执行 SQL 并返回实际数据

## 最近更新

### 上下文记忆和SQL清理优化（最新）
- **问题修复**：
  1. **SQL语句显示问题**：加强了SQL清理逻辑，确保所有SQL代码都被过滤掉，不会在前端显示
  2. **上下文记忆问题**：数据库查询Agent现在支持对话历史，能够理解多轮对话的上下文
- **改进内容**：
  1. 修改了`dbAgent.ts`，添加了对话历史参数支持，让Agent能够理解上下文
  2. 修改了`server.ts`，使用内存存储保存对话历史，并在调用dbAgent时传递历史记录
  3. 加强了SQL清理逻辑，包括：
     - 清理代码块标记（```sql等）
     - 清理单独的SQL语句（包括多行）
     - 清理SQL关键词开头的行
     - 清理SQL相关的说明文字
     - 清理多余的空行
  4. 前端也加强了SQL清理逻辑，双重保险确保SQL不会显示
- **使用效果**：
  - 现在查询"评分最高的电影"后，再问"评分多少"，系统能够理解这是指之前提到的电影的评分
  - SQL语句不会再显示在前端界面中

### 流式传输和 Markdown 渲染支持
- **新增功能**：
  1. **流式传输**：后端支持 Server-Sent Events (SSE) 流式传输，响应内容逐字符实时显示，提升用户体验
  2. **Markdown 渲染**：前端使用 `@ant-design/x-markdown` 渲染响应内容，专为流式渲染优化，支持代码高亮、表格、列表等 Markdown 语法
  3. **Ant Design X 组件**：使用 `Bubble.List` 显示对话，`Think` 组件显示思考过程，`Prompts` 组件提供快捷提示
  4. **Tailwind CSS**：使用 Tailwind CSS 作为 UI 样式库，替代原生 CSS，提供更现代化的样式方案
  5. **实时更新**：流式传输过程中，消息内容实时更新，无需等待完整响应
  6. **SQL 代码过滤**：自动清理响应中的 SQL 代码，只显示查询结果

- **技术实现**：
  - 后端：使用 SSE (Server-Sent Events) 实现流式传输，逐字符发送响应内容
  - 前端：使用 `fetch` API 的 `ReadableStream` 读取流式数据，实时更新 UI
  - Markdown：使用 `@ant-design/x-markdown` 组件，专为流式渲染优化
  - 样式：使用 Tailwind CSS 作为 UI 样式库，提供现代化的样式方案

- **使用方法**：
  - 前端自动使用流式传输（通过 `?stream=true` 参数）
  - 响应内容自动渲染为 Markdown 格式
  - 代码块自动高亮显示

### 数据库查询功能优化
- **问题修复**：修复了自然语言查询数据库时只返回 SQL 语句而不返回实际数据的问题
- **改进内容**：
  1. 重写了 `dbAgent.ts`，使用 LLM 生成 SQL → TypeORM 执行 → LLM 格式化的流程
  2. 自动查询表结构，使用实际字段名生成 SQL
  3. 修复了 SSL 证书问题，支持 Supabase 连接
  4. 使用 LLM 格式化查询结果，使回答更自然易读
- **使用效果**：现在查询"评分最高的电影"会返回实际的电影信息，而不是 SQL 代码

## 许可证

ISC
