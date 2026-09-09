import { access } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { bindVoiceSample, createVoice, deleteVoice, listVoices, readVoice, voiceFile } from "./voice-store";

const trash: string[] = [];

afterEach(async () => {
  for (const id of trash.splice(0)) await deleteVoice(id);
});

describe("voice library", () => {
  it("saves a voice and can bind the sample again", async () => {
    const voice = await createVoice({
      name: "我",
      data: Buffer.from("abcd"),
      ext: "mp3",
    });
    trash.push(voice.id);
    expect(voice.name).toBe("我");
    const listed = await listVoices();
    expect(listed.some((v) => v.id === voice.id)).toBe(true);
    const again = await readVoice(voice.id);
    expect(again?.sample).toBe("sample.mp3");
    const dest = voiceFile(voice.id, "copy.mp3");
    await bindVoiceSample(voice.id, dest);
    await access(dest);
  });

  it("rejects a missing voice bind", async () => {
    await expect(bindVoiceSample("no-such-voice", voiceFile("no-such-voice", "x.mp3"))).rejects.toThrow(/音色不存在/);
  });
});
