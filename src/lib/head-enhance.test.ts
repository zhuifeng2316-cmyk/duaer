import { describe, expect, it } from "vitest";
import { HEAD_UPSCALE_FILTER } from "./head-crop";

describe("head enhance", () => {
  it("retouches the original crop instead of redrawing a face", () => {
    expect(HEAD_UPSCALE_FILTER).toMatch(/lanczos/);
    expect(HEAD_UPSCALE_FILTER).toMatch(/cas=strength=0\.28/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/unsharp/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/contrast/);
    expect(HEAD_UPSCALE_FILTER).not.toMatch(/生成|换脸|重绘/);
  });
});
