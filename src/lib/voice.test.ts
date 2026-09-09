import { describe, expect, it } from "vitest";
import {
  assertVoice,
  assertVoiceDurationSec,
  extForVoiceMime,
  finishVoiceRecord,
  parseVoiceName,
  pickRecorderMime,
  recorderStillFlushing,
} from "./voice";

describe("voice sample", () => {
  it("accepts a short mp3 and names the file", () => {
    const file = new File([new Uint8Array([1, 2, 3])], "me.mp3", { type: "audio/mpeg" });
    expect(() => assertVoice(file)).not.toThrow();
    expect(extForVoiceMime(file.type)).toBe("mp3");
  });

  it("picks a recorder mime the browser supports", () => {
    expect(pickRecorderMime((type) => type === "audio/webm")).toBe("audio/webm");
    expect(pickRecorderMime(() => false)).toBe("");
  });

  it("rejects recordings shorter than 10 seconds", () => {
    expect(() => assertVoiceDurationSec(9.9)).toThrow(/10 秒/);
    expect(() => assertVoiceDurationSec(10)).not.toThrow();
  });

  it("keeps a short take for preview but flags it", () => {
    const part = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm" });
    const shortTake = finishVoiceRecord([part], "audio/webm", 3);
    expect(shortTake.tooShort).toBe(true);
    expect(shortTake.blob?.size).toBeGreaterThan(0);
    expect(shortTake.error).toMatch(/3 秒/);
    const empty = finishVoiceRecord([], "audio/webm", 12);
    expect(empty.blob).toBeNull();
    expect(empty.error).toMatch(/没录上/);
  });

  it("waits for the recorder to flush before giving up", () => {
    expect(recorderStillFlushing("recording", 400, false)).toBe(true);
    expect(recorderStillFlushing("inactive", 80, false)).toBe(true);
    expect(recorderStillFlushing("inactive", 80, true)).toBe(false);
    expect(recorderStillFlushing("inactive", 900, false)).toBe(false);
    expect(recorderStillFlushing("recording", 2500, false)).toBe(false);
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
