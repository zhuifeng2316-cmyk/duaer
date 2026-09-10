import { describe, expect, it } from "vitest";
import { captionFilter } from "./compose";
import { MOCK_SCRIPT } from "./copy";

describe("captions", () => {
  it("includes hook and on-screen text", () => {
    const vf = captionFilter(MOCK_SCRIPT, "9:16");
    expect(vf).toContain("drawtext");
    expect(vf).toContain("pad=1440:2560");
    expect(vf).toMatch(/还在自己拍口播/);
  });
});
