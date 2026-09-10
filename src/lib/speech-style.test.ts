import { describe, expect, it } from "vitest";
import { cinemaSpeechInstruction } from "./cosyvoice";
import { talkSpeechStyle } from "./speech-style";

describe("talk speech style", () => {
  it("opens faster and lands slower", () => {
    const first = talkSpeechStyle({ index: 0, total: 5, line: "人到中年。", topic: "story", voiceId: "house-ye" });
    const last = talkSpeechStyle({ index: 4, total: 5, line: "人到中年。", topic: "story", voiceId: "house-ye" });
    expect(first.speechRate).toBeGreaterThan(last.speechRate);
    expect(first.instruction).toMatch(/稍快|开口/);
    expect(last.instruction).toMatch(/放慢/);
    expect(first.instruction).toMatch(/夜里|压/);
    expect(first.ffmpegTempo).toBe(1);
  });

  it("slows down a long line and keeps clone instructions short", () => {
    const short = talkSpeechStyle({ index: 1, total: 4, line: "别等了。" });
    const long = talkSpeechStyle({
      index: 1,
      total: 4,
      line: "人到中年还在等别人点头，才敢过自己想过的那种日子。",
    });
    expect(long.speechRate).toBeLessThan(short.speechRate);
    expect(cinemaSpeechInstruction({ index: 0, total: 5 }).length).toBeLessThanOrEqual(50);
    expect(cinemaSpeechInstruction({ index: 4, total: 5 })).toMatch(/放慢/);
  });

  it("lets a hold role override a middle shot", () => {
    const push = talkSpeechStyle({ index: 1, total: 4, line: "人到中年。", voiceRole: "push" });
    const hold = talkSpeechStyle({ index: 1, total: 4, line: "人到中年。", voiceRole: "hold" });
    expect(hold.speechRate).toBeLessThan(push.speechRate);
    expect(hold.instruction).toMatch(/放慢/);
  });
});
