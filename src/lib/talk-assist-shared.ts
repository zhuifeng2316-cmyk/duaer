import {
  CAPTION_STYLES,
  CARD_CAPTION_STYLES,
  FX_CAPTION_STYLES,
  FRAME_CAPTION_STYLES,
  HOUSE_CAPTION_STYLES,
  LOOK_CAPTION_STYLES,
  MOVE_CAPTION_STYLES,
  POP_CAPTION_STYLES,
} from "./caption-styles";
import type { VisualMode } from "./hf-labels";
import house from "./duaer-registry.json";
import { recipeIntentLabels } from "./skill-recipes";

export type AssistMessage = { role: "user" | "assistant"; content: string };

export type CaptionRecommendation = {
  id: string;
  label: string;
  shotIndex?: number;
  section?: "hook" | "mid" | "end";
};

export type GraphicRecommendation = {
  wraps: string;
  label: string;
  kind: "block" | "component";
  shotIndex?: number;
  section?: "hook" | "mid" | "end";
  tags?: string[];
};

type HouseRow = {
  wraps: string;
  label: string;
  kind?: "block" | "component";
  modes: string[];
  aliases: string[];
  tags?: string[];
};

const HOUSE = house as HouseRow[];
const MODE_ORDER: VisualMode[] = ["story", "product", "knowledge"];

const CAPTION_GROUPS: { title: string; rows: readonly { id: string; label: string }[] }[] = [
  { title: "口播字", rows: HOUSE_CAPTION_STYLES },
  { title: "电影字", rows: LOOK_CAPTION_STYLES },
  { title: "特效字", rows: FX_CAPTION_STYLES },
  { title: "气质条", rows: FRAME_CAPTION_STYLES },
  { title: "动效字", rows: MOVE_CAPTION_STYLES },
  { title: "片卡字", rows: CARD_CAPTION_STYLES },
  { title: "更多字", rows: POP_CAPTION_STYLES },
];

const MODE_TITLE: Record<string, string> = {
  story: "故事口播",
  product: "产品介绍",
  knowledge: "知识输出",
};

function formatModeCatalog(mode: string): string {
  const rows = HOUSE.filter((row) => row.modes.includes(mode));
  const blocks = rows.filter((row) => row.kind === "block");
  const comps = rows.filter((row) => row.kind !== "block");
  return [
    `### 全库 · ${MODE_TITLE[mode] || mode} · 画面块（${blocks.length}）`,
    blocks.map((row) => `- ${row.label}`).join("\n") || "- （无）",
    "",
    `### 全库 · ${MODE_TITLE[mode] || mode} · 叠层（${comps.length}）`,
    comps.map((row) => `- ${row.label}`).join("\n") || "- （无）",
  ].join("\n");
}

function formatRecipeCatalog(mode: string): string {
  const primary = (MODE_ORDER.includes(mode as VisualMode) ? mode : "story") as VisualMode;
  const primaryLines = recipeIntentLabels(primary).map((name) => `- ${name}`).join("\n");
  const others = MODE_ORDER.filter((m) => m !== primary)
    .map((m) => {
      const lines = recipeIntentLabels(m).map((name) => `- ${name}`).join("\n");
      return `### 题材精选 · ${MODE_TITLE[m]}\n${lines}`;
    })
    .join("\n\n");
  return [
    `### 题材精选 · ${MODE_TITLE[primary]}（写分镜常用，优先推荐）`,
    primaryLines,
    "",
    others,
  ].join("\n");
}

export function captionCatalogForPrompt(): string {
  return CAPTION_GROUPS.map((group) => {
    const lines = group.rows.map((row) => `- ${row.label}`).join("\n");
    return `### ${group.title}\n${lines}`;
  }).join("\n\n");
}

/** 题材精选（配方）+ 全库约四百个组件中文名。 */
export function graphicCatalogForPrompt(mode?: string | null): string {
  const primary = mode || "story";
  return [
    formatRecipeCatalog(primary),
    "",
    `全库组件共 ${HOUSE.length} 个，下面按题材列出，均可点名预览与用到某一镜：`,
    "",
    MODE_ORDER.map(formatModeCatalog).join("\n\n"),
  ].join("\n");
}

export function resolveHouseByLabel(raw: string): HouseRow | undefined {
  const label = String(raw || "").trim();
  if (!label) return undefined;
  return HOUSE.find((row) => row.label === label) || HOUSE.find((row) => row.aliases.includes(label));
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

export function extractGraphicRecommendations(text: string, shotCount = 0): GraphicRecommendation[] {
  const found: GraphicRecommendation[] = [];
  const seen = new Set<string>();
  const sorted = [...HOUSE].sort((a, b) => b.label.length - a.label.length);
  const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
  let section: GraphicRecommendation["section"] | undefined;

  function pushForLine(line: string) {
    const nextSection = detectSection(line);
    if (nextSection) section = nextSection;
    const explicitShot = detectShotIndex(line, shotCount);
    const shotIndex = explicitShot ?? sectionShotIndex(section, shotCount);
    for (const row of sorted) {
      if (!line.includes(row.label)) continue;
      const key = `${row.wraps}:${shotIndex ?? "all"}`;
      if (seen.has(key)) continue;
      if (shotIndex == null && seen.has(`${row.wraps}:all`)) continue;
      seen.add(key);
      if (shotIndex == null) seen.add(`${row.wraps}:all`);
      found.push({
        wraps: row.wraps,
        label: row.label,
        kind: row.kind === "block" ? "block" : "component",
        tags: row.tags?.slice(0, 4),
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
      if (seen.has(row.wraps)) continue;
      seen.add(row.wraps);
      found.push({
        wraps: row.wraps,
        label: row.label,
        kind: row.kind === "block" ? "block" : "component",
        tags: row.tags?.slice(0, 4),
      });
      if (found.length >= 8) break;
    }
  }
  return found;
}

export function recommendationShotLabel(
  rec: { shotIndex?: number; section?: "hook" | "mid" | "end" },
  shotCount: number,
): string {
  if (typeof rec.shotIndex === "number" && rec.shotIndex >= 0) {
    const sec = rec.section === "hook" ? "钩子" : rec.section === "mid" ? "中段" : rec.section === "end" ? "收尾" : "";
    return sec ? `镜${rec.shotIndex + 1} · ${sec}` : `镜${rec.shotIndex + 1}`;
  }
  if (rec.section === "hook") return shotCount ? "镜1 · 钩子" : "钩子";
  if (rec.section === "mid") return "中段";
  if (rec.section === "end") return shotCount ? `镜${shotCount} · 收尾` : "收尾";
  return "各镜";
}

export function houseLabelList(): string[] {
  return HOUSE.map((row) => row.label);
}
