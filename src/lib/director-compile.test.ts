import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT, applyBoard } from "./copy";
import { compileDirector, compileMusicPrompt } from "./director-compile";
import { stillBakesLettering, parseHighlightList, planShotLettering, buildEditList } from "./html-compose";
import { talkSpeechStyle } from "./speech-style";

describe("director compile", () => {
  it("turns portrait knowledge charts into highlight overlays", () => {
    const next = compileDirector(
      {
        ...MOCK_SCRIPT,
        visualMode: "knowledge",
        shots: [
          { ...MOCK_SCRIPT.shots[0]!, graphicIntent: "砸字", overlay: undefined, block: undefined },
          { ...MOCK_SCRIPT.shots[1]!, graphicIntent: undefined, overlay: undefined, block: undefined },
          { ...MOCK_SCRIPT.shots[2]!, graphicIntent: "图表", overlay: undefined, block: "data-chart", kind: "empty", imagePrompt: "", hostStill: true },
          { ...MOCK_SCRIPT.shots[3]!, graphicIntent: undefined, overlay: undefined, block: undefined },
        ],
      },
      "9:16",
    );
    expect(next.shots[2]?.graphicIntent).toBe("划重点");
    expect(next.shots[2]?.block).not.toBe("data-chart");
    expect(next.shots[2]?.kind).not.toBe("empty");
    expect(next.shots[2]?.overlay || "").not.toMatch(/data-chart/);
    expect(next.shots[2]?.lettering).toBe("overlay-highlight");
    expect(next.shots[0]?.lettering).toBe("overlay-slam");
    expect(next.shots[0]?.overlay || "").not.toMatch(/slam/);
    expect(stillBakesLettering(next.shots[0]!)).toBe(false);
    expect(
      planShotLettering(
        {
          motion: next.shots[2]!.motion,
          scene: next.shots[2]!.scene,
          imagePrompt: next.shots[2]!.imagePrompt,
          onScreenText: next.shots[2]!.onScreenText,
          voiceover: next.shots[2]!.voiceover,
          layout: next.shots[2]!.layout,
          overlay: next.shots[2]!.overlay,
          block: next.shots[2]!.block,
          graphicVars: next.shots[2]!.graphicVars,
          lettering: next.shots[2]!.lettering,
        },
        2,
        next.shots.length,
        "knowledge",
      ).showSpoken,
    ).toBe(true);
    expect(new Set(next.shots.map((s) => s.layout)).size).toBeGreaterThanOrEqual(3);
  });

  it("keeps landscape knowledge charts as host blocks", () => {
    const next = compileDirector(
      {
        ...MOCK_SCRIPT,
        visualMode: "knowledge",
        shots: [{ ...MOCK_SCRIPT.shots[0]!, graphicIntent: "图表", overlay: undefined, block: undefined, kind: "empty", imagePrompt: "" }, ...MOCK_SCRIPT.shots.slice(1)],
      },
      "16:9",
    );
    expect(next.shots[0]?.block).toBe("data-chart");
    expect(next.shots[0]?.kind).toBe("empty");
    expect(next.shots[0]?.imagePrompt).toBe("");
    expect(next.shots[0]?.hostStill).toBe(false);
    expect(next.shots[0]?.lettering).toBe("graphic");
  });

  it("forces portrait product carousel to own the frame without a person still", () => {
    const next = compileDirector(
      {
        ...MOCK_SCRIPT,
        visualMode: "product",
        shots: [
          {
            ...MOCK_SCRIPT.shots[0]!,
            graphicIntent: "轮播",
            overlay: undefined,
            block: "carousel-circle-1",
            kind: "close",
            layout: "montage",
            stillRefs: [0, 1],
            imagePrompt: "夜窗旁的人看手机",
            hostStill: true,
          },
          ...MOCK_SCRIPT.shots.slice(1),
        ],
      },
      "9:16",
    );
    expect(next.shots[0]?.block).toBe("carousel-circle-1");
    expect(next.shots[0]?.hostStill).toBe(false);
    expect(next.shots[0]?.kind).toBe("empty");
    expect(next.shots[0]?.imagePrompt).toBe("");
    expect(next.shots[0]?.layout).toBe("hero");
    expect(next.shots[0]?.stillRefs).toEqual([]);
  });

  it("strips playful vocal music beds", () => {
    expect(compileMusicPrompt("knowledge", "upbeat pop with vocals")).toMatch(/instrumental/);
    expect(compileMusicPrompt("knowledge", "upbeat pop with vocals")).toMatch(/no vocals/i);
    expect(compileMusicPrompt("knowledge", "upbeat pop with vocals")).not.toMatch(/upbeat pop/i);
  });

  it("falls back to native slam when a caption overlay has no talk copy", () => {
    const next = compileDirector(
      {
        ...MOCK_SCRIPT,
        visualMode: "story",
        shots: [
          {
            ...MOCK_SCRIPT.shots[0]!,
            graphicIntent: "砸字",
            overlay: "caption-kinetic-slam",
            graphicVars: {},
            lettering: "graphic",
          },
          {
            ...MOCK_SCRIPT.shots[1]!,
            graphicIntent: "故障字",
            overlay: "caption-glitch-rgb",
            graphicVars: {},
            lettering: "graphic",
          },
          {
            ...MOCK_SCRIPT.shots[2]!,
            graphicIntent: "标题卡",
            overlay: "titlecard-calm",
            kind: "empty",
            imagePrompt: "",
            scene: "炭黑底冷青暗金电影配色的竖屏三笔账清单组件",
            onScreenText: "三笔账：时间、钱、风险",
            graphicVars: { headline: "三笔账：时间、钱、风险", kicker: "DESIGN PRINCIPLE" },
            lettering: "graphic",
          },
          MOCK_SCRIPT.shots[3]!,
        ],
      },
      "9:16",
    );
    expect(next.shots[0]?.overlay || "").not.toMatch(/slam|glitch/);
    expect(next.shots[0]?.lettering).toBe("overlay-slam");
    expect(next.shots[1]?.overlay || "").not.toMatch(/glitch/);
    expect(next.shots[1]?.lettering).toBe("overlay-slam");
    expect(next.shots[2]?.overlay || "").not.toMatch(/titlecard/);
    expect(next.shots[2]?.graphicIntent).toBe("划重点");
    expect(next.shots[2]?.lettering).toBe("overlay-highlight");
    expect(next.shots[2]?.scene).toBe("划重点叠人");
    expect(next.shots[2]?.imagePrompt).toMatch(/炭黑底/);
    expect(next.shots[2]?.imagePrompt).not.toMatch(/人物半身/);
    expect(parseHighlightList(next.shots[2]!.onScreenText)).toEqual({ title: "三笔账", items: ["时间", "钱", "风险"] });
    const mute = planShotLettering(
      {
        motion: next.shots[0]!.motion,
        scene: next.shots[0]!.scene,
        imagePrompt: next.shots[0]!.imagePrompt,
        onScreenText: next.shots[0]!.onScreenText,
        voiceover: next.shots[0]!.voiceover,
        layout: next.shots[0]!.layout,
        overlay: next.shots[0]!.overlay,
        block: next.shots[0]!.block,
        graphicVars: next.shots[0]!.graphicVars,
        lettering: next.shots[0]!.lettering,
      },
      0,
      next.shots.length,
      "story",
    );
    expect(mute.showSpoken).toBe(true);
  });

  it("turns a caption overlay with a spoken list into native highlight", () => {
    const next = compileDirector(
      {
        ...MOCK_SCRIPT,
        visualMode: "knowledge",
        shots: [
          MOCK_SCRIPT.shots[0]!,
          MOCK_SCRIPT.shots[1]!,
          {
            ...MOCK_SCRIPT.shots[2]!,
            graphicIntent: "打字机",
            overlay: "typewriter",
            scene: "清单组件",
            imagePrompt: "咖啡馆闭口侧脸",
            onScreenText: "三笔账",
            voiceover: "时间、钱、风险，这三笔账都得算",
            graphicVars: { text: "三笔账" },
            lettering: "graphic",
          },
          MOCK_SCRIPT.shots[3]!,
        ],
      },
      "9:16",
    );
    expect(next.shots[2]?.overlay).toBeUndefined();
    expect(next.shots[2]?.graphicIntent).toBe("划重点");
    expect(next.shots[2]?.lettering).toBe("overlay-highlight");
    expect(next.shots[2]?.scene).toBe("划重点叠人");
    expect(next.shots[2]?.imagePrompt).toBe("咖啡馆闭口侧脸");
    expect(stillBakesLettering(next.shots[2]!)).toBe(false);
  });

  it("does not slam over a baked still title", () => {
    const list = buildEditList({
      script: { ...MOCK_SCRIPT, visualMode: "story" },
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    const plan = planShotLettering({ ...list.clips[1]!, letteringInStill: true, layout: "under-text", lettering: "still-title" }, 1, list.clips.length, "story");
    expect(plan.showSpoken).toBe(true);
    expect(plan.showPoster).toBe(false);
    expect(plan.style).not.toBe("slam");
  });
});

describe("voice role", () => {
  it("lets a hold role slow a middle shot", () => {
    const push = talkSpeechStyle({ index: 1, total: 4, line: "人到中年。", voiceRole: "push" });
    const hold = talkSpeechStyle({ index: 1, total: 4, line: "人到中年。", voiceRole: "hold" });
    expect(hold.speechRate).toBeLessThan(push.speechRate);
    expect(hold.instruction).toMatch(/放慢/);
  });
});

describe("applyBoard director", () => {
  it("fills lettering and voice roles", () => {
    const next = applyBoard(
      { ...MOCK_SCRIPT, visualMode: "knowledge" },
      {
        visualMode: "knowledge",
        shots: MOCK_SCRIPT.shots.map((shot, i) => ({
          scene: shot.scene,
          imagePrompt: i === 2 ? "" : shot.imagePrompt,
          kind: i === 2 ? "empty" : shot.kind,
          layout: "under-text",
          motion: shot.motion,
          graphicIntent: i === 2 ? "图表" : i === 0 ? "砸字" : "",
        })),
      },
      "9:16",
    );
    expect(next.shots[0]?.lettering).toBeTruthy();
    expect(next.shots[0]?.voiceRole).toBe("hook");
    expect(next.shots.at(-1)?.voiceRole).toBe("hold");
    expect(next.shots.some((s) => s.block === "data-chart")).toBe(false);
    expect(new Set(next.shots.map((s) => s.layout)).size).toBeGreaterThanOrEqual(3);
  });
});
