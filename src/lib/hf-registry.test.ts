import { describe, expect, it } from "vitest";
import {
  inferVisualMode,
  isKnownGraphic,
  parseBlock,
  parseOverlay,
  parseVisualMode,
  registryCatalog,
  registryRel,
  VISUAL_MODE_LABEL,
} from "./hf-registry";

describe("registry visual mode", () => {
  it("infers product, knowledge and story from the idea", () => {
    expect(inferVisualMode("新功能上线提醒怎么做")).toBe("product");
    expect(inferVisualMode("为什么睡眠不够会胖")).toBe("knowledge");
    expect(inferVisualMode("我也要这样活")).toBe("story");
    expect(parseVisualMode("情感口播")).toBe("story");
    expect(parseVisualMode("产品介绍")).toBe("product");
    expect(VISUAL_MODE_LABEL.product).toBe("产品介绍");
    expect(VISUAL_MODE_LABEL.knowledge).toBe("知识输出");
    expect(VISUAL_MODE_LABEL.story).toBe("情感口播");
  });

  it("keeps only allowlisted overlay and block ids", () => {
    expect(parseOverlay("notification-stack", "product")).toBe("notification-stack");
    expect(parseOverlay("notification-stack", "story")).toBeUndefined();
    expect(parseOverlay("not-a-real-widget", "product")).toBeUndefined();
    expect(parseBlock("data-chart", "knowledge")).toBe("data-chart");
    expect(parseBlock("data-chart", "product")).toBeUndefined();
    expect(parseBlock("us-map", "knowledge")).toBe("us-map");
    expect(isKnownGraphic("carousel-circle-1")).toBe(true);
    expect(isKnownGraphic("transitions-other")).toBe(true);
    expect(isKnownGraphic("typewriter")).toBe(true);
    expect(isKnownGraphic("not-a-real-widget")).toBe(false);
  });

  it("indexes only the house library", () => {
    expect(registryCatalog().length).toBeGreaterThanOrEqual(390);
    expect(registryCatalog().some((it) => it.name === "offset-path-traveler")).toBe(true);
    expect(registryCatalog().some((it) => it.name === "notification-stack")).toBe(true);
    const flow = registryCatalog().find((it) => it.name === "flowchart-vertical");
    expect(flow?.width).toBe(1440);
    expect(flow?.height).toBe(2560);
    const pull = registryCatalog().find((it) => it.name === "pull-to-refresh");
    expect(pull?.width).toBeUndefined();
    expect(pull?.height).toBeUndefined();
    expect(registryRel("pull-to-refresh")).toBe("compositions/components/pull-to-refresh.html");
    expect(registryRel("texture-mask-text")).toBeTruthy();
    expect(registryRel("lt-neon-border")).toBeUndefined();
  });
});
