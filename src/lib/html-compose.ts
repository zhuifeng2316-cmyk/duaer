import type { Aspect, Motion } from "./aspect";
import { ASPECT_SIZE, parseMotion } from "./aspect";
import { getScriptModel, isFlowMock } from "./flow/config";
import { flowChat } from "./flow/chat";
import type { Script } from "./types";

export type EditClip = {
  id: string;
  stillRel: string;
  start: number;
  duration: number;
  motion: Motion;
  onScreenText: string;
  voiceover: string;
};

export type CaptionWord = { text: string; start: number; end: number };
export type CaptionGroup = { wordStart: number; wordEnd: number; start: number; end: number };

export type EditList = {
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  hook: string;
  cta: string;
  clips: EditClip[];
  speechRel?: string;
  bgmRel?: string;
  speechVolume: number;
  bgmVolume: number;
};

export type ParsedClip = {
  src: string;
  start: number;
  duration: number;
  motion: Motion;
  text?: string;
};

/** Nested grade payload for stills: film stock, not a selfie filter. */
export const FILM_STILL_GRADE = {
  adjust: {
    contrast: 0.14,
    saturation: -0.05,
    temperature: 0.1,
    shadows: -0.08,
    highlights: 0.04,
    blacks: -0.05,
  },
  details: {
    grain: 0.28,
    vignette: 0.42,
  },
  effects: {
    bloom: 0.16,
  },
};

const GSAP_SRC = "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap";

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i")) || tag.match(new RegExp(`${name}='([^']*)'`, "i"));
  return m?.[1] || "";
}

export function allowedRemoteUrl(url: string): boolean {
  return (
    /^https:\/\/cdn\.jsdelivr\.net\/npm\/gsap@3(?:\.[\d.]+)?\/dist\/gsap\.min\.js$/i.test(url) ||
    /^https:\/\/fonts\.googleapis\.com(?:\/|$)/i.test(url) ||
    /^https:\/\/fonts\.gstatic\.com(?:\/|$)/i.test(url)
  );
}

export function tokenizeCaption(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const parts: string[] = [];
  const re = /[A-Za-z0-9]+(?:'[A-Za-z]+)?|[\u4e00-\u9fff]|[^\s]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) {
    const tok = m[0];
    if (/^[\s.,!?;:，。！？、：；…—-]+$/.test(tok)) {
      if (parts.length) parts[parts.length - 1] += tok;
      continue;
    }
    parts.push(tok);
  }
  return parts;
}

export function buildCaptionTrack(list: EditList): { words: CaptionWord[]; groups: CaptionGroup[] } {
  const words: CaptionWord[] = [];
  const groups: CaptionGroup[] = [];

  function addPhrase(text: string, start: number, end: number) {
    const tokens = tokenizeCaption(text);
    if (!tokens.length || end - start < 0.08) return;
    const wordStart = words.length;
    const each = (end - start) / tokens.length;
    tokens.forEach((token, i) => {
      words.push({
        text: token,
        start: Number((start + i * each).toFixed(3)),
        end: Number((start + (i + 1) * each).toFixed(3)),
      });
    });
    groups.push({ wordStart, wordEnd: words.length - 1, start, end });
  }

  const hookEnd = Math.min(2.2, list.durationSec);
  if (list.hook) addPhrase(list.hook, 0, hookEnd);
  for (const clip of list.clips) {
    const text = clip.voiceover || clip.onScreenText;
    let start = clip.start;
    const end = clip.start + clip.duration;
    if (list.hook && start < hookEnd) start = Math.min(end, Math.max(start, hookEnd));
    addPhrase(text, start, end);
  }
  const ctaStart = Math.max(0, list.durationSec - 2.4);
  if (list.cta) {
    for (const group of groups) {
      if (group.end > ctaStart) group.end = ctaStart;
    }
    addPhrase(list.cta, ctaStart, list.durationSec);
  }
  return { words, groups };
}

