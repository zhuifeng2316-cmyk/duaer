/** Forced look for every clone still. Head refs lock the face; this locks the movie light. */
export const CINEMA_STILL_LOCK = [
  "画面是电影大片静帧：有主光和轮廓光，浅景深，胶片色彩，环境有气氛。",
  "把附图这个人放进场景里，不是手机自拍，不是证件照。",
  "闭口、自然表情，不做主持，不对镜头讲话。",
  "不要另造一个演员，不要整容，不要磨成网红脸。",
].join("");

export const CINEMA_TURNAROUND_LOCK =
  "这是同一个人站在电影光里：浅景深、胶片色彩。不是证件照，不是白底头像。";

export const CINEMA_IDENTITY_LEAD =
  "先看附图。输出里的人必须是附图同一个人：同一张脸、同一发型、同一发色、同一年龄。不要换人，不要变年轻，不要画成另一个演员。";

export const CINEMA_WARDROBE_LOCK =
  "附图里能看见的衣服颜色和款式尽量原样留下，不要换成西装、皮衣或另一套戏服。只改场景、光线和摄像机位置。";

export const DEFAULT_CINEMA_LOOK = "电影大片光影，浅景深，胶片色彩，真人质感";

/** Locked chrome for every house component. Uploads keep their own pixels. */
export const CINEMA_GRAPHIC_TOKENS = {
  bg: "#0c0a08",
  fg: "#f4ead0",
  brand: "#e8c56a",
  accent: "#d4a05a",
  accent2: "#c9b896",
  surface: "#1a1610",
  border: "#3d3428",
  muted: "#b8a88a",
};

export const CINEMA_HOST_GRADE = [
  "data-chart",
  "caption-highlight",
  "carousel-circle-1",
  "oversized-cursor",
  "app-showcase",
];

export function cinemaGraphicToken(id: string): string {
  const k = id.toLowerCase().replace(/[-_]/g, "");
  if (k === "bg" || k === "background") return CINEMA_GRAPHIC_TOKENS.bg;
  if (k === "fg" || k === "foreground" || k === "hwink") return CINEMA_GRAPHIC_TOKENS.fg;
  if (k === "surface") return CINEMA_GRAPHIC_TOKENS.surface;
  if (k === "border") return CINEMA_GRAPHIC_TOKENS.border;
  if (k === "muted") return CINEMA_GRAPHIC_TOKENS.muted;
  if (k === "accent") return CINEMA_GRAPHIC_TOKENS.accent;
  if (k === "accent2" || k === "accenttwo") return CINEMA_GRAPHIC_TOKENS.accent2;
  return CINEMA_GRAPHIC_TOKENS.brand;
}

export function cinemaMountVars(): string {
  const t = CINEMA_GRAPHIC_TOKENS;
  return [
    `--bg:${t.bg}`,
    `--background:${t.bg}`,
    `--fg:${t.fg}`,
    `--brand:${t.brand}`,
    `--accent:${t.accent}`,
    `--accent-2:${t.accent2}`,
    `--hf-accent:${t.brand}`,
    `--hf-surface:${t.surface}`,
    `--hf-bg:${t.bg}`,
    `--hf-fg:${t.fg}`,
    `--surface:${t.surface}`,
    `--border:${t.border}`,
    `--muted:${t.muted}`,
    `--ns-accent:${t.brand}`,
    `--ufz-accent:${t.brand}`,
    `--opt-accent:${t.brand}`,
    `--nnp-accent:${t.brand}`,
    `--cu-accent:${t.brand}`,
    `--ctr-accent:${t.accent}`,
    `--hw-ink:${t.fg}`,
    `--hw-accent:${t.brand}`,
    `--hw-accent-warm:${t.brand}`,
  ].join(";");
}

export function needsCinemaHostGrade(name: string): boolean {
  return CINEMA_HOST_GRADE.includes(name);
}

export const CINEMA_GRAPHIC_LOCK = [
  "这是电影大片里的产品界面，不是扁平互联网风。",
  "暗部底、胶片色彩、暖金点缀，浅景深边缘光。",
  "不要白底后台、不要马卡龙、不要赛博霓虹皮肤、不要贴纸插画风。",
].join("");

export const CINEMA_BAKEOFF_SCENE =
  "雨夜城市街头，湿地面映着霓虹，浅景深，轮廓光与主光，胶片色彩。这个人在画面里，半身，闭口，像被电影灯光照到的同一个人。";

/** Talk stills are movie posters. Identity packs stay letterless. */
export function cinemaPosterTitle(onScreenText?: string): string {
  const raw = String(onScreenText || "")
    .replace(/[《》〈〉「」『』""'']/g, "")
    .trim();
  if (!raw) return "";
  const clause = raw.split(/[，。！？、；：\n]/).map((part) => part.trim()).find(Boolean) || raw;
  const title = clause.replace(/[？?！!。.]$/g, "").trim();
  if (title.length <= 8) return title;
  return title.slice(0, 6);
}

export function stripBoardLettering(frame: string): string {
  return String(frame || "")
    .replace(/画上屏幕字[：:][^。]*/g, "")
    .replace(/[，、]?\s*大标题位画上[^。]*/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/[，、。\s]+$/g, "")
    .trim();
}

export function cinemaPosterCopy(onScreenText?: string): string {
  const title = cinemaPosterTitle(onScreenText);
  if (!title) {
    return "构图按电影大片海报来：人物让出上三分之一或下三分之一的标题位。无水印、画面上不要字。不要任何汉字、英文、数字、招牌字、海报标题。";
  }
  return [
    "构图按电影大片海报来：人物放在中下或一侧，给一行短标题留空。",
    "画面上最多一行短标题，三四字到六字，像电影海报片名。",
    `标题只能写：「${title}」。不要把口播整句画上去，不要字幕条，不要英文，不要再多写字。`,
    "字要清楚，奶油色或暖金，不是手机底部小字幕，不是水印。",
  ].join("");
}

export function cinemaMovieStillPrompt(opts: {
  scene: string;
  identity?: string;
  angle?: string;
}): string {
  const who = (opts.identity || "").trim();
  const angle = (opts.angle || "").trim();
  return [
    "任务：把附图这个人放进电影场景。不是另画一个演员，不是证件头像转面。",
    "先锁脸。输出里的人必须与附图是同一个人，要能一眼认出来。",
    "五官、脸型、发型、发色、年龄必须和附图一致，不要变年轻。",
    CINEMA_WARDROBE_LOCK,
    CINEMA_STILL_LOCK,
    who ? `附图脸上能看见的特征（必须保留）：${who}` : "",
    angle ? `只转动摄像机：${angle}。人还是这个人，衣服还是这身。` : "",
    `这一镜只改场景和光：${opts.scene.trim()}`,
    "只生成一张图，不要文字回复。画幅 9:16，像素 1440x2560，无水印、画面上不要字。",
  ]
    .filter(Boolean)
    .join("\n");
}
