import { describe, expect, it } from "vitest";
import { parseDurationSec, planBoard } from "./board";

describe("planBoard", () => {
  it("treats duration as a budget, not a fixed shot grid", () => {
    expect(planBoard(15)).toEqual({ durationSec: 15, minCount: 2, maxCount: 6 });
    expect(planBoard(30).maxCount).toBeGreaterThanOrEqual(8);
    expect(planBoard(8).minCount).toBe(2);
    expect(planBoard(60).maxCount).toBe(12);
  });

  it("clamps duration", () => {
    expect(parseDurationSec("3")).toBe(8);
    expect(parseDurationSec("90")).toBe(60);
    expect(parseDurationSec("")).toBe(15);
  });
});
