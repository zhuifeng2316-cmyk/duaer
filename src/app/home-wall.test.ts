import { describe, expect, it } from "vitest";
import { aspectWeight, MINE_PAGE, masonryColCount, nextMineCount, packColumns, posterRatio } from "./home-wall";

describe("mine wall paging", () => {
  it("loads another grid page and stops at the end", () => {
    expect(nextMineCount(MINE_PAGE, 26)).toBe(24);
    expect(nextMineCount(24, 26)).toBe(26);
    expect(nextMineCount(26, 26)).toBe(26);
  });

  it("keeps each talk's own aspect for the waterfall", () => {
    expect(posterRatio("9:16")).toBe("9 / 16");
    expect(posterRatio("16:9")).toBe("16 / 9");
    expect(posterRatio("1:1")).toBe("1 / 1");
    expect(posterRatio("")).toBe("3 / 4");
    expect(posterRatio("3:4")).toBe("3 / 4");
  });

  it("drops mixed ratios into the shortest waterfall column", () => {
    const packed = packColumns(
      [
        { id: "wide", aspect: "16:9" },
        { id: "tall", aspect: "9:16" },
        { id: "photo", aspect: "3:4" },
      ],
      2,
      (row) => aspectWeight(row.aspect),
    );
    expect(packed).toEqual([
      [
        { id: "wide", aspect: "16:9" },
        { id: "photo", aspect: "3:4" },
      ],
      [{ id: "tall", aspect: "9:16" }],
    ]);
    expect(aspectWeight("9:16")).toBeCloseTo(16 / 9);
  });

  it("puts the popular wall on three equal-width columns on desktop", () => {
    expect(masonryColCount("wall", 1440)).toBe(3);
    expect(masonryColCount("wall", 800)).toBe(1);
    expect(masonryColCount("mine", 1440)).toBe(3);
  });
});
