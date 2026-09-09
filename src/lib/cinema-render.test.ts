import { readFile, lstat, rm } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { makePlaceholderStill } from "./compose";
import { shouldTryHtmlVideoRender, stageComposeMedia, writeAndRenderCinema } from "./cinema-render";
import { MOCK_SCRIPT } from "./copy";
import { buildEditList } from "./html-compose";
import { createProject, projectDir, projectFile, updateProject, writeProjectFile } from "./store";

describe("cinema html render", () => {
  const ids: string[] = [];
  afterEach(async () => {
    for (const id of ids.splice(0)) {
      await rm(projectDir(id), { recursive: true, force: true });
    }
  });

  it("skips the html renderer in mock mode", () => {
    const prevMock = process.env.FLOW_MOCK;
    const prevRender = process.env.CINEMA_HTML_RENDER;
    process.env.FLOW_MOCK = "1";
    delete process.env.CINEMA_HTML_RENDER;
    expect(shouldTryHtmlVideoRender()).toBe(false);
    process.env.FLOW_MOCK = prevMock;
    process.env.CINEMA_HTML_RENDER = prevRender;
  });

  it("skips the html renderer when forced off", () => {
    const prevMock = process.env.FLOW_MOCK;
    const prevRender = process.env.CINEMA_HTML_RENDER;
    process.env.FLOW_MOCK = "0";
    process.env.CINEMA_HTML_RENDER = "0";
    expect(shouldTryHtmlVideoRender()).toBe(false);
    process.env.FLOW_MOCK = prevMock;
    process.env.CINEMA_HTML_RENDER = prevRender;
  });

  it("stages stills into the compose root", async () => {
    const project = await createProject({ idea: "合成", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(project.id);
    await writeProjectFile(project.id, "stills/shot-1.png", Buffer.from("png"));
    const list = buildEditList({
      script: MOCK_SCRIPT,
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    const composeDir = await stageComposeMedia(project.id, list);
    expect(composeDir).toContain("compose");
    const linked = await lstat(projectFile(project.id, "compose/stills"));
    expect(linked.isSymbolicLink() || linked.isDirectory()).toBe(true);
  });

  it("keeps an edited composition when re-rendering", async () => {
    const prevMock = process.env.FLOW_MOCK;
    const prevRender = process.env.CINEMA_HTML_RENDER;
    process.env.FLOW_MOCK = "1";
    process.env.CINEMA_HTML_RENDER = "0";
    const project = await createProject({ idea: "合成", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(project.id);
    const stills = MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`);
    for (const rel of stills) {
      await makePlaceholderStill(projectFile(project.id, rel), "9:16", "0x1a2330");
    }
    const marker = "CINEMA-EDIT-KEEP";
    await writeProjectFile(project.id, "compose/index.html", `<!doctype html><html><body>${marker}</body></html>`);
    await updateProject(project.id, { script: MOCK_SCRIPT, stills, htmlPath: "compose/index.html" });
    await writeAndRenderCinema(project.id, { reuseHtml: true });
    const html = await readFile(projectFile(project.id, "compose/index.html"), "utf8");
    expect(html).toContain(marker);
    process.env.FLOW_MOCK = prevMock;
    process.env.CINEMA_HTML_RENDER = prevRender;
  }, 60_000);
});
