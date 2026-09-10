import { describe, expect, it } from "vitest";
import { alignShotMotions, parseLetteringMode, parseVoiceRole, recipeAllowsLabel, recipeIntentLabels, skillRecipe } from "./skill-recipes";

describe("skill recipes", () => {
  it("keeps 8–12 Chinese board intents per mode and no English skill names", () => {
    for (const mode of ["story", "knowledge", "product"] as const) {
      const labels = recipeIntentLabels(mode);
      expect(labels.length).toBeGreaterThanOrEqual(8);
      expect(labels.length).toBeLessThanOrEqual(12);
      expect(labels.join("")).not.toMatch(/[A-Za-z]/);
      const blob = JSON.stringify(skillRecipe(mode));
      expect(blob).not.toMatch(/faceless-explainer|talking-head-recut|hyperframes|HeyGen/i);
    }
    expect(recipeIntentLabels("knowledge")).toEqual(expect.arrayContaining(["划重点", "流程图"]));
    expect(recipeIntentLabels("product")).toEqual(expect.arrayContaining(["轮播", "下拉刷新"]));
    expect(recipeIntentLabels("story")).toEqual(expect.arrayContaining(["砸字"]));
    expect(recipeAllowsLabel("knowledge", "流程图")).toBe(true);
    expect(recipeAllowsLabel("knowledge", "下拉刷新")).toBe(false);
    expect(skillRecipe("knowledge").boardDirector.join("")).toMatch(/先定全片|划重点叠在人身上/);
    expect(skillRecipe("knowledge").intentLooks.some((row) => row.label === "图表" && /竖屏不要用/.test(row.look))).toBe(true);
    expect(parseLetteringMode("成片砸字")).toBe("overlay-slam");
    expect(parseLetteringMode("成片划重点")).toBe("overlay-highlight");
    expect(parseVoiceRole("开口砸", 2, 5)).toBe("hook");
  });

  it("turns opposing pans onto the same current", () => {
    const shots = alignShotMotions([{ motion: "pan-left" as const }, { motion: "pan-right" as const }, { motion: "punch" as const }]);
    expect(shots.map((s) => s.motion)).toEqual(["pan-left", "pan-left", "punch"]);
    const zoom = alignShotMotions([{ motion: "push-in" as const }, { motion: "pull-out" as const }]);
    expect(zoom.map((s) => s.motion)).toEqual(["push-in", "push-in"]);
  });
});
