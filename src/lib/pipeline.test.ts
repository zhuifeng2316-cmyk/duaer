import { readFile } from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";
import { PRODUCE_PHASES } from "./pipeline";

describe("produce order", () => {
  it("writes the composition html after music and before assemble", () => {
    expect([...PRODUCE_PHASES]).toEqual(["copy", "board", "images", "speech", "music", "html", "assemble"]);
  });
});

describe("c-end copy has no vendor names", () => {
  it("keeps the homepage and produce messages vendor-free", async () => {
    const root = path.join(process.cwd(), "src");
    const page = await readFile(path.join(root, "app/page.tsx"), "utf8");
    const pipeline = await readFile(path.join(root, "lib/pipeline.ts"), "utf8");
    const copy = await readFile(path.join(root, "lib/copy.ts"), "utf8");
    const visible = [page, pipeline, copy].join("\n");
    expect(visible).toMatch(/在写合成稿/);
    expect(visible).toMatch(/人物形象/);
    expect(visible).toMatch(/重做这张/);
    expect(visible).toMatch(/八个方位/);
    expect(visible).not.toMatch(/HyperFrames|Seedream|Gemini|方舟|豆包|即梦/i);
  });
});
