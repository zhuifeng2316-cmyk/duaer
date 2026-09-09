import { describe, expect, it } from "vitest";
import { durationForVoiceover, spokenLine } from "./speech-text";

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
});
