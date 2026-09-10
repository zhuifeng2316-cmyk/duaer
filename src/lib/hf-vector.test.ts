import { describe, expect, it } from "vitest";
import { MOCK_SCRIPT } from "./copy";
import { pickGraphicForShot, rankRegistry } from "./hf-pick";
import { officialCatalogRank } from "./hf-semantic";
import { expandZhToEn, vectorScore } from "./hf-vector";

describe("registry vectors", () => {
  it("does not call the English-only official embedder from unit tests", () => {
    expect(officialCatalogRank("pull to refresh")).toBeNull();
  });

  it("expands a Chinese paraphrase into English search words", () => {
    expect(expandZhToEn("列表往下扯一下重新加载")).toMatch(/pull|refresh/);
    expect(expandZhToEn("字突然拍满屏")).toBe("");
    expect(expandZhToEn("我也要这样活")).toBe("");
  });

  it("ranks pull-to-refresh from a paraphrase that is not in the regex table", () => {
    expect(vectorScore("列表往下扯一下重新加载", "pull-to-refresh")).toBeGreaterThan(vectorScore("列表往下扯一下重新加载", "app-showcase"));
    const ranked = rankRegistry("列表往下扯一下重新加载", "product", 5);
    expect(ranked[0]?.name).toBe("pull-to-refresh");
    const picked = pickGraphicForShot({ ...MOCK_SCRIPT.shots[0]!, graphicIntent: "列表往下扯一下重新加载" }, "product");
    expect(picked?.name).toBe("pull-to-refresh");
  });

  it("ranks slam from a spoken paraphrase", () => {
    const picked = pickGraphicForShot({ ...MOCK_SCRIPT.shots[0]!, graphicIntent: "砸大字满屏拍上来" }, "story");
    expect(picked?.name).toBe("caption-kinetic-slam");
  });

  it("does not invent a product graphic from a plain talk line", () => {
    expect(expandZhToEn("我也要这样活")).toBe("");
    expect(pickGraphicForShot({ ...MOCK_SCRIPT.shots[0]!, graphicIntent: "我也要这样活" }, "product")).toBeUndefined();
  });
});
