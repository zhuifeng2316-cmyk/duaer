import { describe, expect, it } from "vitest";
import { durationForVoiceover, spokenLine, spokenShotLine } from "./speech-text";
import { MOCK_SCRIPT } from "./copy";

describe("speech text", () => {
  it("sizes duration from 口播 length", () => {
    expect(durationForVoiceover("短")).toBe(2);
    expect(durationForVoiceover("一张照片就能换十个场景今晚发出去")).toBeGreaterThan(2);
    expect(durationForVoiceover("x".repeat(80))).toBe(6);
  });

  it("prefers voiceover over on-screen text", () => {
    expect(spokenLine({ voiceover: "口播一句", onScreenText: "大字" })).toBe("口播一句");
    expect(spokenLine({ onScreenText: "大字" })).toBe("大字");
  });

  it("puts hook and cta on the first and last spoken lines", () => {
    expect(spokenShotLine(MOCK_SCRIPT, 0)).toContain(MOCK_SCRIPT.hook);
    expect(spokenShotLine(MOCK_SCRIPT, 0)).toContain(MOCK_SCRIPT.shots[0]!.voiceover);
    expect(spokenShotLine(MOCK_SCRIPT, 1)).toBe(MOCK_SCRIPT.shots[1]!.voiceover);
    const last = MOCK_SCRIPT.shots.length - 1;
    expect(spokenShotLine(MOCK_SCRIPT, last)).toContain(MOCK_SCRIPT.cta);
    expect(spokenShotLine(MOCK_SCRIPT, last)).toContain(MOCK_SCRIPT.shots[last]!.voiceover);
    expect(
      spokenShotLine(
        { hook: "人不用出镜", cta: "今晚发出去", shots: [{ voiceover: "人不用出镜，声音画面都能克隆" }, { voiceover: "今晚发出去" }] },
        0,
      ),
    ).toBe("人不用出镜，声音画面都能克隆");
    expect(
      spokenShotLine(
        {
          cta: "下次想说如果由我，先把代价列出来。",
          shots: [
            { voiceover: "旁观容易" },
            { voiceover: "下次想说「如果由我」，先把代价列出来。" },
          ],
        },
        1,
      ),
    ).toBe("下次想说「如果由我」，先把代价列出来。");
  });
});
