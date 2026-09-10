import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT } from "./copy";
import {
  fillRegistryVars,
  pickGraphicForShot,
  readRegistryVariables,
  registryFileExists,
} from "./hf-pick";
import type { Aspect } from "./aspect";
import { registryItem, registryMountKind, registryMountSize, type VisualMode } from "./hf-registry";
import type { Shot } from "./types";

type Case = {
  name: string;
  mode: VisualMode;
  aspect?: Aspect;
  intent: string;
  onScreenText?: string;
  voiceover?: string;
  want: string | null;
};

const CASES: Case[] = [
  { name: "下拉刷新", mode: "product", intent: "下拉刷新", onScreenText: "刷新一下", voiceover: "列表往下拉就能刷新", want: "pull-to-refresh" },
  { name: "列表往下拉", mode: "product", intent: "列表往下拉就能刷新", want: "pull-to-refresh" },
  { name: "通知堆", mode: "product", intent: "通知堆叠出来", onScreenText: "今天就出发", voiceover: "三条提醒同时进来", want: "notification-stack" },
  { name: "一堆通知", mode: "product", intent: "一堆通知", want: "notification-stack" },
  { name: "右上角弹出", mode: "product", intent: "右上角弹出一条通知", onScreenText: "上线了", voiceover: "新版本已经可以更新", want: "native-notification-pop" },
  { name: "上线提醒", mode: "product", intent: "上线提醒", onScreenText: "上线了", voiceover: "去看看新功能", want: "native-notification-pop" },
  { name: "Mac弹出", mode: "product", intent: "桌面右上角弹出一条通知", onScreenText: "渲染完了", voiceover: "可以预览了", want: "native-notification-pop" },
  { name: "路径飞过", mode: "product", aspect: "16:9", intent: "图标沿着路径飞过去", onScreenText: "预览", want: "offset-path-traveler" },
  { name: "产品界面", mode: "product", aspect: "16:9", intent: "产品界面展示", want: "app-showcase" },
  { name: "手机轮播", mode: "product", aspect: "16:9", intent: "手机里轮播功能", want: "carousel-circle-1" },
  { name: "竖屏轮播", mode: "product", aspect: "9:16", intent: "手机里轮播功能", want: "carousel-circle-1" },
  { name: "竖图轮播", mode: "product", aspect: "3:4", intent: "手机里轮播功能", want: "carousel-circle-1" },
  { name: "横图轮播", mode: "product", aspect: "4:3", intent: "手机里轮播功能", want: "carousel-circle-1" },
  { name: "界面放大", mode: "product", aspect: "16:9", intent: "界面放大", want: "ui-focus-zoom" },
  { name: "大光标", mode: "product", aspect: "16:9", intent: "超大鼠标点一下", want: "oversized-cursor" },
  { name: "聊天对话", mode: "product", intent: "聊天对话", want: "message-thread-reveal" },
  { name: "分享面板", mode: "product", intent: "分享面板", want: "share-sheet-carousel" },
  { name: "代码演示", mode: "product", aspect: "16:9", intent: "终端跑代码", want: "code-terminal-run" },
  { name: "故障字", mode: "story", intent: "故障字", want: "caption-glitch-rgb" },
  { name: "霓虹字", mode: "story", intent: "霓虹字", want: "caption-neon-glow" },
  { name: "打字机", mode: "story", intent: "打字机", want: "typewriter" },
  { name: "标题卡", mode: "story", intent: "标题卡", want: "titlecard-calm" },
  { name: "漏光", mode: "story", intent: "漏光", want: "light-leak" },
  { name: "闪白", mode: "story", intent: "闪白转场", want: "flash-through-white" },
  { name: "胶片颗粒", mode: "story", intent: "胶片颗粒", want: "grain-overlay" },
  { name: "数字跳动", mode: "knowledge", aspect: "16:9", intent: "数字跳动", want: "count-up" },
  { name: "打勾清单", mode: "knowledge", intent: "打勾清单", want: "marker-checklist-card" },
  { name: "代码演示知识", mode: "knowledge", aspect: "16:9", intent: "代码演示", want: "code-terminal-run" },
  { name: "产品空动作", mode: "product", intent: "我也要这样活", want: null },
  { name: "产品美国地图", mode: "product", intent: "美国地图", want: null },
  { name: "故事砸字", mode: "story", intent: "砸大字", onScreenText: "我也要这样活", want: "caption-kinetic-slam" },
  { name: "杂志双字体", mode: "story", intent: "杂志双字体", want: "caption-editorial-emphasis" },
  { name: "字重切换", mode: "story", intent: "字重切换", want: "caption-weight-shift" },
  { name: "手写标题", mode: "story", intent: "手写标题", want: "hw-title" },
  { name: "故事下拉刷新", mode: "story", intent: "下拉刷新", want: null },
  { name: "故事空动作", mode: "story", intent: "我也要这样活", want: null },
  { name: "柱状图", mode: "knowledge", aspect: "16:9", intent: "柱状图", want: "data-chart" },
  { name: "数据对比", mode: "knowledge", aspect: "16:9", intent: "数据对比", want: "data-chart" },
  { name: "流程图", mode: "knowledge", intent: "流程图走一遍", want: "flowchart-vertical" },
  { name: "步骤图", mode: "knowledge", intent: "步骤图", want: "flowchart-vertical" },
  { name: "手绘流程", mode: "knowledge", intent: "手绘流程", want: "hw-pipeline" },
  { name: "划重点", mode: "knowledge", intent: "划重点", want: "caption-highlight" },
  { name: "知识空动作", mode: "knowledge", intent: "为什么睡眠不够", want: null },
  { name: "知识美国地图", mode: "knowledge", aspect: "16:9", intent: "美国地图", want: "us-map" },
];

