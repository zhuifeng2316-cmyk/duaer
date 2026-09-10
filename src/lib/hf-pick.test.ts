import { describe, expect, it } from "vitest";
import {
  assignGraphics,
  englishQueryForIntent,
  fillRegistryVars,
  parseRegistryVariables,
  pickGraphicForShot,
  rankRegistry,
  varsCarryTalkCopy,
} from "./hf-pick";
import { MOCK_SCRIPT } from "./copy";

describe("smart registry pick", () => {
  it("translates 下拉刷新 into an English catalog query and ranks pull-to-refresh first", () => {
    expect(englishQueryForIntent("手机列表下拉刷新", "product")).toMatch(/pull to refresh/i);
    const ranked = rankRegistry("pull to refresh mobile gesture", "product", 5);
    expect(ranked[0]?.name).toBe("pull-to-refresh");
    const picked = pickGraphicForShot(
      {
        ...MOCK_SCRIPT.shots[0]!,
        graphicIntent: "下拉刷新",
        onScreenText: "刷新一下",
        voiceover: "列表往下拉就能刷新",
      },
      "product",
    );
    expect(picked?.name).toBe("pull-to-refresh");
    expect(picked?.vars.pullDistance).toBe(120);
    expect(String(picked?.vars.spinnerStyle || "")).toMatch(/ring|dots|arrow/);
  });

  it("does not pin a product gesture onto a plain story talk", () => {
    expect(englishQueryForIntent("我也要这样活", "story")).toBe("");
    const ranked = rankRegistry(englishQueryForIntent("我也要这样活", "story"), "story", 8);
    expect(ranked).toEqual([]);
    const next = assignGraphics({ ...MOCK_SCRIPT, visualMode: "story" });
    expect(next.shots.some((s) => s.overlay === "pull-to-refresh")).toBe(false);
    expect(next.shots.every((s) => !s.overlay && !s.block)).toBe(true);
  });

  it("reads declared variables from a snippet", () => {
    const html = `<html data-composition-variables='[{"id":"pullDistance","type":"number","default":120,"min":60,"max":220},{"id":"spinnerStyle","type":"enum","default":"ring","options":[{"value":"arrow"},{"value":"ring"}]}]'>`;
    const defs = parseRegistryVariables(html);
    const vars = fillRegistryVars(defs, { onScreenText: "刷新", voiceover: "用力下拉", graphicIntent: "下拉刷新" });
    expect(vars.pullDistance).toBe(160);
    expect(vars.spinnerStyle).toBe("ring");
    const gentle = fillRegistryVars(defs, { onScreenText: "刷新", voiceover: "列表往下拉就能刷新", graphicIntent: "下拉刷新" });
    expect(gentle.pullDistance).toBe(120);
    const slotted = fillRegistryVars(
      [{ id: "image1", type: "image", default: "https://static.heygen.ai/demo.png" }],
      { graphicIntent: "轮播", graphicAssets: { image1: "graphics/carousel-circle-1-image1.png" } },
    );
    expect(slotted.image1).toBe("graphics/carousel-circle-1-image1.png");
    const painted = fillRegistryVars(
      [
        { id: "background", type: "color", default: "#EDEDEF" },
        { id: "accent", type: "enum", default: "blue", options: [{ value: "green" }, { value: "blue" }, { value: "violet" }] },
      ],
      { graphicIntent: "轮播" },
    );
    expect(painted.background).toBe("#0c0a08");
    expect(painted.accent).toBe("green");
    const copy = fillRegistryVars(
      [{ id: "text", type: "string", default: "hyperframes add typewriter" }],
      { onScreenText: "人到中年，放过自己", voiceover: "别再为难自己" },
    );
    expect(copy.text).toBe("人到中年 放过自己");
    expect(varsCarryTalkCopy(copy)).toBe(true);
    const titlecard = fillRegistryVars(
      [
        { id: "headline", type: "string", default: "Less, but better" },
        { id: "kicker", type: "string", default: "DESIGN PRINCIPLE" },
      ],
      { onScreenText: "三笔账：时间、钱、风险", voiceover: "时间、钱、风险，这三笔账都得算。" },
    );
    expect(titlecard.headline).toBe("三笔账");
    expect(titlecard.kicker).toBe("");
    expect(varsCarryTalkCopy({ text: "HyperFrames lets you write HTML" })).toBe(false);
    expect(varsCarryTalkCopy({})).toBe(false);
  });

  it("scales a carousel onto every talk aspect and drops unknown names", () => {
    const shot = { ...MOCK_SCRIPT.shots[0]!, graphicIntent: "轮播", onScreenText: "界面轮播", voiceover: "三张界面轮播给你看" };
    expect(pickGraphicForShot(shot, "product", [], "9:16")?.name).toBe("carousel-circle-1");
    expect(pickGraphicForShot(shot, "product", [], "3:4")?.name).toBe("carousel-circle-1");
    expect(pickGraphicForShot(shot, "product", [], "16:9")?.name).toBe("carousel-circle-1");
    expect(pickGraphicForShot(shot, "product", [], "4:3")?.name).toBe("carousel-circle-1");
    const dirty = assignGraphics(
      {
        ...MOCK_SCRIPT,
        visualMode: "product",
        shots: [{ ...shot, overlay: undefined, block: "transitions-other", graphicIntent: "轮播" }],
      },
      "9:16",
    );
    expect(dirty.shots[0]?.block).toBe("carousel-circle-1");
    expect(dirty.shots[0]?.block).not.toBe("transitions-other");
  });

  it("does not hang a graphic outside the recipe allowlist", () => {
    const next = assignGraphics({
      ...MOCK_SCRIPT,
      visualMode: "knowledge",
      shots: [{ ...MOCK_SCRIPT.shots[0]!, graphicIntent: "美国地图" }, ...MOCK_SCRIPT.shots.slice(1)],
    });
    expect(next.shots[0]?.overlay).toBeUndefined();
    expect(next.shots[0]?.block).toBeUndefined();
    expect(pickGraphicForShot({ ...MOCK_SCRIPT.shots[0]!, graphicIntent: "美国地图" }, "knowledge")?.name).toBeTruthy();
  });

  it("reuses the recipe wrap on duplicate intents and never remounts 手势点按", () => {
    const base = MOCK_SCRIPT.shots[0]!;
    const next = assignGraphics(
      {
        ...MOCK_SCRIPT,
        visualMode: "product",
        shots: [
          { ...base, graphicIntent: "下拉刷新", overlay: undefined, block: undefined },
          { ...MOCK_SCRIPT.shots[1]!, graphicIntent: "下拉刷新", overlay: undefined, block: undefined },
          { ...MOCK_SCRIPT.shots[2]!, graphicIntent: "手势点按", overlay: "gesture-tap", block: undefined },
          { ...MOCK_SCRIPT.shots[3]!, graphicIntent: "轮播", overlay: undefined, block: undefined },
        ],
      },
      "9:16",
    );
    expect(next.shots[0]?.overlay).toBe("pull-to-refresh");
    expect(next.shots[1]?.overlay).toBe("pull-to-refresh");
    expect(next.shots[2]?.overlay).toBeUndefined();
    expect(next.shots[2]?.block).toBeUndefined();
    expect(next.shots.every((s) => s.overlay !== "gesture-tap" && s.block !== "gesture-tap")).toBe(true);
    expect(next.shots[3]?.block).toBe("carousel-circle-1");
  });
});
