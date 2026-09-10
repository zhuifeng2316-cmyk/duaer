import { access, mkdir } from "fs/promises";
import { parseQuality, type Aspect, type AspectFamily, type OutputQuality } from "./aspect";
import { CINEMA_GRAPHIC_LOCK, DEFAULT_CINEMA_LOOK } from "./cinema";
import { makePlaceholderStill } from "./compose";
import house from "./duaer-registry.json";
import { isFlowMock } from "./flow/config";
import { generateFlowImage } from "./flow/image";
import type { VisualMode } from "./hf-registry";
import { skillRecipe } from "./skill-recipes";
import { projectFile } from "./store";
import type { Script } from "./types";

export type HouseSlot = { id: string; hint: string; label?: string };

export type HouseKnob = {
  id: string;
  label: string;
  type: "number" | "enum" | "text";
  min?: number;
  max?: number;
  options?: { value: string; label: string }[];
};

export type HouseItem = {
  wraps: string;
  label: string;
  kind?: "block" | "component";
  host?: boolean;
  modes: VisualMode[];
  fits: AspectFamily[];
  aliases: string[];
  imageSlots: HouseSlot[];
  knobs?: HouseKnob[];
  width?: number;
  height?: number;
  duration?: number;
  tags?: string[];
};

const HOUSE = house as HouseItem[];
const BY_WRAP = new Map(HOUSE.map((it) => [it.wraps, it]));

export function houseCatalog(): HouseItem[] {
  return HOUSE;
}

export function houseItem(wraps: string): HouseItem | undefined {
  return BY_WRAP.get(wraps);
}

export function houseIsAdaptive(_item: HouseItem): boolean {
  return true;
}

export function houseFitsFamily(item: HouseItem, family: AspectFamily): boolean {
  if (houseIsAdaptive(item)) return true;
  return !item.fits?.length || item.fits.includes(family);
}

export function houseFitsPreferred(item: HouseItem, family: AspectFamily): boolean {
  return !item.fits?.length || item.fits.includes(family);
}

export function houseLabels(mode: VisualMode, family?: AspectFamily): string[] {
  return HOUSE.filter((it) => it.modes.includes(mode) && (!family || houseFitsFamily(it, family))).map((it) => it.label);
}

export function houseDocument(item: HouseItem): string {
  return [item.wraps, item.label, item.aliases.join(" "), item.modes.join(" "), (item.fits || []).join(" ")].join(" ");
}

export function graphicAssetRel(wraps: string, slotId: string): string {
  return `graphics/${wraps}-${slotId}.png`;
}

export async function generateGraphicSlotImage(opts: {
  destPath: string;
  hint: string;
  idea: string;
  look?: string;
  aspect: Aspect;
  quality?: OutputQuality;
}): Promise<void> {
  if (isFlowMock()) {
    await makePlaceholderStill(opts.destPath, opts.aspect, "0x243044", parseQuality(opts.quality));
    return;
  }
  try {
    await generateFlowImage({
      prompt: [
        "只生成一张图，不要文字回复。",
        `画幅 ${opts.aspect}。这是真实产品界面截图，但必须是电影大片气质。`,
        CINEMA_GRAPHIC_LOCK,
        `气质：${(opts.look || "").trim() || DEFAULT_CINEMA_LOOK}。必须是电影大片，不是扁平截图。`,
        "不要人脸，不要模特，不要手，不要海报大字，不要水印。",
        opts.hint,
        `产品：${opts.idea}`,
      ]
        .filter(Boolean)
        .join("\n"),
      destPath: opts.destPath,
      aspect: opts.aspect,
      quality: parseQuality(opts.quality),
    });
  } catch {
    await makePlaceholderStill(opts.destPath, opts.aspect, "0x1c2433", parseQuality(opts.quality));
  }
}

export async function writeHouseGraphicPlaceholders(
  projectId: string,
  script: Script,
  aspect: Aspect = "9:16",
  opts?: { idea?: string; look?: string; quality?: OutputQuality; force?: boolean },
): Promise<void> {
  const dir = projectFile(projectId, "graphics");
  await mkdir(dir, { recursive: true });
  for (const shot of script.shots) {
    const name = shot.overlay || shot.block;
    const item = name ? BY_WRAP.get(name) : undefined;
    if (!item?.imageSlots.length) continue;
    for (const slot of item.imageSlots) {
      const rel = shot.graphicAssets?.[slot.id] || graphicAssetRel(item.wraps, slot.id);
      const abs = projectFile(projectId, rel);
      if (!opts?.force) {
        try {
          await access(abs);
          continue;
        } catch {
          /* generate */
        }
      }
      await generateGraphicSlotImage({
        destPath: abs,
        hint: slot.hint || "电影大片里的产品界面，不要人脸",
        idea: opts?.idea || "",
        look: opts?.look,
        aspect,
        quality: opts?.quality,
      });
    }
  }
}

export function housePromptLine(mode: VisualMode, script?: Script, family?: AspectFamily): string {
  const recipe = skillRecipe(mode);
  const labels = recipe.boardIntents;
  const looks = recipe.intentLooks.map((row) => `${row.label}：${row.look}`).join("；");
  const ready = script?.shots.some((s) => s.graphicAssets && Object.keys(s.graphicAssets).length);
  const assets = ready ? "；部分镜的组件用图已经备好，不要改口播" : "";
  const hostLine = recipe.hostIntents.length ? `。宿主动作（${recipe.hostIntents.join("、")}）可以只出组件、不出人物底` : "";
  const portrait = family === "portrait" ? "。竖屏不要用图表横版报表" : "";
  return `graphicIntent 只从这些中文动作里选或空着：${labels.join("、")}。${looks}。首镜可写钩子动作，中段最多挂一个宿主动作，不要每镜都挂组件${hostLine}${portrait}${assets}。组件只许电影大片配色。不要写英文组件名`;
}
