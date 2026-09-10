import { describe, expect, it } from "vitest";
import { publicProject, publicTalkCard, talkWallCards, type Project } from "./types";

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
  composeError: null,
  finalPath: null,
  coverPath: null,
    coverRev: 0,
    coverTemplate: "titlecard-lockup",
    captionStyle: "",
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

  it("defaults missing quality to 2K", () => {
    expect(publicProject(sample).quality).toBe("2K");
    expect(publicProject({ ...sample, quality: "4K" }).quality).toBe("4K");
  });

  it("prefers the cover as the list thumb", () => {
    const card = publicTalkCard({ ...sample, coverPath: "cover.png", coverRev: 2 });
    expect(card.coverUrl).toContain("cover.png");
    expect(card.thumbUrl).toContain("cover.png");
    expect(card.thumbUrl).toContain("v=2");
    expect(card.thumbUrl).not.toContain("shot-1");
  });

  it("only puts ready talks with a picture on the wall", () => {
    const ready = { ...sample, status: "ready" as const, finalPath: "final.mp4", coverPath: "cover.png" };
    expect(talkWallCards([sample, ready]).map((c) => c.id)).toEqual(["talk-1"]);
    expect(talkWallCards([{ ...sample, status: "ready", finalPath: null, coverPath: null, stills: [] }])).toEqual([]);
  });
});
