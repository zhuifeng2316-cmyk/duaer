import { describe, expect, it } from "vitest";
import type { Aspect } from "./aspect";
import { MOCK_SCRIPT } from "./copy";
import { compileDirector } from "./director-compile";
import { houseItem } from "./duaer-registry";
import { graphicIsHost, shotNeedsPersonStill } from "./graphic-board";
import { pickGraphicForShot } from "./hf-pick";
import type { VisualMode } from "./hf-registry";
import {
  buildEditList,
  fallbackCinemaHtml,
  graphicHoldsLettering,
  validateCinemaHtml,
} from "./html-compose";
import { skillRecipe, type LetteringMode } from "./skill-recipes";
import type { Script, Shot } from "./types";

type Row = {
  mode: VisualMode;
  intent: string;
  wraps: string;
  aspect?: Aspect;
  /** After compileDirector, expected lettering on that shot. */
  lettering: LetteringMode;
  /** Screen copy that triggers list highlight when needed. */
  onScreenText?: string;
  voiceover?: string;
  /** Vertical knowledge chart must remap. */
  remapTo?: string;
};

const ROWS: Row[] = [
  { mode: "story", intent: "砸字", wraps: "caption-kinetic-slam", lettering: "overlay-slam" },
  { mode: "story", intent: "杂志字", wraps: "caption-editorial-emphasis", lettering: "overlay-wipe", onScreenText: "看见代价" },
  { mode: "story", intent: "字重切换", wraps: "caption-weight-shift", lettering: "overlay-wipe", onScreenText: "看见代价" },
  { mode: "story", intent: "手写标题", wraps: "hw-title", lettering: "overlay-wipe", onScreenText: "看见代价" },
  {
    mode: "story",
    intent: "划重点",
    wraps: "caption-highlight",
    lettering: "overlay-highlight",
    onScreenText: "三笔账：时间、钱、风险",
    voiceover: "时间、钱、风险，这三笔账都得算。",
  },
  { mode: "story", intent: "打字机", wraps: "typewriter", lettering: "graphic", onScreenText: "看见代价" },
  { mode: "story", intent: "标题卡", wraps: "titlecard-calm", lettering: "graphic", onScreenText: "看见代价" },
  { mode: "story", intent: "故障字", wraps: "caption-glitch-rgb", lettering: "overlay-slam" },
  { mode: "story", intent: "漏光", wraps: "light-leak", lettering: "overlay-wipe" },
  { mode: "story", intent: "闪白", wraps: "flash-through-white", lettering: "overlay-wipe" },

  { mode: "knowledge", intent: "流程图", wraps: "flowchart-vertical", lettering: "graphic" },
  { mode: "knowledge", intent: "手绘流程", wraps: "hw-pipeline", lettering: "graphic" },
  { mode: "knowledge", intent: "图表", wraps: "data-chart", aspect: "16:9", lettering: "graphic" },
  {
    mode: "knowledge",
    intent: "图表",
    wraps: "data-chart",
    aspect: "9:16",
    lettering: "overlay-highlight",
    remapTo: "划重点",
    onScreenText: "三笔账：时间、钱、风险",
    voiceover: "时间、钱、风险，这三笔账都得算。",
  },
  { mode: "knowledge", intent: "数字跳动", wraps: "count-up", aspect: "16:9", lettering: "graphic" },
  {
    mode: "knowledge",
    intent: "划重点",
    wraps: "caption-highlight",
    lettering: "overlay-highlight",
    onScreenText: "三笔账：时间、钱、风险",
    voiceover: "时间、钱、风险，这三笔账都得算。",
  },
  { mode: "knowledge", intent: "砸字", wraps: "caption-kinetic-slam", lettering: "overlay-slam" },
  { mode: "knowledge", intent: "代码演示", wraps: "code-terminal-run", aspect: "16:9", lettering: "graphic" },
  { mode: "knowledge", intent: "打勾清单", wraps: "marker-checklist-card", lettering: "graphic", onScreenText: "先列代价" },
  { mode: "knowledge", intent: "手写标题", wraps: "hw-title", lettering: "overlay-wipe", onScreenText: "先列代价" },

  { mode: "product", intent: "下拉刷新", wraps: "pull-to-refresh", lettering: "graphic", onScreenText: "刷新一下" },
  { mode: "product", intent: "通知堆", wraps: "notification-stack", lettering: "graphic", onScreenText: "今天就出发" },
  { mode: "product", intent: "通知弹出", wraps: "native-notification-pop", lettering: "graphic", onScreenText: "上线了" },
  { mode: "product", intent: "轮播", wraps: "carousel-circle-1", aspect: "16:9", lettering: "graphic" },
  { mode: "product", intent: "产品展示", wraps: "app-showcase", aspect: "16:9", lettering: "graphic" },
  { mode: "product", intent: "大光标", wraps: "oversized-cursor", aspect: "16:9", lettering: "graphic" },
  { mode: "product", intent: "界面放大", wraps: "ui-focus-zoom", aspect: "16:9", lettering: "graphic" },
  { mode: "product", intent: "聊天对话", wraps: "message-thread-reveal", lettering: "graphic" },
  { mode: "product", intent: "路径游走", wraps: "offset-path-traveler", aspect: "16:9", lettering: "graphic" },
  { mode: "product", intent: "分享面板", wraps: "share-sheet-carousel", lettering: "graphic" },
];

