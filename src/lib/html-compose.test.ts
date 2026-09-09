import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT } from "./copy";
import {
  buildEditList,
  extractHtmlDocument,
  fallbackCinemaHtml,
  generateCinemaHtml,
  htmlClipToStillRel,
  parseCompositionClips,
  validateCinemaHtml,
} from "./html-compose";

describe("cinema html compose", () => {
  const list = buildEditList({
    script: MOCK_SCRIPT,
    stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
    aspect: "9:16",
    speechRel: "speech.wav",
    bgmRel: "bgm.mp3",
  });

  it("builds an edit list that covers every shot", () => {
    expect(list.width).toBe(1080);
    expect(list.height).toBe(1920);
    expect(list.clips).toHaveLength(MOCK_SCRIPT.shots.length);
    expect(list.clips[0]?.stillRel).toBe("stills/shot-1.png");
    expect(list.speechRel).toBe("speech.wav");
  });

  it("fallback html is a valid cinema composition", () => {
    const html = fallbackCinemaHtml(list);
    expect(validateCinemaHtml(html, list)).toEqual({ ok: true });
    expect(html).toMatch(/data-composition-id="cinema"/);
    expect(html).toContain("stills/shot-1.png");
    expect(html).toContain("speech.wav");
    expect(html).toContain("bgm.mp3");
    expect(html).toMatch(/data-motion="push-in"/);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("rejects html that drops a still or uses a remote url", () => {
    const html = fallbackCinemaHtml(list).replace("shot-3.png", "missing.png");
    expect(validateCinemaHtml(html, list).ok).toBe(false);
    expect(validateCinemaHtml(html.replace("missing.png", "shot-3.png") + `<img src="https://evil.example/x.png">`, list).ok).toBe(false);
  });

  it("parses clip timing from the html", () => {
    const clips = parseCompositionClips(fallbackCinemaHtml(list));
    expect(clips.length).toBe(MOCK_SCRIPT.shots.length);
    expect(htmlClipToStillRel(clips[0]!.src)).toBe("stills/shot-1.png");
    expect(clips[0]?.duration).toBe(MOCK_SCRIPT.shots[0]?.durationSec);
  });

  it("strips markdown fences from a model reply", () => {
    const inner = fallbackCinemaHtml(list);
    expect(extractHtmlDocument("```html\n" + inner + "\n```")).toContain("data-composition-id");
  });

  it("mock generateCinemaHtml returns the fallback", async () => {
    const prev = process.env.FLOW_MOCK;
    process.env.FLOW_MOCK = "1";
    const html = await generateCinemaHtml(list);
    process.env.FLOW_MOCK = prev;
    expect(validateCinemaHtml(html, list).ok).toBe(true);
  });
});
