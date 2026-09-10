import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LAB = path.join(ROOT, "storage/hyperframes-registry");
const HOUSE = path.join(ROOT, "house/registry");
const CATALOG = path.join(ROOT, "src/lib/hf-registry-catalog.json");
const HOUSE_JSON = path.join(ROOT, "src/lib/duaer-registry.json");

const TOKENS_COLOR = { brand: "#e8c56a", accent: "#d4a05a", bg: "#0c0a08" };
const DEFAULT_TITLE = "这一组";
const DEFAULT_LINE = "看这里";
const CINEMA_SLOT = "电影大片里的产品界面，暗部底暖金点缀，不要人脸";

const KNOWN = {
  "pull-to-refresh": "下拉刷新",
  "notification-stack": "通知堆",
  "native-notification-pop": "通知弹出",
  "offset-path-traveler": "路径游走",
  "app-showcase": "产品展示",
  "carousel-circle-1": "轮播",
  "ui-focus-zoom": "界面放大",
  "oversized-cursor": "大光标",
  "caption-kinetic-slam": "砸字",
  "caption-editorial-emphasis": "杂志字",
  "caption-weight-shift": "字重切换",
  "hw-title": "手写标题",
  "data-chart": "图表",
  "flowchart-vertical": "流程图",
  "hw-pipeline": "手绘流程",
  "caption-highlight": "划重点",
  "count-up": "数字跳动",
  "code-terminal-run": "代码演示",
  "share-sheet-carousel": "分享面板",
  "message-thread-reveal": "聊天对话",
  "ai-chat-reveal": "对话露出",
  "notification-cascade": "通知瀑布",
  "marker-checklist-card": "打勾清单",
  "caption-glitch-rgb": "故障字",
  "caption-neon-glow": "霓虹字",
  typewriter: "打字机",
  "titlecard-calm": "标题卡",
  "light-leak": "漏光",
  "flash-through-white": "闪白",
  "grain-overlay": "胶片颗粒",
};

