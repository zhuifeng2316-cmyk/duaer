import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT } from "./copy";
import {
  fillRegistryVars,
  inferItemFits,
  modesForItem,
  pickGraphicForShot,
  rankRegistry,
  readRegistryVariables,
  registryFileExists,
} from "./hf-pick";
import type { Aspect } from "./aspect";
import { houseCatalog } from "./duaer-registry";
import { graphicLabel, HOUSE_REGISTRY_ROOT, registryCatalog, registryMountSize, registryRel } from "./hf-registry";

const SHOT = {
  onScreenText: "屏幕大字",
  voiceover: "这一镜口播在讲什么",
  graphicIntent: "测试动作",
};

const VENDOR = /hyperframes|heygen|launch-cut/i;

describe("house registry catalog", () => {
  const items = registryCatalog();
  const house = houseCatalog();

  it("indexes only the house library", () => {
    expect(items.map((it) => it.name)).toEqual(house.map((it) => it.wraps));
    expect(items.length).toBeGreaterThanOrEqual(390);
    expect(registryRel("texture-mask-text")).toBeTruthy();
    expect(registryRel("transitions-other")).toBeTruthy();
    expect(registryRel("lt-neon-border")).toBeUndefined();
    expect(registryFileExists("pull-to-refresh")).toBe(true);
    expect(registryRel("pull-to-refresh")).toBe("compositions/components/pull-to-refresh.html");
    expect(HOUSE_REGISTRY_ROOT).toMatch(/house\/registry$/);
  });

  it("fills every house item without vendor English", () => {
    for (const it of items) {
      expect(registryFileExists(it.name), it.name).toBe(true);
      const defs = readRegistryVariables(it.name);
      const vars = fillRegistryVars(defs, SHOT);
      expect(JSON.stringify(vars), it.name).not.toMatch(VENDOR);
      expect(graphicLabel(it.name)).toBe(house.find((h) => h.wraps === it.name)?.label);
      const box = registryMountSize(it.name);
      if (it.width && it.height) {
        expect(box).toEqual({ width: it.width, height: it.height, hostFill: false });
      } else {
        expect(box.hostFill, it.name).toBe(true);
      }
    }
  });

  it("ranks an item from its own name when the topic allows it", () => {
    const misses: string[] = [];
    for (const it of items) {
      const modes = modesForItem(it);
      if (!modes.length) continue;
      const query = it.name.replace(/-/g, " ");
      const family = inferItemFits(it)[0];
      const aspect: Aspect = family === "landscape" ? "16:9" : family === "square" ? "1:1" : "9:16";
      const ranked = rankRegistry(query, modes[0]!, 5, aspect);
      if (ranked[0]?.name !== it.name) misses.push(`${it.name} → ${ranked[0]?.name || "NONE"}`);
    }
    expect(misses, misses.join("\n")).toEqual([]);
  });

  it("picks the family winner from Chinese intent", () => {
    const shot = MOCK_SCRIPT.shots[0]!;
    const rows: Array<[string, "story" | "product" | "knowledge", string]> = [
      ["下拉刷新", "product", "pull-to-refresh"],
      ["通知堆叠出来", "product", "notification-stack"],
      ["右上角弹出一条通知", "product", "native-notification-pop"],
      ["图标沿着路径飞过去", "product", "offset-path-traveler"],
      ["产品界面展示", "product", "app-showcase"],
      ["手机里轮播功能", "product", "carousel-circle-1"],
      ["界面放大", "product", "ui-focus-zoom"],
      ["超大鼠标点一下", "product", "oversized-cursor"],
      ["终端跑代码", "product", "code-terminal-run"],
      ["砸大字", "story", "caption-kinetic-slam"],
      ["杂志双字体", "story", "caption-editorial-emphasis"],
      ["字重切换", "story", "caption-weight-shift"],
      ["手写标题", "story", "hw-title"],
      ["柱状图", "knowledge", "data-chart"],
      ["流程图走一遍", "knowledge", "flowchart-vertical"],
      ["手绘流程", "knowledge", "hw-pipeline"],
      ["划重点", "knowledge", "caption-highlight"],
      ["数字跳动", "knowledge", "count-up"],
      ["代码演示", "knowledge", "code-terminal-run"],
    ];
    const landscape = new Set([
      "offset-path-traveler",
      "app-showcase",
      "carousel-circle-1",
      "ui-focus-zoom",
      "oversized-cursor",
      "code-terminal-run",
      "data-chart",
      "count-up",
    ]);
    for (const [intent, mode, want] of rows) {
      expect(registryFileExists(want), want).toBe(true);
      const aspect: Aspect = landscape.has(want) ? "16:9" : "9:16";
      const picked = pickGraphicForShot({ ...shot, graphicIntent: intent }, mode, [], aspect);
      expect(picked?.name, intent).toBe(want);
    }
    expect(pickGraphicForShot({ ...shot, graphicIntent: "聊天对话" }, "product")?.name).toBe("message-thread-reveal");
    expect(pickGraphicForShot({ ...shot, graphicIntent: "打字机" }, "story")?.name).toBe("typewriter");
  });
});
