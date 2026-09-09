import { describe, expect, it } from "vitest";
import { motionFilter, parseAspect, parseMotion } from "./aspect";

describe("aspect", () => {
  it("defaults unknown aspect to 9:16", () => {
    expect(parseAspect("")).toBe("9:16");
    expect(parseAspect("4:3")).toBe("9:16");
    expect(parseAspect("1:1")).toBe("1:1");
  });

  it("defaults unknown motion to push-in", () => {
    expect(parseMotion("zoom")).toBe("push-in");
    expect(parseMotion("punch")).toBe("punch");
  });

  it("builds a sized zoompan filter", () => {
    const vf = motionFilter("pan-left", "9:16", 3);
    expect(vf).toContain("s=1080x1920");
    expect(vf).toContain("zoompan");
    expect(motionFilter("punch", "1:1", 2)).toContain("s=1080x1080");
    expect(motionFilter("push-in", "16:9", 2)).toContain("s=1920x1080");
  });
});
