import { describe, expect, it } from "vitest";
import {
  applyHouseLabelToShot,
  assignGraphics,
  englishQueryForIntent,
  fillRegistryVars,
  parseRegistryVariables,
  pickGraphicForShot,
  rankRegistry,
  readRegistryVariables,
  varsCarryTalkCopy,
} from "./hf-pick";
import { compileDirector } from "./director-compile";
import { shotNeedsPersonStill } from "./graphic-board";
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

  it("fills marker-checklist with Chinese list parts, not English demo shell", () => {
    const defs = readRegistryVariables("marker-checklist-card");
    const vars = fillRegistryVars(defs, {
      onScreenText: "三笔账：时间、钱、风险",
      voiceover: "这三笔账都得算",
      graphicIntent: "打勾清单",
    });
    expect(vars.top).toBe("三笔账");
    expect(vars.mid).toBe("要");
    expect(vars.circled).toBe("算");
    expect(vars.rest).toBe("清");
    expect(vars.l1).toBe("时间");
    expect(vars.v1).toBe("算过");
    expect(vars.l2).toBe("钱");
    expect(vars.l3).toBe("风险");
    expect(JSON.stringify(vars)).not.toMatch(/THE POWER|WRITE|IN 4K|TODAY/i);
    const gt = fillRegistryVars(defs, {
      onScreenText: "眼前快乐＞花钱代价",
      voiceover: "先算这两笔",
      graphicIntent: "打勾清单",
    });
    expect(gt.top).toBe("这一组");
    expect(gt.l1).toBe("眼前快乐");
    expect(gt.l2).toBe("花钱代价");
  });

  it("fills share-sheet with Chinese action chrome", () => {
    const defs = readRegistryVariables("share-sheet-carousel");
    const vars = fillRegistryVars(defs, {
      onScreenText: "分享出去",
      voiceover: "把这条发出去",
      graphicIntent: "分享面板",
    });
    expect(vars.acceptLabel).toBe("接受");
    expect(vars.declineLabel).toBe("拒绝");
    expect(vars.itemLabel).toBe("一条口播");
    expect(vars.stripText).toBe("分享出去");
    expect(String(vars.acceptLabel)).not.toMatch(/Accept/i);
    expect(String(vars.declineLabel)).not.toMatch(/Decline/i);
    expect(String(vars.itemLabel)).not.toMatch(/video/i);
    expect(String(vars.stripText)).not.toMatch(/OPEN-SOURCE/i);
  });

  it("fills message-thread with Chinese chat copy", () => {
    const defs = readRegistryVariables("message-thread-reveal");
    const vars = fillRegistryVars(defs, {
      onScreenText: "先问一句",
      voiceover: "把成片发出去",
      graphicIntent: "聊天对话",
    });
    expect(vars.contactName).toBe("朋友");
    expect(vars.questionMessage).toBe("先问一句");
    expect(vars.teaserMessage).toBe("你看这个");
    expect(vars.ecCta).toBe("去做一条");
    expect(String(vars.questionMessage)).not.toMatch(/launch video/i);
    expect(String(vars.benefitMessage)).not.toMatch(/4K|editor/i);
  });

  it("keeps exact full-catalog labels through recipe compile and clears orphan hostStill", () => {
    const base = {
      ...MOCK_SCRIPT,
      visualMode: "story" as const,
      shots: MOCK_SCRIPT.shots.map((s, i) =>
        i === 0
          ? {
              ...s,
              graphicIntent: "手写标题",
              overlay: undefined,
              block: undefined,
              hostStill: undefined,
              graphicLock: undefined,
              imagePrompt: "人物半身，侧光，闭口",
            }
          : s,
      ),
    };
    const applied = applyHouseLabelToShot(base, 0, "标志收尾", "9:16");
    expect(applied.shots[0]?.block).toBe("logo-outro");
    expect(applied.shots[0]?.graphicLock).toBe(true);
    expect(applied.shots[0]?.hostStill).toBe(false);

    const assigned = assignGraphics(applied, "9:16");
    expect(assigned.shots[0]?.block).toBe("logo-outro");
    expect(assigned.shots[0]?.graphicLock).toBe(true);

    const compiled = compileDirector(applied, "9:16");
    expect(compiled.shots[0]?.block).toBe("logo-outro");
    expect(shotNeedsPersonStill(compiled.shots[0]!)).toBe(false);

    const orphan = {
      ...base,
      shots: base.shots.map((s, i) =>
        i === 0 ? { ...s, graphicIntent: "不存在的组件名xyz", block: undefined, hostStill: false as const } : s,
      ),
    };
    const cleared = assignGraphics(orphan, "9:16");
    expect(cleared.shots[0]?.block).toBeUndefined();
    expect(cleared.shots[0]?.hostStill).toBeUndefined();
    expect(shotNeedsPersonStill(cleared.shots[0]!)).toBe(true);
  });
});
