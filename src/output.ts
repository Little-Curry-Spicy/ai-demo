import 'dotenv/config';
import { z } from 'zod';
import { model } from './utils';
import chalk from 'chalk';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { JsonOutputParser } from '@langchain/core/output_parsers';
// 定义结构化输出的 schema
const scientistSchema = z.object({
    name: z.string().describe("科学家的全名"),
    birth_year: z.number().describe("出生年份"),
    nationality: z.string().describe("国籍"),
    fields: z.array(z.string()).describe("研究领域列表"),
});

type Scientist = z.infer<typeof scientistSchema>;
const parser = new JsonOutputParser<Scientist>();
const chain = model.pipe(parser);
const obj = await chain.invoke('介绍一下爱因斯坦，用 JSON 返回：name、birth_year、nationality、fields');
console.log(chalk.green(JSON.stringify(obj, null, 2)));

// const structuredModel = model.withStructuredOutput(scientistSchema);
// const parser = StructuredOutputParser.fromZodSchema(scientistSchema);
// const formatInstructions = parser.getFormatInstructions();

// const prompt=`请介绍一下爱因斯坦，严格按以下格式输出：\n${formatInstructions}`;
// const stream = await model.stream(prompt);
// let fullContent = '';
// for await (const chunk of stream) {
//     fullContent += chunk.content as string;
//     process.stdout.write(chunk.content as string);
// }
// const result = await parser.parse(fullContent);
// if (result) {
//     console.log("📊 最终结构化结果:\n");
//     console.log(chalk.green(JSON.stringify(result, null, 2)));
//     console.log(chalk.green("\n📝 格式化输出:"));
//     console.log(chalk.green(`姓名: ${result.name}`));
//     console.log(chalk.green(`出生年份: ${result.birth_year}`));
//     console.log(chalk.green(`国籍: ${result.nationality}`));
//     console.log(chalk.green(`研究领域: ${result.fields.join(', ')}`));
// }
// const result = await structuredModel.invoke("介绍一下爱因斯坦");
// if (result) {
//     console.log("📊 最终结构化结果:\n");
//     console.log(chalk.green(JSON.stringify(result, null, 2)));

//     console.log(chalk.green("\n📝 格式化输出:"));
//     console.log(chalk.green(`姓名: ${result.name}`));
//     console.log(chalk.green(`出生年份: ${result.birth_year}`));
//     console.log(chalk.green(`国籍: ${result.nationality}`));
//     console.log(chalk.green(`研究领域: ${result.fields.join(', ')}`));
// }

// const parser = StructuredOutputParser.fromZodSchema(scientistSchema);

// const stream = await model.stream("介绍一下爱因斯坦");
// let chunkCount = 0;

// let fullContent = '';

// for await (const chunk of stream) {
//     chunkCount++;
//     const content = chunk.content;
//     fullContent += content;

//     process.stdout.write(content as string); // 实时显示流式文本
// }
// const result = await parser.parse(fullContent);
// if (result) {
//     console.log("📊 最终结构化结果:\n");
//     console.log(JSON.stringify(result, null, 2));

//     console.log("\n📝 格式化输出:");
//     console.log(`姓名: ${result.name}`);
//     console.log(`出生年份: ${result.birth_year}`);
//     console.log(`国籍: ${result.nationality}`);
//     console.log(`研究领域: ${result.fields.join(', ')}`);
// }