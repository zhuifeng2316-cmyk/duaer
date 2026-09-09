import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT, applyBoard, buildBoardSystem, buildCopySystem, parseScript } from "./copy";
import { cloneImagePrompt } from "./flow/image";

describe("copy script", () => {
  it("writes copy before the picture board", () => {
    const copy = buildCopySystem(5, 15, 3);
    expect(copy).toMatch(/只写文案/);
    expect(copy).not.toMatch(/imagePrompt/);
    const board = buildBoardSystem(5);
    expect(board).toMatch(/图片分镜/);
    expect(board).toMatch(/不得改/);
    expect(board).toMatch(/电影大片/);
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
  });

  it("fits shots to a 15s board", () => {
    const s = parseScript(
      {
        hook: "钩子",
        cta: "关注",
        musicPrompt: "beat",
        shots: [{ scene: "雨夜街头", imagePrompt: "雨夜霓虹下的人物特写", onScreenText: "太长了的屏幕字会被切开一二三四五", durationSec: 9, motion: "punch" }],
      },
      { targetDurationSec: 15 },
    );
    expect(s.shots.length).toBe(5);
    expect(s.shots[0]?.onScreenText.length).toBeLessThanOrEqual(16);
    expect(s.shots[0]?.durationSec).toBe(3);
    expect(s.shots[0]?.motion).toBe("punch");
    expect(s.shots[0]?.imagePrompt).toMatch(/雨夜/);
  });

  it("keeps the mock script usable", () => {
    expect(parseScript(MOCK_SCRIPT, { targetDurationSec: 15 }).shots).toHaveLength(5);
    expect(MOCK_SCRIPT.shots.every((x) => x.voiceover.length > 0)).toBe(true);
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
