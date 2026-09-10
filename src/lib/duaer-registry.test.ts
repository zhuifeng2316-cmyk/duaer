import { access, rm } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { MOCK_SCRIPT } from "./copy";
import { graphicAssetRel, houseCatalog, houseItem, housePromptLine, writeHouseGraphicPlaceholders } from "./duaer-registry";
import { planHouseGraphics } from "./hf-pick";
import { createProject, projectDir, projectFile } from "./store";

describe("house registry", () => {
  const ids: string[] = [];
  afterEach(async () => {
    for (const id of ids.splice(0)) {
      await rm(projectDir(id), { recursive: true, force: true });
    }
  });

  it("keeps Chinese labels and no English wrap names in the board prompt", () => {
    expect(houseCatalog().some((it) => it.wraps === "pull-to-refresh" && it.label === "下拉刷新")).toBe(true);
    expect(houseItem("carousel-circle-1")?.imageSlots.map((s) => s.id)).toEqual(["image1", "image2", "image3"]);
    expect(houseItem("carousel-circle-1")?.imageSlots.every((s) => /电影大片/.test(s.hint) && !/干净/.test(s.hint))).toBe(true);
    expect(houseItem("carousel-circle-1")?.host).toBe(true);
    expect(houseItem("marker-checklist-card")?.host).toBe(true);
    expect(houseItem("pull-to-refresh")?.host).toBe(false);
    const product = housePromptLine("product", undefined, "portrait");
    expect(product).toMatch(/下拉刷新/);
    expect(product).toMatch(/轮播/);
    expect(product).toMatch(/只出组件/);
    expect(product).toMatch(/电影大片/);
    expect(housePromptLine("product", undefined, "landscape")).toMatch(/轮播/);
    expect(product).not.toMatch(/pull-to-refresh|carousel-circle|notification-stack/);
    expect(housePromptLine("story")).toMatch(/砸字/);
    expect(housePromptLine("story")).not.toMatch(/下拉刷新/);
    const knowledge = housePromptLine("knowledge");
    expect(knowledge).toMatch(/划重点/);
    expect(knowledge).toMatch(/流程图/);
    expect(housePromptLine("knowledge", undefined, "portrait")).toMatch(/竖屏不要用图表/);
    expect(knowledge).toMatch(/人还在，总题留下/);
    const listed = knowledge.split("只从这些中文动作里选或空着：")[1]?.split("。")[0] || "";
    expect(listed.split("、").length).toBeLessThanOrEqual(12);
    expect(knowledge).not.toMatch(/果味金额|美国地图|对话露出/);
  });

  it("mentions ready component pictures when slots are already planned", () => {
    const script = planHouseGraphics(
      {
        ...MOCK_SCRIPT,
        visualMode: "product",
        shots: [
          {
            ...MOCK_SCRIPT.shots[0]!,
            graphicIntent: "轮播",
            onScreenText: "界面轮播",
            voiceover: "三张产品界面轮播给你看",
          },
          ...MOCK_SCRIPT.shots.slice(1),
        ],
      },
      "16:9",
    );
    expect(script.shots[0]?.graphicAssets?.image1).toBe(graphicAssetRel("carousel-circle-1", "image1"));
    expect(housePromptLine("product", script)).toMatch(/组件用图已经备好/);
  });

  it("does not pin a product gesture onto a story board", () => {
    const next = planHouseGraphics({ ...MOCK_SCRIPT, visualMode: "story" });
    expect(next.shots.every((s) => !s.overlay && !s.block && !s.graphicAssets)).toBe(true);
  });

  it("writes placeholders only for house image slots", async () => {
    const project = await createProject({ idea: "产品轮播", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(project.id);
    const script = {
      ...MOCK_SCRIPT,
      visualMode: "product" as const,
      shots: [
        {
          ...MOCK_SCRIPT.shots[0]!,
          overlay: undefined,
          block: "carousel-circle-1",
          graphicIntent: "轮播",
          graphicAssets: {
            image1: graphicAssetRel("carousel-circle-1", "image1"),
            image2: graphicAssetRel("carousel-circle-1", "image2"),
            image3: graphicAssetRel("carousel-circle-1", "image3"),
          },
        },
        { ...MOCK_SCRIPT.shots[1]!, overlay: "pull-to-refresh", graphicIntent: "下拉刷新" },
      ],
    };
    process.env.FLOW_MOCK = "1";
    await writeHouseGraphicPlaceholders(project.id, script);
    await access(projectFile(project.id, "graphics/carousel-circle-1-image1.png"));
    await access(projectFile(project.id, "graphics/carousel-circle-1-image2.png"));
    await access(projectFile(project.id, "graphics/carousel-circle-1-image3.png"));
    await expect(access(projectFile(project.id, "graphics/pull-to-refresh-image1.png"))).rejects.toThrow();
  });
});
