/**
 * 模板化 Prompt 示例（LangChain @langchain/core/prompts）
 *
 * 1. PromptTemplate：单段字符串模板，占位符 {变量名}
 * 2. ChatPromptTemplate：多角色对话模板（system / human / ai）
 * 3. 带 MessagesPlaceholder：在模板中预留「历史消息」位置
 * 4. partial：固定部分变量，后续只传剩余变量
 * 5. Few-shot 模板：在 prompt 里放几条「输入→输出」示例，让模型模仿格式/风格
 */

import "dotenv/config";
import {
  PromptTemplate,
  ChatPromptTemplate,
  SystemMessagePromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  FewShotPromptTemplate,
} from "@langchain/core/prompts";
import { model } from "./utils";
import chalk from "chalk";
// =============================================================================
// 1. PromptTemplate：单段字符串，占位符用 {变量名}
// 适合：一次性拼出一整段文本（如给 invoke 的字符串）
// =============================================================================

const greetTemplate = new PromptTemplate({
  inputVariables: ["name", "role"],
  template: "你好，{name}！你正在以{role}的身份与 AI 对话。请简要介绍一下你自己。",
});


// 使用：format() 得到填充后的字符串
async function example1() {
  const str = await greetTemplate.format({ name: "小明", role: "产品经理" });
  console.log(chalk.green("1. PromptTemplate 填充结果:") + str);
  // 可直接把填充结果交给 model（若模型接字符串）
  const msg = await model.invoke(str);
  console.log(chalk.green("3. 模型回复摘要:") + (msg.content as string).slice(0, 80) + "...");
}

// =============================================================================
// 2. ChatPromptTemplate：多角色消息模板，用于 Chat 模型
// 由多条「消息模板」组成，每条可含 {变量名}
// =============================================================================

const chatTemplate = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "你是一个{style}的助手。回答时要{constraint}。"
  ),
  HumanMessagePromptTemplate.fromTemplate("{question}"),
]);

// formatMessages() 得到 BaseMessage[]，可直接传给 model.invoke
async function example2() {
  const messages = await chatTemplate.formatMessages({
    style: "简洁专业",
    constraint: "控制在三句话以内",
    question: "什么是 RAG？",
  });
  const response = await model.invoke(messages);
  console.log(chalk.green("4. ChatPromptTemplate 回复:") + (response.content as string).slice(0, 120) + "...");
}

// =============================================================================
// 3. MessagesPlaceholder：在模板中预留「历史消息」位置
//
// 是什么：在 ChatPromptTemplate 里占一个「坑」，formatMessages 时用「变量名」传入
//        一条或多条 BaseMessage（HumanMessage / AIMessage / SystemMessage），
//        它们会按顺序插在该占位符的位置，不参与 {xxx} 字符串替换。
//
// 用法：new MessagesPlaceholder("变量名")，变量名对应 formatMessages({ 变量名: BaseMessage[] })。
// 适合：多轮对话——system 固定，中间是历史消息，最后是当前用户 input。
//
// 可选：MessagesPlaceholder({ variableName: "history", optional: true }) 表示历史可为空（首轮）。
// =============================================================================

const chatWithHistoryTemplate = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate(
    "你是客服助手。根据对话历史回答用户，保持礼貌简洁。"
  ),
  new MessagesPlaceholder("history"),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

/** 首轮没有历史时，传空数组即可 */
const chatWithOptionalHistoryTemplate = ChatPromptTemplate.fromMessages([
  SystemMessagePromptTemplate.fromTemplate("你是助手。{instruction}"),
  new MessagesPlaceholder({ variableName: "history", optional: true }),
  HumanMessagePromptTemplate.fromTemplate("{input}"),
]);

