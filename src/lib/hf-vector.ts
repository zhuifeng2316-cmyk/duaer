import { houseDocument, houseItem } from "./duaer-registry";
import { graphicLabel, GRAPHIC_LABEL, registryCatalog, type RegistryItem } from "./hf-registry";

const DIM = 256;

const TAG_ZH: Record<string, string> = {
  captions: "字幕",
  "caption-style": "字幕动效",
  typography: "字体",
  handwritten: "手写",
  notification: "通知",
  showcase: "产品展示",
  carousel: "轮播",
  chart: "图表",
  data: "数据",
  flowchart: "流程图",
  diagram: "图解",
  gesture: "手势",
  mobile: "手机",
  pointer: "指针",
  pointers: "指针",
  cursor: "光标",
  terminal: "终端",
  code: "代码",
  counter: "计数",
  stats: "数字",
  transition: "转场",
  grain: "颗粒",
  film: "胶片",
  reveal: "露出",
  "product-demo": "产品演示",
  "mock-ui": "界面",
  "title-card": "标题卡",
  glitch: "故障",
  neon: "霓虹",
  chat: "聊天",
};

const ZH_EN: Array<[string, string]> = [
  ["下拉刷新", "pull refresh"],
  ["重新加载", "refresh"],
  ["往下拉", "pull"],
  ["往下扯", "pull"],
  ["往下拽", "pull"],
  ["通知堆", "notification stack"],
  ["通知瀑布", "notification cascade"],
  ["通知弹出", "notification pop"],
  ["路径游走", "path traveler"],
  ["分享面板", "share sheet"],
  ["聊天对话", "chat thread"],
  ["界面放大", "focus zoom"],
  ["局部放大", "focus zoom"],
  ["聚焦缩放", "focus zoom"],
  ["超大鼠标", "oversized cursor"],
  ["大光标", "oversized cursor"],
  ["产品展示", "app showcase"],
  ["手绘流程", "handwritten flowchart"],
  ["流程图", "flowchart"],
  ["步骤图", "flowchart"],
  ["数字跳动", "count up"],
  ["金额跳动", "count up"],
  ["打勾清单", "checklist"],
  ["数据对比", "data chart"],
  ["柱状图", "bar chart"],
  ["代码演示", "code terminal"],
  ["终端跑代码", "code terminal"],
  ["划重点", "caption highlight"],
  ["手写标题", "handwritten title"],
  ["故障字", "glitch caption"],
  ["霓虹字", "neon caption"],
  ["打字机", "typewriter"],
  ["标题卡", "titlecard"],
  ["杂志字", "editorial caption"],
  ["字重切换", "weight shift"],
  ["胶片颗粒", "grain overlay"],
  ["闪白", "flash white"],
  ["砸大字", "kinetic slam"],
  ["全屏大字", "kinetic slam"],
  ["下拉", "pull"],
  ["刷新", "refresh"],
  ["通知", "notification"],
  ["提醒", "notification"],
  ["弹出", "pop"],
  ["轮播", "carousel"],
  ["相册", "carousel"],
  ["路径", "path"],
  ["游走", "traveler"],
  ["光标", "cursor"],
  ["鼠标", "cursor"],
  ["图表", "chart"],
  ["柱状", "bar"],
  ["折线", "line"],
  ["流程", "flowchart"],
  ["代码", "code"],
  ["终端", "terminal"],
  ["砸字", "slam"],
  ["大字", "slam"],
  ["字幕", "caption"],
  ["高亮", "highlight"],
  ["手写", "handwritten"],
  ["转场", "transition"],
  ["漏光", "light leak"],
  ["颗粒", "grain"],
  ["聊天", "chat"],
  ["分享", "share"],
  ["放大", "zoom"],
  ["清单", "checklist"],
  ["计数", "count"],
  ["手机", "mobile"],
  ["列表", "list"],
  ["界面", "ui"],
  ["展示", "showcase"],
];

