import { describe, expect, it } from "vitest";
import { assertVoice, extForVoiceMime, parseVoiceName } from "./voice";

describe("voice sample", () => {
  it("accepts a short mp3 and names the file", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "me.mp3", { type: "audio/mpeg" });
    expect(() => assertVoice(file)).not.toThrow();
    expect(extForVoiceMime(file.type)).toBe("mp3");
  });

  it("rejects a huge file", () => {
    const file = new File([new Uint8Array(13 * 1024 * 1024)], "me.wav", { type: "audio/wav" });
    expect(() => assertVoice(file)).toThrow(/12MB/);
  });
});

describe("voice name", () => {
  it("falls back and clips", () => {
    expect(parseVoiceName("  ")).toBe("我的音色");
    expect(parseVoiceName("这是一个非常非常长的音色名字会被切开")).toHaveLength(16);
  });
});
