import { existsSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { CINEMA_GRAPHIC_LOCK, CINEMA_GRAPHIC_TOKENS, cinemaMountVars, needsCinemaHostGrade } from "./cinema";
import { MOCK_SCRIPT } from "./copy";
import { houseCatalog } from "./duaer-registry";
import { graphicSlots } from "./graphic-board";
import {
  captionGraphicCarriesTalkCopy,
  fallbackCinemaHtml,
  graphicHoldsLettering,
  isCaptionGraphic,
  buildEditList,
} from "./html-compose";
import { fillRegistryVars, pickGraphicForShot, readRegistryVariables, registryFileExists } from "./hf-pick";
import { graphicLabel, HOUSE_REGISTRY_ROOT, registryRel } from "./hf-registry";
import { HOUSE_DEMO_ENGLISH, needsRegistryCopySkin, skinRegistryHtml, visibleRegistryCopy } from "./registry-skin";
import type { Aspect } from "./aspect";

const SHOT = {
  onScreenText: "屏幕大字",
  voiceover: "这一镜口播在讲什么",
  graphicIntent: "测试动作",
};

const LAB = HOUSE_REGISTRY_ROOT;

function houseHtml(name: string): string {
  const rel = registryRel(name);
  expect(rel, name).toBeTruthy();
  const abs = path.join(LAB, rel!);
  expect(existsSync(abs), name).toBe(true);
  return readFileSync(abs, "utf8");
}

function aspectForFits(fits: string[]): Aspect {
  if (fits.includes("landscape")) return "16:9";
  if (fits.includes("square")) return "1:1";
  return "9:16";
}

function mountHtml(wraps: string, host: boolean | undefined, vars?: Record<string, string | number>): string {
  const list = buildEditList({
    script: MOCK_SCRIPT,
    stillRels: MOCK_SCRIPT.shots.map((_, i) => `stills/shot-${i + 1}.png`),
    aspect: "9:16",
  });
  return fallbackCinemaHtml({
    ...list,
    clips: list.clips.map((c, i) =>
      i === 0
        ? {
            ...c,
            block: host ? wraps : undefined,
            overlay: host ? undefined : wraps,
            graphicVars: vars,
          }
        : c,
    ),
  });
}

describe("house components meet cinema grade", () => {
  const house = houseCatalog();

  it("locks the full house catalog so a new wrap cannot skip cinema checks", () => {
    expect(house.length).toBeGreaterThanOrEqual(390);
    expect(new Set(house.map((h) => h.wraps)).size).toBe(house.length);
    expect(new Set(house.map((h) => h.label)).size).toBe(house.length);
    expect(house.some((h) => h.wraps === "pull-to-refresh")).toBe(true);
    expect(house.some((h) => h.wraps === "typewriter")).toBe(true);
    expect(house.some((h) => h.wraps === "lt-neon-border")).toBe(false);
  });

  it("gives every house item a Chinese label, file, modes, and cinema slot hints", () => {
    for (const item of house) {
      expect(graphicLabel(item.wraps), item.wraps).toBe(item.label);
      expect(item.label, item.wraps).not.toMatch(/[A-Za-z]{3,}/);
      expect(registryFileExists(item.wraps), item.wraps).toBe(true);
      expect(item.modes.length, item.wraps).toBeGreaterThan(0);
      expect(item.aliases.length, item.wraps).toBeGreaterThan(0);
      for (const slot of graphicSlots(item.wraps)) {
        expect(slot.hint, `${item.wraps}.${slot.id}`).toMatch(/电影大片/);
      }
    }
    expect(CINEMA_GRAPHIC_LOCK).toMatch(/电影大片/);
  });

  it("picks every house item from its Chinese label and first alias", () => {
    const misses: string[] = [];
    for (const item of house) {
      const mode = item.modes[0]!;
      const aspect = aspectForFits(item.fits);
      for (const intent of [item.label, item.aliases[0]!]) {
        const picked = pickGraphicForShot({ ...MOCK_SCRIPT.shots[0]!, graphicIntent: intent }, mode, [], aspect);
        if (picked?.name !== item.wraps) misses.push(`${intent} (${mode}) → ${picked?.name || "NONE"}`);
      }
    }
    expect(misses, misses.join("\n")).toEqual([]);
  });

  it("fills vars with cinema colors and Chinese talk copy, never vendor English", () => {
    for (const item of house) {
      const defs = readRegistryVariables(item.wraps);
      const vars = fillRegistryVars(defs, SHOT);
      expect(JSON.stringify(vars), item.wraps).not.toMatch(/hyperframes|heygen|launch-cut/i);
      for (const def of defs) {
        if (def.type !== "color") continue;
        const value = String(vars[def.id] || "").toLowerCase();
        expect(
          Object.values(CINEMA_GRAPHIC_TOKENS).some((token) => token === value),
          `${item.wraps}.${def.id}=${value}`,
        ).toBe(true);
      }
      if (vars.click_label) expect(String(vars.click_label), item.wraps).toBe(SHOT.onScreenText);
      if (vars.titles) expect(String(vars.titles), item.wraps).toBe(SHOT.onScreenText);
    }
  });

  it("mounts cinema chrome; skips empty caption demos; grades light hosts", () => {
    const tokens = cinemaMountVars();
    expect(tokens).toContain(`--background:${CINEMA_GRAPHIC_TOKENS.bg}`);
    expect(tokens).toContain(`--accent:${CINEMA_GRAPHIC_TOKENS.accent}`);
    for (const item of house) {
      const html = mountHtml(item.wraps, item.host);
      expect(html).toMatch(/--accent:\s*#d4a05a/);
      expect(html).toMatch(/--brand:\s*#e8c56a/);
      expect(html).toMatch(/--background:\s*#0c0a08/);
      const captionEmpty = isCaptionGraphic(item.wraps) && !captionGraphicCarriesTalkCopy(item.wraps);
      if (captionEmpty) {
        expect(html, item.wraps).not.toContain(`data-registry="${item.wraps}"`);
        continue;
      }
      expect(html, item.wraps).toContain(`data-registry="${item.wraps}"`);
      if (needsCinemaHostGrade(item.wraps)) {
        expect(html, item.wraps).toMatch(new RegExp(`class="[^"]*registry-grade[^"]*"[^>]*data-registry="${item.wraps}"`));
      }
      if (needsRegistryCopySkin(item.wraps)) {
        expect(html, item.wraps).toContain(`data-composition-src="compositions/${item.wraps}--shot-1.html"`);
      }
    }
  });

  it("does not stack talk lettering on components that already show copy", () => {
    const named = [
      "notification-stack",
      "native-notification-pop",
      "data-chart",
      "flowchart-vertical",
      "pull-to-refresh",
      "app-showcase",
      "code-terminal-run",
      "hw-pipeline",
      "count-up",
      "carousel-circle-1",
      "marker-checklist-card",
    ];
    for (const name of named) {
      expect(graphicHoldsLettering(name), name).toBe(true);
    }
    expect(graphicHoldsLettering("caption-kinetic-slam")).toBe(false);
    expect(graphicHoldsLettering("typewriter", { text: "屏幕大字" })).toBe(true);
  });

  it("bakes cinema Chinese into house files and leaves official sources alone", () => {
    const chart = houseHtml("data-chart");
    expect(visibleRegistryCopy(chart)).not.toMatch(HOUSE_DEMO_ENGLISH);
    expect(chart).toContain("这一组");
    expect(chart.toLowerCase()).not.toContain("#faf9f6");

    const flow = houseHtml("flowchart-vertical");
    expect(visibleRegistryCopy(flow)).not.toMatch(HOUSE_DEMO_ENGLISH);
    expect(flow).toContain("这一组");

    const ptr = houseHtml("pull-to-refresh");
    expect(visibleRegistryCopy(ptr)).not.toMatch(HOUSE_DEMO_ENGLISH);
    expect(ptr).toContain("下拉刷新");
    expect(ptr.toLowerCase()).not.toContain("#35d6a0");

    const app = houseHtml("app-showcase");
    expect(visibleRegistryCopy(app)).not.toMatch(HOUSE_DEMO_ENGLISH);
    expect(app).toContain("开始");
    expect(app.toLowerCase()).not.toContain("#e4fa72");
    expect(app.toLowerCase()).not.toContain("#f1f2ec");
    expect(app.toLowerCase()).not.toContain("#e8ecda");
    expect(app).toContain(CINEMA_GRAPHIC_TOKENS.bg);

    const pipe = houseHtml("hw-pipeline");
    expect(pipe).toContain("这一组");
    expect(pipe).not.toContain('"Idea"');

    const title = houseHtml("hw-title");
    expect(title).toContain("这一组");
    expect(title).not.toContain("shine like the star");

    const term = houseHtml("code-terminal-run");
    expect(term).toContain("出片");
    expect(term).not.toContain("run build");

    const carousel = houseHtml("carousel-circle-1");
    expect(carousel.toLowerCase()).not.toContain("#ededef");
    expect(carousel.toLowerCase()).toContain(CINEMA_GRAPHIC_TOKENS.bg);

    const checklist = houseHtml("marker-checklist-card");
    expect(visibleRegistryCopy(checklist)).not.toMatch(HOUSE_DEMO_ENGLISH);
    expect(checklist).toContain("这一组");
    expect(checklist).toContain("算过");
    expect(checklist).not.toContain("THE POWER");
    expect(checklist).not.toContain("IN 4K");

    const skinned = skinRegistryHtml("data-chart", chart, { title: "看这组数", line: "前后对比" });
    expect(skinned).toContain("看这组数");
    expect(visibleRegistryCopy(skinned)).not.toMatch(HOUSE_DEMO_ENGLISH);

    expect(needsCinemaHostGrade("app-showcase")).toBe(true);
    expect(needsCinemaHostGrade("carousel-circle-1")).toBe(true);
    expect(needsCinemaHostGrade("data-chart")).toBe(true);
    expect(needsCinemaHostGrade("flowchart-vertical")).toBe(true);

    const official = path.join(process.cwd(), "storage/hyperframes-registry/compositions/data-chart.html");
    if (existsSync(official)) {
      expect(readFileSync(official, "utf8")).toContain("Monthly Revenue");
    }
  });
});