function hashToken(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) h = Math.imul(h ^ token.charCodeAt(i), 16777619);
  return h;
}

export function expandZhToEn(text: string): string {
  const found = new Set<string>();
  for (const [zh, en] of ZH_EN) {
    if (text.includes(zh)) for (const w of en.split(" ")) found.add(w);
  }
  return [...found].join(" ");
}

export function vectorTokens(text: string): string[] {
  const out: string[] = [];
  const lowered = text.toLowerCase();
  for (const w of lowered.replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/)) {
    if (w.length > 1) out.push(w);
  }
  const chars = [...text].filter((ch) => /[\u4e00-\u9fff]/.test(ch));
  for (const ch of chars) out.push(ch);
  for (let i = 0; i < chars.length - 1; i++) out.push(chars[i] + chars[i + 1]);
  for (const [zh, en] of ZH_EN) {
    if (text.includes(zh)) {
      out.push(zh);
      for (const w of en.split(" ")) out.push(w);
    }
  }
  return out;
}

function addToken(vec: Float64Array, token: string, weight: number): void {
  const h = hashToken(token);
  const i = (h >>> 0) % DIM;
  vec[i] += (h & 0x80000000 ? -1 : 1) * weight;
}

function embedTokens(tokens: string[], idf: Map<string, number>): Float64Array {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
  const vec = new Float64Array(DIM);
  for (const [token, n] of tf) addToken(vec, token, (1 + Math.log(n)) * (idf.get(token) || 1));
  return vec;
}

function normalize(vec: Float64Array): Float64Array {
  let sum = 0;
  for (const x of vec) sum += x * x;
  const n = Math.sqrt(sum) || 1;
  const out = new Float64Array(vec.length);
  for (let i = 0; i < vec.length; i++) out[i] = vec[i] / n;
  return out;
}

export function cosine(a: Float64Array, b: Float64Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function itemDocument(item: RegistryItem): string {
  const aliases = [
    GRAPHIC_LABEL[item.name],
    graphicLabel(item.name),
    ...item.tags.map((t) => TAG_ZH[t] || ""),
  ];
  if (item.name.includes("refresh")) aliases.push("下拉刷新", "往下拉", "重新加载");
  if (item.name.includes("notification") && item.name.includes("stack")) aliases.push("通知堆", "一堆通知");
  if (item.name.includes("notification") && item.name.includes("pop")) aliases.push("通知弹出", "右上角弹出");
  if (item.name.includes("slam")) aliases.push("砸字", "砸大字", "全屏大字");
  const house = houseItem(item.name);
  return [item.name, item.title, item.description, item.tags.join(" "), aliases.filter(Boolean).join(" "), house ? houseDocument(house) : ""].join(" ");
}

type Index = {
  idf: Map<string, number>;
  vectors: Map<string, Float64Array>;
};

function buildIndex(): Index {
  const items = registryCatalog();
  const docs = items.map((item) => ({ name: item.name, tokens: vectorTokens(itemDocument(item)) }));
  const df = new Map<string, number>();
  for (const doc of docs) {
    for (const t of new Set(doc.tokens)) df.set(t, (df.get(t) || 0) + 1);
  }
  const idf = new Map<string, number>();
  const n = docs.length || 1;
  for (const [t, d] of df) idf.set(t, Math.log((n + 1) / (d + 1)) + 1);
  const vectors = new Map<string, Float64Array>();
  for (const doc of docs) vectors.set(doc.name, normalize(embedTokens(doc.tokens, idf)));
  return { idf, vectors };
}

const INDEX = buildIndex();

export function embedQuery(text: string): Float64Array {
  const expanded = [text, expandZhToEn(text)].filter(Boolean).join(" ");
  return normalize(embedTokens(vectorTokens(expanded), INDEX.idf));
}

export function vectorScore(query: string, name: string): number {
  const itemVec = INDEX.vectors.get(name);
  if (!itemVec || !query.trim()) return 0;
  return cosine(embedQuery(query), itemVec);
}
