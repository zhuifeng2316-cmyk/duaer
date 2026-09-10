import { describe, expect, it } from "vitest";
import { CAPTION_STYLES } from "./caption-styles";
import { getTalkChatModel } from "./flow/config";
import {
  buildTalkAssistSystem,
  captionCatalogForPrompt,
  extractCaptionRecommendations,
  mockTalkAssistReply,
  sectionShotIndex,
} from "./talk-assist";
import type { Project } from "./types";

const sample = {
  id: "p1",
  idea: "人到中年放过自己",
  topic: "人到中年",
  script: {
    hook: "人到中年，别再为难自己。",
    cta: "今晚照顾好自己",
    musicPrompt: "",
    shots: [
      {
        scene: "窗边",
        imagePrompt: "",
        onScreenText: "人到中年放过自己",
        voiceover: "人到中年，别再为难自己。",
        durationSec: 3,
        motion: "punch",
        kind: "wide",
        layout: "hero",
        stillRefs: [],
      },
      {
        scene: "餐桌",
        imagePrompt: "",
        onScreenText: "平安就是福气",
        voiceover: "平安就是福气",
        durationSec: 3,
        motion: "push",
        kind: "close",
        layout: "hero",
        stillRefs: [],
      },
      {
        scene: "床沿",
        imagePrompt: "",
        onScreenText: "先照顾好自己",
        voiceover: "先照顾好自己",
        durationSec: 3,
        motion: "hold",
        kind: "close",
        layout: "hero",
        stillRefs: [],
      },
    ],
  },
} as unknown as Project;

describe("talk assist", () => {
  it("defaults the talk chat model to deepseek-chat", () => {
    expect(getTalkChatModel()).toMatch(/deepseek-chat|deepseek/i);
    expect(process.env.TALK_CHAT_MODEL || "deepseek-chat").toBeTruthy();
  });

  it("puts every caption label into the system catalog", () => {
    const catalog = captionCatalogForPrompt();
    expect(catalog).toMatch(/口播字/);
    expect(catalog).toMatch(/更多字/);
    expect(catalog).toMatch(/- 砸字/);
    expect(catalog).toMatch(/- 打乱露出/);
    for (const row of CAPTION_STYLES) {
      expect(catalog).toContain(`- ${row.label}`);
    }
    const system = buildTalkAssistSystem(sample);
    expect(system).toMatch(/人到中年/);
    expect(system).toContain(catalog);
    expect(system).toMatch(/钩子 \/ 中段 \/ 收尾/);
    expect(system).not.toMatch(/DeepSeek|GPT|方舟|HyperFrames/i);
  });

  it("mocks caption recommendations with real catalog names and shot context", () => {
    const reply = mockTalkAssistReply("有哪些字幕推荐？");
    expect(reply).toMatch(/砸字/);
    expect(reply).toMatch(/霓虹字/);
    expect(reply).toMatch(/钩子/);
    const recs = extractCaptionRecommendations(reply, 3);
    expect(recs.map((r) => r.label)).toEqual(expect.arrayContaining(["砸字", "霓虹字", "划重点"]));
    expect(recs.every((r) => CAPTION_STYLES.some((row) => row.id === r.id))).toBe(true);
    const slam = recs.find((r) => r.label === "砸字");
    expect(slam?.shotIndex).toBe(0);
    expect(slam?.section).toBe("hook");
    const highlight = recs.find((r) => r.label === "划重点");
    expect(highlight?.section).toBe("mid");
    expect(highlight?.shotIndex).toBe(sectionShotIndex("mid", 3));
  });
});
