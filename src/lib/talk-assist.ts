import {
  CAPTION_STYLES,
  CARD_CAPTION_STYLES,
  FX_CAPTION_STYLES,
  FRAME_CAPTION_STYLES,
  HOUSE_CAPTION_STYLES,
  LOOK_CAPTION_STYLES,
  MOVE_CAPTION_STYLES,
  POP_CAPTION_STYLES,
  captionStyleLabel,
  parseCaptionStyle,
} from "./caption-styles";
import { flowChat } from "./flow/chat";
import { getTalkChatModel, isFlowMock } from "./flow/config";
import type { Project } from "./types";

export type AssistMessage = { role: "user" | "assistant"; content: string };

export type CaptionRecommendation = {
  id: string;
  label: string;
  /** 0-based 分镜；有上下文时指向钩子/中段/收尾对应镜 */
  shotIndex?: number;
  section?: "hook" | "mid" | "end";
};

const CAPTION_GROUPS: { title: string; rows: readonly { id: string; label: string }[] }[] = [
  { title: "口播字", rows: HOUSE_CAPTION_STYLES },
  { title: "电影字", rows: LOOK_CAPTION_STYLES },
  { title: "特效字", rows: FX_CAPTION_STYLES },
  { title: "气质条", rows: FRAME_CAPTION_STYLES },
  { title: "动效字", rows: MOVE_CAPTION_STYLES },
  { title: "片卡字", rows: CARD_CAPTION_STYLES },
  { title: "更多字", rows: POP_CAPTION_STYLES },
];

export function captionCatalogForPrompt(): string {
  return CAPTION_GROUPS.map((group) => {
    const lines = group.rows.map((row) => `- ${row.label}`).join("\n");
    return `### ${group.title}\n${lines}`;
  }).join("\n\n");
}

export function sectionShotIndex(section: CaptionRecommendation["section"], shotCount: number): number | undefined {
  if (!shotCount || shotCount < 1) return undefined;
  if (section === "hook") return 0;
  if (section === "end") return shotCount - 1;
  if (section === "mid") return Math.min(Math.max(1, Math.floor((shotCount - 1) / 2)), shotCount - 1);
  return undefined;
}

function detectSection(line: string): CaptionRecommendation["section"] | undefined {
  if (/钩子|开口|第\s*1\s*[段镜]/.test(line)) return "hook";
  if (/收尾|结尾|最后|第\s*\d+\s*[段镜].*(收|尾|结)/.test(line) || /收尾|结尾/.test(line)) return "end";
  if (/中段|正文|中间|第\s*[2-9０-９]/.test(line)) return "mid";
  return undefined;
}

function detectShotIndex(line: string, shotCount: number): number | undefined {
  const m = /镜\s*([0-9０-９]+)/.exec(line);
  if (!m || !shotCount) return undefined;
  const raw = m[1]!.replace(/[０-９]/g, (ch) => String(ch.charCodeAt(0) - 0xff10));
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > shotCount) return undefined;
  return n - 1;
}

export function buildTalkAssistSystem(project: Project): string {
  const script = project.script;
  const shots = (script?.shots || [])
    .slice(0, 8)
    .map((shot, i) => `${i + 1}. 屏：${shot.onScreenText || "（无）"} / 口：${(shot.voiceover || "").slice(0, 40)}`)
    .join("\n");
  const topic = (project.topic || project.idea || "口播").slice(0, 80);
  return `你是口播成片助手。用简体中文回答，短句清楚。不要写模型名、通道名、厂商名。

当前口播：「${topic}」
钩子：${(script?.hook || "").slice(0, 80) || "（还没有）"}
分镜摘要：
${shots || "（分镜还没写好）"}

## 字幕样式目录（只能从这里推荐，禁止编造目录外名称）
${captionCatalogForPrompt()}

规则：
1. 用户问字幕/字效/推荐时，只从上面目录挑中文名，并按「钩子 / 中段 / 收尾」分段写，每段点名适合的镜号（如镜1）。
2. 一次推荐 3～6 个即可；每段至少写清样式中文名原词，方便作者对照预览点选。
3. 提到样式时用目录里的中文名原词，不要改名。
4. 不谈时间轴微调；成片换画面要「再出一次片」。`;
}

/** 从回复里捞目录内样式，并尽量挂上钩子/中段/收尾对应镜。 */
export function extractCaptionRecommendations(text: string, shotCount = 0): CaptionRecommendation[] {
  const found: CaptionRecommendation[] = [];
  const seen = new Set<string>();
  const sorted = [...CAPTION_STYLES].sort((a, b) => b.label.length - a.label.length);
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  let section: CaptionRecommendation["section"] | undefined;

  function pushForLine(line: string) {
    const nextSection = detectSection(line);
    if (nextSection) section = nextSection;
    const explicitShot = detectShotIndex(line, shotCount);
    const shotIndex = explicitShot ?? sectionShotIndex(section, shotCount);
    for (const row of sorted) {
      if (!line.includes(row.label)) continue;
      const key = `${row.id}:${shotIndex ?? "all"}`;
      if (seen.has(key)) continue;
      // 同一样式不同镜可各留一条；同一样式无镜只留一条
      if (shotIndex == null && seen.has(`${row.id}:all`)) continue;
      seen.add(key);
      if (shotIndex == null) seen.add(`${row.id}:all`);
      found.push({
        id: row.id,
        label: row.label,
        ...(shotIndex != null ? { shotIndex, section } : section ? { section } : {}),
      });
      if (found.length >= 8) return;
    }
  }

  for (const line of lines) {
    pushForLine(line);
    if (found.length >= 8) break;
  }
  if (!found.length) {
    for (const row of sorted) {
      if (!text.includes(row.label)) continue;
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      found.push({ id: row.id, label: row.label });
      if (found.length >= 8) break;
    }
  }
  return found;
}

export function mockTalkAssistReply(userText: string): string {
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
  return "可以问我字幕怎么选，或这条口播下一步该确认文案、分镜还是画面。字幕只能从本站目录里挑。";
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
      maxTokens: 1200,
    });
  } catch {
    // 通道短暂失败时仍给目录内推荐，不挡作者问字幕
    return mockTalkAssistReply(cleaned[cleaned.length - 1]!.content);
  }
}

export function resolveRecommendStyle(raw: string): { id: string; label: string } | undefined {
  const id = parseCaptionStyle(raw);
  if (id) return { id, label: captionStyleLabel(id) };
  const hit = CAPTION_STYLES.find((row) => row.label === String(raw || "").trim());
  return hit ? { id: hit.id, label: hit.label } : undefined;
}

export function recommendationShotLabel(rec: CaptionRecommendation, shotCount: number): string {
  if (typeof rec.shotIndex === "number" && rec.shotIndex >= 0) {
    const sec = rec.section === "hook" ? "钩子" : rec.section === "mid" ? "中段" : rec.section === "end" ? "收尾" : "";
    return sec ? `镜${rec.shotIndex + 1} · ${sec}` : `镜${rec.shotIndex + 1}`;
  }
  if (rec.section === "hook") return shotCount ? "镜1 · 钩子" : "钩子";
  if (rec.section === "mid") return "中段";
  if (rec.section === "end") return shotCount ? `镜${shotCount} · 收尾` : "收尾";
  return "全片";
}
