import { describe, expect, it } from "vitest";
import { HOUSE_DEMO_ENGLISH, needsRegistryCopySkin, skinRegistryHtml, skinnedRegistryHtml } from "./registry-skin";

describe("registry copy skin", () => {
  it("rewrites baked English on chart and flowchart copies", () => {
    expect(needsRegistryCopySkin("data-chart")).toBe(true);
    expect(needsRegistryCopySkin("pull-to-refresh")).toBe(true);
    const chart = skinRegistryHtml(
      "data-chart",
      `<h1 class="headline">Monthly Revenue vs. Conversion Rate</h1>
       <p class="subtitle">Jan–Jun 2024, in thousands</p>
       <span class="key-text">Revenue</span>
       <span class="key-text">Conversion Rate</span>
       <div class="source">Source: Internal analytics</div>`,
      { title: "看这组数", line: "前后对比" },
    );
    expect(chart).toContain("看这组数");
    expect(chart).toContain("前后对比");
    expect(chart).toContain(">收入<");
    expect(chart).toContain(">转化<");
    expect(chart).toContain("本片");
    expect(chart).not.toContain("Monthly Revenue");
    expect(chart).not.toMatch(HOUSE_DEMO_ENGLISH);
    expect(chart).not.toContain("Conversion Rate");
    const flow = skinRegistryHtml(
      "flowchart-vertical",
      `<div>Should I learn to code?</div>
       <div id="node-yes">Yes</div>
       <div id="label-not-sure">Not sure</div>
       <span id="python-text">Start with Pythom</span>
       <div>Try no-code first</div>
       <div>Build a personal website</div>
       <div>Take a free intro course</div>
       <div class="cursor-tag">You</div>`,
      { title: "要不要学", line: "从这一步开始" },
    );
    expect(flow).toContain("要不要学");
    expect(flow).toContain(">是<");
    expect(flow).toContain("不确定");
    expect(flow).toContain("从这一步开始");
    expect(flow).toContain(">你<");
    expect(flow).not.toContain("Should I learn");
    expect(flow).not.toContain("Pythom");
    const aliased = skinnedRegistryHtml("data-chart", `data-composition-id="data-chart"`, "shot-2", {
      title: "数",
      line: "比",
    });
    expect(aliased.id).toBe("data-chart--shot-2");
    expect(aliased.html).toContain('data-composition-id="data-chart--shot-2"');
  });
});