function shotFor(c: Case): Shot {
  return {
    ...MOCK_SCRIPT.shots[0]!,
    graphicIntent: c.intent,
    onScreenText: c.onScreenText || MOCK_SCRIPT.shots[0]!.onScreenText,
    voiceover: c.voiceover || MOCK_SCRIPT.shots[0]!.voiceover,
  };
}

describe("registry scene matrix", () => {
  it.each(CASES)("$mode · $name → $want", (c) => {
    const picked = pickGraphicForShot(shotFor(c), c.mode, [], c.aspect || "9:16");
    if (c.want) {
      expect(registryFileExists(c.want), `${c.want} should be installed`).toBe(true);
      expect(picked?.name).toBe(c.want);
    } else {
      expect(picked).toBeUndefined();
    }
  });

  it("keeps pull-to-refresh on the declared 60–220 range and default 120", () => {
    const defs = readRegistryVariables("pull-to-refresh");
    expect(defs.map((d) => d.id).sort()).toEqual(["pullDistance", "spinnerStyle"]);
    const normal = fillRegistryVars(defs, { graphicIntent: "下拉刷新", onScreenText: "刷新一下", voiceover: "列表往下拉就能刷新" });
    expect(normal.pullDistance).toBe(120);
    expect(normal.spinnerStyle).toBe("ring");
    const hard = fillRegistryVars(defs, { graphicIntent: "下拉刷新", voiceover: "用力下拉" });
    expect(hard.pullDistance).toBe(160);
    const arrow = fillRegistryVars(defs, { graphicIntent: "下拉刷新", voiceover: "箭头指示" });
    expect(arrow.spinnerStyle).toBe("arrow");
  });

  it("fills notification-stack with Chinese lists, not English pipeline copy", () => {
    const defs = readRegistryVariables("notification-stack");
    const vars = fillRegistryVars(defs, {
      graphicIntent: "通知堆叠出来",
      onScreenText: "今天就出发",
      voiceover: "三条提醒同时进来",
    });
    expect(vars.titles).toBe("今天就出发");
    expect(vars.bodies).toBe("三条提醒同时进来");
    expect(vars.expand).toBe(-1);
    expect(String(vars.titles)).not.toMatch(/Build queued|Checks passed|Deploy live/);
    expect(String(vars.bodies)).not.toMatch(/Pipeline started|checks green/i);
  });

  it("fills native-notification-pop without vendor English defaults", () => {
    const defs = readRegistryVariables("native-notification-pop");
    const vars = fillRegistryVars(defs, {
      graphicIntent: "上线提醒",
      onScreenText: "上线了",
      voiceover: "新版本已经可以更新",
    });
    expect(vars.title).toBe("上线了");
    expect(vars.body).toBe("新版本已经可以更新");
    expect(vars.app_label).toBe("口播");
    expect(vars.os).toBe("ios");
    expect(vars.at).toBe(0.3);
    const mac = fillRegistryVars(defs, {
      graphicIntent: "桌面右上角弹出一条通知",
      onScreenText: "渲染完了",
      voiceover: "可以预览了",
    });
    expect(mac.os).toBe("macos");
    expect(mac.app_label).toBe("口播");
    expect(String(vars.app_label)).not.toMatch(/HyperFrames/i);
    expect(String(vars.body)).not.toMatch(/launch-cut|\.mp4/);
  });

  it("does not invent an SVG path for offset-path-traveler", () => {
    const defs = readRegistryVariables("offset-path-traveler");
    const pathDef = defs.find((d) => d.id === "path");
    const vars = fillRegistryVars(defs, {
      graphicIntent: "图标沿着路径飞过去",
      onScreenText: "预览",
      voiceover: "点一下就跟着走",
    });
    expect(vars.path).toBe(pathDef?.default);
    expect(vars.traveler_label).toBe("预览");
    expect(String(vars.path)).toMatch(/^M /);
  });

  it("uses each component's native box, not a fake 960×540 card", () => {
    expect(registryMountSize("pull-to-refresh")).toEqual({ hostFill: true });
    expect(registryMountSize("notification-stack")).toEqual({ hostFill: true });
    expect(registryMountSize("native-notification-pop")).toEqual({ hostFill: true });
    expect(registryMountSize("offset-path-traveler")).toEqual({ hostFill: true });
    expect(registryMountSize("app-showcase")).toEqual({ width: 1920, height: 1080, hostFill: false });
    expect(registryMountSize("app-showcase", { width: 1440, height: 2560 })).toEqual({
      width: 1920,
      height: 1080,
      hostFill: false,
      adapt: true,
      scale: 2560 / 1080,
    });
    expect(registryMountSize("carousel-circle-1", { width: 1440, height: 2560 })).toEqual({
      width: 1920,
      height: 1080,
      hostFill: false,
      adapt: true,
      scale: 2560 / 1080,
    });
    expect(registryMountSize("data-chart")).toEqual({ width: 1920, height: 1080, hostFill: false });
    expect(registryMountSize("flowchart-vertical")).toEqual({ width: 1440, height: 2560, hostFill: false });
    expect(registryMountSize("caption-kinetic-slam")).toEqual({ hostFill: true });
    expect(registryMountKind("pull-to-refresh", false)).toBe("registry-overlay");
    expect(registryMountKind("data-chart", true)).toBe("registry-card");
    expect(registryMountKind("flowchart-vertical", true)).toBe("registry-overlay");
    expect(registryMountKind("caption-kinetic-slam", false)).toBe("registry-overlay");
    expect(registryMountKind("hw-title", true)).toBe("registry-overlay");
    expect(registryItem("flowchart-vertical")?.duration).toBe(12);
    expect(registryItem("pull-to-refresh")?.width).toBeUndefined();
  });
});
