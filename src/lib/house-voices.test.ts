import { describe, expect, it } from "vitest";
import { DEFAULT_HOUSE_VOICE_ID, getHouseVoice, isHouseVoiceId, pickStudioVoiceId, publicHouseVoices } from "./house-voices";

describe("house voices", () => {
  it("defaults to a cloned voice when one exists", () => {
    expect(pickStudioVoiceId(["clone-new", "clone-old"], "house-lengxu")).toBe("clone-new");
    expect(pickStudioVoiceId(["clone-new", "clone-old"], "clone-old")).toBe("clone-old");
    expect(pickStudioVoiceId([], "house-ye")).toBe("house-ye");
    expect(pickStudioVoiceId([], null)).toBe(DEFAULT_HOUSE_VOICE_ID);
    expect(pickStudioVoiceId(["clone-1"], "missing")).toBe("clone-1");
  });

  it("exposes six cinematic voices without leaking speakers to the public list", () => {
    const pub = publicHouseVoices();
    expect(pub.length).toBeGreaterThanOrEqual(6);
    expect(pub.map((v) => v.name)).toEqual(expect.arrayContaining(["冷叙", "译制", "悬疑", "夜谈", "青叔", "直率"]));
    expect(JSON.stringify(pub)).not.toMatch(/uranus|bigtts|speaker/i);
    expect(isHouseVoiceId(DEFAULT_HOUSE_VOICE_ID)).toBe(true);
    expect(getHouseVoice("house-yizhi")?.name).toBe("译制");
    expect(getHouseVoice("no-such")).toBeNull();
    expect(pub.every((v) => v.sampleUrl.includes(v.id))).toBe(true);
  });
});
