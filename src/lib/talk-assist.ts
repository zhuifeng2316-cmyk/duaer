import { CAPTION_STYLES, captionStyleLabel, parseCaptionStyle } from "./caption-styles";
import { flowChat } from "./flow/chat";
import { getTalkChatModel, isFlowMock } from "./flow/config";
import type { VisualMode } from "./hf-registry";
import type { Project } from "./types";
import {
  captionCatalogForPrompt,
  graphicCatalogForPrompt,
  type AssistMessage,
  type CaptionRecommendation,
  type GraphicRecommendation,
} from "./talk-assist-shared";

export type { AssistMessage, CaptionRecommendation, GraphicRecommendation };
export {
  captionCatalogForPrompt,
  extractCaptionRecommendations,
  extractGraphicRecommendations,
  graphicCatalogForPrompt,
  recommendationShotLabel,
  resolveHouseByLabel,
  sectionShotIndex,
} from "./talk-assist-shared";

const MODE_TITLE: Record<VisualMode, string> = {
  story: "故事口播",
  product: "产品介绍",
  knowledge: "知识输出",
};

export function buildTalkAssistSystem(project: Project): string {
  const script = project.script;
  const mode = (script?.visualMode || "story") as VisualMode;
  const shots = (script?.shots || [])
    .slice(0, 8)
    .map((shot, i) => {
      const gfx = shot.graphicIntent || "（无组件）";
      return `${i + 1}. 屏：${shot.onScreenText || "（无）"} / 口：${(shot.voiceover || "").slice(0, 40)} / 组件：${gfx}`;
    })
    .join("\n");
  const topic = (project.topic || project.idea || "口播").slice(0, 80);
  return `你是口播成片助手。用简体中文回答，短句清楚。不要写模型名、通道名、厂商名。

当前口播：「${topic}」
题材：${MODE_TITLE[mode] || mode}
钩子：${(script?.hook || "").slice(0, 80) || "（还没有）"}
分镜摘要：
${shots || "（分镜还没写好）"}

## 字幕样式目录（只能从这里推荐，禁止编造目录外名称）
${captionCatalogForPrompt()}

## 组件目录（只能从这里推荐，禁止编造目录外名称；只写中文名）
${graphicCatalogForPrompt(mode)}

规则：
1. 用户问字幕/字效时，只从字幕目录挑中文名，并按「钩子 / 中段 / 收尾」分段写，点名镜号（如镜1）。
2. 用户问组件/画面块/叠层/动效/代码/图表/界面时，只从组件目录挑中文名，同样按钩子/中段/收尾与镜号写。日常优先「题材精选」；用户要更多花样或点名全库时，从「全库」里挑（含代码、图表、轮播等）。
3. 一次推荐 3～6 个即可；提到名称时必须用目录原词，方便作者点选预览。不要写英文技能名。
4. 不要把字幕名当成组件名，也不要把组件名当成字幕名。
5. 不谈时间轴微调；成片换画面要「再出一次片」。`;
}

export function mockTalkAssistReply(userText: string): string {
  const askGraphic = /组件|画面块|叠层|下拉|轮播|流程图|地图/.test(userText);
  if (askGraphic) {
    return [
      "按题材精选和全库，这条可以这样配：",
      "",
      "### 钩子（镜1）",
      "- 闪白：开口闪一下，把注意力拽住。",
      "",
      "### 中段",
      "- 漏光：情绪段加一层暖光。",
      "- 手写标题：要点写成手写感。",
      "- 代码演示：要讲清步骤时可用独立代码块。",
      "",
      "### 收尾",
      "- 胶片颗粒：收束成片气质。",
      "- 故障字：如果要更冲一点再用。",
      "",
      "全库里还可以点「下拉刷新」「柱图表赛跑」「对话露出」这类。",
      "点预览卡就能用到对应镜；组件名都以目录为准。",
    ].join("\n");
  }
  const askCaption = /字幕|字效|推荐|风格|样式|砸字|霓虹/.test(userText);
  if (askCaption) {
    return [
      "按咱们现有目录，这条口播可以这样挑：",
      "",
      "### 钩子（镜1）",
      "- 砸字：开口一句砸开，适合「人到中年」。",
      "",
      "### 中段",
      "- 划重点：要点做成芯片。",
      "- 霓虹字：情绪段屏幕字发光。",
      "",
      "### 收尾",
      "- 打字机：收束像备忘。",
      "- 珊瑚硬边：底栏气质条，整片统一也稳。",
      "",
      "想整片统一就先定一种；钩子砸、后文杂志也可以分镜单改。",
    ].join("\n");
  }
  return "可以问我字幕或组件怎么选。字幕和组件都只能从本站目录里挑。";
}

export async function runTalkAssist(project: Project, history: AssistMessage[]): Promise<string> {
  const cleaned = history
    .map((row) => ({
      role: row.role,
      content: String(row.content || "").trim().slice(0, 4000),
    }))
    .filter((row) => row.content && (row.role === "user" || row.role === "assistant"))
    .slice(-12);
  if (!cleaned.length || cleaned[cleaned.length - 1]?.role !== "user") {
    throw new Error("先说一句你想问什么");
  }
  if (isFlowMock()) {
    return mockTalkAssistReply(cleaned[cleaned.length - 1]!.content);
  }
  if (!process.env.FLOW_API_KEY?.trim()) {
    return mockTalkAssistReply(cleaned[cleaned.length - 1]!.content);
  }
  const system = buildTalkAssistSystem(project);
  const messages = [{ role: "system" as const, content: system }, ...cleaned];
  try {
    return await flowChat({
      system,
      user: cleaned[cleaned.length - 1]!.content,
      messages,
      model: getTalkChatModel(),
      kind: "助手",
      expectJson: false,
      temperature: 0.5,
      maxTokens: 1400,
    });
  } catch {
    return mockTalkAssistReply(cleaned[cleaned.length - 1]!.content);
  }
}

export function resolveRecommendStyle(raw: string): { id: string; label: string } | undefined {
  const id = parseCaptionStyle(raw);
  if (id) return { id, label: captionStyleLabel(id) };
  const hit = CAPTION_STYLES.find((row) => row.label === String(raw || "").trim());
  return hit ? { id: hit.id, label: hit.label } : undefined;
}