function baseShot(row: Row): Shot {
  const house = houseItem(row.wraps);
  return {
    ...MOCK_SCRIPT.shots[0]!,
    graphicIntent: row.intent,
    overlay: undefined,
    block: undefined,
    graphicVars: undefined,
    lettering: undefined,
    captionStyle: undefined,
    onScreenText: row.onScreenText || MOCK_SCRIPT.shots[0]!.onScreenText,
    voiceover: row.voiceover || MOCK_SCRIPT.shots[0]!.voiceover,
    kind: house?.host ? "empty" : "close",
    imagePrompt: house?.host ? "" : "人物半身，侧光，闭口，电影大片",
    hostStill: house?.host ? false : undefined,
  };
}

function scriptFor(row: Row): Script {
  const shot = baseShot(row);
  return {
    ...MOCK_SCRIPT,
    visualMode: row.mode,
    shots: [shot, ...MOCK_SCRIPT.shots.slice(1).map((s) => ({ ...s, graphicIntent: "", overlay: undefined, block: undefined }))],
  };
}

describe("recipe cinema pipeline matrix", () => {
  it("lists every boardIntent from the three recipes", () => {
    const covered = new Set(ROWS.filter((r) => !r.remapTo).map((r) => `${r.mode}:${r.intent}`));
    for (const mode of ["story", "knowledge", "product"] as const) {
      for (const intent of skillRecipe(mode).boardIntents) {
        expect(covered.has(`${mode}:${intent}`), `missing ${mode} · ${intent}`).toBe(true);
      }
    }
  });

  it.each(ROWS)("$mode · $intent → $wraps ($lettering)", (row) => {
    const aspect = row.aspect || "9:16";
    const picked = pickGraphicForShot(baseShot(row), row.mode, [], aspect);
    expect(picked?.name, row.intent).toBe(row.wraps);

    const house = houseItem(row.wraps);
    expect(house, row.wraps).toBeTruthy();
    expect(house!.modes).toContain(row.mode);

    const compiled = compileDirector(scriptFor(row), aspect);
    const shot = compiled.shots[0]!;
    if (row.remapTo) {
      expect(shot.graphicIntent).toBe(row.remapTo);
      expect(shot.overlay || shot.block || "").not.toBe(row.wraps);
    } else {
      expect(shot.graphicIntent === row.intent || shot.overlay === row.wraps || shot.block === row.wraps, JSON.stringify(shot)).toBe(true);
    }
    expect(shot.lettering, `${row.mode}/${row.intent}`).toBe(row.lettering);
    if (row.intent === "杂志字") expect(shot.captionStyle).toBe("caption-editorial-emphasis");
    if (row.intent === "字重切换") expect(shot.captionStyle).toBe("caption-weight-shift");

    const name = shot.overlay || shot.block || "";
    if (name && graphicHoldsLettering(name, shot.graphicVars)) {
      expect(shot.lettering).toBe("graphic");
    }
    if (house?.host && shot.hostStill !== true && !row.remapTo) {
      expect(shotNeedsPersonStill(shot)).toBe(false);
    }
  });

  it("builds a valid cinema html for every recipe intent", () => {
    const fails: string[] = [];
    for (const row of ROWS) {
      const aspect = row.aspect || "9:16";
      const compiled = compileDirector(scriptFor(row), aspect);
      const stillRels = compiled.shots.map((_, i) => `stills/shot-${i + 1}.png`);
      const list = buildEditList({
        script: compiled,
        stillRels,
        aspect,
        speechRel: "speech.mp3",
      });
      const html = fallbackCinemaHtml(list);
      const check = validateCinemaHtml(html, list);
      if (!check.ok) fails.push(`${row.mode}/${row.intent}: ${check.reason}`);
      const name = compiled.shots[0]!.overlay || compiled.shots[0]!.block;
      if (name && graphicIsHost(name) && compiled.shots[0]!.hostStill !== true) {
        if (!html.includes(`data-registry="${name}"`)) fails.push(`${row.mode}/${row.intent}: missing host mount`);
      }
    }
    expect(fails, fails.join("\n")).toEqual([]);
  });
});
