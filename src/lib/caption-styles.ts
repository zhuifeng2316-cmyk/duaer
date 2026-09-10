export const CAPTION_FAMILIES = ["slam", "editorial", "wipe", "weight", "highlight"] as const;
export type CaptionFamily = (typeof CAPTION_FAMILIES)[number];

export const HOUSE_CAPTION_STYLES = [
  { id: "caption-kinetic-slam", label: "砸字", family: "slam", preview: "slam" },
  { id: "caption-editorial-emphasis", label: "杂志字", family: "editorial", preview: "editorial" },
  { id: "caption-weight-shift", label: "字重切换", family: "weight", preview: "weight" },
  { id: "caption-highlight", label: "划重点", family: "highlight", preview: "highlight" },
  { id: "caption-clip-wipe", label: "字幕片段划转", family: "wipe", preview: "wipe" },
  { id: "caption-camera-follow", label: "字幕镜头跟随", family: "wipe", preview: "follow" },
  { id: "caption-glitch-rgb", label: "故障字", family: "slam", preview: "glitch" },
  { id: "caption-neon-glow", label: "霓虹字", family: "slam", preview: "neon" },
  { id: "caption-neon-accent", label: "字幕霓虹点缀", family: "slam", preview: "neonAccent" },
  { id: "caption-blend-difference", label: "字幕混合差", family: "editorial", preview: "blend" },
  { id: "caption-emoji-pop", label: "字幕表情弹出", family: "slam", preview: "emoji" },
  { id: "caption-gradient-fill", label: "字幕渐变铺满", family: "wipe", preview: "gradient" },
  { id: "caption-matrix-decode", label: "字幕矩阵解码", family: "slam", preview: "matrix" },
  { id: "caption-parallax-layers", label: "字幕视差层", family: "editorial", preview: "parallax" },
  { id: "caption-particle-burst", label: "字幕粒子爆", family: "slam", preview: "particle" },
  { id: "caption-pill-karaoke", label: "字幕胶囊逐字", family: "wipe", preview: "karaoke" },
  { id: "caption-texture", label: "字幕纹理", family: "editorial", preview: "texture" },
] as const;

export const LOOK_CAPTION_STYLES = [
  { id: "look-cream", label: "暖光嵌字", family: "editorial", preview: "lookCream" },
  { id: "look-ink", label: "压印字", family: "editorial", preview: "lookInk" },
  { id: "look-editorial", label: "斜体嵌字", family: "editorial", preview: "lookEditorial" },
  { id: "look-keynote", label: "演讲字", family: "slam", preview: "lookKeynote" },
  { id: "look-documentary", label: "纪录字", family: "editorial", preview: "lookDocumentary" },
  { id: "look-loud", label: "炸场字", family: "slam", preview: "lookLoud" },
  { id: "look-neon", label: "招牌霓虹", family: "slam", preview: "lookNeon" },
  { id: "look-glitch", label: "信号故障", family: "slam", preview: "lookGlitch" },
  { id: "look-chrome", label: "金属字", family: "slam", preview: "lookChrome" },
  { id: "look-velocity", label: "速度字", family: "slam", preview: "lookVelocity" },
  { id: "look-anchor", label: "新闻条", family: "wipe", preview: "lookAnchor" },
  { id: "look-ordnance", label: "冲压字", family: "slam", preview: "lookOrdnance" },
  { id: "look-terminal", label: "终端字", family: "wipe", preview: "lookTerminal" },
  { id: "look-neonsign", label: "手写霓虹", family: "slam", preview: "lookNeonsign" },
  { id: "look-stardust", label: "星尘字", family: "editorial", preview: "lookStardust" },
  { id: "look-stomp", label: "占屏字", family: "slam", preview: "lookStomp" },
  { id: "look-lastpage", label: "手稿字", family: "editorial", preview: "lookLastpage" },
  { id: "look-scoreboard", label: "翻牌字", family: "highlight", preview: "lookScoreboard" },
  { id: "look-transit", label: "到站屏", family: "wipe", preview: "lookTransit" },
  { id: "look-vhs", label: "录像带字", family: "wipe", preview: "lookVhs" },
  { id: "look-arcade", label: "街机字", family: "slam", preview: "lookArcade" },
  { id: "look-dossier", label: "卷宗字", family: "editorial", preview: "lookDossier" },
  { id: "look-laser", label: "激光字", family: "slam", preview: "lookLaser" },
  { id: "look-thunder", label: "闪电字", family: "slam", preview: "lookThunder" },
  { id: "look-hologram", label: "全息字", family: "wipe", preview: "lookHologram" },
  { id: "look-biolume", label: "深海光字", family: "editorial", preview: "lookBiolume" },
  { id: "look-aurora", label: "极光字", family: "editorial", preview: "lookAurora" },
  { id: "look-spectrum", label: "示波器字", family: "wipe", preview: "lookSpectrum" },
  { id: "look-papercut", label: "剪纸字", family: "highlight", preview: "lookPapercut" },
  { id: "look-popup", label: "立体书字", family: "highlight", preview: "lookPopup" },
  { id: "look-chalkboard", label: "粉笔字", family: "editorial", preview: "lookChalk" },
  { id: "look-graffiti", label: "涂鸦字", family: "slam", preview: "lookGraffiti" },
  { id: "look-brush", label: "毛笔字", family: "editorial", preview: "lookBrush" },
  { id: "look-inkwater", label: "墨水字", family: "editorial", preview: "lookInkwater" },
  { id: "look-ransom", label: "剪贴字", family: "slam", preview: "lookRansom" },
] as const;

