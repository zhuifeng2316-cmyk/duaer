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
    const nav = await readFile(path.join(root, "app/site-nav.tsx"), "utf8");
    const talks = await readFile(path.join(root, "app/talks/page.tsx"), "utf8");
    const workspace = await readFile(path.join(root, "app/talk-workspace.tsx"), "utf8");
    const pipeline = await readFile(path.join(root, "lib/pipeline.ts"), "utf8");
    const copy = await readFile(path.join(root, "lib/copy.ts"), "utf8");
    const speech = await readFile(path.join(root, "lib/flow/speech.ts"), "utf8");
    const visible = [page, nav, talks, workspace, pipeline, copy, speech].join("\n");
    expect(visible).toMatch(/做口播/);
    expect(visible).toMatch(/我的口播/);
    expect(visible).toMatch(/在写合成稿/);
    expect(visible).toMatch(/确认后再写图片分镜/);
    expect(visible).toMatch(/确认分镜，开始出图/);
    expect(visible).toMatch(/正在写口播文案/);
    expect(visible).toMatch(/人物形象/);
    expect(visible).toMatch(/重做这张/);
    expect(visible).toMatch(/八个方位/);
    expect(visible).toMatch(/确认文案，写图片分镜/);
    expect(visible).toMatch(/确认分镜，开始出图/);
    expect(visible).toMatch(/先写文案/);
    expect(visible).toMatch(/对照/);
    expect(visible).toMatch(/确认画面，继续成片/);
    expect(visible).toMatch(/微调成片/);
    expect(visible).toMatch(/按时间轴再出片/);
    expect(visible).toMatch(/选中的克隆音色这次没接上/);
    expect(visible).not.toMatch(/Astra|Astro|GPT|gpt-6/i);
    expect(visible).not.toMatch(/HyperFrames|Seedream|Gemini|方舟|豆包|即梦/i);
    expect([nav, talks, workspace, page].join("\n")).not.toMatch(/数据库/);
  });
});
