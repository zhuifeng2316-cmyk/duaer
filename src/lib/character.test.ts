import { describe, expect, it } from "vitest";
import { isDefaultFaceLabel, parseCharacterName, parseFaceLabel } from "./character";

describe("character names", () => {
  it("trims and caps names at 16 characters", () => {
    expect(parseCharacterName("  阿宁  ")).toBe("阿宁");
    expect(parseCharacterName("一二三四五六七八九十一二三四五六七")).toHaveLength(16);
    expect(parseCharacterName("   ")).toBe("人物");
    expect(parseCharacterName("", "头像 1")).toBe("头像 1");
  });

  it("keeps the current face label when the new name is blank", () => {
    expect(parseFaceLabel("  ", "头像 1")).toBe("头像 1");
    expect(parseFaceLabel("阿宁", "头像 1")).toBe("阿宁");
  });

  it("treats 头像 N as an unnamed default", () => {
    expect(isDefaultFaceLabel("头像 1")).toBe(true);
    expect(isDefaultFaceLabel("阿宁")).toBe(false);
  });
});
