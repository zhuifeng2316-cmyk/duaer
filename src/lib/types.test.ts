import { describe, expect, it } from "vitest";
import { publicTalkCard, type Project } from "./types";

const sample: Project = {
  id: "talk-1",
  createdAt: "2026-09-09T00:00:00.000Z",
  idea: "用照片讲一个产品",
  look: "",
  targetDurationSec: 15,
  aspect: "9:16",
  photos: ["photos/photo-01.jpg"],
  characterIds: [],
  voiceId: null,
  voicePath: null,
  stills: ["stills/shot-1.png"],
  htmlPath: null,
  script: null,
  draftText: "",
  stillRev: 3,
  regenShotIndex: null,
  status: "running",
  phase: "copy",
  progress: 42,
  message: "正在写口播文案…",
  error: null,
  musicError: null,
  speechError: null,
  finalPath: null,
};

describe("publicTalkCard", () => {
  it("exposes progress for the talks list", () => {
    const card = publicTalkCard(sample);
    expect(card.id).toBe("talk-1");
    expect(card.idea).toBe("用照片讲一个产品");
    expect(card.progress).toBe(42);
    expect(card.message).toBe("正在写口播文案…");
    expect(card.thumbUrl).toContain("stills%2Fshot-1.png");
    expect(card.thumbUrl).toContain("v=3");
  });
});
