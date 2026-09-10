import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { arkImageEndpoint, arkStillSize, mapArkImageError } from "./config";
import { buildArkStillBody, generateStillFromRef, uniqueRefPaths } from "./image";

describe("ark clone stills", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts clone stills to the ark images endpoint", () => {
    expect(arkImageEndpoint()).toMatch(/\/api\/v3\/images\/generations$/);
    expect(arkImageEndpoint()).toMatch(/ark\.cn-beijing/);
  });

  it("locks 2K pixels to the chosen aspect", () => {
    expect(arkStillSize("9:16", { size: "2K" })).toBe("1440x2560");
    expect(arkStillSize("16:9")).toBe("2560x1440");
    expect(arkStillSize("1:1")).toBe("2048x2048");
    expect(arkStillSize("3:4")).toBe("1536x2048");
    expect(arkStillSize("4:3")).toBe("2048x1536");
  });

  it("locks 4K pixels to the chosen aspect", () => {
    expect(arkStillSize("9:16", { size: "4K" })).toBe("2160x3840");
    expect(arkStillSize("16:9", { size: "4K" })).toBe("3840x2160");
    expect(arkStillSize("1:1", { size: "4K" })).toBe("4096x4096");
  });

  it("sends reference photos and identity text, no watermark", () => {
    const body = buildArkStillBody({
      prompt: "改朝向",
      lead: "必须是这个人",
      imageDataUrls: ["data:image/jpeg;base64,AAA", "data:image/png;base64,BBB"],
      model: "doubao-seedream-4-5-251128",
      aspect: "9:16",
    });
    expect(body.image).toEqual(["data:image/jpeg;base64,AAA", "data:image/png;base64,BBB"]);
    expect(body.prompt).toMatch(/必须是这个人/);
    expect(body.prompt).toMatch(/改朝向/);
    expect(body.watermark).toBe(false);
    expect(body.size).toBe("1440x2560");
  });

  it("dedupes the same head path so one photo is not posted twice", () => {
    const once = uniqueRefPaths(["/tmp/head.png", "/tmp/head.png", "/tmp/source.jpg"]);
    expect(once).toEqual(["/tmp/head.png", "/tmp/source.jpg"]);
  });

  it("maps http errors without vendor names", () => {
    expect(mapArkImageError(401)).toBe("密钥无效");
    expect(mapArkImageError(404)).toBe("出图失败");
    expect(mapArkImageError(500)).not.toMatch(/火山|方舟|豆包|Seedream|Gemini/i);
  });

  it("requires the ark key", async () => {
    const prev = process.env.ARK_API_KEY;
    delete process.env.ARK_API_KEY;
    try {
      await expect(
        generateStillFromRef({
          prompt: "窗边",
          photoPaths: ["/tmp/missing.png"],
          destPath: "/tmp/out.png",
        }),
      ).rejects.toThrow(/未配置密钥/);
    } finally {
      if (prev === undefined) delete process.env.ARK_API_KEY;
      else process.env.ARK_API_KEY = prev;
    }
  });

  it("posts a data-url reference and writes the returned image", async () => {
    const work = path.join(os.tmpdir(), `duaer-ark-work-${Date.now()}`);
    await mkdir(work, { recursive: true });
    const ref = path.join(work, "head.png");
    const dest = path.join(work, "out.png");
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64",
    );
    await writeFile(ref, png);
    const prevKey = process.env.ARK_API_KEY;
    process.env.ARK_API_KEY = "test-key";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: [{ url: "https://example.invalid/still.png" }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => Uint8Array.from([9, 8, 7]).buffer,
      });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await generateStillFromRef({
        prompt: "窗边",
        lead: "先看附图",
        photoPaths: [ref, ref],
        destPath: dest,
        aspect: "9:16",
      });
      const [url, init] = fetchMock.mock.calls[0] as [string, { body: string; headers: Record<string, string> }];
      expect(url).toMatch(/\/api\/v3\/images\/generations$/);
      expect(init.headers.Authorization).toMatch(/^Bearer /);
      const body = JSON.parse(init.body) as { image: string; prompt: string; size: string; watermark: boolean };
      expect(body.image).toMatch(/^data:image\/png;base64,/);
      expect(body.prompt).toMatch(/先看附图/);
      expect(body.size).toBe("1440x2560");
      expect(body.watermark).toBe(false);
      expect(Buffer.from(await readFile(dest)).equals(Buffer.from([9, 8, 7]))).toBe(true);
    } finally {
      if (prevKey === undefined) delete process.env.ARK_API_KEY;
      else process.env.ARK_API_KEY = prevKey;
      await rm(work, { recursive: true, force: true });
    }
  });
});