export const FX_CAPTION_STYLES = [
  { id: "fx-typewriter", label: "打字机", family: "wipe", preview: "fxTypewriter" },
  { id: "fx-hw-title", label: "手写标题", family: "editorial", preview: "fxHwTitle" },
  { id: "fx-hw-write", label: "手写写标题", family: "editorial", preview: "fxHwWrite" },
  { id: "fx-path", label: "路径字", family: "editorial", preview: "fxPath" },
  { id: "fx-cloud", label: "字云", family: "highlight", preview: "fxCloud" },
  { id: "fx-shimmer", label: "文字闪光", family: "wipe", preview: "fxShimmer" },
  { id: "fx-stream", label: "流式字", family: "wipe", preview: "fxStream" },
  { id: "fx-drop", label: "顶落字", family: "slam", preview: "fxDrop" },
  { id: "fx-whiteboard", label: "白板墨字", family: "editorial", preview: "fxWhiteboard" },
  { id: "fx-stitch", label: "缝线字", family: "editorial", preview: "fxStitch" },
  { id: "fx-ticker", label: "滚字占满", family: "slam", preview: "fxTicker" },
  { id: "fx-notes", label: "备忘打字", family: "wipe", preview: "fxNotes" },
  { id: "fx-explode", label: "字炸开", family: "slam", preview: "fxExplode" },
  { id: "fx-slot", label: "翻滚字", family: "highlight", preview: "fxSlot" },
  { id: "fx-morph", label: "变形字", family: "weight", preview: "fxMorph" },
  { id: "fx-marker", label: "马克笔", family: "highlight", preview: "fxMarker" },
  { id: "fx-annotate", label: "口播批注", family: "editorial", preview: "fxAnnotate" },
  { id: "fx-tiles", label: "字标砖", family: "highlight", preview: "fxTiles" },
  { id: "fx-scan", label: "扫描条", family: "wipe", preview: "fxScan" },
  { id: "fx-marquee", label: "透视跑马", family: "wipe", preview: "fxMarquee" },
  { id: "fx-strike", label: "删除替换", family: "highlight", preview: "fxStrike" },
  { id: "fx-kinetic", label: "中心叠字", family: "slam", preview: "fxKinetic" },
  { id: "fx-rise", label: "逐词升", family: "wipe", preview: "fxRise" },
  { id: "fx-wave", label: "字重波", family: "weight", preview: "fxWave" },
] as const;

