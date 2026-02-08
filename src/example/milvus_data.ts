/** 默认数据集：用于练习增删改查 */

import { DataType } from "@zilliz/milvus2-sdk-node";

/** 日记条目类型（与前端/默认数据一致） */
export interface DiaryEntry {
  id: string;
  content: string;
  date: string;
  mood: string;
  tags: string[];
}

/** 灰太狼的日记（喜羊羊与灰太狼） */
export const diaryContents: DiaryEntry[] = [
  {
    id: "diary_001",
    content:
      "今天发明了吸羊机，本来想一口气把羊村的羊全吸进狼堡，结果喜羊羊把管道调了方向，我和红太狼的平底锅一起被吸进去了。唉，我一定会回来的！",
    date: "2026-01-10",
    mood: "frustrated",
    tags: ["发明", "抓羊", "喜羊羊"],
  },
  {
    id: "diary_002",
    content:
      "扮成羊混进羊村，以为这次稳了。没想到喜羊羊请我吃超级辣草，辣得现出原形，被捆起来扔出羊村。在空中飞的时候我又喊了那句：我一定会回来的！",
    date: "2026-01-11",
    mood: "angry",
    tags: ["伪装", "羊村", "喜羊羊"],
  },
  {
    id: "diary_003",
    content:
      "红太狼又用平底锅敲我脑袋，骂我没用的东西。我也没办法啊，喜羊羊太聪明了。不过没关系，我灰太狼不会放弃的，明天再想新办法抓羊。",
    date: "2026-01-12",
    mood: "sad",
    tags: ["红太狼", "平底锅", "抓羊"],
  },
  {
    id: "diary_004",
    content:
      "在狼堡里捣鼓新发明，想造一台自动抓羊机。要是能抓到羊，红太狼就不会老拿平底锅揍我了。小羊们等着，我灰太狼一定会回来的！",
    date: "2026-01-12",
    mood: "hopeful",
    tags: ["发明", "狼堡", "抓羊"],
  },
  {
    id: "diary_005",
    content:
      "今天差点抓到懒羊羊，他在村外草地上睡着了。可惜喜羊羊又及时赶到，把懒羊羊救走了。这些羊怎么这么团结，气死我了。",
    date: "2026-01-13",
    mood: "frustrated",
    tags: ["懒羊羊", "喜羊羊", "羊村"],
  },
  {
    id: "diary_006",
    content:
      "青青草原上日复一日和羊村斗智斗勇。虽然每次都说我一定会回来的，但小羊们团结在一起，从来没让我得逞。不过我是不会认输的！",
    date: "2026-01-14",
    mood: "determined",
    tags: ["青青草原", "羊村", "斗智斗勇"],
  },
];

/** 根据当前 embedding 模型的向量维度生成集合 schema（维度需与 embed 输出一致） */
export function getSchema(dim: number) {
  return [
    {
      name: "id",
      description: "日记主键",
      data_type: DataType.VarChar,
      is_primary_key: true,
      max_length: 64,
    },
    {
      name: "content",
      description: "日记正文",
      data_type: DataType.VarChar,
      max_length: 4096,
    },
    {
      name: "date",
      description: "日期",
      data_type: DataType.VarChar,
      max_length: 32,
    },
    {
      name: "mood",
      description: "心情",
      data_type: DataType.VarChar,
      max_length: 64,
    },
    {
      name: "tags",
      description: "标签列表",
      data_type: DataType.JSON,
    },
    {
      name: "vector",
      description: "content 的向量",
      data_type: DataType.FloatVector,
      dim,
    },
  ];
}