export function buildEditList(opts: {
  script: Script;
  stillRels: string[];
  aspect: Aspect;
  speechRel?: string;
  bgmRel?: string;
}): EditList {
  const { width, height } = ASPECT_SIZE[opts.aspect];
  let start = 0;
  const clips: EditClip[] = opts.script.shots.map((shot, i) => {
    const clip: EditClip = {
      id: `shot-${i + 1}`,
      stillRel: opts.stillRels[i] || opts.stillRels[0] || `stills/shot-${i + 1}.png`,
      start,
      duration: shot.durationSec,
      motion: shot.motion,
      onScreenText: shot.onScreenText,
      voiceover: shot.voiceover,
    };
    start += shot.durationSec;
    return clip;
  });
  return {
    width,
    height,
    fps: 25,
    durationSec: start || opts.script.shots.reduce((n, s) => n + s.durationSec, 0),
    hook: opts.script.hook,
    cta: opts.script.cta,
    clips,
    speechRel: opts.speechRel,
    bgmRel: opts.bgmRel,
    speechVolume: 1,
    bgmVolume: 0.16,
  };
}

/** Paths resolve from the compose/ project root, never `../`. */
export function mediaHref(rel: string): string {
  return rel.replace(/^\/+/, "").replace(/^\.\.\//, "").replace(/^\.\//, "");
}

export function filmGradeAttr(): string {
  return JSON.stringify(FILM_STILL_GRADE);
}

function cinemaCss(list: EditList): string {
  const scaleX = list.width / 1920;
  const scaleY = list.height / 1080;
  const pad = Math.round(100 * scaleX);
  const bottom = Math.round(140 * scaleY);
  const fontPx = Math.round(80 * Math.min(1, list.width / 1080));
  return `    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; background: #000; overflow: hidden; width: ${list.width}px; height: ${list.height}px; }
    #root {
      position: relative; width: ${list.width}px; height: ${list.height}px;
      overflow: hidden; background: #07080c;
    }
    .clip { position: absolute; inset: 0; }
    .still {
      width: 100%; height: 100%; object-fit: cover;
      transform-origin: 50% 42%; will-change: transform;
    }
    #hl-container {
      position: absolute; inset: 0; z-index: 10; pointer-events: none;
    }
    .hl-group {
      position: absolute; bottom: ${bottom}px; left: 0; width: 100%;
      display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: center;
      gap: 8px; padding: 0 ${pad}px; opacity: 0; visibility: hidden;
    }
    .hl-word {
      font-family: "Montserrat", "PingFang SC", "Hiragino Sans GB", sans-serif;
      font-weight: 800; font-size: ${fontPx}px; color: #fff;
      display: inline-block; letter-spacing: 0.02em; line-height: 1;
      position: relative; padding: 6px 12px 8px;
      text-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
      transform-origin: 50% 58%;
    }
    .hl-word-bg {
      position: absolute; inset: 0;
      background: linear-gradient(135deg, #ff1745 0%, #df1238 100%);
      border-radius: 10px; opacity: 0; transform: scaleX(0);
      transform-origin: 0% 50%; z-index: -1;
    }
    .hl-word-text { position: relative; z-index: 1; }`;
}

export function fallbackCinemaHtml(list: EditList): string {
  const duration = list.durationSec.toFixed(2);
  const grade = filmGradeAttr();
  const stills = list.clips
    .map((c) => {
      return `    <section class="clip" id="${c.id}" data-start="${c.start}" data-duration="${c.duration}" data-track-index="0" data-motion="${c.motion}">
      <img id="${c.id}-still" class="still" src="${mediaHref(c.stillRel)}" data-color-grading='${grade}' alt="" />
    </section>`;
    })
    .join("\n");
  const speech = list.speechRel
    ? `    <audio id="vo" data-start="0" data-duration="${duration}" data-track-index="10" data-volume="${list.speechVolume}" src="${mediaHref(list.speechRel)}"></audio>`
    : "";
  const bgm = list.bgmRel
    ? `    <audio id="bgm" data-start="0" data-duration="${duration}" data-track-index="11" data-volume="${list.bgmVolume}" src="${mediaHref(list.bgmRel)}"></audio>`
    : "";
  const track = buildCaptionTrack(list);
  const motions = list.clips.map((c) => ({ id: c.id, start: c.start, duration: c.duration, motion: c.motion }));
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${list.width}, height=${list.height}" />
  <title>cinema</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${FONT_HREF}" rel="stylesheet" />
  <script src="${GSAP_SRC}"></script>
  <style>
${cinemaCss(list)}
  </style>
</head>
<body>
  <div id="root" data-composition-id="cinema" data-start="0" data-duration="${duration}" data-width="${list.width}" data-height="${list.height}" data-fps="${list.fps}">
${stills}
    <div id="hl-container" data-layout-allow-caption-zone></div>
${speech}
${bgm}
  </div>
  <script>
(function () {
  var WORDS = ${JSON.stringify(track.words)};
  var GROUPS = ${JSON.stringify(track.groups)};
  var MOTION = ${JSON.stringify(motions)};
  var container = document.getElementById("hl-container");
  var tl = gsap.timeline({ paused: true });
  var _fitCanvas = document.createElement("canvas");
  var _fitCtx = _fitCanvas.getContext("2d");
  function fitFontSize(text, baseFontSize, fontWeight, fontFamily, maxWidth) {
    var size = baseFontSize;
    var minSize = Math.floor(baseFontSize * 0.45);
    while (size > minSize) {
      _fitCtx.font = fontWeight + " " + size + "px " + fontFamily;
      if (_fitCtx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    }
    return minSize;
  }
  var fontPx = ${Math.round(80 * Math.min(1, list.width / 1080))};
  var safeWidth = ${Math.max(200, list.width - Math.round(200 * (list.width / 1920)))};
  MOTION.forEach(function (c) {
    var el = "#" + c.id + "-still";
    if (c.motion === "pull-out") tl.fromTo(el, { scale: 1.16 }, { scale: 1.02, duration: c.duration, ease: "none" }, c.start);
    else if (c.motion === "pan-left") tl.fromTo(el, { scale: 1.12, xPercent: 3.6 }, { scale: 1.12, xPercent: -3.6, duration: c.duration, ease: "none" }, c.start);
    else if (c.motion === "pan-right") tl.fromTo(el, { scale: 1.12, xPercent: -3.6 }, { scale: 1.12, xPercent: 3.6, duration: c.duration, ease: "none" }, c.start);
    else if (c.motion === "punch") tl.fromTo(el, { scale: 1 }, { scale: 1.22, duration: c.duration, ease: "none" }, c.start);
    else tl.fromTo(el, { scale: 1.02 }, { scale: 1.14, duration: c.duration, ease: "none" }, c.start);
  });
  GROUPS.forEach(function (g, gi) {
    var groupWords = WORDS.slice(g.wordStart, g.wordEnd + 1);
    var grp = document.createElement("div");
    grp.className = "hl-group";
    grp.id = "hl-grp-" + gi;
    var groupText = groupWords.map(function (w) { return w.text; }).join("");
    var computedSize = fitFontSize(groupText, fontPx, "800", "Montserrat", safeWidth);
    groupWords.forEach(function (w, i) {
      var wi = g.wordStart + i;
      var wordEl = document.createElement("span");
      wordEl.className = "hl-word";
      wordEl.id = "hl-w-" + wi;
      wordEl.style.fontSize = computedSize + "px";
      var bgEl = document.createElement("span");
      bgEl.className = "hl-word-bg";
      bgEl.id = "hl-bg-" + wi;
      var textEl = document.createElement("span");
      textEl.className = "hl-word-text";
      textEl.textContent = w.text;
      wordEl.appendChild(bgEl);
      wordEl.appendChild(textEl);
      grp.appendChild(wordEl);
    });
    container.appendChild(grp);
    tl.set(grp, { visibility: "visible" }, g.start);
    tl.fromTo(grp, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: "power2.out" }, g.start);
    groupWords.forEach(function (w, i) {
      var wi = g.wordStart + i;
      var bgEl = document.getElementById("hl-bg-" + wi);
      var wordEl = document.getElementById("hl-w-" + wi);
      tl.to(bgEl, { opacity: 1, scaleX: 1, duration: 0.15, ease: "power2.out" }, w.start);
      tl.to(wordEl, { filter: "brightness(1.05)", duration: 0.08, ease: "power2.out" }, w.start);
      tl.to(wordEl, { filter: "brightness(1)", duration: 0.16, ease: "power2.out" }, w.start + 0.08);
      tl.to(bgEl, { opacity: 0, scaleX: 1.02, duration: 0.1, ease: "power2.in" }, w.end);
      tl.set(bgEl, { scaleX: 0 }, w.end + 0.1);
    });
    tl.to(grp, { opacity: 0, duration: 0.1, ease: "power2.in" }, Math.max(g.start, g.end - 0.1));
    tl.set(grp, { opacity: 0, visibility: "hidden" }, g.end);
  });
  tl.seek(0);
  window.__timelines = window.__timelines || {};
  window.__timelines["cinema"] = tl;
})();
  </script>
</body>
</html>
`;
}

export function extractHtmlDocument(raw: string): string {
  let text = raw.trim().replace(/^\uFEFF/, "");
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:html)?\s*/i, "").replace(/\s*```$/m, "").trim();
  }
  const start = text.search(/<!doctype html>|<html[\s>]/i);
  if (start >= 0) text = text.slice(start);
  const end = text.toLowerCase().lastIndexOf("</html>");
  if (end >= 0) text = text.slice(0, end + 7);
  return text.trim();
}

