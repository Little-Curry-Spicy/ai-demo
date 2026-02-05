import "dotenv/config";
import * as path from "node:path";
import * as readline from "node:readline";
import { z } from "zod";
import fs from "fs-extra";
import {
    HumanMessage,
    SystemMessage,
    ToolMessage,
} from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import type { BaseMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import chalk from "chalk";
import { env } from "node:process";

/** 所有文件操作限制在此目录下（当前工作目录） */
const BASE_DIR = process.cwd();

function resolvePath(relativePath: string): string {
    const p = path.resolve(BASE_DIR, relativePath);
    if (!p.startsWith(BASE_DIR)) {
        throw new Error("路径不允许超出工作目录");
    }
    return p;
}

// ============ 工具：创建目录 ============
const createDirectory = tool(
    async ({ dirPath }) => {
        const full = resolvePath(String(dirPath));
        await fs.ensureDir(full);
        return "已创建目录: " + full;
    },
    {
        name: "create_directory",
        description: "创建目录；若父目录不存在会一并创建。路径相对于当前工作目录。",
        schema: z.object({
            dirPath: z.string().describe("相对路径，如 src/components 或 output"),
        }),
    }
);

// ============ 工具：读文件 ============
const readFile = tool(
    async ({ filePath }) => {
        const full = resolvePath(String(filePath));
        const content = await fs.readFile(full, "utf-8");
        return content;
    },
    {
        name: "read_file",
        description: "读取文件内容（UTF-8 文本）。路径相对于当前工作目录。",
        schema: z.object({
            filePath: z.string().describe("文件相对路径，如 src/index.ts"),
        }),
    }
);

// ============ 工具：写文件 ============
const writeFile = tool(
    async ({ filePath, content }) => {
        const full = resolvePath(String(filePath));
        await fs.outputFile(full, String(content), "utf-8");
        return "已写入: " + full;
    },
    {
        name: "write_file",
        description:
            "写入文件；若目录不存在会先创建。用于生成或覆盖文件内容。路径相对于当前工作目录。",
        schema: z.object({
            filePath: z.string().describe("文件相对路径"),
            content: z.string().describe("文件内容（纯文本）"),
        }),
    }
);

// ============ 工具：列出目录 ============
const listDirectory = tool(
    async ({ dirPath }) => {
        const full = resolvePath(String(dirPath) || ".");
        const names = await fs.readdir(full);
        return names.join("\n");
    },
    {
        name: "list_directory",
        description:
            "列出目录下的文件名（一层）。路径相对于当前工作目录；传 . 或空表示当前目录。",
        schema: z.object({
            dirPath: z.string().describe("目录相对路径，. 表示当前目录"),
        }),
    }
);

// ============ 模型与工具 ============
const allTools = [createDirectory, readFile, writeFile, listDirectory];

/** 用于统一调用：各 tool 的 invoke 入参类型不同，联合类型无法直接 .invoke(args)，故用此类型断言 */
type ToolRunner = { invoke: (input: Record<string, unknown>) => Promise<unknown> };

const model = new ChatOpenAI({
    modelName: "deepseek-chat",
    apiKey: env.DEEPSEEK_API_KEY,
    configuration: { baseURL: "https://api.deepseek.com" },
    temperature: 0.7,
});

const modelWithTools = model.bindTools(allTools);

function readQuestion(prompt: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function runToolCalls(
    toolCalls: { id?: string; name?: string; args?: Record<string, unknown> }[]
): Promise<ToolMessage[]> {
    const results: ToolMessage[] = [];
    for (const tc of toolCalls) {
        const id = tc.id ?? "";
        const name = tc.name ?? "";
        const fn = allTools.find(item => item.name == name);
        let content: string;
        if (!fn) {
            content = "未知工具: " + name;
        } else {
            try {
                console.log(chalk.red("用户请求工具:", name, JSON.stringify(tc.args, null, 2)));
                const out = await (fn as ToolRunner).invoke(tc.args ?? {});
                content = String(out);
            } catch (e) {
                content =
                    "错误: " + (e instanceof Error ? e.message : String(e));
            }
        }
        results.push(new ToolMessage({ content, tool_call_id: id }));
    }
    return results;
}

async function main() {
    console.log(chalk.redBright("工作目录:", BASE_DIR));
    console.log(chalk.green("支持: 创建目录、读文件、写文件、列目录。输入 exit/quit/q 退出。\n"));

    while (true) {
        const question = await readQuestion("你说: ");

        if (!question || ["exit", "quit", "q"].includes(question.toLowerCase())) {
            console.log("再见。");
            break;
        }

        let messages: BaseMessage[] = [
            new SystemMessage(
                `你是助手，可用工具：
                create_directory 创建目录；
                read_file 读文件；
                write_file 写文件（可生成新文件）；
                list_directory 列目录。路径都相对于当前工作目录。
                根据用户意图选工具，用中文总结。`
            ),
            new HumanMessage(question),
        ];
        console.log(chalk.green("AI 正在思考。。。"));
        let response = await modelWithTools.invoke(messages);

        const maxToolRounds = 10; // 防止模型一直返回 tool_calls 导致死循环
        let round = 0;
        while (response.tool_calls && response.tool_calls.length > 0 && round < maxToolRounds) {
            console.log(chalk.yellow("工具调用开始:", round));
            round++;
            const toolMessages = await runToolCalls(response.tool_calls);
            messages = [...messages, response, ...toolMessages];
            response = await modelWithTools.invoke(messages);
        }

        console.log(response.content?.toString() ?? "(无回复)");
    }
}

main();
