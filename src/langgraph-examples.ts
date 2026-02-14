/**
 * LangGraph API 示例（基于 Graph API）
 *
 * 运行: pnpm exec tsx src/langgraph-examples.ts  或  pnpm langgraph（若已配置脚本）
 * 运行前请确保已安装依赖: pnpm install
 *
 * 本文件演示的 API 与概念：
 *
 * 1. 最简线性图
 *    - StateSchema：用 z 和 ReducedValue 定义图状态
 *    - addNode(name, fn)：节点函数接收 state，返回部分 state 更新
 *    - addEdge(from, to)：固定边，START / END 为虚拟起止节点
 *    - compile()：编译后才能 invoke
 *    - invoke(initialState)：执行图并返回最终 state
 *
 * 2. 条件边
 *    - addConditionalEdges(node, router, [可选节点列表])：路由函数根据 state 返回下一节点名或 END
 *
 * 3. 带 LLM 的图
 *    - MessagesValue：内置的消息列表状态（带 reducer，适合对话）
 *    - 节点内调用 model.invoke(state.messages)，再根据最后一条是否含 tool_calls 决定是否继续
 */

import "dotenv/config";
import { z } from "zod";
import { HumanMessage } from "@langchain/core/messages";
import { model } from "./utils";
import {
  StateGraph,
  StateSchema,
  MessagesValue,
  ReducedValue,
  START,
  END,
  type GraphNode,
  type ConditionalEdgeRouter,
} from "@langchain/langgraph";

// =============================================================================
// 示例 1：最简线性图（无 LLM）
// 演示：定义 State、添加节点、固定边、compile、invoke
// =============================================================================

/** 示例 1 的状态：只有一个累加数字 */
const CounterState = new StateSchema({
  count: z.number().default(0),
  steps: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (curr, next) => [...curr, ...(Array.isArray(next) ? next : [next])],
  }),
});

/** 节点 A：给 count+1，并往 steps 里追加一条记录 */
const nodeA: GraphNode<typeof CounterState> = (state) => {
  return {
    count: state.count + 1,
    steps: ["A 执行了"],
  };
};

/** 节点 B：再 +1，再追加一条 */
const nodeB: GraphNode<typeof CounterState> = (state) => {
  return {
    count: state.count + 1,
    steps: ["B 执行了"],
  };
};

/** 构建线性图：START -> nodeA -> nodeB -> END */
const linearGraph = new StateGraph(CounterState)
  .addNode("nodeA", nodeA)
  .addNode("nodeB", nodeB)
  .addEdge(START, "nodeA")
  .addEdge("nodeA", "nodeB")
  .addEdge("nodeB", END)
  .compile();

// =============================================================================
// 示例 2：条件边（根据 state 决定下一个节点）
// 演示：addConditionalEdges、路由函数返回节点名或 END
// =============================================================================

const RouteState = new StateSchema({
  value: z.number().default(0),
  path: new ReducedValue(z.array(z.string()).default(() => []), {
    reducer: (curr, next) => [...curr, ...(Array.isArray(next) ? next : [next])],
  }),
});

const nodeDouble: GraphNode<typeof RouteState> = (state) => ({
  value: state.value * 2,
  path: ["double"],
});

/** 路由：value >= 10 结束，否则继续回到 double（循环） */
const routeAfterDouble: ConditionalEdgeRouter<typeof RouteState, Record<string, any>> = (state) => {
  if (state.value >= 10) return END;
  return "double";
};

const conditionalGraph = new StateGraph(RouteState)
  .addNode("double", nodeDouble)
  .addEdge(START, "double")
  // addConditionalEdges 的意思是在 "double" 节点后，使用 routeAfterDouble 路由函数来决定下一个节点。
  // routeAfterDouble 会检查 state，如果 state.value >= 10 就转到 END，否则回到 "double" 节点，实现循环。
  .addConditionalEdges("double", routeAfterDouble, ["double", END])
  .compile();

// =============================================================================
// 示例 3：带 LLM 的图（消息状态 + 条件边）
// 演示：MessagesValue、节点内调用 model、根据是否有 tool_calls 决定是否继续
// =============================================================================

const MessagesState = new StateSchema({
  messages: MessagesValue,
});

/** 调用 LLM 的节点：把当前 messages 发给 model，返回新消息 */
const llmNode: GraphNode<typeof MessagesState> = async (state) => {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
};

/** 条件边：若最后一条是 AI 且带 tool_calls 则去 tool 节点，否则结束 */
const shouldContinue: ConditionalEdgeRouter<typeof MessagesState, Record<string, any>> = (state) => {
  const last = state.messages?.at(-1);
  if (!last || typeof (last as { tool_calls?: unknown[] }).tool_calls === "undefined")
    return END;
  const toolCalls = (last as { tool_calls?: unknown[] }).tool_calls;
  if (toolCalls?.length) return "llm"; // 本示例未实现 tool 节点，仅演示路由
  return END;
};

const chatGraph = new StateGraph(MessagesState)
  .addNode("llm", llmNode)
  .addEdge(START, "llm")
  .addConditionalEdges("llm", shouldContinue, ["llm", END])
  .compile();

// =============================================================================
// 运行示例
// =============================================================================

async function main() {
  console.log("========== 示例 1：线性图 ==========");
  const r1 = await linearGraph.invoke({ count: 0 });
  console.log("最终 state:", r1);

  console.log("\n========== 示例 2：条件边 ==========");
  const r2 = await conditionalGraph.invoke({ value: 1 });
  console.log("最终 state:", r2);

  console.log("\n========== 示例 3：带 LLM ==========");
  const r3 = await chatGraph.invoke({
    messages: [new HumanMessage("用一句话介绍 LangGraph 是做什么的。")],
  });
  console.log(
    "最后一条消息:",
    r3.messages?.at(-1) ? (r3.messages.at(-1) as { content?: string }).content : ""
  );
}

main().catch(console.error);
