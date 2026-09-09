import { describe, expect, it } from "vitest";
import { transcodeVoiceToWav } from "./voice-audio";

describe("voice audio", () => {
  it("keeps a junk sample if transcode cannot run", async () => {
    const raw = Buffer.from("not-audio");
    const out = await transcodeVoiceToWav(raw, "mp3");
    expect(out.ext).toBe("mp3");
    expect(out.data.equals(raw)).toBe(true);
  });
});
