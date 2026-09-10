import { describe, expect, it } from "vitest";
import { aspectFamily, aspectSize, motionFilter, parseAspect, parseMotion, parseQuality } from "./aspect";

describe("aspect", () => {
  it("defaults unknown aspect to 9:16", () => {
    expect(parseAspect("")).toBe("9:16");
    expect(parseAspect("21:9")).toBe("9:16");
    expect(parseAspect("4:3")).toBe("4:3");
    expect(parseAspect("3:4")).toBe("3:4");
    expect(parseAspect("1:1")).toBe("1:1");
  });

  it("groups talk aspects into portrait square landscape", () => {
    expect(aspectFamily("9:16")).toBe("portrait");
    expect(aspectFamily("3:4")).toBe("portrait");
    expect(aspectFamily("1:1")).toBe("square");
    expect(aspectFamily("4:3")).toBe("landscape");
    expect(aspectFamily("16:9")).toBe("landscape");
  });

  it("defaults unknown motion to push-in", () => {
    expect(parseMotion("zoom")).toBe("push-in");
    expect(parseMotion("punch")).toBe("punch");
  });

  it("defaults unknown quality to 2K", () => {
    expect(parseQuality("")).toBe("2K");
    expect(parseQuality("1080p")).toBe("2K");
    expect(parseQuality("4K")).toBe("4K");
    expect(parseQuality("2K")).toBe("2K");
  });

  it("sizes 2K and 4K to the chosen aspect", () => {
    expect(aspectSize("9:16")).toMatchObject({ width: 1440, height: 2560 });
    expect(aspectSize("9:16", "4K")).toMatchObject({ width: 2160, height: 3840 });
    expect(aspectSize("16:9", "2K")).toMatchObject({ width: 2560, height: 1440 });
    expect(aspectSize("16:9", "4K")).toMatchObject({ width: 3840, height: 2160 });
    expect(aspectSize("3:4", "2K")).toMatchObject({ width: 1536, height: 2048 });
    expect(aspectSize("4:3", "4K")).toMatchObject({ width: 2880, height: 2160 });
  });

  it("builds a sized zoompan filter", () => {
    const vf = motionFilter("pan-left", "9:16", 3);
    expect(vf).toContain("s=1440x2560");
    expect(vf).toContain("zoompan");
    expect(motionFilter("punch", "1:1", 2)).toContain("s=2048x2048");
    expect(motionFilter("push-in", "16:9", 2)).toContain("s=2560x1440");
    expect(motionFilter("push-in", "3:4", 2)).toContain("s=1536x2048");
    expect(motionFilter("push-in", "4:3", 2)).toContain("s=2048x1536");
    expect(motionFilter("push-in", "9:16", 2, "4K")).toContain("s=2160x3840");
  });
});