async function example3() {
  const { HumanMessage, AIMessage } = await import("@langchain/core/messages");

  // 有历史：history 对应 MessagesPlaceholder("history")，传 BaseMessage[]
  const messages = await chatWithHistoryTemplate.formatMessages({
    history: [
      new HumanMessage("我想查订单 12345 的物流"),
      new AIMessage("好的，正在为您查询订单 12345 的物流信息,大概需要3天左右到货"),
    ],
    input: "大概什么时候能到？",
  });
  const response = await model.invoke(messages);
  console.log(chalk.green("5. 带历史消息的回复:") + (response.content as string).slice(0, 100) + "...");

  // 首轮：history 传 []，optional 时不会报错
  const firstTurn = await chatWithOptionalHistoryTemplate.formatMessages({
    instruction: "简洁回答。",
    history: [],
    input: "你好，请问 RAG 是什么？",
  });
  const firstResponse = await model.invoke(firstTurn);
  console.log(chalk.green("5b. MessagesPlaceholder 首轮(history=[])") + (firstResponse.content as string).slice(0, 80) + "...");
}

// =============================================================================
// 4. partial：固定部分变量，得到「部分填充」的模板
// 适合：系统设定固定，只传每轮不同的 question / input
// =============================================================================

async function example4() {
  // partial() 返回 Promise，需 await；固定 style、constraint 后只需传 question
  const partialChat = await chatTemplate.partial({
    style: "温暖贴心",
    constraint: "用一两句话说明白",
  });
  const messages = await partialChat.formatMessages({
    question: "你好，请问 RAG 是什么？",
  });
  const response = await model.invoke(messages);
  console.log(chalk.green("7. partial 固定风格后的回复:") + (response.content as string).slice(0, 100) + "...");
}

// =============================================================================
// 5. 链式使用：prompt.pipe(model) 得到 Runnable，invoke 时传变量即可
// =============================================================================

async function example5() {
  const partialChat = await chatTemplate.partial({
    style: "简洁",
    constraint: "一句话",
  });
  const chain = partialChat.pipe(model);
  const result = await chain.invoke({ question: "用一句话解释 API 是什么。" });
  console.log(chalk.green("8. 链式调用结果:") + (result.content as string).slice(0, 80) + "...");
}

// =============================================================================
// 6. Few-shot 模板：在 prompt 里放几条「输入→输出」示例，让模型模仿
//
// 是什么：Few-shot = 在提示中先写若干条「示例」（输入 + 期望输出），再给出「当前输入」，
//        让模型按同样格式/风格回答。相对地，不写示例、直接问叫 zero-shot。
// 适合：分类、翻译、固定格式生成、风格模仿等。
//
// LangChain 用法：
// - FewShotPromptTemplate：单段字符串，由 prefix（说明）+ 多条 example（用 examplePrompt 格式化）+ suffix（含当前输入的占位符）组成。
// - examplePrompt：每条示例的模板，占位符对应 examples 里每个对象的 key（如 input/output）。
// - suffix 里用到的变量即 inputVariables，format 时传入当前这一条的参数。
// =============================================================================

const fewShotTemplate = new FewShotPromptTemplate({
  examples: [
    { input: "大", output: "小" },
    { input: "快", output: "慢" },
    { input: "热", output: "冷" },
  ],
  examplePrompt: PromptTemplate.fromTemplate("输入: {input}\n输出: {output}"),
  prefix: "请给出下列词语的反义词，只输出一个词。",
  suffix: "输入: {word}\n输出:",
  inputVariables: ["word"],
  exampleSeparator: "\n\n",
});

async function example6() {
  // 拼出的 prompt 里会先有 3 条示例，最后是「输入: 难\n输出:」，让模型补「易」
  const promptText = await fewShotTemplate.format({ word: "难" });
  console.log(chalk.green("9. Few-shot 拼出的 prompt 片段:") + "\n" + promptText.slice(-80));

  const { HumanMessage } = await import("@langchain/core/messages");
  const response = await model.invoke([new HumanMessage(promptText)]);
  console.log(chalk.green("10. 模型补出的反义词:") + (response.content as string));
}

// =============================================================================
// 运行所有示例
// =============================================================================

async function main() {
  console.log(chalk.green("========== 模板化 Prompt 示例 ==========\n"));
  await example1();
  console.log("");
  await example2();
  console.log("");
  await example3();
  console.log("");
  await example4();
  console.log("");
  await example5();
  console.log("");
  await example6();
  console.log(chalk.green("\n========== 结束 =========="));
}

main().catch(console.error);
