import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT } from "./copy";
import {
  applyShotGraphic,
  graphicIsHost,
  graphicKnobs,
  graphicSlots,
  shotNeedsPersonStill,
  talkPicturesReady,
} from "./graphic-board";

describe("graphic board", () => {
  it("treats carousel as a host and pull-to-refresh as an overlay", () => {
    expect(graphicIsHost("carousel-circle-1")).toBe(true);
    expect(graphicIsHost("app-showcase")).toBe(true);
    expect(graphicIsHost("pull-to-refresh")).toBe(false);
    expect(graphicIsHost("notification-stack")).toBe(false);
  });

  it("skips person stills on host shots unless the wall turns them on", () => {
    expect(shotNeedsPersonStill({ block: "carousel-circle-1" })).toBe(false);
    expect(shotNeedsPersonStill({ block: "carousel-circle-1", hostStill: true })).toBe(true);
    expect(shotNeedsPersonStill({ overlay: "pull-to-refresh" })).toBe(true);
    expect(shotNeedsPersonStill({ overlay: "pull-to-refresh", hostStill: false })).toBe(false);
    expect(shotNeedsPersonStill({ scene: "窗边" } as never)).toBe(true);
  });

  it("lets a talk confirm when host shots have no clone still", () => {
    const script = {
      ...MOCK_SCRIPT,
      shots: [
        { ...MOCK_SCRIPT.shots[0]!, block: "carousel-circle-1", hostStill: false },
        { ...MOCK_SCRIPT.shots[1]!, overlay: "pull-to-refresh" },
      ],
    };
    expect(talkPicturesReady({ script, stills: ["", "stills/shot-2.png"] })).toBe(true);
    expect(talkPicturesReady({ script, stills: ["", ""] })).toBe(false);
  });

  it("shows chinese knobs and carousel slots", () => {
    expect(graphicKnobs("pull-to-refresh").map((k) => k.label)).toEqual(["下拉距离", "加载样式"]);
    expect(graphicSlots("carousel-circle-1").map((s) => s.label)).toEqual(["第一屏", "第二屏", "第三屏"]);
  });

  it("writes hostStill and clamped knob values", () => {
    const script = {
      ...MOCK_SCRIPT,
      shots: [{ ...MOCK_SCRIPT.shots[0]!, overlay: "pull-to-refresh", graphicVars: { pullDistance: 120, spinnerStyle: "ring" } }],
    };
    const next = applyShotGraphic(script, 0, { hostStill: false, graphicVars: { pullDistance: 300, spinnerStyle: "dots" } });
    expect(next.shots[0]?.hostStill).toBe(false);
    expect(next.shots[0]?.graphicVars?.pullDistance).toBe(220);
    expect(next.shots[0]?.graphicVars?.spinnerStyle).toBe("dots");
  });
});