export const FRAME_CAPTION_STYLES = [
  { id: "frame-coral", label: "珊瑚硬边", family: "wipe", preview: "frameCoral" },
  { id: "frame-capsule", label: "圆角胶囊", family: "wipe", preview: "frameCapsule" },
  { id: "frame-forest", label: "林间杂志", family: "wipe", preview: "frameForest" },
  { id: "frame-daisy", label: "贴纸字", family: "wipe", preview: "frameDaisy" },
  { id: "frame-broadside", label: "抗议报", family: "wipe", preview: "frameBroadside" },
  { id: "frame-creative", label: "厚边黄块", family: "wipe", preview: "frameCreative" },
  { id: "frame-cobalt", label: "钴蓝格", family: "wipe", preview: "frameCobalt" },
  { id: "frame-code", label: "代码杂志", family: "wipe", preview: "frameCode" },
  { id: "frame-cartesian", label: "博物条", family: "wipe", preview: "frameCartesian" },
  { id: "frame-block", label: "方块戳", family: "wipe", preview: "frameBlock" },
  { id: "frame-poster", label: "海报条", family: "wipe", preview: "framePoster" },
  { id: "frame-blue", label: "专业蓝", family: "wipe", preview: "frameBlue" },
  { id: "frame-biennale", label: "双年展黄", family: "wipe", preview: "frameBiennale" },
] as const;

export const MOVE_CAPTION_STYLES = [
  { id: "move-rgb", label: "色散故障", family: "slam", preview: "moveRgb" },
  { id: "move-blur-up", label: "虚化出上", family: "wipe", preview: "moveBlurUp" },
  { id: "move-bottom", label: "底上字母", family: "wipe", preview: "moveBottom" },
  { id: "move-soft", label: "柔虚化入", family: "wipe", preview: "moveSoft" },
  { id: "move-focus", label: "聚焦收住", family: "editorial", preview: "moveFocus" },
  { id: "move-headline", label: "标题砸字", family: "slam", preview: "moveHeadline" },
  { id: "move-inline", label: "行内高亮", family: "highlight", preview: "moveInline" },
  { id: "move-lines", label: "逐行滑入", family: "wipe", preview: "moveLines" },
  { id: "move-crossfade", label: "逐词叠化", family: "wipe", preview: "moveCrossfade" },
  { id: "move-tracking", label: "字距收紧", family: "editorial", preview: "moveTracking" },
  { id: "move-axis-y", label: "纵轴字", family: "wipe", preview: "moveAxisY" },
  { id: "move-axis-z", label: "深轴字", family: "slam", preview: "moveAxisZ" },
  { id: "move-particle", label: "粒子叠化", family: "slam", preview: "moveParticle" },
  { id: "move-sweep", label: "闪烁扫过", family: "wipe", preview: "moveSweep" },
  { id: "move-callout", label: "标注高亮", family: "highlight", preview: "moveCallout" },
  { id: "move-emphasis", label: "强调打字", family: "wipe", preview: "moveEmphasis" },
  { id: "move-prism", label: "棱镜标题", family: "slam", preview: "movePrism" },
  { id: "move-feather", label: "羽化高亮", family: "highlight", preview: "moveFeather" },
  { id: "move-news", label: "新闻滚字", family: "wipe", preview: "moveNews" },
  { id: "move-third", label: "下三分大字", family: "wipe", preview: "moveThird" },
  { id: "move-flex", label: "弹性字重", family: "weight", preview: "moveFlex" },
  { id: "move-ascii", label: "字符画", family: "editorial", preview: "moveAscii" },
  { id: "move-swap", label: "砸字对切", family: "slam", preview: "moveSwap" },
  { id: "move-code", label: "代码打字", family: "wipe", preview: "moveCode" },
] as const;

