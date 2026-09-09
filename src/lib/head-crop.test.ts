import { describe, expect, it } from "vitest";
import {
  DEFAULT_HEAD_BOX,
  HEAD_DETECT_PROMPT,
  HEAD_UPSCALE_FILTER,
  clampHeadBox,
  dedupeHeadBoxes,
  padHeadBox,
  parseHeadBox,
  parseHeadBoxes,
} from "./head-crop";

describe("head crop box", () => {
  it("asks for every head and ignores clothes", () => {
    expect(HEAD_DETECT_PROMPT).toMatch(/每一颗人的头/);
    expect(HEAD_DETECT_PROMPT).toMatch(/不要只框五官/);
    expect(HEAD_DETECT_PROMPT).toMatch(/不要切成脸的一角/);
    expect(HEAD_DETECT_PROMPT).toMatch(/heads/);
  });

  it("pads a tight face box so hair is not clipped", () => {
    const padded = padHeadBox({ x: 40, y: 20, w: 20, h: 20 }, 0.2);
    expect(padded.x).toBeLessThan(40);
    expect(padded.y).toBeLessThan(20);
    expect(padded.w).toBeGreaterThan(20);
    expect(padded.h).toBeGreaterThan(20);
  });

  it("clamps an oversized box to the frame", () => {
    expect(clampHeadBox({ x: -10, y: 5, w: 200, h: 10 })).toEqual({
      x: 0,
      y: 5,
      w: 100,
      h: 20,
    });
  });

  it("parses one or many heads", () => {
    expect(parseHeadBox('{"x":20,"y":8,"w":55,"h":40}')).toEqual({ x: 20, y: 8, w: 55, h: 40 });
    expect(parseHeadBoxes('{"heads":[{"x":5,"y":10,"w":30,"h":35},{"x":50,"y":12,"w":28,"h":36}]}')).toEqual([
      { x: 5, y: 10, w: 30, h: 35 },
      { x: 50, y: 12, w: 28, h: 36 },
    ]);
    expect(parseHeadBoxes("not-json")).toEqual([DEFAULT_HEAD_BOX]);
  });

  it("enlarges the crop without stacking sharpen", () => {
    expect(HEAD_UPSCALE_FILTER).toMatch(/lanczos/);
    expect(HEAD_UPSCALE_FILTER).toMatch(/cas=strength=0\.28/);
    expect(HEAD_UPSCALE_FILTER).toMatch(/iw\*3/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/unsharp/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/iw\*2/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/contrast/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/生成|换脸/);
  });

  it("drops overlapping duplicate boxes", () => {
    const kept = dedupeHeadBoxes([
      { x: 10, y: 10, w: 40, h: 40 },
      { x: 12, y: 12, w: 38, h: 38 },
    ]);
    expect(kept).toHaveLength(1);
  });
});
