import { existsSync, readFileSync } from "fs";
import path from "path";
import { aspectFamily, type Aspect, type AspectFamily } from "./aspect";
import { cinemaGraphicToken } from "./cinema";
import { graphicAssetRel, houseCatalog, houseFitsFamily, houseFitsPreferred, houseItem } from "./duaer-registry";
import { HOUSE_REGISTRY_ROOT, isKnownGraphic, registryCatalog, registryItem, registryRel, type RegistryItem, type VisualMode } from "./hf-registry";
import { expandZhToEn, vectorScore } from "./hf-vector";
import { alignShotMotions, recipeAllowsLabel, skillRecipe } from "./skill-recipes";
import type { Script, Shot } from "./types";

export type RegistryVar = {
  id: string;
  type: string;
  default?: unknown;
  min?: number;
  max?: number;
  options?: Array<string | { value: string }>;
};

export type GraphicPick = {
  name: string;
  type: "block" | "component";
  score: number;
  vars: Record<string, string | number>;
  width?: number;
  height?: number;
  duration?: number;
};

const INTENT_QUERIES: Array<{ re: RegExp; query: string; modes?: VisualMode[]; label: string }> = [
  { re: /下拉|刷新/, query: "pull to refresh", modes: ["product"], label: "下拉刷新" },
  { re: /通知堆|一堆通知|通知叠|堆叠通知/, query: "notification stack", modes: ["product"], label: "通知堆" },
  { re: /通知|提醒|弹出/, query: "notification pop banner", modes: ["product"], label: "通知弹出" },
  { re: /路径|游走|沿着/, query: "offset path traveler", modes: ["product"], label: "路径游走" },
  { re: /分享面板|分享菜单/, query: "share sheet carousel", modes: ["product"], label: "分享面板" },
  { re: /聊天|对话气泡|消息串/, query: "message thread reveal chat", modes: ["product"], label: "聊天对话" },
  { re: /界面放大|聚焦缩放|局部放大/, query: "ui focus zoom", modes: ["product"], label: "界面放大" },
  { re: /大光标|超大鼠标|光标点/, query: "oversized cursor", modes: ["product"], label: "大光标" },
  { re: /轮播|相册转/, query: "carousel circle showcase", modes: ["product"], label: "轮播" },
  { re: /展示|手机界面|产品界面/, query: "app showcase", modes: ["product"], label: "产品展示" },
  { re: /手绘流程/, query: "hw pipeline handwritten flowchart", modes: ["knowledge"], label: "手绘流程" },
  { re: /流程|步骤图/, query: "vertical flowchart portrait", modes: ["knowledge"], label: "流程图" },
  { re: /数字跳动|金额跳动|计数/, query: "count up number", modes: ["knowledge", "product"], label: "数字跳动" },
  { re: /打勾清单|清单核对/, query: "marker checklist card", modes: ["knowledge"], label: "打勾清单" },
  { re: /图表|柱状|折线|数据对比/, query: "data chart", modes: ["knowledge"], label: "图表" },
  { re: /代码终端|终端跑代码|代码演示/, query: "code terminal run", modes: ["knowledge", "product"], label: "代码演示" },
  { re: /划重点|高亮/, query: "caption highlight", modes: ["knowledge", "story"], label: "划重点" },
  { re: /手写标题|手写大字/, query: "hw title handwritten", modes: ["story", "knowledge"], label: "手写标题" },
  { re: /故障字|故障风/, query: "caption glitch rgb", modes: ["story"], label: "故障字" },
  { re: /霓虹字/, query: "caption neon glow", modes: ["story"], label: "霓虹字" },
  { re: /打字机/, query: "typewriter", modes: ["story", "knowledge"], label: "打字机" },
  { re: /标题卡/, query: "titlecard calm", modes: ["story"], label: "标题卡" },
  { re: /砸字|全屏大字|砸大字/, query: "caption kinetic slam", modes: ["story", "knowledge"], label: "砸字" },
  { re: /杂志字|双字体/, query: "caption editorial emphasis", modes: ["story"], label: "杂志字" },
  { re: /字重/, query: "caption weight shift", modes: ["story"], label: "字重切换" },
  { re: /漏光/, query: "light leak", modes: ["story"], label: "漏光" },
  { re: /闪白|闪一下/, query: "flash through white", modes: ["story"], label: "闪白" },
  { re: /胶片颗粒|颗粒感/, query: "grain overlay", modes: ["story"], label: "胶片颗粒" },
  { re: /美国地图/, query: "us map", modes: ["knowledge"], label: "美国地图" },
];

