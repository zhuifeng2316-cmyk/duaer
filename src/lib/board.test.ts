import { describe, expect, it } from "vitest";
import { parseDurationSec, planBoard } from "./board";

describe("planBoard", () => {
  it("maps video length to shot count", () => {
    expect(planBoard(15)).toEqual({ durationSec: 15, count: 5, each: 3 });
    expect(planBoard(30).count).toBe(10);
    expect(planBoard(8).count).toBe(3);
    expect(planBoard(60).count).toBe(12);
  });

  it("clamps duration", () => {
    expect(parseDurationSec("3")).toBe(8);
    expect(parseDurationSec("90")).toBe(60);
    expect(parseDurationSec("")).toBe(15);
  });
});
