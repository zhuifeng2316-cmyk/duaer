import type { Motion } from "./aspect";
import type { VisualMode } from "./hf-registry";

export const LETTERING_MODES = ["overlay-slam", "overlay-wipe", "overlay-highlight", "still-title", "graphic"] as const;
export type LetteringMode = (typeof LETTERING_MODES)[number];

export const VOICE_ROLES = ["hook", "push", "hold"] as const;
export type VoiceRole = (typeof VOICE_ROLES)[number];

export const LETTERING_MODE_LABEL: Record<LetteringMode, string> = {
  "overlay-slam": "成片砸字",
  "overlay-wipe": "成片擦字",
  "overlay-highlight": "成片划重点",
  "still-title": "画进图",
  graphic: "组件自带",
};

export const VOICE_ROLE_LABEL: Record<VoiceRole, string> = {
  hook: "开口砸",
  push: "往前推",
  hold: "收住",
};

export type IntentLook = {
  label: string;
  look: string;
};

/** Distilled generation recipe. Runtime never reads `.agents/skills`. */
export type SkillRecipe = {
  copyBeats: string[];
  boardIntents: string[];
  hostIntents: string[];
  overlayIntents: string[];
  boardDirector: string[];
  intentLooks: IntentLook[];
  musicBeats: string[];
  composeMoves: {
    hookSlam: boolean;
    captionOverlay: boolean;
    alignMotion: boolean;
  };
};

const STORY: SkillRecipe = {
  copyBeats: ["开头一句要能全屏砸出来"],
  boardIntents: ["砸字", "杂志字", "字重切换", "手写标题", "划重点", "打字机", "标题卡", "故障字", "漏光", "闪白"],
  hostIntents: [],
  overlayIntents: ["砸字", "杂志字", "字重切换", "手写标题", "划重点", "打字机", "标题卡", "故障字", "漏光", "闪白"],
  boardDirector: [
    "先定全片：首镜钩子人物海报，中间换构图，末镜收束",
    "字同一时刻只留一层：要砸就不要画进图",
    "屏幕字若是总题加甲、乙、丙并列，用划重点把几项分开亮，不要收成一张标题卡",
    "全片镜头顺着一个方向推，不要推完再拉",
    "四镜以上组法至少三种",
  ],
  intentLooks: [
    { label: "砸字", look: "成片正中一词一词砸，静帧不要再烤标题" },
    { label: "划重点", look: "人还在，总题留下，并列项分开高亮" },
    { label: "杂志字", look: "叠在人物底上的大标题，不要另开底栏" },
    { label: "字重切换", look: "叠在画面上换字重，人还在" },
    { label: "手写标题", look: "叠在人物底上的手写标题" },
    { label: "打字机", look: "叠在画面上逐字打出" },
    { label: "标题卡", look: "整屏一句总题；若后面是顿号并列项，改划重点" },
    { label: "故障字", look: "叠在画面上的故障大字" },
    { label: "漏光", look: "叠在画面上的漏光闪" },
    { label: "闪白", look: "切镜闪白，不要另造场景" },
  ],
  musicBeats: ["垫乐克制、器乐、不要欢快抢人声"],
  composeMoves: { hookSlam: false, captionOverlay: true, alignMotion: true },
};

const KNOWLEDGE: SkillRecipe = {
  copyBeats: ["第一句是能砸上屏的短结论，不要先下定义", "中间要有一处能画成图解的判断或数字"],
  boardIntents: ["流程图", "手绘流程", "图表", "数字跳动", "划重点", "砸字", "代码演示", "打勾清单", "手写标题"],
  hostIntents: ["流程图", "手绘流程", "图表", "代码演示", "打勾清单"],
  overlayIntents: ["划重点", "砸字", "数字跳动", "手写标题"],
  boardDirector: [
    "先定全片：首镜钩子人物海报，中段一处图解，末镜收束",
    "竖屏图解优先划重点叠在人身上，不要整屏横版报表",
    "字同一时刻只留一层：要砸就不要画进图",
    "屏幕字若是总题加甲、乙、丙并列，用划重点把几项分开亮，不要收成一张标题卡",
    "全片镜头顺着一个方向推，不要推完再拉",
    "四镜以上组法至少三种",
  ],
  intentLooks: [
    { label: "划重点", look: "人还在，总题留下，并列项分开高亮" },
    { label: "砸字", look: "成片正中一词一词砸，静帧不要再烤标题" },
    { label: "图表", look: "横版报表，竖屏不要用，改划重点或流程图" },
    { label: "流程图", look: "整屏自己演，不要人物底" },
    { label: "手绘流程", look: "整屏自己演，不要人物底" },
    { label: "数字跳动", look: "叠在人物底上跳数字" },
    { label: "代码演示", look: "整屏自己演，不要人物底" },
    { label: "打勾清单", look: "整屏自己演，不要人物底" },
    { label: "手写标题", look: "叠在人物底上的手写标题" },
  ],
  musicBeats: ["垫乐克制、器乐、不要欢快抢人声"],
  composeMoves: { hookSlam: true, captionOverlay: true, alignMotion: true },
};