export const CARD_CAPTION_STYLES = [
  { id: "card-academic", label: "讲义字", family: "editorial", preview: "cardAcademic" },
  { id: "card-editorial", label: "珊瑚引文", family: "editorial", preview: "cardEditorial" },
  { id: "card-minimal", label: "极简大字", family: "slam", preview: "cardMinimal" },
  { id: "card-spotlight", label: "聚光字", family: "slam", preview: "cardSpotlight" },
  { id: "card-geom", label: "撞色字", family: "slam", preview: "cardGeom" },
  { id: "card-whiteboard", label: "白板卡", family: "editorial", preview: "cardWhiteboard" },
  { id: "card-audit", label: "审核戳", family: "highlight", preview: "cardAudit" },
  { id: "card-terminal", label: "终端卡", family: "wipe", preview: "cardTerminal" },
  { id: "card-swiss", label: "瑞士字", family: "editorial", preview: "cardSwiss" },
  { id: "card-social", label: "种草字", family: "highlight", preview: "cardSocial" },
] as const;

export const POP_CAPTION_STYLES = [
  { id: "pop-scramble", label: "打乱露出", family: "slam", preview: "popScramble" },
  { id: "pop-stagger", label: "错落淡上", family: "wipe", preview: "popStagger" },
  { id: "pop-texture", label: "遮罩字", family: "editorial", preview: "popTexture" },
  { id: "pop-count", label: "数字弹", family: "slam", preview: "popCount" },
  { id: "pop-line-swap", label: "线对切", family: "wipe", preview: "popLineSwap" },
  { id: "pop-blur-in", label: "虚化入", family: "wipe", preview: "popBlurIn" },
  { id: "pop-page", label: "翻页滑入", family: "wipe", preview: "popPage" },
  { id: "pop-match", label: "对上切", family: "slam", preview: "popMatch" },
  { id: "pop-flap", label: "翻板字", family: "highlight", preview: "popFlap" },
  { id: "pop-cursor", label: "字光标", family: "wipe", preview: "popCursor" },
  { id: "pop-flash", label: "杂志闪", family: "editorial", preview: "popFlash" },
  { id: "pop-underline", label: "手写下划", family: "editorial", preview: "popUnderline" },
  { id: "pop-white", label: "闪白字", family: "slam", preview: "popWhite" },
  { id: "pop-state", label: "状态对切", family: "weight", preview: "popState" },
  { id: "pop-dots", label: "打字点", family: "wipe", preview: "popDots" },
  { id: "pop-halftone", label: "网点字", family: "editorial", preview: "popHalftone" },
] as const;

export const CAPTION_STYLES = [
  ...HOUSE_CAPTION_STYLES,
  ...LOOK_CAPTION_STYLES,
  ...FX_CAPTION_STYLES,
  ...FRAME_CAPTION_STYLES,
  ...MOVE_CAPTION_STYLES,
  ...CARD_CAPTION_STYLES,
  ...POP_CAPTION_STYLES,
] as const;

export const LOOK_RAIL_PREVIEWS = new Set([
  "lookAnchor",
  "lookTerminal",
  "lookTransit",
  "lookVhs",
  "lookChalk",
  "lookScoreboard",
  "lookHologram",
  "lookSpectrum",
]);

export const LOOK_CHIP_PREVIEWS = new Set(["lookPapercut", "lookPopup", "lookScoreboard", "lookRansom"]);

export const FX_RAIL_PREVIEWS = new Set(["fxTypewriter", "fxNotes", "fxScan", "fxAnnotate", "fxWhiteboard"]);

export const FX_CHIP_PREVIEWS = new Set(["fxCloud", "fxTiles", "fxSlot", "fxStrike", "fxMarker"]);

export const FRAME_PILL_PREVIEWS = new Set(FRAME_CAPTION_STYLES.map((row) => row.preview));

