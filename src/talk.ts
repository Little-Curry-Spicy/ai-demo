import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as readline from "node:readline";
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { env } from "node:process";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** 单条问答记录 */
interface QARecord {
    question: string;
    answer: string;
}

/** 持久化文件路径（与脚本同目录下的 qa-records.json） */
const RECORDS_PATH = path.join(__dirname, "qa-records.json");

/** 问答记录数组：启动时从文件加载，每次问答后写入文件，重启后仍保留 */
function loadQARecords(): QARecord[] {
    try {
        const data = fs.readFileSync(RECORDS_PATH, "utf-8");
        return JSON.parse(data) as QARecord[];
    } catch {
        return [];
    }
}

function saveQARecords(records: QARecord[]) {
    fs.writeFileSync(RECORDS_PATH, JSON.stringify(records, null, 2), "utf-8");
}

let qaRecords = loadQARecords();

const model = new ChatOpenAI({
    modelName: "deepseek-chat",
    apiKey: env.DEEPSEEK_API_KEY,
    configuration: {
        baseURL: "https://api.deepseek.com",
    },
    temperature: 0.7,
});

/** 从终端读取一行输入（你输入的问题） */
function readQuestion(prompt: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {

    while (true) {
        const question = await readQuestion("请输入你的问题: ");

        // 退出指令：不调用模型，直接结束
        if (!question || ["exit", "quit", "q"].includes(question.toLowerCase())) {
            console.log("再见，当前共", qaRecords.length, "条问答记录已保存。");
            break;
        }

        // 带上历史对话（带角色：user/assistant），模型才能记住上下文
        const messages = [
            new SystemMessage("你是一个助手，请用中文回答用户的问题。"),
            ...qaRecords.flatMap((r) => [
                new HumanMessage(r.question),
                new AIMessage(r.answer),
            ]),
            new HumanMessage(question),
        ];
        const response = await model.invoke(messages);

        const answer = response.content.toString();
        qaRecords.push({ question, answer });
        saveQARecords(qaRecords);

        console.log(answer);
        console.log("--- 当前共", qaRecords.length, "条记录 ---\n");
    }
}

main();