const WORD = {
  code: "代码",
  carousel: "轮播",
  snippet: "片段",
  text: "字",
  caption: "字幕",
  reveal: "露出",
  terminal: "终端",
  transitions: "转场",
  apple: "果味",
  card: "卡片",
  circle: "圆",
  hw: "手写",
  light: "光",
  lt: "条",
  yt: "视频站",
  mk: "标记",
  path: "路径",
  morph: "变形",
  liquid: "流体",
  vfx: "特效",
  camera: "镜头",
  glass: "玻璃",
  notification: "通知",
  swap: "对切",
  orbit: "环绕",
  highlight: "高亮",
  dark: "暗",
  stack: "堆",
  map: "地图",
  blur: "虚化",
  chart: "图表",
  beat: "节拍",
  cut: "切",
  zoom: "缩放",
  vision: "视野",
  split: "对切",
  dissolve: "叠化",
  logo: "标志",
  line: "线",
  grid: "网格",
  focus: "聚焦",
  flow: "流动",
  device: "设备",
  pop: "弹出",
  wipe: "划转",
  particle: "粒子",
  follow: "跟随",
  background: "底",
  us: "美国",
  cursor: "光标",
  parallax: "视差",
  type: "打字",
  chat: "对话",
  bar: "柱",
  radial: "放射",
  "3d": "立体",
  scroll: "滚动",
  typing: "打字",
  warp: "扭曲",
  overlay: "叠层",
  through: "穿过",
  frame: "画框",
  glitch: "故障",
  avatar: "头像",
  transition: "转场",
  title: "标题",
  accent: "点缀",
  mask: "遮罩",
  neon: "霓虹",
  soft: "柔",
  message: "消息",
  thread: "串",
  pan: "横移",
  fill: "铺满",
  motion: "运动",
  pass: "掠过",
  trail: "拖尾",
  scan: "扫描",
  kinetic: "砸",
  slam: "砸字",
  lockup: "锁定",
  sweep: "扫过",
  slide: "滑入",
  draw: "画出",
  axis: "轴向",
  spring: "弹性",
  stagger: "错开",
  svg: "矢量",
  indicator: "指示",
  count: "计数",
  freeze: "定格",
  intro: "开场",
  hud: "抬头显",
  exchange: "交换",
  chromatic: "色散",
  assemble: "拼合",
  clear: "清空",
  page: "翻页",
  modern: "新",
  plus: "加",
  flight: "飞过",
  high: "高",
  contrast: "反差",
  visual: "画面",
  studio: "片场",
  editorial: "杂志",
  flash: "闪",
  flowchart: "流程",
  vertical: "竖",
  halftone: "网点",
  field: "场",
  cloud: "云",
  leak: "漏光",
  menu: "菜单",
  lower: "下",
  third: "三分",
  underline: "下划线",
  block: "块",
  pill: "胶囊",
  macos: "桌面",
  callout: "标注",
  wall: "墙",
  progress: "进度",
  ticker: "滚字",
  locked: "锁住",
  down: "下",
  notes: "笔记",
  cascade: "瀑布",
  trace: "描线",
  rack: "虚实",
  post: "帖",
  ripple: "涟漪",
  iris: "光圈",
  sheet: "面板",
  distortion: "畸变",
  push: "推",
  ui: "界面",
  weight: "字重",
  whip: "甩",
  arc: "弧",
  ascii: "字符画",
  drift: "漂",
  badge: "徽章",
  letters: "字母",
  stage: "台",
  rig: "架",
  emphasis: "强调",
  rgb: "色散",
  gradient: "渐变",
  matrix: "矩阵",
  decode: "解码",
  texture: "纹理",
  story: "故事",
  cta: "去看",
  close: "收",
  fade: "淡",
  grain: "颗粒",
  icon: "图标",
  ink: "墨",
  marker: "马克笔",
  match: "对上",
  number: "数字",
  surround: "环绕",
  word: "词",
  pull: "拉",
  band: "条",
  screen: "屏",
  toggle: "开关",
  shared: "分享",
  shimmer: "闪烁",
  proof: "证明",
  touch: "触",
  tilt: "倾",
  cards: "卡片",
  state: "状态",
  rail: "轨道",
  testimonial: "证言",
  titlecard: "标题卡",
  variable: "可变",
  ai: "对话",
  app: "应用",
  showcase: "展示",
  money: "金额",
  race: "赛跑",
  blue: "蓝",
  sweater: "毛衣",
  video: "影像",
  camcorder: "摄像机",
  dolly: "轨道",
  chatgpt: "对话窗",
  cinematic: "电影",
  claude: "对话稿",
  extrude: "挤出",
  diff: "对照",
  shader: "着色",
  basic: "基础",
  grass: "草地",
  homebrew: "自制",
  man: "人",
  novel: "小说",
  ocean: "海",
  pro: "专业",
  red: "红",
  sands: "沙",
  silver: "银",
  aerogel: "气凝胶",
  solid: "实色",
  colors: "色",
  monokai: "暗码",
  solarized: "日晒色",
  cosmic: "星空",
  orb: "球",
  cross: "交叉",
  data: "数据",
  domain: "域",
  white: "白",
  dressing: "布置",
  gallery: "画廊",
  tunnel: "隧道",
  gravitational: "引力",
  lens: "镜头",
  heygen: "口播",
  promo: "预告",
  pipeline: "流水线",
  scribble: "涂鸦",
  write: "写",
  instagram: "照片墙",
  ios26: "手机系统",
  context: "上下文",
  media: "媒体",
  controls: "控件",
  widgets: "组件",
  outro: "收尾",
  bild: "大字",
  bold: "粗",
  clean: "净",
  color: "色",
  kicker: "肩题",
  name: "名",
  border: "边",
  side: "侧",
  rule: "线",
  bars: "柱",
  tahoe: "湖面",
  clone: "克隆",
  graph: "图",
  placeholder: "占位",
  stat: "指标",
  specs: "规格",
  list: "清单",
  news: "新闻",
  north: "北",
  korea: "韩",
  nyc: "纽约",
  paris: "巴黎",
  organic: "有机",
  oscilloscope: "示波",
  reddit: "论坛",
  ridged: "脊",
  burn: "灼",
  waves: "波",
  sdf: "场",
  share: "分享",
  slack: "协作",
  ad: "广告",
  spain: "西班牙",
  spiral: "螺旋",
  galaxy: "星系",
  flap: "翻板",
  board: "板",
  spotify: "歌单",
  swirl: "旋",
  vortex: "涡",
  thermal: "热成像",
  tiktok: "短视频",
  cover: "封面",
  destruction: "碎裂",
  mechanical: "机械",
  other: "其他",
  scale: "缩放",
  bubble: "气泡",
  hex: "六边",
  anamorphic: "变形宽银幕",
  flare: "光斑",
  iphone: "手机",
  magnetic: "磁",
  portal: "门",
  shatter: "碎",
  vpn: "通道",
  youtube: "片站",
  spot: "点",
  wave: "波",
  world: "世界",
  comment: "评论",
  lcd: "屏显",
  prism: "棱镜",
  animated: "动",
  render: "渲",
  aurora: "极光",
  group: "组",
  hover: "悬停",
  pulse: "脉冲",
  timeline: "时间轴",
  before: "前",
  after: "后",
  out: "出",
  bottom: "底",
  browser: "浏览",
  depth: "景深",
  gate: "门",
  shake: "晃",
  blend: "混合",
  difference: "差",
  clip: "片段",
  emoji: "表情",
  glow: "发光",
  layers: "层",
  burst: "爆",
  karaoke: "逐字",
  shift: "切换",
  resize: "缩放",
  char: "字",
  explode: "炸开",
  aberration: "色差",
  run: "跑",
  comparison: "对比",
  confetti: "彩屑",
  conic: "锥",
  ring: "环",
  constellation: "星座",
  hub: "枢纽",
  glyph: "字形",
  curve: "曲线",
  decline: "下降",
  directional: "定向",
  hold: "停",
  dynamic: "动",
  echo: "回声",
  facet: "切面",
  resolve: "收住",
  gesture: "手势",
  tap: "点按",
  gloss: "亮泽",
  grade: "调色",
  pixelate: "像素",
  headline: "标题",
  arrow: "箭头",
  boil: "沸",
  box: "盒",
  label: "标签",
  bleed: "出血",
  inline: "行内",
  input: "输入",
  feedback: "反馈",
  keyframe: "关键帧",
  scrub: "拖看",
  center: "居中",
  build: "搭建",
  nucleus: "核",
  brand: "品牌",
  sting: "戳",
  checklist: "清单",
  mesh: "网",
  bg: "底",
  micro: "微",
  usage: "用量",
  modal: "弹层",
  multi: "多",
  splay: "散开",
  multiplayer: "多人",
  cursors: "光标",
  native: "系统",
  pileup: "堆叠",
  wheel: "轮",
  offset: "偏移",
  traveler: "游走",
  onboarding: "上手",
  stepper: "步骤",
  ordered: "有序",
  dither: "抖动",
  outline: "描边",
  oversized: "超大",
  overwhelm: "铺满",
  stations: "站",
  panel: "面板",
  dive: "俯冲",
  unzoom: "拉远",
  image: "图",
  crossfade: "叠化",
  rise: "升",
  perspective: "透视",
  marquee: "跑马",
  physical: "物理",
  exit: "退出",
  press: "按下",
  back: "回",
  refresh: "刷新",
  rubber: "橡皮筋",
  bumper: "缓冲",
  scramble: "打乱",
  feed: "信息流",
  segmentation: "分割",
  flood: "漫",
  separator: "分隔",
  settings: "设置",
  signup: "登记",
  simulated: "模拟",
  skeleton: "骨架",
  slit: "狭缝",
  slot: "槽",
  machine: "机",
  roll: "滚",
  social: "社交",
  blob: "团",
  spotlight: "追光",
  shuffle: "洗牌",
  lattice: "格",
  staggered: "错落",
  star: "星",
  rating: "评分",
  chip: "片",
  sticky: "粘",
  mock: "示意",
  stitched: "缝",
  stop: "停",
  cadence: "节奏",
  store: "店",
  streaming: "流",
  strikethrough: "删除线",
  replace: "替换",
  success: "成功",
  check: "勾",
  loader: "加载",
  stroke: "描边",
  swipe: "滑",
  tabs: "页签",
  telemetry: "遥测",
  simulator: "模拟",
  three: "三",
  orbiting: "环绕",
  takeover: "占满",
  calm: "静",
  flip: "翻",
  top: "顶",
  tracing: "描",
  beam: "光束",
  tracking: "跟踪",
  trust: "信任",
  strip: "条",
  typed: "打出",
  prompt: "提示",
  typewriter: "打字机",
  font: "字体",
  flex: "弹性",
  vector: "矢量",
  editor: "编辑",
  velocity: "速度",
  throw: "甩",
  snap: "吸合",
  vignette: "暗角",
  vox: "口播",
  annotate: "批注",
  whiteboard: "白板",
  wordmark: "字标",
  tiles: "砖",
  move: "移",
  pointer: "指针",
  feather: "羽化",
  in: "入",
  up: "上",
  per: "逐",
  the: "",
  by: "",
  to: "",
  x: "横",
  y: "纵",
  z: "深",
};

