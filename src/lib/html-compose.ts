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
};

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

function attr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, "i")) || tag.match(new RegExp(`${name}='([^']*)'`, "i"));
  return m?.[1] || "";
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

function stillHref(rel: string): string {
  const cleaned = rel.replace(/^\/+/, "");
  return cleaned.startsWith("../") ? cleaned : `../${cleaned}`;
}

function audioHref(rel: string): string {
  return stillHref(rel);
}

export function fallbackCinemaHtml(list: EditList): string {
  const duration = list.durationSec.toFixed(2);
  const stills = list.clips
    .map((c) => {
      return `    <img class="clip still" id="${c.id}" src="${stillHref(c.stillRel)}" data-start="${c.start}" data-duration="${c.duration}" data-track-index="0" data-motion="${c.motion}" alt="" />`;
    })
    .join("\n");
  const captions = list.clips
    .map((c, i) => {
      const text = (c.onScreenText || "").replace(/</g, "");
      return `    <p class="clip caption" id="cap-${i + 1}" data-start="${c.start}" data-duration="${c.duration}" data-track-index="1">${text}</p>`;
    })
    .join("\n");
  const hook = `    <p class="clip hook" id="hook" data-start="0" data-duration="2.2" data-track-index="2">${list.hook.replace(/</g, "")}</p>`;
  const ctaStart = Math.max(0, list.durationSec - 2.4);
  const cta = `    <p class="clip hook" id="cta" data-start="${ctaStart.toFixed(2)}" data-duration="2.4" data-track-index="2">${list.cta.replace(/</g, "")}</p>`;
  const speech = list.speechRel
    ? `    <audio data-start="0" data-duration="${duration}" data-track-index="10" data-volume="${list.speechVolume}" src="${audioHref(list.speechRel)}"></audio>`
    : "";
  const bgm = list.bgmRel
    ? `    <audio data-start="0" data-duration="${duration}" data-track-index="11" data-volume="${list.bgmVolume}" src="${audioHref(list.bgmRel)}"></audio>`
    : "";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=${list.width}, height=${list.height}" />
  <style>
    html, body { margin: 0; background: #000; overflow: hidden; }
    #root { position: relative; width: ${list.width}px; height: ${list.height}px; overflow: hidden; background: #07080c; }
    .clip { position: absolute; inset: 0; }
    .still { width: 100%; height: 100%; object-fit: cover; }
    .caption, .hook {
      left: 8%; right: 8%; bottom: 13%; top: auto; height: auto;
      margin: 0; text-align: center; color: #fff;
      font: 700 48px/1.25 "PingFang SC", "Hiragino Sans GB", sans-serif;
      text-shadow: 0 2px 18px #000; letter-spacing: 0.06em;
    }
    .hook { bottom: 22%; font-size: 40px; opacity: 0.92; }
    .grain, .vignette { pointer-events: none; }
    .grain { opacity: 0.14; background-image: repeating-radial-gradient(circle at 20% 20%, rgba(255,255,255,.18) 0 1px, transparent 1px 3px); mix-blend-mode: overlay; }
    .vignette { box-shadow: inset 0 0 160px 48px rgba(0,0,0,.6); }
  </style>
</head>
<body>
  <div id="root" data-composition-id="cinema" data-start="0" data-duration="${duration}" data-width="${list.width}" data-height="${list.height}" data-fps="${list.fps}">
${stills}
${hook}
${captions}
${cta}
${speech}
${bgm}
    <div class="clip grain" data-start="0" data-duration="${duration}" data-track-index="20"></div>
    <div class="clip vignette" data-start="0" data-duration="${duration}" data-track-index="21"></div>
  </div>
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

export function validateCinemaHtml(html: string, list: EditList): { ok: boolean; reason?: string } {
  if (!/<div[^>]*data-composition-id=/i.test(html)) return { ok: false, reason: "missing composition" };
  if (!html.includes(`data-width="${list.width}"`) && !html.includes(`data-width='${list.width}'`)) {
    return { ok: false, reason: "width" };
  }
  if (!html.includes(`data-height="${list.height}"`) && !html.includes(`data-height='${list.height}'`)) {
    return { ok: false, reason: "height" };
  }
  if (/https?:\/\//i.test(html) || /javascript:/i.test(html)) return { ok: false, reason: "remote" };
  for (const clip of list.clips) {
    const name = clip.stillRel.split("/").pop() || clip.stillRel;
    if (!html.includes(name)) return { ok: false, reason: `missing ${name}` };
  }
  if (list.speechRel) {
    const name = list.speechRel.split("/").pop() || list.speechRel;
    if (!html.includes(name)) return { ok: false, reason: "speech" };
  }
  return { ok: true };
}

export function parseCompositionClips(html: string): ParsedClip[] {
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  const clips: ParsedClip[] = [];
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
  return src.replace(/^\.\.\//, "").replace(/^\/+/, "");
}

export function buildHtmlSystem(): string {
  return `你为「人不出镜的电影口播」写一份完整 HTML 合成稿。只输出 HTML，不要解释。
硬性规则：
- 必须是完整 HTML 文档（<!doctype html>）
- 根节点 id="root"，带 data-composition-id="cinema"、data-start、data-duration、data-width、data-height、data-fps
- 每一镜一张 <img class="clip still">，src 用相对路径（../stills/shot-N.png），带 data-start、data-duration、data-track-index、data-motion
- 屏幕字用 <p class="clip caption">，钩子和结尾行动单独一层
- 若提供了口播或配乐文件，必须有对应 <audio>，src 为相对路径，data-volume 口播 1、配乐 0.16
- 电影气质：黑底、胶片颗粒层、暗角、字幕在下部安全区；人物画面是静帧在动，不要写成对嘴型出镜
- 禁止任何 http(s) 外链、禁止 javascript:、禁止厂商名、禁止画面上出现英文水印
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
        "按这份剪辑表写合成稿。路径不要改文件名。",
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
