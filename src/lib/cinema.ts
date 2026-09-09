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

export const CINEMA_BAKEOFF_SCENE =
  "雨夜城市街头，湿地面映着霓虹，浅景深，轮廓光与主光，胶片色彩。这个人在画面里，半身，闭口，像被电影灯光照到的同一个人。";

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
    "只生成一张图，不要文字回复。画幅 9:16，像素 1080x1920，无水印、画面上不要字。",
  ]
    .filter(Boolean)
    .join("\n");
}
