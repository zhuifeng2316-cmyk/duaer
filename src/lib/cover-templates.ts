export const DEFAULT_COVER_TEMPLATE = "titlecard-lockup";

export const COVER_TEMPLATES = [
  { id: "titlecard-lockup", label: "标题卡锁定", kind: "registry", preview: "lockup", snapshotAt: 2.4, duration: 4 },
  { id: "titlecard-calm", label: "标题卡", kind: "registry", preview: "calm", snapshotAt: 2.0, duration: 4 },
  { id: "headline-slam", label: "砸大字", kind: "registry", preview: "slam", snapshotAt: 1.2, duration: 3.5 },
  { id: "cta-lockup", label: "行动卡", kind: "registry", preview: "cta", snapshotAt: 2.0, duration: 4 },
  { id: "scramble-reveal", label: "解码字", kind: "registry", preview: "scramble", snapshotAt: 2.0, duration: 4 },
  { id: "magazine", label: "杂志字", kind: "html", preview: "magazine", snapshotAt: 0.4, duration: 4 },
  { id: "neon", label: "霓虹字", kind: "html", preview: "neon", snapshotAt: 0.4, duration: 4 },
  { id: "glitch", label: "故障字", kind: "html", preview: "glitch", snapshotAt: 0.4, duration: 4 },
  { id: "hand", label: "手写标题", kind: "html", preview: "hand", snapshotAt: 0.4, duration: 4 },
  { id: "stamp", label: "底栏叠字", kind: "stamp", preview: "stamp", snapshotAt: 0, duration: 0 },
] as const;

export type CoverTemplateId = (typeof COVER_TEMPLATES)[number]["id"];
export type CoverPreviewId = (typeof COVER_TEMPLATES)[number]["preview"];

const TITLE_BREAK_BEFORE = new Set(["别", "再", "不", "没", "也", "还", "就", "才", "却", "让", "向", "从", "由"]);

export function parseCoverTemplate(raw: unknown): CoverTemplateId {
  const id = String(raw || "").trim();
  return COVER_TEMPLATES.some((row) => row.id === id) ? (id as CoverTemplateId) : DEFAULT_COVER_TEMPLATE;
}

export function coverTemplateMeta(raw: unknown): (typeof COVER_TEMPLATES)[number] {
  const id = parseCoverTemplate(raw);
  return COVER_TEMPLATES.find((row) => row.id === id) || COVER_TEMPLATES[0];
}

export function coverTitle(script: { hook?: string; shots?: Array<{ onScreenText?: string }> } | null | undefined, idea = ""): string {
  const raw = (script?.hook || script?.shots?.[0]?.onScreenText || idea || "")
    .replace(/[，。！？、：；…—,.!?;:“”"'‘’\s]+/g, "");
  return raw.slice(0, 12) || "口播";
}

export function wrapCoverTitle(title: string): string[] {
  const t = coverTitle({ hook: title }, title);
  if (t.length <= 6) return [t];
  const mid = Math.ceil(t.length / 2);
  const lo = Math.max(3, mid - 2);
  const hi = Math.min(t.length - 2, mid + 2);
  let cut = mid;
  for (let i = lo; i <= hi; i++) {
    if (TITLE_BREAK_BEFORE.has(t[i] || "")) {
      cut = i;
      break;
    }
  }
  return [t.slice(0, cut), t.slice(cut)];
}
