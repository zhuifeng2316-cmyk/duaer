import { readFile, lstat, rm } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { makePlaceholderStill } from "./compose";
import { composeFallbackNotice, COMPOSE_FALLBACK_NOTICE, shouldTryHtmlVideoRender, stageComposeMedia, stageCoverCompose, writeAndRenderCinema } from "./cinema-render";
import { MOCK_SCRIPT } from "./copy";
import { buildEditList } from "./html-compose";
import { createProject, projectDir, projectFile, readProject, updateProject, writeProjectFile } from "./store";

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

  it("stages house component pictures into the compose root", async () => {
    const project = await createProject({ idea: "合成", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(project.id);
    await writeProjectFile(project.id, "graphics/carousel-circle-1-image1.png", Buffer.from("png"));
    const list = buildEditList({
      script: MOCK_SCRIPT,
      stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    const composeDir = await stageComposeMedia(project.id, list);
    const linked = await lstat(projectFile(project.id, "compose/graphics"));
    expect(composeDir).toContain("compose");
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
    const after = await readProject(project.id);
    expect(after?.composeError).toBeFalsy();
    process.env.FLOW_MOCK = prevMock;
    process.env.CINEMA_HTML_RENDER = prevRender;
  }, 60_000);

  it("only flags a compose fallback when html render actually failed", () => {
    expect(composeFallbackNotice(true, true)).toBe(COMPOSE_FALLBACK_NOTICE);
    expect(composeFallbackNotice(false, true)).toBeNull();
    expect(composeFallbackNotice(true, false)).toBeNull();
  });

  it("writes a chinese-skinned chart copy into compose, not the official english", async () => {
    const project = await createProject({ idea: "合成", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(project.id);
    const script = {
      ...MOCK_SCRIPT,
      visualMode: "knowledge" as const,
      shots: MOCK_SCRIPT.shots.map((shot, i) =>
        i === 1 ? { ...shot, block: "data-chart", overlay: undefined, onScreenText: "看这组数", voiceover: "前后对比" } : shot,
      ),
    };
    const list = buildEditList({
      script,
      stillRels: script.shots.map((_, i) => `stills/shot-${i + 1}.png`),
      aspect: "9:16",
    });
    await stageComposeMedia(project.id, list);
    const skinned = await readFile(projectFile(project.id, "compose/compositions/data-chart--shot-2.html"), "utf8");
    expect(skinned).toContain("看这组数");
    expect(skinned).toContain("data-chart--shot-2");
    expect(skinned).not.toContain("Monthly Revenue");
    expect(skinned).not.toContain("Should I learn");
  });

  it("stages the last still under the titlecard cover template", async () => {
    const project = await createProject({ idea: "封面", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(project.id);
    await makePlaceholderStill(projectFile(project.id, "stills/shot-1.png"), "9:16", "0x1a2330");
    const composeDir = projectFile(project.id, "cover-compose");
    await stageCoverCompose({
      composeDir,
      html: "<!doctype html><html><body>titlecard-calm</body></html>",
      stillAbs: projectFile(project.id, "stills/shot-1.png"),
      template: "titlecard-calm",
    });
    const html = await readFile(projectFile(project.id, "cover-compose/index.html"), "utf8");
    expect(html).toContain("titlecard-calm");
    const card = await lstat(projectFile(project.id, "cover-compose/compositions/components/titlecard-calm.html"));
    expect(card.isFile()).toBe(true);
    const still = await lstat(projectFile(project.id, "cover-compose/still.png"));
    expect(still.isFile()).toBe(true);
  });

  it("stages a lettering cover without a registry overlay file", async () => {
    const project = await createProject({ idea: "杂志封面", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(project.id);
    await makePlaceholderStill(projectFile(project.id, "stills/shot-1.png"), "9:16", "0x1a2330");
    const composeDir = projectFile(project.id, "cover-compose");
    await stageCoverCompose({
      composeDir,
      html: "<!doctype html><html><body><div class=\"lettering magazine\">今晚</div></body></html>",
      stillAbs: projectFile(project.id, "stills/shot-1.png"),
      template: "magazine",
    });
    const html = await readFile(projectFile(project.id, "cover-compose/index.html"), "utf8");
    expect(html).toContain("lettering magazine");
    await expect(lstat(projectFile(project.id, "cover-compose/compositions/components/magazine.html"))).rejects.toThrow();
  });
});
