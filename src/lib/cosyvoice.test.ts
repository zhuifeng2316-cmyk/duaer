import { mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { buildCosySpeechBody, cinemaSpeechInstruction, readCachedCosyVoice, resolveCosyVoiceId } from "./cosyvoice";

const trash: string[] = [];
afterEach(async () => {
  for (const dir of trash.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe("cinema speech instruction", () => {
  it("keeps instruct text short and varies by shot", () => {
    const first = cinemaSpeechInstruction({ index: 0, total: 5 });
    const last = cinemaSpeechInstruction({ index: 4, total: 5 });
    const mid = cinemaSpeechInstruction({ index: 1, total: 5 });
    expect(first).not.toBe(last);
    expect(first).not.toBe(mid);
    expect(first.length).toBeLessThanOrEqual(50);
    expect(last.length).toBeLessThanOrEqual(50);
    expect(first).toMatch(/稍快/);
    expect(last).toMatch(/放慢/);
    expect(mid).toMatch(/语速|稍快|起伏/);
  });

  it("sends instruction on the cloned speech request", () => {
    const body = buildCosySpeechBody({
      text: "别再把想要的生活留给以后。",
      remoteVoiceId: "cosy-voice-1",
      instruction: "语速稍快更有力，起伏大，像劝人。",
    });
    expect(body.voice).toBe("cosy-voice-1");
    expect(body.instruction).toMatch(/稍快/);
    expect(body.extra_body).toEqual({ instruction: body.instruction });
    expect(body.speed).toBeUndefined();
  });

  it("reads the enrolled remote voice id from disk", async () => {
    const localId = "test-cosy-cache";
    const remoteId = "cosyvoice-v3.5-plus-sima-d49a238e9ceb4c9da8adeaf8aa701696";
    const dir = path.join(process.cwd(), "storage", "voices", localId);
    trash.push(dir);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "cosyvoice.json"), JSON.stringify({ remoteVoiceId: remoteId, model: "cosyvoice-v3.5-plus" }));
    expect(await readCachedCosyVoice(localId)).toBe(remoteId);
    expect(await resolveCosyVoiceId(localId)).toBe(remoteId);
  });
});
