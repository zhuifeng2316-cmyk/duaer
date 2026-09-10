import { readFile } from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT } from "./copy";
import { COVER_CARD_SEC, COVER_SNAPSHOT_AT, coverTemplateVars, coverTitle, generateCoverHtml, pickCoverStillRel, pickLastCoverStillRel, wrapCoverTitle } from "./cover";
import { COVER_TEMPLATES, parseCoverTemplate } from "./cover-templates";
import { extractChatImage } from "./flow/json";

describe("talk cover", () => {
  it("takes a short title from the hook", () => {
    expect(coverTitle(MOCK_SCRIPT)).toBe("你不用出镜也能天天发口播".slice(0, 12));
    expect(coverTitle(MOCK_SCRIPT).length).toBeLessThanOrEqual(12);
    expect(coverTitle(null, "今晚就发")).toBe("今晚就发");
  });

  it("wraps a long title onto two poster lines", () => {
    expect(wrapCoverTitle("别再把想要的生活留给以后。")).toEqual(["别再把想要的", "生活留给以后"]);
    expect(wrapCoverTitle("今晚就发")).toEqual(["今晚就发"]);
    expect(wrapCoverTitle("人到中年别再为难自己")).toEqual(["人到中年", "别再为难自己"]);
    expect(wrapCoverTitle("人生这道题答案由我来写")).toEqual(["人生这道题答案", "由我来写"]);
  });

  it("picks the last still as the cover photo", () => {
    const stills = ["stills/shot-1.png", "", "stills/shot-3.png"];
    expect(pickLastCoverStillRel(stills)).toBe("stills/shot-3.png");
    expect(pickLastCoverStillRel(["", ""])).toBeNull();
  });

  it("writes a paused titlecard cover composition on the last still", () => {
    const html = generateCoverHtml({ width: 1080, height: 1920, title: "今晚就发" });
    expect(html).toContain("titlecard-lockup");
    expect(html).toContain("compositions/components/titlecard-lockup.html");
    expect(html).toContain("still.png");
    expect(html).toContain("今晚就发");
    expect(html).toMatch(/gsap\.timeline\(\s*\{\s*paused:\s*true/);
    expect(html).toContain('window.__timelines["talk-cover"]');
    expect(html).toContain(`data-duration="${COVER_CARD_SEC}"`);
    expect(html).toContain("--bg:transparent");
    expect(COVER_SNAPSHOT_AT).toBe(2.4);
  });

  it("fills the selected cover template, not only the lockup", () => {
    expect(parseCoverTemplate("titlecard-calm")).toBe("titlecard-calm");
    expect(parseCoverTemplate("nope")).toBe("titlecard-lockup");
    expect(coverTemplateVars("titlecard-calm", "今晚就发")).toEqual({ headline: "今晚就发", kicker: "" });
    const html = generateCoverHtml({ width: 1080, height: 1920, title: "今晚就发", template: "titlecard-calm" });
    expect(html).toContain("titlecard-calm");
    expect(html).toContain("compositions/components/titlecard-calm.html");
    expect(html).not.toContain("titlecard-lockup");
  });

  it("fills slam and magazine cover styles", () => {
    expect(coverTemplateVars("headline-slam", "今晚就发")).toMatchObject({ text: "今晚就发", accent: "green" });
    const slam = generateCoverHtml({ width: 1080, height: 1920, title: "今晚就发", template: "headline-slam" });
    expect(slam).toContain("headline-slam");
    expect(slam).toContain("compositions/components/headline-slam.html");
    const mag = generateCoverHtml({ width: 1080, height: 1920, title: "今晚就发", template: "magazine" });
    expect(mag).toContain("lettering magazine");
    expect(mag).toContain("今晚就发");
    expect(mag).not.toContain("data-composition-src");
    expect(parseCoverTemplate("neon")).toBe("neon");
    expect(COVER_TEMPLATES.map((row) => row.label)).toEqual([
      "标题卡锁定",
      "标题卡",
      "砸大字",
      "行动卡",
      "解码字",
      "杂志字",
      "霓虹字",
      "故障字",
      "手写标题",
      "底栏叠字",
    ]);
  });

  it("fits chinese titlecard wordmarks with square glyph advance", async () => {
    const src = await readFile(path.join(process.cwd(), "house/registry/compositions/components/titlecard-lockup.html"), "utf8");
    expect(src).toContain("1.05");
    expect(src).toContain("\\u4e00-\\u9fff");
  });

  it("picks a close still so the cover face matches the talk", () => {
    const stills = MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`);
    expect(pickCoverStillRel(MOCK_SCRIPT, stills)).toBe("stills/shot-1.png");
    const laterClose = {
      ...MOCK_SCRIPT,
      shots: MOCK_SCRIPT.shots.map((s, i) =>
        i === 4 ? { ...s, scene: "海滩近景", imagePrompt: "正面微笑特写" } : s,
      ),
    };
    expect(pickCoverStillRel(laterClose, stills)).toBe("stills/shot-5.png");
  });

  it("does not stamp the same gold-corner top poster on every cover", async () => {
    const src = await readFile(path.join(process.cwd(), "src/lib/compose.ts"), "utf8");
    expect(src).not.toMatch(/海报角括号/);
    expect(src).toMatch(/place === "left"/);
    expect(src).toMatch(/height - bandH/);
  });
});

describe("chat image extract", () => {
  it("reads an image_url part from a chat completion", () => {
    const url = extractChatImage({
      choices: [
        {
          message: {
            content: [{ type: "image_url", image_url: { url: "data:image/png;base64,AAA" } }],
          },
        },
      ],
    });
    expect(url).toBe("data:image/png;base64,AAA");
  });

  it("falls back to data.b64_json", () => {
    const url = extractChatImage({
      data: [{ b64_json: "BBB", mime_type: "image/jpeg" }],
    });
    expect(url).toBe("data:image/jpeg;base64,BBB");
  });
});