export const MOVE_RAIL_PREVIEWS = new Set(["moveNews", "moveThird", "moveCode", "moveEmphasis", "moveCallout"]);

export const MOVE_CHIP_PREVIEWS = new Set(["moveInline", "moveCallout", "moveFeather"]);

export const CARD_RAIL_PREVIEWS = new Set([
  "cardAcademic",
  "cardEditorial",
  "cardWhiteboard",
  "cardAudit",
  "cardTerminal",
  "cardSwiss",
  "cardSocial",
]);

export const CARD_CHIP_PREVIEWS = new Set(["cardGeom", "cardSocial", "cardAudit"]);

export const POP_CHIP_PREVIEWS = new Set(["popFlap", "popDots"]);

export const POP_RAIL_PREVIEWS = new Set(["popCursor", "popDots"]);

/** 一词一词砸进画面（对应成片 .kt-word），不要整段一起跳。 */
export const PREVIEW_SLAM_STACK = new Set([
  "slam",
  "lookLoud",
  "lookStomp",
  "lookOrdnance",
  "lookKeynote",
  "lookArcade",
  "lookVelocity",
  "fxDrop",
  "fxExplode",
  "fxKinetic",
  "fxTicker",
  "moveHeadline",
  "moveAxisZ",
  "moveSwap",
  "cardMinimal",
  "popCount",
  "popMatch",
  "popWhite",
]);

/** 拆成单字做错落 / 字重 / 打字 / 打乱。 */
export const PREVIEW_CHAR_SPLIT = new Set([
  "editorial",
  "weight",
  "wipe",
  "follow",
  "blend",
  "parallax",
  "texture",
  "matrix",
  "glitch",
  "lookGlitch",
  "lookEditorial",
  "lookInk",
  "lookBrush",
  "lookGraffiti",
  "lookRansom",
  "fxRise",
  "fxWave",
  "fxMorph",
  "fxTypewriter",
  "fxStream",
  "fxNotes",
  "moveBottom",
  "moveLines",
  "moveCrossfade",
  "moveTracking",
  "moveFlex",
  "moveCode",
  "moveEmphasis",
  "moveRgb",
  "popStagger",
  "popPage",
  "popLineSwap",
  "popScramble",
  "popState",
  "popCursor",
  "popHalftone",
]);

export type CaptionStyleId = (typeof CAPTION_STYLES)[number]["id"];
export type CaptionPreviewId = (typeof CAPTION_STYLES)[number]["preview"];

export function captionPreviewTokens(text: string, mode: "stack" | "chars"): string[] {
  const cleaned = (text || "口播字").replace(/[，。！？、：；…—,.!?;:“”"'‘’\s]+/g, "").slice(0, 12) || "口播字";
  if (mode === "chars") return Array.from(cleaned).slice(0, 8);
  const out: string[] = [];
  for (let i = 0; i < Math.min(cleaned.length, 8); i += 2) out.push(cleaned.slice(i, i + 2));
  return out.length ? out : ["口播"];
}

export function parseCaptionStyle(raw: unknown): CaptionStyleId | undefined {
  const id = String(raw || "").trim();
  return CAPTION_STYLES.some((row) => row.id === id) ? (id as CaptionStyleId) : undefined;
}

export function captionStyleMeta(raw: unknown): (typeof CAPTION_STYLES)[number] | undefined {
  const id = parseCaptionStyle(raw);
  return id ? CAPTION_STYLES.find((row) => row.id === id) : undefined;
}

export function resolveCaptionStyle(shotStyle?: unknown, projectStyle?: unknown) {
  return captionStyleMeta(shotStyle) || captionStyleMeta(projectStyle);
}

export function captionStyleLabel(raw: unknown): string {
  return captionStyleMeta(raw)?.label || "自动";
}

export function captionSkinClass(raw: unknown): string {
  const id = parseCaptionStyle(raw);
  return id ? `cap-${id.replace(/^caption-/, "")}` : "";
}
