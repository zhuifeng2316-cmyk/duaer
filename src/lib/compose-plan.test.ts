import { describe, expect, it } from "vitest";
import {
  COMPOSE_LAYOUT_LABEL,
  defaultStillRefs,
  inferComposeLayout,
  inferStillKind,
  parseComposeLayout,
  parseStillKind,
  parseStillRefs,
} from "./compose-plan";

describe("compose plan", () => {
  it("reads kind and layout from english or chinese", () => {
    expect(parseStillKind("close")).toBe("close");
    expect(parseStillKind("面部特写")).toBe("close");
    expect(parseStillKind("空镜天空")).toBe("empty");
    expect(parseComposeLayout("under-text")).toBe("under-text");
    expect(parseComposeLayout("字压图")).toBe("under-text");
    expect(parseComposeLayout("对切")).toBe("split");
    expect(COMPOSE_LAYOUT_LABEL.split).toBe("对切");
  });

  it("treats stillRefs as 1-based shot numbers", () => {
    expect(parseStillRefs([1, 3], 1, 5)).toEqual([0, 2]);
    expect(parseStillRefs(["2"], 0, 5)).toEqual([1]);
    expect(parseStillRefs([2], 1, 5)).toEqual([]);
  });

  it("infers a reusable library instead of one template", () => {
    expect(inferStillKind("窗边特写", "正面近景")).toBe("close");
    expect(inferComposeLayout("empty", "push-in", 4, 5)).toBe("under-text");
    expect(defaultStillRefs("reuse", 3, 5)).toEqual([2]);
    expect(defaultStillRefs("split", 2, 5)).toEqual([1]);
  });
});