function remoteUrls(html: string): string[] {
  const found: string[] = [];
  const re = /https?:\/\/[^"'\\\s>]+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) found.push(m[0].replace(/[.,);]+$/, ""));
  return found;
}

export function validateCinemaHtml(html: string, list: EditList): { ok: boolean; reason?: string } {
  if (!/<div[^>]*data-composition-id=/i.test(html)) return { ok: false, reason: "missing composition" };
  if (!html.includes(`data-width="${list.width}"`) && !html.includes(`data-width='${list.width}'`)) {
    return { ok: false, reason: "width" };
  }
  if (!html.includes(`data-height="${list.height}"`) && !html.includes(`data-height='${list.height}'`)) {
    return { ok: false, reason: "height" };
  }
  if (/javascript:/i.test(html)) return { ok: false, reason: "remote" };
  if (remoteUrls(html).some((url) => !allowedRemoteUrl(url))) return { ok: false, reason: "remote" };
  if (!/data-color-grading=/i.test(html)) return { ok: false, reason: "grade" };
  if (!/"grain"\s*:/i.test(html) && !/\bgrain\b/i.test(html)) return { ok: false, reason: "grain" };
  if (!/"vignette"\s*:/i.test(html) && !/\bvignette\b/i.test(html)) return { ok: false, reason: "vignette" };
  if (/data-no-timeline/i.test(html)) return { ok: false, reason: "timeline" };
  if (!/window\.__timelines/i.test(html) || !/gsap\.timeline\(\s*\{\s*paused:\s*true/i.test(html)) {
    return { ok: false, reason: "timeline" };
  }
  if (/@keyframes ken-push/i.test(html)) return { ok: false, reason: "motion" };
  if (!/\.hl-group/.test(html) || !/\.hl-word/.test(html)) return { ok: false, reason: "captions" };
  if (!/fromTo\(el/.test(html) && !/fromTo\(/.test(html)) return { ok: false, reason: "motion" };
  for (const clip of list.clips) {
    const name = clip.stillRel.split("/").pop() || clip.stillRel;
    if (!html.includes(name)) return { ok: false, reason: `missing ${name}` };
  }
  if (list.speechRel) {
    const name = list.speechRel.split("/").pop() || list.speechRel;
    if (!html.includes(name)) return { ok: false, reason: "speech" };
    if (!/<audio[^>]*\bid=["']vo["']/i.test(html) && !/<audio[^>]*\bid=/i.test(html)) {
      return { ok: false, reason: "speech-id" };
    }
  }
  return { ok: true };
}

export function parseCompositionClips(html: string): ParsedClip[] {
  const clips: ParsedClip[] = [];
  const sections = html.match(/<section\b[^>]*>[\s\S]*?<\/section>/gi) || [];
  for (const block of sections) {
    const open = block.match(/<section\b[^>]*>/i)?.[0] || "";
    const img = block.match(/<img\b[^>]*>/i)?.[0] || "";
    const src = attr(img, "src");
    const start = Number(attr(open, "data-start"));
    const duration = Number(attr(open, "data-duration"));
    if (!src || !Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) continue;
    clips.push({
      src,
      start,
      duration,
      motion: parseMotion(attr(open, "data-motion") || attr(img, "data-motion")),
    });
  }
  if (clips.length) return clips.sort((a, b) => a.start - b.start);
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const src = attr(tag, "src");
    const start = Number(attr(tag, "data-start"));
    const duration = Number(attr(tag, "data-duration"));
    if (!src || !Number.isFinite(start) || !Number.isFinite(duration) || duration <= 0) continue;
    clips.push({
      src,
      start,
      duration,
      motion: parseMotion(attr(tag, "data-motion")),
    });
  }
  return clips.sort((a, b) => a.start - b.start);
}

export function htmlClipToStillRel(src: string): string {
  return mediaHref(src);
}

export function buildHtmlSystem(): string {
  return `你为「人不出镜的电影口播」写一份完整 HTML 合成稿。只输出 HTML，不要解释。
硬性规则：
- 必须是完整 HTML 文档（<!doctype html>）
- 根节点 id="root"，data-composition-id="cinema"，带 data-start、data-duration、data-width、data-height、data-fps。禁止 data-no-timeline
- 一份暂停时间轴 gsap.timeline({ paused: true })，注册 window.__timelines["cinema"]。只允许引入 jsDelivr 上的 gsap.min.js 与 Google Fonts
- 媒体路径相对合成目录：静帧 stills/shot-N.png，口播 speech.wav，配乐 bgm.mp3。禁止 ../，禁止其它 http(s)，禁止 javascript:
- 每一镜 <section class="clip"> 包一张 <img class="still">，section 带稳定 id、data-start、data-duration、data-track-index、data-motion；img 带胶片 data-color-grading（adjust 用 contrast/temperature/shadows/highlights/blacks/saturation，details 用 grain/vignette）
- 静帧运动用时间轴 fromTo 打在 img 上（scale / xPercent，ease none），不要 @keyframes ken-push，不要改 clip 的 visibility
- 字幕用词级高亮：#hl-container、.hl-group、.hl-word、.hl-word-bg，口播原文拆词，当前词扫过高亮；容器带 data-layout-allow-caption-zone
- 口播 <audio id="vo"> volume 1，配乐 <audio id="bgm"> volume 0.16，都必须有 id
- 人物画面是静帧在动，闭口，不要写成对嘴型出镜，不要画面英文水印，不要厂商名
- 不要改口播和屏幕字原文`;
}

export async function generateCinemaHtml(list: EditList): Promise<string> {
  const fallback = fallbackCinemaHtml(list);
  if (isFlowMock()) return fallback;
  try {
    const content = await flowChat({
      model: getScriptModel(),
      kind: "合成稿",
      maxTokens: 8000,
      temperature: 0.4,
      expectJson: false,
      system: buildHtmlSystem(),
      user: [
        "按这份剪辑表写合成稿。路径不要改文件名。必须有暂停时间轴、词级高亮字幕、静帧胶片调色载荷。",
        JSON.stringify(list, null, 2),
      ].join("\n"),
    });
    const html = extractHtmlDocument(content);
    const check = validateCinemaHtml(html, list);
    if (check.ok) return html;
  } catch {
    /* fallback */
  }
  return fallback;
}
