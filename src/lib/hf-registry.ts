import { existsSync } from "fs";
import path from "path";
import type { AspectFamily } from "./aspect";
import house from "./duaer-registry.json";
import { GRAPHIC_LABEL, isKnownGraphic, VISUAL_MODE_LABEL, VISUAL_MODES, type VisualMode } from "./hf-labels";

export { GRAPHIC_LABEL, isKnownGraphic, VISUAL_MODE_LABEL, VISUAL_MODES, type VisualMode };

export const HOUSE_REGISTRY_ROOT = path.join(process.cwd(), "house/registry");

type HouseRow = {
  wraps: string;
  label: string;
  kind?: "block" | "component";
  host?: boolean;
  modes: VisualMode[];
  fits: AspectFamily[];
  aliases: string[];
  width?: number;
  height?: number;
  duration?: number;
  tags?: string[];
};

const HOUSE_ROWS = house as HouseRow[];
const HOUSE_NAMES = new Set(HOUSE_ROWS.map((it) => it.wraps));
const HOUSE_BY_NAME = new Map(HOUSE_ROWS.map((it) => [it.wraps, it]));

export function isHouseGraphic(name: string): boolean {
  return HOUSE_NAMES.has(name);
}

export type RegistryType = "block" | "component";

export type RegistryItem = {
  name: string;
  type: RegistryType;
  title: string;
  description: string;
  tags: string[];
  fits: AspectFamily[];
  width?: number;
  height?: number;
  duration?: number;
};

function houseType(row: HouseRow): RegistryType {
  return row.kind === "block" ? "block" : "component";
}

const CATALOG = HOUSE_ROWS.map((it) => ({
  name: it.wraps,
  type: houseType(it),
  title: it.label,
  description: (it.aliases || []).join(" "),
  tags: it.tags || [],
  fits: it.fits || [],
  width: typeof it.width === "number" ? it.width : undefined,
  height: typeof it.height === "number" ? it.height : undefined,
  duration: typeof it.duration === "number" ? it.duration : undefined,
})) satisfies RegistryItem[];
const CATALOG_BY_NAME = new Map(CATALOG.map((it) => [it.name, it]));

function emptyPack(): { overlays: string[]; blocks: string[] } {
  return { overlays: [], blocks: [] };
}

export const MODE_ALLOWLIST: Record<VisualMode, { overlays: string[]; blocks: string[] }> = {
  story: emptyPack(),
  product: emptyPack(),
  knowledge: emptyPack(),
};

for (const row of HOUSE_ROWS) {
  const bucket = houseType(row) === "block" ? "blocks" : "overlays";
  for (const mode of row.modes) {
    MODE_ALLOWLIST[mode][bucket].push(row.wraps);
  }
}

const MODE_SET = new Set<string>(VISUAL_MODES);

export function registryCatalog(): RegistryItem[] {
  return CATALOG;
}

export function registryItem(name: string): RegistryItem | undefined {
  return CATALOG_BY_NAME.get(name);
}

export function inferVisualMode(text: string): VisualMode {
  const t = text.trim();
  if (/产品|功能|上新|发布|通知|提醒|App|应用|上线|版本/.test(t)) return "product";
  if (/知识|原理|为什么|怎么|如何|科普|教程|方法|数据|流程图|对比/.test(t)) return "knowledge";
  return "story";
}

export function parseVisualMode(raw: string, fallback: VisualMode = "story"): VisualMode {
  const key = raw.trim().toLowerCase().replace(/_/g, "-");
  if (MODE_SET.has(key)) return key as VisualMode;
  if (/产品/.test(raw)) return "product";
  if (/知识/.test(raw)) return "knowledge";
  if (/故事|情感/.test(raw)) return "story";
  return fallback;
}

function houseNameForMode(raw: unknown, mode: VisualMode): string | undefined {
  const name = String(raw || "").trim();
  if (!name) return undefined;
  const row = HOUSE_BY_NAME.get(name);
  if (!row?.modes.includes(mode)) return undefined;
  return name;
}

export function allowedNames(mode: VisualMode): Set<string> {
  return new Set(HOUSE_ROWS.filter((row) => row.modes.includes(mode)).map((row) => row.wraps));
}

export function parseOverlay(raw: unknown, mode: VisualMode): string | undefined {
  return houseNameForMode(raw, mode);
}

export function parseBlock(raw: unknown, mode: VisualMode): string | undefined {
  return houseNameForMode(raw, mode);
}

export function graphicLabel(name?: string): string {
  if (!name) return "";
  if (GRAPHIC_LABEL[name]) return GRAPHIC_LABEL[name];
  return CATALOG_BY_NAME.get(name)?.title || "画面动效";
}

export function registryRel(name: string): string | undefined {
  const item = CATALOG_BY_NAME.get(name);
  if (!item) return undefined;
  const candidates =
    item.type === "component"
      ? [`compositions/components/${item.name}.html`, `compositions/components/${item.name}/${item.name}.html`]
      : [`compositions/${item.name}.html`];
  for (const rel of candidates) {
    if (existsSync(path.join(HOUSE_REGISTRY_ROOT, rel))) return rel;
  }
  return candidates[0];
}

export function boardGraphicCaption(mode: VisualMode, overlay?: string, block?: string): string {
  const graphic = graphicLabel(overlay || block);
  return graphic ? `${VISUAL_MODE_LABEL[mode]} · ${graphic}` : VISUAL_MODE_LABEL[mode];
}

export function allowlistPrompt(mode: VisualMode): string {
  const pack = MODE_ALLOWLIST[mode];
  const overlays = pack.overlays.join("|") || "无";
  const blocks = pack.blocks.join("|") || "无";
  return `overlay 只能是 ${overlays}；block 只能是 ${blocks}。没有合适的就空着。不要发明名单外的名字`;
}

export type RegistryMount = {
  width?: number;
  height?: number;
  hostFill: boolean;
  adapt?: boolean;
  scale?: number;
};

export function registryMountSize(name: string, talk?: { width: number; height: number }): RegistryMount {
  const item = CATALOG_BY_NAME.get(name);
  if (!item?.width || !item?.height) return { hostFill: true };
  if (isHouseGraphic(name) && talk?.width && talk?.height) {
    // Cover the talk frame (not letterbox). Landscape hosts on 9:16 scale up and crop.
    return {
      width: item.width,
      height: item.height,
      hostFill: false,
      adapt: true,
      scale: Math.max(talk.width / item.width, talk.height / item.height),
    };
  }
  return { width: item.width, height: item.height, hostFill: false };
}

export function registryMountKind(name: string, asBlock: boolean): "registry-card" | "registry-overlay" | "registry-adapt" {
  if (!asBlock) return "registry-overlay";
  const item = CATALOG_BY_NAME.get(name);
  if (!item?.width || !item?.height) return "registry-overlay";
  if (item.height > item.width) return "registry-overlay";
  if (/^caption-|^hw-title$|^hw-pipeline$/.test(name)) return "registry-overlay";
  return "registry-card";
}
