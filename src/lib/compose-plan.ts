export const STILL_KINDS = ["wide", "close", "detail", "empty"] as const;
export type StillKind = (typeof STILL_KINDS)[number];

export const COMPOSE_LAYOUTS = ["hero", "under-text", "split", "reuse", "montage"] as const;
export type ComposeLayout = (typeof COMPOSE_LAYOUTS)[number];

export const STILL_KIND_LABEL: Record<StillKind, string> = {
  wide: "远景",
  close: "近景",
  detail: "细节",
  empty: "空镜",
};

export const COMPOSE_LAYOUT_LABEL: Record<ComposeLayout, string> = {
  hero: "英雄镜",
  "under-text": "字压图",
  split: "对切",
  reuse: "复用",
  montage: "快切",
};

const KIND_SET = new Set<string>(STILL_KINDS);
const LAYOUT_SET = new Set<string>(COMPOSE_LAYOUTS);

export function parseStillKind(raw: string, fallback: StillKind = "wide"): StillKind {
  const key = raw.trim().toLowerCase();
  if (KIND_SET.has(key)) return key as StillKind;
  if (/空镜|天空|海面|无人/.test(raw)) return "empty";
  if (/细节|手部|物件|特写物件/.test(raw)) return "detail";
  if (/特写|近景|面部|半身/.test(raw)) return "close";
  if (/远景|全身|全景|宽景/.test(raw)) return "wide";
  return fallback;
}

export function parseComposeLayout(raw: string, fallback: ComposeLayout = "hero"): ComposeLayout {
  const key = raw.trim().toLowerCase().replace(/_/g, "-");
  if (LAYOUT_SET.has(key)) return key as ComposeLayout;
  if (/字压图|压暗/.test(raw)) return "under-text";
  if (/对切|分屏/.test(raw)) return "split";
  if (/复用|同一张/.test(raw)) return "reuse";
  if (/快切|蒙太奇/.test(raw)) return "montage";
  if (/英雄|铺满/.test(raw)) return "hero";
  return fallback;
}

export function inferStillKind(scene: string, imagePrompt: string): StillKind {
  return parseStillKind(`${scene} ${imagePrompt}`);
}

export function inferComposeLayout(kind: StillKind, motion: string, index: number, total: number): ComposeLayout {
  if (kind === "empty") return "under-text";
  if (motion === "punch" && index > 0) return "montage";
  if (motion === "pull-out" && index > 0) return "reuse";
  if (kind === "wide" && index > 0 && index < total - 1) return "split";
  if (index === total - 1 && kind !== "close") return "under-text";
  return "hero";
}

export function parseStillRefs(raw: unknown, selfIndex: number, count: number): number[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/[,，\s]+/) : [];
  const out: number[] = [];
  for (const item of list) {
    const n = Number(item);
    if (!Number.isFinite(n)) continue;
    const resolved = n >= 1 && n <= count ? Math.round(n) - 1 : Math.round(n);
    if (resolved < 0 || resolved >= count || resolved === selfIndex) continue;
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out.slice(0, 3);
}

export function defaultStillRefs(layout: ComposeLayout, index: number, count: number): number[] {
  if (count < 2) return [];
  const prev = Math.max(0, index - 1);
  if (layout === "reuse") return [prev === index ? 0 : prev];
  if (layout === "split") return [prev === index ? (index + 1) % count : prev];
  if (layout === "montage") {
    const a = prev === index ? (index + 1) % count : prev;
    const b = index >= 2 ? 0 : (index + 1) % count;
    return [...new Set([a, b].filter((i) => i !== index))].slice(0, 2);
  }
  return [];
}

export function layoutCaption(kind: StillKind, layout: ComposeLayout): string {
  return `${STILL_KIND_LABEL[kind]} · ${COMPOSE_LAYOUT_LABEL[layout]}`;
}
