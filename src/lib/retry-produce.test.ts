import { describe, expect, it } from "vitest";
import { retryProduceKind } from "./retry-produce";
import type { Project, Script, Shot } from "./types";

const shot = (extra: Partial<Shot> = {}): Shot => ({
  scene: "",
  imagePrompt: "",
  onScreenText: "钩子",
  voiceover: "先讲一句",
  durationSec: 3,
  motion: "push-in",
  kind: "close",
  layout: "hero",
  stillRefs: [],
  ...extra,
});

const base: Pick<Project, "script" | "stills" | "htmlPath"> = {
  script: null,
  stills: [],
  htmlPath: null,
};

describe("retryProduceKind", () => {
  it("rewrites copy when nothing is on disk yet", () => {
    expect(retryProduceKind(base)).toBe("copy");
  });

  it("writes the board when copy shots exist without picture plans", () => {
    const script: Script = { hook: "钩", cta: "去", musicPrompt: "pad", visualMode: "knowledge", shots: [shot()] };
    expect(retryProduceKind({ ...base, script })).toBe("board");
  });

  it("renders stills when the board is already written", () => {
    const script: Script = {
      hook: "钩",
      cta: "去",
      musicPrompt: "pad",
      visualMode: "knowledge",
      shots: [shot({ scene: "窗边", imagePrompt: "窗边侧光" })],
    };
    expect(retryProduceKind({ ...base, script })).toBe("images");
  });

  it("continues from speech when pictures are ready", () => {
    const script: Script = {
      hook: "钩",
      cta: "去",
      musicPrompt: "pad",
      visualMode: "knowledge",
      shots: [shot({ scene: "窗边", imagePrompt: "窗边侧光" })],
    };
    expect(retryProduceKind({ script, stills: ["stills/shot-1.png"], htmlPath: null })).toBe("speech");
  });

  it("reuses the composition when the html draft exists", () => {
    const script: Script = {
      hook: "钩",
      cta: "去",
      musicPrompt: "pad",
      visualMode: "knowledge",
      shots: [shot({ scene: "窗边", imagePrompt: "窗边侧光" })],
    };
    expect(retryProduceKind({ script, stills: ["stills/shot-1.png"], htmlPath: "compose/index.html" })).toBe("assemble");
  });
});