const PRODUCT: SkillRecipe = {
  copyBeats: ["中间要有一处能看清界面自己在动"],
  boardIntents: ["下拉刷新", "通知堆", "通知弹出", "轮播", "产品展示", "大光标", "界面放大", "聊天对话", "路径游走", "分享面板"],
  hostIntents: ["轮播", "产品展示", "聊天对话", "路径游走", "分享面板", "大光标", "界面放大"],
  overlayIntents: ["下拉刷新", "通知堆", "通知弹出"],
  boardDirector: [
    "先定全片：首镜钩子，中段一处界面自己在动，末镜收束",
    "轮播、产品展示整屏自己演，不要人物底；下拉刷新、通知叠在人身上",
    "字同一时刻只留一层：要砸就不要画进图",
    "全片镜头顺着一个方向推，不要推完再拉",
    "四镜以上组法至少三种",
  ],
  intentLooks: [
    { label: "下拉刷新", look: "叠在人物底上的列表手势" },
    { label: "通知堆", look: "叠在人物底上弹出通知" },
    { label: "通知弹出", look: "叠在人物底上弹出通知" },
    { label: "轮播", look: "整屏自己演，不要人物底" },
    { label: "产品展示", look: "整屏自己演，不要人物底" },
    { label: "大光标", look: "整屏界面自己在点" },
    { label: "界面放大", look: "整屏界面自己在放大" },
    { label: "聊天对话", look: "整屏自己演，不要人物底" },
    { label: "路径游走", look: "整屏自己演，不要人物底" },
    { label: "分享面板", look: "整屏自己演，不要人物底" },
  ],
  musicBeats: ["垫乐克制、器乐、不要欢快抢人声"],
  composeMoves: { hookSlam: true, captionOverlay: true, alignMotion: true },
};

const RECIPES: Record<VisualMode, SkillRecipe> = {
  story: STORY,
  knowledge: KNOWLEDGE,
  product: PRODUCT,
};

const MOTION_OPPOSITE: Partial<Record<Motion, Motion>> = {
  "pan-left": "pan-right",
  "pan-right": "pan-left",
  "push-in": "pull-out",
  "pull-out": "push-in",
};

export function skillRecipe(mode: VisualMode = "story"): SkillRecipe {
  return RECIPES[mode] || STORY;
}

export function recipeIntentLabels(mode: VisualMode): string[] {
  return skillRecipe(mode).boardIntents;
}

export function recipeAllowsLabel(mode: VisualMode, intent: string): boolean {
  const t = intent.trim();
  if (!t) return false;
  const recipe = skillRecipe(mode);
  return recipe.boardIntents.some((label) => t === label || t.includes(label) || label.includes(t));
}

export function alignShotMotions<T extends { motion: Motion }>(shots: T[]): T[] {
  const next: T[] = [];
  for (const shot of shots) {
    const prev = next[next.length - 1];
    if (prev && MOTION_OPPOSITE[prev.motion] === shot.motion) {
      next.push({ ...shot, motion: prev.motion });
    } else {
      next.push(shot);
    }
  }
  return next;
}

export function parseLetteringMode(raw: unknown): LetteringMode | undefined {
  const t = String(raw || "").trim();
  if (!t) return undefined;
  if ((LETTERING_MODES as readonly string[]).includes(t)) return t as LetteringMode;
  if (/成片划重点/.test(t) || t === "划重点") return "overlay-highlight";
  if (/成片砸|砸字/.test(t) && !/画进图/.test(t)) return "overlay-slam";
  if (/成片擦|擦字|擦除/.test(t)) return "overlay-wipe";
  if (/画进图|烤进|静帧标题/.test(t)) return "still-title";
  if (/组件自带|组件有字/.test(t)) return "graphic";
  return undefined;
}

export function parseVoiceRole(raw: unknown, index: number, total: number): VoiceRole {
  const t = String(raw || "").trim();
  if ((VOICE_ROLES as readonly string[]).includes(t)) return t as VoiceRole;
  if (/开口砸|钩子狠/.test(t)) return "hook";
  if (/收住|放慢/.test(t)) return "hold";
  if (/往前推|带着劲/.test(t)) return "push";
  if (index === 0) return "hook";
  if (total > 1 && index === total - 1) return "hold";
  return "push";
}
