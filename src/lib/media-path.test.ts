import { describe, expect, it } from "vitest";
import { safeMediaPath } from "./media-path";

describe("safeMediaPath", () => {
  it("allows stills and rejects traversal", () => {
    expect(safeMediaPath("abc", "stills/shot-1.png")).toMatch(/shot-1\.png$/);
    expect(safeMediaPath("abc", "../etc/passwd")).toBeNull();
    expect(safeMediaPath("abc", "..\\secrets")).toBeNull();
  });
});