const VENDOR_ENGLISH = /hyperframes|heygen|launch-cut|Pipeline started|Checks passed|Build queued|Deploy live|Render complete|Live preview|Now serving|All 42 checks|SHIP VIDEO|FROM HTML/i;
const TALK_PUNCT = /[，。！？、：；…—,.!?;:“”"'「」『』（）()]/g;
const LATIN_LABEL = /^(kicker|eyebrow|label|tag|overline)$/i;
const LATIN_ONLY = /^[\sA-Za-z0-9&/.,:'"!?-]+$/;

const SCORE_FLOOR: Record<VisualMode, number> = {
  story: 4,
  product: 3,
  knowledge: 3,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 1);
}

export function englishQueryForIntent(intent: string, mode: VisualMode): string {
  const hit = INTENT_QUERIES.find((row) => row.re.test(intent) && (!row.modes || row.modes.includes(mode)));
  if (hit) return hit.query;
  const other = INTENT_QUERIES.find((row) => row.re.test(intent));
  if (other && other.modes && !other.modes.includes(mode)) return "";
  return expandZhToEn(intent);
}

export function collectIntent(shot: Pick<Shot, "graphicIntent" | "scene" | "imagePrompt" | "onScreenText" | "voiceover">): string {
  return [shot.graphicIntent, shot.scene, shot.imagePrompt, shot.onScreenText, shot.voiceover].filter(Boolean).join(" ");
}

function modeAllows(item: RegistryItem, mode: VisualMode): boolean {
  const house = houseItem(item.name);
  if (!house) return false;
  return house.modes.includes(mode);
}

export function modesForItem(item: RegistryItem): VisualMode[] {
  return (["story", "product", "knowledge"] as VisualMode[]).filter((mode) => modeAllows(item, mode));
}

export function scoreRegistryItem(item: RegistryItem, query: string): number {
  const words = tokenize(query);
  if (!words.length) return 0;
  const hay = tokenize([item.name, item.title, item.description, item.tags.join(" ")].join(" "));
  const set = new Set(hay);
  let n = 0;
  for (const w of words) {
    if (set.has(w)) n += w.length > 4 ? 2 : 1;
    if (item.name.includes(w)) n += 3;
  }
  const nameParts = item.name.split("-").filter((w) => w.length > 1);
  if (nameParts.length && nameParts.every((p) => words.includes(p))) n += nameParts.length * 3;
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (item.name === slug) n += 24;
  const numbered = item.name.match(/-(\d+)$/);
  if (numbered && !/\d/.test(query)) n += numbered[1] === "1" ? 3 : -Number(numbered[1]);
  return n;
}

const ALL_FAMILIES: AspectFamily[] = ["portrait", "square", "landscape"];

export function inferItemFits(item: RegistryItem): AspectFamily[] {
  const house = houseItem(item.name);
  if (house) return ALL_FAMILIES;
  if (item.fits?.length) return item.fits;
  const tags = item.tags;
  if (tags.some((t) => ["captions", "caption-style", "typography", "handwritten", "transition", "grain", "film"].includes(t))) {
    return ALL_FAMILIES;
  }
  if (item.width && item.height) {
    if (item.height > item.width * 1.15) return ["portrait"];
    if (item.width > item.height * 1.15) return ["landscape"];
    return ["square"];
  }
  if (tags.some((t) => ["carousel", "cursor", "chart", "terminal", "showcase", "data"].includes(t))) {
    return ["landscape", "square"];
  }
  if (tags.some((t) => ["mobile", "gesture", "portrait", "vertical"].includes(t))) return ["portrait", "square"];
  return ALL_FAMILIES;
}

export function itemFitsAspect(item: RegistryItem, aspect: Aspect): boolean {
  const family = aspectFamily(aspect);
  const house = houseItem(item.name);
  if (house) return houseFitsFamily(house, family);
  return inferItemFits(item).includes(family);
}

export function rankRegistry(query: string, mode: VisualMode, limit = 5, aspect: Aspect = "9:16"): Array<RegistryItem & { score: number }> {
  if (!query.trim()) return [];
  const family = aspectFamily(aspect);
  return registryCatalog()
    .filter((item) => modeAllows(item, mode) && itemFitsAspect(item, aspect))
    .map((item) => {
      const lex = scoreRegistryItem(item, query);
      const vec = vectorScore(query, item.name);
      const bonus = vec >= 0.28 ? Math.round(vec * 18) : 0;
      const house = houseItem(item.name) && (lex > 0 || vec >= 0.28) ? 8 : 0;
      const preferred = houseItem(item.name) && houseFitsPreferred(houseItem(item.name)!, family) ? 2 : 0;
      return { ...item, score: lex + bonus + house + preferred };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function parseRegistryVariables(html: string): RegistryVar[] {
  const m = html.match(/data-composition-variables\s*=\s*'(\[[\s\S]*?\])'/i) || html.match(/data-composition-variables\s*=\s*"(\[[\s\S]*?\])"/i);
  if (!m?.[1]) return [];
  try {
    const raw = JSON.parse(m[1].replace(/&quot;/g, '"')) as RegistryVar[];
    return Array.isArray(raw) ? raw.filter((v) => v && v.id) : [];
  } catch {
    return [];
  }
}

export function registryLabPath(name: string): string | undefined {
  const rel = registryRel(name);
  if (!rel) return undefined;
  return path.join(HOUSE_REGISTRY_ROOT, rel);
}

export function registryFileExists(name: string): boolean {
  const abs = registryLabPath(name);
  return Boolean(abs && existsSync(abs));
}

export function readRegistryVariables(name: string): RegistryVar[] {
  const abs = registryLabPath(name);
  if (!abs) return [];
  try {
    return parseRegistryVariables(readFileSync(abs, "utf8"));
  } catch {
    return [];
  }
}

function optionValue(opt: string | { value: string }): string {
  return typeof opt === "string" ? opt : opt.value;
}

export function isTalkCopyVarId(id: string): boolean {
  return /^(title|headline|word|traveler_label|click_label|text|notifTitle|cardTitle|shareTitle|ecHeadline|headlineTop|titles|bodies|body|answer\d*|sourceMessage|caption|copy|phrase|line\d*|top|mid|circled|rest|l[123]|v[123])$/i.test(id);
}

/** Parse「总题：项、项」without importing html-compose (avoids cycle). */
function checklistList(text: string): { title: string; items: string[] } | undefined {
  const raw = String(text || "").trim();
  if (!raw) return undefined;
  const colon = raw.split(/[：:]/);
  const hasTitle = colon.length >= 2 && /[\u4e00-\u9fff]/.test(colon[0] || "");
  const rest = hasTitle ? colon.slice(1).join("") : raw;
  if (!hasTitle && !/[、＞>]/.test(rest)) return undefined;
  const title = hasTitle ? displayTalkCopy(colon[0]!) : "";
  const items = rest
    .split(/[、，,＞>\s]+/)
    .map((s) => displayTalkCopy(s))
    .filter((s) => s.length >= 1 && s.length <= 12);
  if (items.length < 2) return undefined;
  return { title, items };
}

function applyMarkerChecklistFill(
  defs: RegistryVar[],
  shot: Pick<Shot, "onScreenText" | "voiceover">,
  out: Record<string, string | number>,
): void {
  const ids = new Set(defs.map((d) => d.id));
  if (!ids.has("top") || !ids.has("l1")) return;
  const list = checklistList(String(shot.onScreenText || "")) || checklistList(String(shot.voiceover || ""));
  // When list has no explicit title (「A＞B」), don't dump the whole string into the marker headline.
  const title =
    displayTalkCopy(list?.title || (!list ? firstTalkClause(String(shot.onScreenText || "")) : "") || "这一组").slice(0, 8) ||
    "这一组";
  out.top = title;
  out.mid = "要";
  out.circled = "算";
  out.rest = "清";
  const fallbacks = ["一项", "二项", "三项"];
  for (let i = 1; i <= 3; i++) {
    const item = displayTalkCopy(list?.items[i - 1] || "").slice(0, 6);
    out[`l${i}`] = item || fallbacks[i - 1]!;
    out[`v${i}`] = "算过";
  }
}

export function varsCarryTalkCopy(vars?: Record<string, string | number>): boolean {
  if (!vars) return false;
  return Object.entries(vars).some(([id, value]) => {
    if (!isTalkCopyVarId(id)) return false;
    const text = String(value ?? "").trim();
    return Boolean(text) && !VENDOR_ENGLISH.test(text);
  });
}

/** 成片字不要逗号句号；英文演示 kicker 也不上屏。 */
export function displayTalkCopy(text: string): string {
  return String(text || "")
    .replace(TALK_PUNCT, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTalkClause(text: string): string {
  const parts = String(text || "")
    .split(TALK_PUNCT)
    .map((s) => s.trim())
    .filter(Boolean);
  return displayTalkCopy(parts[0] || text);
}

function isLatinChrome(id: string, value: string): boolean {
  if (!LATIN_LABEL.test(id)) return false;
  const t = value.trim();
  return Boolean(t) && LATIN_ONLY.test(t) && /[A-Za-z]/.test(t);
}

export function sanitizeGraphicVars(
  vars?: Record<string, string | number>,
): Record<string, string | number> | undefined {
  if (!vars) return vars;
  const out: Record<string, string | number> = {};
  for (const [id, value] of Object.entries(vars)) {
    if (typeof value !== "string") {
      out[id] = value;
      continue;
    }
    let next = isTalkCopyVarId(id) || /^(headline|title|text)$/i.test(id) ? displayTalkCopy(value) : value;
    if (/^headline$/i.test(id)) next = firstTalkClause(value);
    if (isLatinChrome(id, next)) next = "";
    out[id] = next;
  }
  return out;
}

function isVendorEnglish(value: unknown): boolean {
  return VENDOR_ENGLISH.test(String(value ?? ""));
}

function chineseCopy(preferred: string | undefined, fallback: unknown): string {
  const first = displayTalkCopy(String(preferred || ""));
  if (first && !isVendorEnglish(first)) return first;
  const second = displayTalkCopy(String(fallback ?? ""));
  if (second && !isVendorEnglish(second)) return second;
  return first;
}

function isAssetField(def: RegistryVar): boolean {
  if (def.type === "image" || def.type === "video" || def.type === "audio") return true;
  if (/^(image\d*|brandLogo|logo|src|poster|video|audio)$/i.test(def.id)) return true;
  return /^(assets\/|https?:)/i.test(String(def.default ?? "")) || /\.(svg|png|jpe?g|webp|mp4|mp3|wav)$/i.test(String(def.default ?? ""));
}

export function fillRegistryVars(defs: RegistryVar[], shot: Pick<Shot, "onScreenText" | "voiceover" | "graphicIntent" | "graphicAssets">): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const intent = `${shot.graphicIntent || ""} ${shot.onScreenText || ""} ${shot.voiceover || ""}`;
  for (const def of defs) {
    if (def.type === "number") {
      let n = Number(def.default);
      if (!Number.isFinite(n)) n = 0;
      if (/用力|大力/.test(intent) && /distance|pull/i.test(def.id)) n = Math.max(n, 160);
      if (def.min != null) n = Math.max(def.min, n);
      if (def.max != null) n = Math.min(def.max, n);
      out[def.id] = n;
      continue;
    }
    if (def.type === "color") {
      out[def.id] = cinemaGraphicToken(def.id);
      continue;
    }
    if (def.type === "enum") {
      const opts = (def.options || []).map(optionValue);
      let pick = String(def.default ?? opts[0] ?? "");
      if (/圆点|小点/.test(intent) && opts.includes("dots")) pick = "dots";
      else if (/圆环|环形/.test(intent) && opts.includes("ring")) pick = "ring";
      else if (/箭头/.test(intent) && opts.includes("arrow")) pick = "arrow";
      if (/Mac|桌面/.test(intent) && opts.includes("macos")) pick = "macos";
      if (/iPhone|苹果|手机/.test(intent) && opts.includes("ios")) pick = "ios";
      if (/accent/i.test(def.id) && opts.includes("green") && (opts.includes("blue") || opts.includes("violet"))) {
        pick = "green";
      }
      out[def.id] = pick;
      continue;
    }
    if (/^(brand|accent|accent-2|accent2|bg|background|fg|foreground|surface|border|muted|ns-accent|color)$/i.test(def.id)) {
      out[def.id] = cinemaGraphicToken(def.id);
      continue;
    }
    if (/^path$/i.test(def.id) || /^[Mm]\s*-?\d/.test(String(def.default ?? ""))) {
      out[def.id] = String(def.default ?? "");
      continue;
    }
    if (isAssetField(def)) {
      const local = shot.graphicAssets?.[def.id];
      if (local) {
        out[def.id] = local;
        continue;
      }
      // Carousel etc. expose image4…image12; house only prepares image1–3 — cycle those instead of broken demo paths.
      const houseImgs = Object.entries(shot.graphicAssets || {})
        .filter(([k, v]) => /^image\d+$/i.test(k) && Boolean(v))
        .sort((a, b) => Number(a[0].replace(/\D/g, "")) - Number(b[0].replace(/\D/g, "")))
        .map(([, v]) => String(v));
      if (houseImgs.length && /^image\d+$/i.test(def.id)) {
        const n = Math.max(1, Number(def.id.replace(/\D/g, "")) || 1);
        out[def.id] = houseImgs[(n - 1) % houseImgs.length]!;
        continue;
      }
      out[def.id] = isVendorEnglish(def.default) ? "" : String(def.default ?? "");
      continue;
    }
    if (/^(app_label|appName|senderName)$/i.test(def.id)) {
      out[def.id] = "口播";
      continue;
    }
    if (/^acceptLabel$/i.test(def.id)) {
      out[def.id] = "接受";
      continue;
    }
    if (/^declineLabel$/i.test(def.id)) {
      out[def.id] = "拒绝";
      continue;
    }
    if (/^itemLabel$/i.test(def.id)) {
      out[def.id] = "一条口播";
      continue;
    }
    if (/^stripText$/i.test(def.id)) {
      out[def.id] = chineseCopy(shot.onScreenText, "口播成片");
      continue;
    }
    if (def.id === "titles") {
      out[def.id] = chineseCopy(shot.onScreenText, "提醒");
      continue;
    }
    if (def.id === "bodies") {
      out[def.id] = chineseCopy(shot.voiceover, shot.onScreenText);
      continue;
    }
    if (/^headline$/i.test(def.id)) {
      out[def.id] = firstTalkClause(String(shot.onScreenText || def.default || ""));
      continue;
    }
    if (isTalkCopyVarId(def.id) && !/^(titles|bodies|body|answer\d*|sourceMessage|top|mid|circled|rest|l[123]|v[123])$/i.test(def.id)) {
      out[def.id] = chineseCopy(shot.onScreenText, def.default);
      continue;
    }
    if (/^(body|answer\d*|sourceMessage)$/i.test(def.id)) {
      out[def.id] = chineseCopy(shot.voiceover, shot.onScreenText);
      continue;
    }
    if (/cta/i.test(def.id) && isVendorEnglish(def.default)) {
      out[def.id] = "去看";
      continue;
    }
    if (/footer|domain/i.test(def.id) && isVendorEnglish(def.default)) {
      out[def.id] = "";
      continue;
    }
    if (isVendorEnglish(def.default)) {
      out[def.id] = chineseCopy(shot.onScreenText, "口播");
      continue;
    }
    if (def.default != null && def.default !== "") out[def.id] = def.default as string | number;
  }
  applyMarkerChecklistFill(defs, shot, out);
  for (const [id, value] of Object.entries(out)) {
    if (typeof value !== "string" || !VENDOR_ENGLISH.test(value)) continue;
    out[id] = isAssetField({ id, type: "string", default: value }) ? "" : chineseCopy(shot.onScreenText, "口播");
  }
  return sanitizeGraphicVars(out) || out;
}

function pickFromHouse(name: string, shot: Pick<Shot, "onScreenText" | "voiceover" | "graphicIntent" | "graphicAssets">, score: number): GraphicPick | undefined {
  const item = registryItem(name);
  const house = houseItem(name);
  if (!item && !house) return undefined;
  const type = house?.kind === "block" || item?.type === "block" ? "block" : "component";
  const graphicAssets = attachHouseAssets(shot as Shot, name);
  return {
    name,
    type,
    score,
    vars: fillRegistryVars(readRegistryVariables(name), { ...shot, graphicAssets }),
    width: item?.width ?? house?.width,
    height: item?.height ?? house?.height,
    duration: item?.duration ?? house?.duration,
  };
}

export function recipeAllowsIntent(mode: VisualMode, intent: string): boolean {
  const t = intent.trim();
  if (!t) return false;
  if (recipeAllowsLabel(mode, t)) return true;
  const labels = new Set(skillRecipe(mode).boardIntents);
  return houseCatalog().some(
    (h) =>
      labels.has(h.label) &&
      (h.aliases.includes(t) || h.aliases.some((a) => a.length >= 2 && t.includes(a))),
  );
}

function recipeAllowsWrap(mode: VisualMode, name: string): boolean {
  const house = houseItem(name);
  return Boolean(house && skillRecipe(mode).boardIntents.includes(house.label));
}

export function pickGraphicForShot(
  shot: Shot,
  mode: VisualMode,
  used: string[] = [],
  aspect: Aspect = "9:16",
  recipeOnly = false,
): GraphicPick | undefined {
  const intent = String(shot.graphicIntent || "").trim() || inferIntentLabel(shot, mode);
  if (!intent) return undefined;
  if (recipeOnly && !recipeAllowsIntent(mode, intent)) return undefined;
  const family = aspectFamily(aspect);
  // Exact label wins even if already used — remount same wrap, never a stranger.
  const exact = houseCatalog().find(
    (h) => h.modes.includes(mode) && (h.label === intent || h.aliases.includes(intent)),
  );
  if (exact) {
    if (!houseFitsFamily(exact, family)) return undefined;
    if (recipeOnly && !recipeAllowsWrap(mode, exact.wraps)) return undefined;
    return pickFromHouse(exact.wraps, shot, 99);
  }
  const matches = houseCatalog().filter(
    (h) =>
      h.modes.includes(mode) &&
      (!recipeOnly || recipeAllowsWrap(mode, h.wraps)) &&
      (intent.includes(h.label) || h.aliases.some((a) => a.length >= 2 && intent.includes(a))),
  );
  if (matches.length === 1 && houseFitsFamily(matches[0]!, family)) {
    return pickFromHouse(matches[0]!.wraps, shot, 80);
  }
  if (matches.length > 1) {
    const mappedRow = INTENT_QUERIES.find((row) => row.re.test(intent) && (!row.modes || row.modes.includes(mode)));
    const preferred = mappedRow && matches.find((h) => h.label === mappedRow.label);
    if (preferred && houseFitsFamily(preferred, family)) {
      return pickFromHouse(preferred.wraps, shot, 80);
    }
  }
  const mapped = englishQueryForIntent(intent, mode);
  const tableHit = INTENT_QUERIES.some((row) => row.re.test(intent) && (!row.modes || row.modes.includes(mode)));
  if (!matches.length && !tableHit) return undefined;
  const query = mapped || intent;
  const ranked = rankRegistry(query, mode, 8, aspect).filter(
    (item) =>
      isKnownGraphic(item.name) &&
      registryFileExists(item.name) &&
      (!recipeOnly || recipeAllowsWrap(mode, item.name)),
  );
  const top = ranked.find((item) => !used.includes(item.name)) || ranked[0];
  if (!top || top.score < SCORE_FLOOR[mode]) return undefined;
  if (!mapped && vectorScore(query, top.name) < 0.36) return undefined;
  return pickFromHouse(top.name, shot, top.score);
}

function attachHouseAssets(shot: Shot, name: string): Record<string, string> | undefined {
  const house = houseItem(name);
  const assets = { ...(shot.graphicAssets || {}) };
  for (const slot of house?.imageSlots || []) {
    if (!assets[slot.id]) assets[slot.id] = graphicAssetRel(name, slot.id);
  }
  return Object.keys(assets).length ? assets : undefined;
}

export function assignGraphics(script: Script, aspect: Aspect = "9:16"): Script {
  const mode = script.visualMode || "story";
  const used: string[] = [];
  const mapped = script.shots.map((shot) => {
    const intent = String(shot.graphicIntent || "").trim() || inferIntentLabel(shot, mode);
    const picked = pickGraphicForShot({ ...shot, graphicIntent: intent }, mode, used, aspect, true);
      if (!picked) {
        return { ...shot, graphicIntent: intent || undefined, overlay: undefined, block: undefined, graphicVars: undefined, graphicAssets: undefined };
      }
      used.push(picked.name);
      const graphicAssets = attachHouseAssets(shot, picked.name);
      const house = houseItem(picked.name);
      const host = Boolean(house?.host);
      return {
        ...shot,
        graphicIntent: house?.label || intent || shot.graphicIntent,
        overlay: picked.type === "component" ? picked.name : undefined,
        block: picked.type === "block" ? picked.name : undefined,
        hostStill: host ? false : shot.hostStill,
        kind: host && !String(shot.imagePrompt || "").trim() ? "empty" : shot.kind,
        graphicAssets,
        graphicVars: fillRegistryVars(readRegistryVariables(picked.name), { ...shot, graphicIntent: intent, graphicAssets }),
      };
    });
  return {
    ...script,
    shots: alignShotMotions(mapped),
  };
}

export function planHouseGraphics(script: Script, aspect: Aspect = "9:16"): Script {
  return assignGraphics(script, aspect);
}

export function inferIntentLabel(shot: Pick<Shot, "scene" | "imagePrompt" | "onScreenText" | "voiceover" | "graphicIntent">, mode: VisualMode): string {
  if (shot.graphicIntent?.trim()) return shot.graphicIntent.trim();
  const blob = `${shot.scene} ${shot.imagePrompt} ${shot.onScreenText} ${shot.voiceover}`;
  const hit = INTENT_QUERIES.find((row) => row.re.test(blob) && (!row.modes || row.modes.includes(mode)));
  return hit?.label || "";
}