const STORY_TAGS = new Set(["captions", "caption-style", "typography", "handwritten", "text", "transition", "grain", "film", "title-card"]);
const PRODUCT_TAGS = new Set(["product-demo", "mock-ui", "gesture", "mobile", "pointer", "pointers", "notification", "showcase", "carousel", "cursor", "reveal"]);
const KNOWLEDGE_TAGS = new Set(["data", "chart", "handwritten", "captions", "caption-style", "code", "diagram", "flowchart", "portrait", "data-viz", "terminal", "stats", "counter"]);

function paint(html) {
  return html
    .replace(/#e4fa72/gi, TOKENS_COLOR.brand)
    .replace(/#35d6a0/gi, TOKENS_COLOR.brand)
    .replace(/#71f5a7/gi, TOKENS_COLOR.brand)
    .replace(/#22c55e/gi, TOKENS_COLOR.brand)
    .replace(/#61a8ff/gi, TOKENS_COLOR.accent)
    .replace(/#38bdf8/gi, TOKENS_COLOR.accent)
    .replace(/#326[fF][aA]8/g, TOKENS_COLOR.accent)
    .replace(/#ededef/gi, TOKENS_COLOR.bg)
    .replace(/#faf9f6/gi, TOKENS_COLOR.bg);
}

function applyPairs(html, pairs) {
  let next = html;
  for (const [from, to] of pairs) {
    if (from && from !== to) next = next.split(from).join(to);
  }
  return next;
}

function skin(name, html, title, line) {
  if (name === "data-chart") {
    html = applyPairs(html, [
      ["Monthly Revenue vs. Conversion Rate", title],
      ["Jan–Jun 2024, in thousands", line],
      [">Revenue<", ">收入<"],
      [">Conversion Rate<", ">转化<"],
      ["Source: Internal analytics", "本片"],
    ]);
  } else if (name === "flowchart-vertical") {
    html = applyPairs(html, [
      ["Should I learn to code?", title],
      [">Yes<", ">是<"],
      [">Not sure<", ">不确定<"],
      ["Start with Pythom", line],
      ["Try no-code first", "先试试看"],
      ["Build a personal website", "先做出来"],
      ["Take a free intro course", "再往下学"],
      [">You<", ">你<"],
    ]);
  } else if (name === "pull-to-refresh") {
    html = applyPairs(html, [
      ["Pull to refresh", "下拉刷新"],
      ["Pull to Refresh", "下拉刷新"],
      ["Release to refresh", "松开刷新"],
      [">Refreshing<", ">正在刷新<"],
      [">Activity<", `>${title}<`],
      ["Updated now", "刚刚"],
      ["Search activity", "搜索"],
      ["Alex shared a draft", title],
      ["Launch sequence, ready for review", line],
      ["Mika left feedback", "有一条新消息"],
      ["Three comments on the new flow", line],
      ["Noah published an update", "更新好了"],
      ["Mobile preview is available", line],
      ["Sara joined the project", "可以看了"],
      ["Workspace access granted", "已打开"],
    ]);
  } else if (name === "app-showcase") {
    html = applyPairs(html, [
      ["Unleash Full Potential", title],
      ["START NOW", "开始"],
      ["James Medrano", "口播"],
      ["Premium Member", "会员"],
      ["Weekly Goal", title],
      ["Your Progress", "进度"],
      ["See all", "全部"],
      [">Running<", ">跑步<"],
      [">Cycling<", ">骑行<"],
      [">Strength<", ">力量<"],
      ["Burned Calories", "消耗"],
    ]);
  } else if (name === "hw-pipeline") {
    html = applyPairs(html, [
      ['{ label: "Idea" }', `{ label: "${title}" }`],
      ['{ label: "Record" }', '{ label: "记下" }'],
      ['{ label: "Shine!" }', `{ label: "${line.slice(0, 8) || "成片"}" }`],
    ]);
  } else if (name === "hw-title") {
    html = applyPairs(html, [['text: "shine like the star you are"', `text: ${JSON.stringify(title)}`]]);
  } else if (name === "code-terminal-run") {
    html = applyPairs(html, [
      ["run build", "出片"],
      ["resolving 128 modules", "正在准备画面"],
      [">bundling <", ">正在合成 <"],
      ["ok 128 modules in 412 ms", "合成完成"],
      ["wrote ", "成片已落盘 "],
    ]);
  }
  html = html.split("HyperFrames").join("口播").split("HeyGen").join("口播").split("heygen").join("口播");
  return paint(html);
}

function findSrc(name, kind) {
  const candidates =
    kind === "component"
      ? [
          path.join(LAB, "compositions/components", `${name}.html`),
          path.join(LAB, "compositions/components", name, `${name}.html`),
        ]
      : [path.join(LAB, "compositions", `${name}.html`)];
  return candidates.find((file) => existsSync(file));
}

function copyAssets(html, rel) {
  const destHtml = path.join(HOUSE, rel);
  mkdirSync(path.dirname(destHtml), { recursive: true });
  const srcDir = path.dirname(path.join(LAB, rel));
  const destDir = path.dirname(destHtml);
  if (srcDir !== path.join(LAB, "compositions") && srcDir !== path.join(LAB, "compositions/components")) {
    for (const extra of ["assets", "images", "img"]) {
      const from = path.join(srcDir, extra);
      if (existsSync(from)) cpSync(from, path.join(destDir, extra), { recursive: true });
    }
  }
  if (html.includes("assets/fonts/Caveat-700-latin.woff2")) {
    const font = path.join(LAB, "assets/fonts/Caveat-700-latin.woff2");
    const dest = path.join(HOUSE, "assets/fonts/Caveat-700-latin.woff2");
    mkdirSync(path.dirname(dest), { recursive: true });
    if (existsSync(font)) copyFileSync(font, dest);
  }
}

function zhNum(n) {
  const d = "零一二三四五六七八九";
  if (n <= 0) return "零";
  if (n < 10) return d[n];
  if (n < 20) return `十${n === 10 ? "" : d[n % 10]}`;
  if (n < 100) return `${d[Math.floor(n / 10)]}十${n % 10 ? d[n % 10] : ""}`;
  return String(n)
    .split("")
    .map((c) => d[Number(c)])
    .join("");
}

function translateName(name) {
  if (KNOWN[name]) return KNOWN[name];
  const parts = name.split(/[-_]/).filter(Boolean);
  const out = [];
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      out.push(zhNum(Number(part)));
      continue;
    }
    const hit = WORD[part.toLowerCase()];
    if (hit) out.push(hit);
  }
  let label = out.join("") || "画面动效";
  label = label.replace(/[A-Za-z]{3,}/g, "");
  return label || "画面动效";
}

function modesFor(tags) {
  const modes = [];
  if (tags.some((t) => STORY_TAGS.has(t))) modes.push("story");
  if (tags.some((t) => PRODUCT_TAGS.has(t))) modes.push("product");
  if (tags.some((t) => KNOWLEDGE_TAGS.has(t))) modes.push("knowledge");
  return modes.length ? modes : ["story"];
}

function fitsFor(cat) {
  const fits = (cat.fits || []).filter((f) => f === "portrait" || f === "square" || f === "landscape");
  if (fits.length) return fits;
  if (cat.width && cat.height) {
    if (cat.height > cat.width * 1.15) return ["portrait"];
    if (cat.width > cat.height * 1.15) return ["landscape"];
    return ["square"];
  }
  return ["portrait", "square", "landscape"];
}

function isHost(cat, tags) {
  if (tags.some((t) => ["captions", "caption-style", "typography", "transition", "overlay", "grain", "film"].includes(t))) {
    return false;
  }
  return cat.type === "block";
}

function parseImageSlots(html) {
  const m = html.match(/data-composition-variables\s*=\s*'(\[[\s\S]*?\])'/i) || html.match(/data-composition-variables\s*=\s*"(\[[\s\S]*?\])"/i);
  if (!m?.[1]) return [];
  try {
    const raw = JSON.parse(m[1].replace(/&quot;/g, '"'));
    return (Array.isArray(raw) ? raw : [])
      .filter((v) => v && (v.type === "image" || /^image\d*$/i.test(v.id)))
      .map((v, i) => ({ id: v.id, label: `第${i + 1}屏`, hint: CINEMA_SLOT }));
  } catch {
    return [];
  }
}

function main() {
  const args = process.argv.slice(2);
  const all = args.includes("--all") || args.length === 0;
  const wanted = new Set(args.filter((a) => a !== "--all"));
  const existing = JSON.parse(readFileSync(HOUSE_JSON, "utf8"));
  const byWrap = new Map(existing.map((row) => [row.wraps, row]));
  const catalog = JSON.parse(readFileSync(CATALOG, "utf8"));
  mkdirSync(path.join(HOUSE, "compositions/components"), { recursive: true });
  writeFileSync(
    path.join(HOUSE, "hyperframes.json"),
    `${JSON.stringify({ paths: { blocks: "compositions", components: "compositions/components", assets: "assets" } }, null, 2)}\n`,
  );
  const labAssets = path.join(LAB, "assets");
  if (existsSync(labAssets)) cpSync(labAssets, path.join(HOUSE, "assets"), { recursive: true });

  const used = new Set();
  const next = [];
  let copied = 0;
  let skipped = 0;

  const rows = all ? catalog : catalog.filter((row) => wanted.has(row.name) || byWrap.has(row.name));
  if (!all && wanted.size) {
    for (const wrap of wanted) {
      if (!catalog.some((row) => row.name === wrap)) throw new Error(`not in catalog: ${wrap}`);
    }
  }

  for (const cat of rows) {
    const kind = cat.type === "block" ? "block" : "component";
    const src = findSrc(cat.name, kind);
    if (!src) {
      skipped += 1;
      continue;
    }
    const rel = path.relative(LAB, src);
    const html = skin(cat.name, readFileSync(src, "utf8"), DEFAULT_TITLE, DEFAULT_LINE);
    const dest = path.join(HOUSE, rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    writeFileSync(dest, html);
    copyAssets(html, rel);
    copied += 1;

    const prev = byWrap.get(cat.name);
    const tags = cat.tags || [];
    if (prev) {
      used.add(prev.label);
      for (const alias of prev.aliases || []) used.add(alias);
      next.push({
        ...prev,
        kind,
        width: typeof cat.width === "number" ? cat.width : prev.width,
        height: typeof cat.height === "number" ? cat.height : prev.height,
        duration: typeof cat.duration === "number" ? cat.duration : prev.duration,
        tags,
      });
      continue;
    }

    let label = translateName(cat.name);
    let n = 2;
    while (used.has(label) || /[A-Za-z]{3,}/.test(label)) {
      label = `${translateName(cat.name)}${zhNum(n)}`;
      n += 1;
      if (n > 40) {
        label = `画面${zhNum(copied)}`;
        break;
      }
    }
    used.add(label);
    let alias = `${label}一下`;
    let a = 2;
    while (used.has(alias)) {
      alias = `${label}${zhNum(a)}下`;
      a += 1;
    }
    used.add(alias);
    next.push({
      wraps: cat.name,
      label,
      host: isHost(cat, tags),
      modes: modesFor(tags),
      fits: fitsFor(cat),
      aliases: [alias],
      imageSlots: parseImageSlots(html),
      kind,
      width: typeof cat.width === "number" ? cat.width : undefined,
      height: typeof cat.height === "number" ? cat.height : undefined,
      duration: typeof cat.duration === "number" ? cat.duration : undefined,
      tags,
    });
  }

  writeFileSync(HOUSE_JSON, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`copied ${copied}, skipped ${skipped}, house ${next.length}`);
}

main();
