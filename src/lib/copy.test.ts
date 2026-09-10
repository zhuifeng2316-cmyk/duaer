import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT, applyBoard, buildBoardSystem, buildCopySystem, formatCopyDraft, formatScriptBoard, generateCopy, parseScript, shotBoardText, shotStillRel } from "./copy";
import { cloneImagePrompt } from "./flow/image";

describe("copy script", () => {
  it("writes copy before the picture board", () => {
    const copy = buildCopySystem(2, 6, 15);
    expect(copy).toMatch(/只写文案/);
    expect(copy).toMatch(/不要凑成固定 5 镜/);
    expect(copy).toMatch(/像人说的/);
    expect(copy).toMatch(/气口/);
    expect(buildCopySystem(2, 6, 15, "knowledge")).toMatch(/知识口播/);
    expect(buildCopySystem(2, 6, 15, "knowledge")).toMatch(/能上屏|短结论/);
    expect(buildCopySystem(2, 6, 15, "knowledge")).toMatch(/垫乐|器乐|抢人声/);
    expect(buildCopySystem(2, 6, 15, "story")).toMatch(/情感口播/);
    expect(buildCopySystem(2, 6, 15, "story")).toMatch(/全屏砸/);
    expect(copy).not.toMatch(/imagePrompt/);
    const board = buildBoardSystem(5);
    expect(board).toMatch(/总导演|先定全片/);
    expect(board).toMatch(/不得改/);
    expect(board).toMatch(/电影大片/);
    expect(board).toMatch(/不要写路人/);
    expect(board).toMatch(/kind/);
    expect(board).toMatch(/layout/);
    expect(board).toMatch(/stillRefs/);
    expect(board).toMatch(/graphicIntent/);
    expect(board).toMatch(/lettering/);
    expect(board).toMatch(/成片砸字/);
    expect(board).toMatch(/只出组件/);
    expect(board).toMatch(/电影大片海报/);
    expect(board).toMatch(/选中的这个人|参考照片/);
    expect(board).toMatch(/不要把整句屏幕字/);
    expect(board).not.toMatch(/屏幕字出图时画上/);
    expect(board).not.toMatch(/faceless-explainer|caption-kinetic-slam/);
    expect(buildBoardSystem(5, 2, "product")).toMatch(/下拉刷新/);
    expect(buildBoardSystem(5, 2, "product")).toMatch(/轮播/);
    expect(buildBoardSystem(5, 2, "product", undefined, "16:9")).toMatch(/轮播/);
    expect(buildBoardSystem(5, 2, "product")).not.toMatch(/notification-stack|carousel-circle|pull-to-refresh/);
    expect(buildBoardSystem(5, 1, "knowledge")).toMatch(/划重点/);
    expect(buildBoardSystem(5, 1, "knowledge")).toMatch(/流程图/);
    expect(buildBoardSystem(5, 1, "knowledge")).toMatch(/先定全片/);
    expect(buildBoardSystem(5, 1, "knowledge", undefined, "9:16")).toMatch(/竖屏不要用图表/);
    expect(buildBoardSystem(5, 2)).toMatch(/已选定 2 个人物/);
  });

  it("keeps locked voiceover when applying the board", () => {
    const copy = parseScript(
      {
        hook: "钩子",
        cta: "关注",
        shots: [{ onScreenText: "屏幕字", voiceover: "定稿口播不要改" }],
      },
      { targetDurationSec: 15 },
    );
    const next = applyBoard(copy, {
      shots: [{ imagePrompt: "雨夜霓虹下的人物特写", scene: "雨夜街头", motion: "punch", voiceover: "试图改口播" }],
    });
    expect(next.shots[0]?.voiceover).toBe("定稿口播不要改");
    expect(next.shots[0]?.onScreenText).toBe("屏幕字");
    expect(next.shots[0]?.imagePrompt).toMatch(/雨夜/);
    expect(next.shots[0]?.motion).toBe("punch");
    expect(next.shots[0]?.kind).toBeTruthy();
    expect(next.shots[0]?.layout).toBeTruthy();
  });

  it("keeps a still library plan when applying the board", () => {
    const copy = parseScript(
      {
        hook: "钩子",
        cta: "关注",
        shots: [
          { onScreenText: "屏幕字", voiceover: "定稿口播不要改" },
          { onScreenText: "空镜", voiceover: "先看海面" },
          { onScreenText: "侧脸", voiceover: "再看人" },
        ],
      },
      { targetDurationSec: 15 },
    );
    const next = applyBoard(copy, {
      shots: [
        { imagePrompt: "雨夜霓虹下的人物特写", scene: "雨夜街头", kind: "close", layout: "hero" },
        { imagePrompt: "空镜海面", scene: "海面", kind: "empty", layout: "under-text" },
        { imagePrompt: "侧脸", scene: "侧脸", kind: "close", layout: "split", stillRefs: [1] },
      ],
    });
    expect(next.shots[0]?.layout).toBe("hero");
    expect(next.shots[1]?.kind).toBe("empty");
    expect(next.shots[1]?.layout).toBe("under-text");
    expect(next.shots[2]?.layout).toBe("split");
    expect(next.shots[2]?.stillRefs).toEqual([0]);
    expect(new Set(next.shots.map((s) => s.kind)).size).toBeGreaterThanOrEqual(2);
    expect(new Set(next.shots.map((s) => s.layout)).size).toBeGreaterThanOrEqual(3);
  });

  it("matches a Chinese motion to a registry graphic and drops junk ids", () => {
    const copy = parseScript(
      {
        hook: "新功能上线提醒",
        cta: "去看",
        visualMode: "product",
        shots: [{ onScreenText: "刷新一下", voiceover: "列表下拉就能刷新" }],
      },
      { targetDurationSec: 15, idea: "新功能上线提醒怎么做" },
    );
    expect(copy.visualMode).toBe("product");
    const next = applyBoard(copy, {
      visualMode: "product",
      shots: [
        { imagePrompt: "手机列表", scene: "下拉", graphicIntent: "下拉刷新", overlay: "us-map" },
        { imagePrompt: "窗边", scene: "窗边", overlay: "not-a-real-widget" },
      ],
    });
    expect(next.visualMode).toBe("product");
    expect(next.shots[0]?.overlay).toBe("pull-to-refresh");
    expect(next.shots[0]?.graphicIntent).toBe("下拉刷新");
    expect(next.shots[0]?.graphicVars?.pullDistance).toBeTruthy();
    expect(next.shots[0]?.graphicAssets).toBeUndefined();
    expect(next.shots[0]?.voiceover).toBe("列表下拉就能刷新");
    expect(next.shots[1]?.overlay).not.toBe("not-a-real-widget");
  });

  it("fills house carousel slots before the board is confirmed", () => {
    const copy = parseScript(
      {
        hook: "新功能上线提醒",
        cta: "去看",
        visualMode: "product",
        shots: [{ onScreenText: "界面轮播", voiceover: "三张产品界面轮播给你看" }],
      },
      { targetDurationSec: 15, idea: "新功能上线提醒怎么做" },
    );
    const next = applyBoard(
      copy,
      {
        visualMode: "product",
        shots: [{ imagePrompt: "手机相册", scene: "轮播", graphicIntent: "轮播" }],
      },
      "16:9",
    );
    expect(next.shots[0]?.block || next.shots[0]?.overlay).toBe("carousel-circle-1");
    expect(next.shots[0]?.graphicIntent).toBe("轮播");
    expect(next.shots[0]?.graphicAssets?.image1).toBe("graphics/carousel-circle-1-image1.png");
    expect(next.shots[0]?.graphicVars?.image1).toBe("graphics/carousel-circle-1-image1.png");
    expect(next.shots[0]?.graphicVars?.image2).toBe("graphics/carousel-circle-1-image2.png");
    expect(next.shots[0]?.graphicVars?.image3).toBe("graphics/carousel-circle-1-image3.png");
    expect(next.shots[0]?.graphicVars?.image4).toBe("graphics/carousel-circle-1-image1.png");
    expect(next.shots[0]?.graphicVars?.image12).toBe("graphics/carousel-circle-1-image3.png");
    const portrait = applyBoard(
      copy,
      {
        visualMode: "product",
        shots: [{ imagePrompt: "手机相册", scene: "轮播", graphicIntent: "轮播" }],
      },
      "9:16",
    );
    expect(portrait.shots[0]?.block || portrait.shots[0]?.overlay).toBe("carousel-circle-1");
    expect(portrait.shots[0]?.hostStill).toBe(false);
    const hostOnly = applyBoard(
      copy,
      {
        visualMode: "product",
        shots: [{ scene: "轮播", graphicIntent: "轮播", kind: "empty", imagePrompt: "" }],
      },
      "9:16",
    );
    expect(hostOnly.shots[0]?.imagePrompt).toBe("");
    expect(hostOnly.shots[0]?.kind).toBe("empty");
    expect(hostOnly.shots[0]?.hostStill).toBe(false);
  });

  it("keeps the copy's own shot count instead of padding to five", () => {
    const s = parseScript(
      {
        hook: "钩子",
        cta: "关注",
        musicPrompt: "beat",
        shots: [{ scene: "雨夜街头", imagePrompt: "雨夜霓虹下的人物特写", onScreenText: "太长了的屏幕字会被切开一二三四五", voiceover: "雨夜里你还在拍", durationSec: 4.2, motion: "punch" }],
      },
      { targetDurationSec: 15 },
    );
    expect(s.shots.length).toBe(1);
    expect(s.shots[0]?.onScreenText.length).toBeLessThanOrEqual(16);
    expect(s.shots[0]?.durationSec).toBe(4.2);
    expect(s.shots[0]?.motion).toBe("punch");
    expect(s.shots[0]?.imagePrompt).toMatch(/雨夜/);
  });

  it("turns partial json into readable copy while streaming", () => {
    const draft = formatCopyDraft(`{"hook":"你不用出镜","shots":[{"onScreenText":"看这里","voiceover":"今晚就能发"}]`);
    expect(draft).toMatch(/钩子：你不用出镜/);
    expect(draft).toMatch(/今晚就能发/);
  });

  it("prefers imagePrompt as the still caption", () => {
    expect(shotBoardText({ imagePrompt: "雨夜霓虹下的人物特写", scene: "雨夜街头" })).toBe("雨夜霓虹下的人物特写");
    expect(shotBoardText({ scene: "雨夜街头" })).toBe("雨夜街头");
    expect(shotStillRel(0)).toBe("stills/shot-1.png");
    expect(shotStillRel(3)).toBe("stills/shot-4.png");
  });

  it("keeps the mock script usable", () => {
    expect(parseScript(MOCK_SCRIPT, { targetDurationSec: 15 }).shots).toHaveLength(5);
    expect(MOCK_SCRIPT.shots.every((x) => x.voiceover.length > 0)).toBe(true);
    expect(new Set(MOCK_SCRIPT.shots.map((s) => s.kind)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(MOCK_SCRIPT.shots.map((s) => s.layout)).size).toBeGreaterThanOrEqual(3);
    expect(formatScriptBoard({ ...MOCK_SCRIPT, visualMode: "product" })).toMatch(/题材：产品介绍/);
    expect(formatScriptBoard(applyBoard({ ...MOCK_SCRIPT, visualMode: "knowledge" }, { visualMode: "knowledge", shots: MOCK_SCRIPT.shots }, "9:16"))).toMatch(/成片砸字|成片擦字|成片划重点|画进图|组件自带/);
  });

  it("seeds product mock copy so the board can plan house graphics", async () => {
    const prev = process.env.FLOW_MOCK;
    process.env.FLOW_MOCK = "1";
    const script = await generateCopy({ idea: "用我的照片做一条产品口播", durationSec: 15, aspect: "9:16" });
    process.env.FLOW_MOCK = prev;
    expect(script.visualMode).toBe("product");
    expect(script.shots[0]?.voiceover).toMatch(/下拉/);
    expect(script.shots[1]?.voiceover).toMatch(/轮播/);
  });
});

describe("clone prompt", () => {
  it("locks identity, look and aspect", () => {
    const p = cloneImagePrompt({
      scene: "咖啡馆窗边",
      aspect: "9:16",
      look: "日系清新",
      imagePrompt: "窗边手持咖啡杯",
    });
    expect(p).toMatch(/同一个人/);
    expect(p).toMatch(/口播/);
    expect(p).toMatch(/9:16/);
    expect(p).toMatch(/电影大片/);
    expect(p).toMatch(/日系清新/);
    expect(p).toMatch(/窗边手持咖啡杯/);
  });
});
