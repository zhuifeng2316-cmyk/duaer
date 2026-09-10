import { mkdir, mkdtemp, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateSpokenAudio } from "./openspeech";

describe("cloned speech routing", () => {
  const env = { ...process.env };
  const trash: string[] = [];
  afterEach(async () => {
    process.env = { ...env };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    for (const dir of trash.splice(0)) await rm(dir, { recursive: true, force: true });
  });

  it("reuses the cached Cosy voice id and does not call Seed", async () => {
    process.env.SPEECH_MODEL = "cosyvoice-v3.5-plus";
    process.env.FLOW_API_KEY = "dwflow-test";
    const localId = "test-cosy-only";
    const remoteId = "cosyvoice-v3.5-plus-sima-d49a238e9ceb4c9da8adeaf8aa701696";
    const voiceDir = path.join(process.cwd(), "storage", "voices", localId);
    trash.push(voiceDir);
    await mkdir(voiceDir, { recursive: true });
    await writeFile(
      path.join(voiceDir, "cosyvoice.json"),
      JSON.stringify({ remoteVoiceId: remoteId, model: "cosyvoice-v3.5-plus" }),
    );
    const dir = await mkdtemp(path.join(tmpdir(), "duaer-cosy-"));
    trash.push(dir);
    const dest = path.join(dir, "shot.aiff");
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        urls.push(String(url));
        const body = JSON.parse(String(init?.body || "{}")) as { voice?: string; model?: string };
        if (String(url).includes("/audio/speech") && body.voice === remoteId && body.model === "cosyvoice-v3.5-plus") {
          return new Response(Buffer.alloc(240, 9), {
            status: 200,
            headers: { "content-type": "audio/mpeg" },
          });
        }
        return new Response("no", { status: 404 });
      }),
    );
    const spoken = await generateSpokenAudio("人到中年，别再为难自己。", dest, path.join(dir, "ref.wav"), localId);
    expect(spoken.cloneUsed).toBe(true);
    expect(spoken.warning).toBeNull();
    expect(urls.some((u) => u.includes("openspeech.bytedance.com"))).toBe(false);
    expect(urls.some((u) => u.includes("/audio/speech"))).toBe(true);
  });

  it("does not fall back to Seed when Cosy is down", async () => {
    process.env.SPEECH_MODEL = "cosyvoice-v3.5-plus";
    process.env.FLOW_API_KEY = "dwflow-test";
    const localId = "test-cosy-down";
    const voiceDir = path.join(process.cwd(), "storage", "voices", localId);
    trash.push(voiceDir);
    await mkdir(voiceDir, { recursive: true });
    await writeFile(
      path.join(voiceDir, "cosyvoice.json"),
      JSON.stringify({
        remoteVoiceId: "cosyvoice-v3.5-plus-sima-d49a238e9ceb4c9da8adeaf8aa701696",
        model: "cosyvoice-v3.5-plus",
      }),
    );
    const dir = await mkdtemp(path.join(tmpdir(), "duaer-cosy-down-"));
    trash.push(dir);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("<!doctype html>", { status: 404, headers: { "content-type": "text/html" } })),
    );
    await expect(
      generateSpokenAudio("人到中年，别再为难自己。", path.join(dir, "shot.aiff"), path.join(dir, "ref.wav"), localId),
    ).rejects.toThrow(/口播合成失败|还没有编号/);
  });

  it("sends emotion instruction and speech rate for a house voice", async () => {
    process.env.OPEN_SPEECH_API_KEY = "test-key";
    process.env.SPEECH_MODEL = "seed-tts-2.0";
    const dir = await mkdtemp(path.join(tmpdir(), "duaer-house-"));
    trash.push(dir);
    const dest = path.join(dir, "shot.aiff");
    const bodies: string[] = [];
    const chunk = Buffer.alloc(240, 7).toString("base64");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        bodies.push(String(init?.body || ""));
        return new Response(`${JSON.stringify({ code: 0, data: chunk })}\n${JSON.stringify({ code: 20000000 })}\n`, {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
    const spoken = await generateSpokenAudio(
      "人到中年，别再为难自己。",
      dest,
      null,
      "house-yizhi",
      "像译制片画外音，开口稍快更有力。",
      { instruction: "像译制片画外音，开口稍快更有力。", speechRate: 20, ffmpegTempo: 1 },
    );
    expect(spoken.cloneUsed).toBe(false);
    expect(spoken.tempo).toBe(1);
    const payload = JSON.parse(bodies[0] || "{}") as {
      req_params?: { speaker?: string; audio_params?: { speech_rate?: number }; additions?: string };
    };
    expect(payload.req_params?.speaker).toMatch(/yizhipiannan/);
    expect(payload.req_params?.audio_params?.speech_rate).toBe(20);
    expect(payload.req_params?.additions).toMatch(/译制|稍快/);
  });
});
