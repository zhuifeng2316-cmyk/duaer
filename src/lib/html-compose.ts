import type { Aspect, Motion, OutputQuality } from "./aspect";
import { CINEMA_GRAPHIC_TOKENS, cinemaMountVars, needsCinemaHostGrade } from "./cinema";
import { aspectSize, parseMotion, parseQuality } from "./aspect";
import { graphicIsHost, shotNeedsPersonStill } from "./graphic-board";
import type { ComposeLayout } from "./compose-plan";
import { fillRegistryVars, pickGraphicForShot, readRegistryVariables, sanitizeGraphicVars, displayTalkCopy, varsCarryTalkCopy } from "./hf-pick";
import { isKnownGraphic, registryItem, registryMountKind, registryMountSize, registryRel, type VisualMode } from "./hf-registry";
import { alignShotMotions, skillRecipe, type LetteringMode } from "./skill-recipes";
import { captionStyleMeta } from "./caption-styles";
import { needsRegistryCopySkin, registrySkinId } from "./registry-skin";
import { spokenShotLine } from "./speech-text";
import type { Script } from "./types";

export type EditClip = {
  id: string;
  stillRel: string;
  extraStillRels: string[];
  start: number;
  duration: number;
  motion: Motion;
  onScreenText: string;
  voiceover: string;
  /** 这一镜实际念出的字（首镜含钩子、末镜含结尾）。 */
  spokenText?: string;
  scene: string;
  imagePrompt: string;
  layout: ComposeLayout;
  overlay?: string;
  block?: string;
  graphicVars?: Record<string, string | number>;
  graphicUploads?: string[];
  /** 口播实际时长；成片末镜会比这个更长，用来收住。 */
  speechDuration?: number;
  letteringInStill?: boolean;
  lettering?: LetteringMode;
  captionStyle?: string;
};

export type CaptionWord = { text: string; start: number; end: number };
export type CaptionGroup = { wordStart: number; wordEnd: number; start: number; end: number };

export type EditList = {
  width: number;
  height: number;
  fps: number;
  durationSec: number;
  /** 口播轨时长；成片可比它更长，末镜画面用来收住。 */
  speechDurationSec: number;
  hook: string;
  cta: string;
  visualMode?: VisualMode;
  clips: EditClip[];
  captionStyle?: string;
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
  "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@600;700;800&family=Noto+Sans+SC:wght@300;700;900&display=swap";
const POSTER_FONT = '"Noto Serif SC", "Songti SC", "Noto Serif CJK SC", serif';
const SLAM_FONT = '"Noto Sans SC", "Hiragino Sans GB", "PingFang SC", sans-serif';
const BODY_FONT = '"Noto Sans SC", "Hiragino Sans GB", "PingFang SC", sans-serif';

/** 最后一镜口播结束后再停一下，避免片子戛然而止。 */
export const LAST_SHOT_HOLD_SEC = 1.4;

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

const CAPTION_BREAK = /[，。！？、：；…—,.!?;:]+/;
const PHRASE_TARGET = 6;
const PHRASE_HARD = 8;
const PHRASE_MARKERS = ["如果", "下次", "先把", "先列", "再", "却", "但", "就是", "不是", "不要", "没有", "还是", "才能"];

/** 标点不进字幕；逗号/句号等处拆成下一句。 */
export function splitCaptionSentences(text: string): string[] {
  return text
    .split(CAPTION_BREAK)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function phraseMarkerCut(tokens: string[]): number {
  for (let i = 2; i <= tokens.length - 2; i++) {
    const rest = tokens.slice(i).join("");
    if (PHRASE_MARKERS.some((m) => rest.startsWith(m))) return i;
  }
  return -1;
}

function chunkCaptionTokens(tokens: string[]): string[][] {
  if (tokens.length <= PHRASE_TARGET) return [tokens];
  if (tokens.length <= PHRASE_HARD) {
    const cut = phraseMarkerCut(tokens);
    if (cut >= 2) return [tokens.slice(0, cut), tokens.slice(cut)];
    return [tokens];
  }
  const out: string[][] = [];
  let rest = tokens;
  while (rest.length > PHRASE_HARD) {
    let cut = phraseMarkerCut(rest);
    if (cut < 2 || cut > PHRASE_TARGET + 2) cut = PHRASE_TARGET;
    if (rest.length - cut < 2) cut = rest.length - 2;
    if (cut < 2) {
      out.push(rest);
      return out;
    }
    out.push(rest.slice(0, cut));
    rest = rest.slice(cut);
  }
  if (rest.length) out.push(...chunkCaptionTokens(rest));
  return out;
}

/** 长口播拆成一屏一句短词，标点处优先，太长再按语气词切开。 */
export function splitCaptionPhrases(text: string): string[] {
  const out: string[] = [];
  for (const sentence of splitCaptionSentences(text)) {
    const tokens = tokenizeCaption(sentence);
    if (!tokens.length) continue;
    for (const chunk of chunkCaptionTokens(tokens)) {
      if (chunk.length) out.push(chunk.join(""));
    }
  }
  return out;
}

export function tokenizeCaption(text: string): string[] {
  const t = text
    .replace(new RegExp(CAPTION_BREAK.source, "g"), " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return [];
  const parts: string[] = [];
  const re = /[A-Za-z0-9]+(?:'[A-Za-z]+)?|[\u4e00-\u9fff]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) parts.push(m[0]);
  return parts;
}

function highlightItemsFrom(rest: string): string[] {
  const cut = (s: string) => displayTalkCopy(s.replace(/[，,。！？!?].*$/, ""));
  if (/[、]/.test(rest)) {
    return rest
      .split(/[、]/)
      .map(cut)
      .filter((s) => s.length >= 1 && s.length <= 6);
  }
  if (/[＞>]/.test(rest)) {
    return rest
      .split(/[＞>]/)
      .map(cut)
      .filter((s) => s.length >= 1 && s.length <= 8);
  }
  return rest
    .split(/\s+/)
    .map(cut)
    .filter((s) => s.length >= 1 && s.length <= 6);
}

/** 总题加顿号或空格并列（三笔账：时间、钱、风险）→ 总题 + 分开高亮的短项。 */
export function parseHighlightList(text: string): { title: string; items: string[] } | undefined {
  const raw = String(text || "").trim();
  if (!raw) return undefined;
  const colon = raw.split(/[：:]/);
  const hasTitle = colon.length >= 2 && /[\u4e00-\u9fff]/.test(colon[0] || "");
  const rest = hasTitle ? colon.slice(1).join("") : raw;
  if (!hasTitle && !/[、＞>]/.test(rest)) return undefined;
  const title = hasTitle ? displayTalkCopy(colon[0]!) : "";
  const items = highlightItemsFrom(rest);
  if (items.length < 2) return undefined;
  return { title, items };
}

/** 屏幕字优先；口播里的顿号并列也能补上总题。 */
export function shotHighlightList(
  onScreen?: string,
  voiceover?: string,
): { title: string; items: string[] } | undefined {
  const fromScreen = parseHighlightList(onScreen || "");
  if (fromScreen) return fromScreen;
  const fromVo = parseHighlightList(voiceover || "");
  if (!fromVo) return undefined;
  const titleFromScreen = displayTalkCopy((onScreen || "").split(/[：:]/)[0] || "");
  if (titleFromScreen && titleFromScreen.length <= 8 && !fromVo.title) {
    return { title: titleFromScreen, items: fromVo.items };
  }
  return fromVo;
}

export type SlamPhrase = { text: string; start: number; end: number; accent?: boolean; phrase?: number };
export type ShotCaptionStyle = "slam" | "editorial" | "wipe" | "weight" | "highlight";
export type ShotCaption = {
  clipId: string;
  style: ShotCaptionStyle;
  skin?: string;
  start: number;
  duration: number;
  title?: string;
  words: SlamPhrase[];
};
export type PosterCard = {
  id: string;
  text: string;
  start: number;
  duration: number;
  pose: "top-left" | "low-left" | "top-right" | "mid-left" | "low-center";
};

const CLOSE_SHOT = /特写|近景|面部|正面望|胸部以上/;
const WIDE_SHOT = /远景|全身|天空|海滩|海面|天台|列车|车厢|海岸/;
const NIGHT_SHOT = /夜景|霓虹|夜色|夜晚|夜里/;

export function pickShotCaptionStyle(
  clip: Pick<EditClip, "motion" | "scene" | "imagePrompt" | "onScreenText" | "voiceover" | "layout">,
  index: number,
  total: number,
): ShotCaptionStyle {
  const blob = `${clip.scene} ${clip.imagePrompt} ${clip.onScreenText} ${clip.voiceover}`;
  const close = CLOSE_SHOT.test(blob);
  const wide = WIDE_SHOT.test(blob);
  const night = NIGHT_SHOT.test(blob);
  if (shotHighlightList(clip.onScreenText, clip.voiceover)) return "highlight";
  if (clip.motion === "punch") return "slam";
  if (clip.motion === "pan-left" || clip.motion === "pan-right" || (night && !close)) return "wipe";
  if (clip.layout === "under-text") return "slam";
  if (clip.motion === "pull-out") return "weight";
  if (close) return "editorial";
  if (wide && index !== total - 1) return "slam";
  if (index === 0) return "slam";
  if (index === total - 1) return "editorial";
  return "weight";
}

export function isCaptionGraphic(name?: string): boolean {
  if (!name) return false;
  if (/^caption-|^hw-title$|^typewriter$|^titlecard-/.test(name)) return true;
  const item = registryItem(name);
  return Boolean(item?.tags.some((t) => t === "captions" || t === "caption-style" || t === "typography"));
}

export function captionGraphicCarriesTalkCopy(
  name?: string,
  vars?: Record<string, string | number>,
): boolean {
  return isCaptionGraphic(name) && varsCarryTalkCopy(vars);
}

export function graphicHoldsLettering(
  name?: string,
  vars?: Record<string, string | number>,
): boolean {
  if (!name) return false;
  if (graphicIsHost(name)) return true;
  if (captionGraphicCarriesTalkCopy(name, vars)) return true;
  if (/^(data-chart|flowchart|flowchart-vertical|notification-stack|native-notification-pop|notification-pop|pull-to-refresh|app-showcase|code-terminal-run|hw-pipeline|count-up|carousel-circle-1|marker-checklist-card)$/.test(name)) {
    return true;
  }
  return varsCarryTalkCopy(vars);
}

export function stillBakesLettering(
  shot: Pick<Script["shots"][number], "onScreenText" | "overlay" | "block" | "graphicVars" | "hostStill" | "lettering">,
): boolean {
  if (
    shot.lettering === "overlay-slam" ||
    shot.lettering === "overlay-wipe" ||
    shot.lettering === "overlay-highlight" ||
    shot.lettering === "graphic"
  ) {
    return false;
  }
  if (!String(shot.onScreenText || "").trim()) return false;
  if (!shotNeedsPersonStill(shot)) return false;
  if (shot.lettering === "still-title") return true;
  return !graphicHoldsLettering(shot.overlay || shot.block, shot.graphicVars);
}

export function letteringStyleFromGraphic(name?: string): ShotCaptionStyle | undefined {
  if (!name) return undefined;
  const meta = captionStyleMeta(name);
  if (meta) return meta.family;
  if (/kinetic-slam|slam|glitch|neon|particle|emoji|matrix/i.test(name)) return "slam";
  if (/editorial|hw-title|titlecard|typewriter|handwritten|parallax/i.test(name)) return "editorial";
  if (/weight-shift/i.test(name)) return "weight";
  if (/wipe|highlight|gradient|texture|pill|karaoke|clip-wipe/i.test(name)) return "wipe";
  if (isCaptionGraphic(name)) return "slam";
  return undefined;
}

function captionPlain(text: string): string {
  return splitCaptionSentences(text).join("");
}

function captionsOverlap(a: string, b: string): boolean {
  const left = captionPlain(a);
  const right = captionPlain(b);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export type ShotLettering = {
  style: ShotCaptionStyle;
  skin?: string;
  showPoster: boolean;
  showSpoken: boolean;
  pose: PosterCard["pose"];
};

export function planShotLettering(
  clip: Pick<EditClip, "motion" | "scene" | "imagePrompt" | "onScreenText" | "voiceover" | "layout" | "overlay" | "block" | "graphicVars" | "letteringInStill" | "lettering" | "captionStyle">,
  index: number,
  total: number,
  mode: VisualMode = "story",
  defaultStyle?: string,
): ShotLettering {
  const graphic = clip.overlay || clip.block;
  const recipe = skillRecipe(mode);
  const hookSlam = Boolean(recipe.composeMoves.hookSlam && index === 0 && !graphic);
  const forced = captionStyleMeta(clip.captionStyle) || captionStyleMeta(defaultStyle);
  let style = forced?.family || letteringStyleFromGraphic(graphic) || (hookSlam ? "slam" : pickShotCaptionStyle(clip, index, total));
  if (!forced) {
    if (clip.lettering === "overlay-slam") style = "slam";
    if (clip.lettering === "overlay-wipe") style = "wipe";
    if (clip.lettering === "overlay-highlight") style = "highlight";
  }
  const list = shotHighlightList(clip.onScreenText, clip.voiceover);
  // Host/graphic that paints its own copy wins over native highlight — except empty caption demos
  // (titlecard / caption-*) which compose drops when the shot is a highlight list.
  if (graphicHoldsLettering(graphic, clip.graphicVars) && !isCaptionGraphic(graphic)) {
    return { style: list ? "wipe" : style, skin: forced?.id, showPoster: false, showSpoken: false, pose: "top-left" };
  }
  if (list) {
    return { style: "highlight", skin: forced?.id, showPoster: false, showSpoken: true, pose: "top-left" };
  }
  if (style === "highlight" && clip.lettering !== "overlay-highlight") {
    style = hookSlam || clip.motion === "punch" ? "slam" : "wipe";
  }
  if (graphicHoldsLettering(graphic, clip.graphicVars)) {
    return { style, skin: forced?.id, showPoster: false, showSpoken: false, pose: "top-left" };
  }
  if (clip.lettering === "graphic" && graphic && captionGraphicCarriesTalkCopy(graphic, clip.graphicVars)) {
    const spoken = Boolean(captionPlain(clip.voiceover || clip.onScreenText));
    return { style, skin: forced?.id, showPoster: false, showSpoken: spoken, pose: "top-left" };
  }
  if (!forced && clip.lettering === "overlay-slam") {
    const spoken = Boolean(captionPlain(clip.voiceover || clip.onScreenText));
    return { style: "slam", showPoster: false, showSpoken: spoken, pose: "top-left" };
  }
  if (!forced && clip.lettering === "overlay-wipe") {
    const spoken = Boolean(captionPlain(clip.voiceover || clip.onScreenText));
    return { style: "wipe", showPoster: false, showSpoken: spoken, pose: "top-left" };
  }
  if (!forced && clip.lettering === "overlay-highlight") {
    const spoken = Boolean(captionPlain(clip.voiceover || clip.onScreenText));
    return { style: "highlight", showPoster: false, showSpoken: spoken, pose: "top-left" };
  }
  if (clip.letteringInStill || clip.lettering === "still-title") {
    const spoken = Boolean(captionPlain(clip.voiceover || clip.onScreenText));
    const rail = style === "slam" ? "wipe" : style;
    return { style: rail, skin: forced?.id, showPoster: false, showSpoken: spoken, pose: "top-left" };
  }
  if (isCaptionGraphic(graphic)) {
    const spoken = Boolean(captionPlain(clip.voiceover || clip.onScreenText));
    return { style, skin: forced?.id, showPoster: false, showSpoken: spoken, pose: "top-left" };
  }
  const spoken = Boolean(captionPlain(clip.voiceover || clip.onScreenText));
  const posterText = captionPlain(clip.onScreenText);
  const same = spoken && posterText && captionsOverlap(clip.onScreenText, clip.voiceover || "");
  const showSpoken = spoken;
  const showPoster = Boolean(posterText) && style !== "slam" && !same;
  const notify = /native-notification|notification-pop|notification-stack/.test(graphic || "");
  const pose: PosterCard["pose"] = notify || index % 2 === 1 ? "top-left" : "top-right";
  return { style, skin: forced?.id, showPoster, showSpoken, pose };
}

function clampSpokenWords(words: SlamPhrase[], shotStart: number, shotEnd: number): SlamPhrase[] {
  const cut = Number((shotEnd - 0.08).toFixed(3));
  const next: SlamPhrase[] = [];
  for (const word of words) {
    const start = Math.max(shotStart, word.start);
    const end = Math.min(cut, word.end);
    if (end - start < 0.05) continue;
    const prev = next[next.length - 1];
    if (prev && prev.end > start) prev.end = start;
    if (prev && prev.end - prev.start < 0.05) next.pop();
    next.push({ ...word, start: Number(start.toFixed(3)), end: Number(end.toFixed(3)) });
  }
  return next.filter((w) => w.end - w.start >= 0.05);
}

function timedWordsForClip(clip: EditClip): SlamPhrase[] {
  const out: SlamPhrase[] = [];
  const phrases = splitCaptionPhrases(clip.spokenText || clip.voiceover || clip.onScreenText);
  const tokenCounts = phrases.map((s) => tokenizeCaption(s).length);
  const total = tokenCounts.reduce((n, c) => n + c, 0);
  const speakFor = clip.speechDuration && clip.speechDuration > 0.08 ? clip.speechDuration : clip.duration;
  if (!total || speakFor < 0.08) return out;
  const each = speakFor / total;
  let i = 0;
  phrases.forEach((phrase, pi) => {
    const tokens = tokenizeCaption(phrase);
    tokens.forEach((token, ti) => {
      out.push({
        text: token,
        start: Number((clip.start + i * each).toFixed(3)),
        end: Number((clip.start + (i + 1) * each).toFixed(3)),
        accent: ti === tokens.length - 1,
        phrase: pi,
      });
      i += 1;
    });
  });
  const last = out[out.length - 1];
  if (last && clip.duration > speakFor + 0.2) {
    last.end = Number((clip.start + clip.duration - 0.12).toFixed(3));
  }
  return clampSpokenWords(out, clip.start, clip.start + clip.duration);
}

function timedHighlightWords(clip: EditClip, items: string[]): SlamPhrase[] {
  const speakFor = clip.speechDuration && clip.speechDuration > 0.08 ? clip.speechDuration : clip.duration;
  if (!items.length || speakFor < 0.08) return [];
  const paintFor = speakFor * 0.68;
  const each = paintFor / items.length;
  const holdEnd = clip.start + clip.duration - 0.12;
  const out = items.map((text, i) => {
    const start = clip.start + i * each;
    const end = i === items.length - 1 ? holdEnd : clip.start + (i + 1) * each;
    return {
      text,
      start: Number(start.toFixed(3)),
      end: Number(end.toFixed(3)),
      accent: true,
    };
  });
  return clampSpokenWords(out, clip.start, clip.start + clip.duration);
}

export function buildShotCaptions(list: EditList): ShotCaption[] {
  return list.clips.map((clip, i) => {
    const plan = planShotLettering(clip, i, list.clips.length, list.visualMode, list.captionStyle);
    const marks = shotHighlightList(clip.onScreenText, clip.voiceover);
    const highlightWords =
      plan.style === "highlight" && marks
        ? timedHighlightWords(clip, marks.items)
        : plan.style === "highlight"
          ? timedHighlightWords(
              clip,
              splitCaptionPhrases(clip.spokenText || clip.onScreenText || clip.voiceover || "")
                .map((s) => displayTalkCopy(s))
                .filter((s) => s.length >= 1 && s.length <= 10)
                .slice(0, 4),
            )
          : null;
    return {
      clipId: clip.id,
      style: plan.style,
      skin: plan.skin,
      start: clip.start,
      duration: clip.duration,
      title: plan.style === "highlight" ? marks?.title || undefined : undefined,
      words: plan.showSpoken
        ? highlightWords && highlightWords.length
          ? highlightWords
          : timedWordsForClip(clip)
        : [],
    };
  });
}

function posterLayout(text: string): string {
  const t = splitCaptionSentences(text).join("");
  if (t.length <= 8) return t;
  const mid = Math.ceil(t.length / 2);
  return `${t.slice(0, mid)}\n${t.slice(mid)}`;
}

export function buildPosterCards(list: EditList): PosterCard[] {
  return list.clips
    .map((clip, i) => {
      const plan = planShotLettering(clip, i, list.clips.length, list.visualMode, list.captionStyle);
      if (!plan.showPoster) return null;
      const text = posterLayout(clip.onScreenText);
      if (!text) return null;
      return {
        id: clip.id,
        text,
        start: clip.start,
        duration: Math.max(0.4, clip.duration - 0.12),
        pose: plan.pose,
      };
    })
    .filter((card): card is PosterCard => Boolean(card));
}

/** 口播按字砸上全屏，标点已在拆句时丢掉。句末字金色。 */
export function buildSlamPhrases(list: EditList): SlamPhrase[] {
  return list.clips.flatMap((clip) => timedWordsForClip(clip));
}

export function buildCaptionTrack(list: EditList): { words: CaptionWord[]; groups: CaptionGroup[] } {
  const words: CaptionWord[] = [];
  const groups: CaptionGroup[] = [];

  function addPhrase(text: string, start: number, end: number) {
    const sentences = splitCaptionSentences(text);
    if (!sentences.length || end - start < 0.08) return;
    const tokenCounts = sentences.map((s) => tokenizeCaption(s).length);
    const totalTokens = tokenCounts.reduce((n, c) => n + c, 0) || sentences.length;
    const span = end - start;
    let cursor = start;
    sentences.forEach((sentence, si) => {
      const tokens = tokenizeCaption(sentence);
      if (!tokens.length) return;
      const share = (tokens.length / totalTokens) * span;
      const gStart = cursor;
      const gEnd = si === sentences.length - 1 ? end : Number((cursor + share).toFixed(3));
      if (gEnd - gStart < 0.06) {
        cursor = gEnd;
        return;
      }
      const wordStart = words.length;
      const each = (gEnd - gStart) / tokens.length;
      tokens.forEach((token, i) => {
        words.push({
          text: token,
          start: Number((gStart + i * each).toFixed(3)),
          end: Number((gStart + (i + 1) * each).toFixed(3)),
        });
      });
      groups.push({ wordStart, wordEnd: words.length - 1, start: gStart, end: gEnd });
      cursor = gEnd;
    });
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

export function editListRegistryNames(list: EditList): string[] {
  const names = new Set<string>();
  for (const c of list.clips) {
    if (c.overlay) names.add(c.overlay);
    if (c.block) names.add(c.block);
  }
  return [...names];
}

function varsAttr(vars?: Record<string, string | number>): string {
  if (!vars || !Object.keys(vars).length) return "";
  return ` data-variable-values='${JSON.stringify(vars).replace(/'/g, "&#39;")}'`;
}

function clipRegistryMarkup(c: EditClip, talk: { width: number; height: number }): string {
  const name = c.block || c.overlay;
  if (!name || !isKnownGraphic(name)) return "";
  if (shotHighlightList(c.onScreenText, c.voiceover) && isCaptionGraphic(name)) return "";
  if (isCaptionGraphic(name) && !captionGraphicCarriesTalkCopy(name, c.graphicVars)) return "";
  const compositionId = needsRegistryCopySkin(name) ? registrySkinId(name, c.id) : name;
  const src = needsRegistryCopySkin(name) ? `compositions/${compositionId}.html` : registryRel(name);
  if (!src) return "";
  const box = registryMountSize(name, talk);
  const kind = box.adapt ? "registry-adapt" : registryMountKind(name, Boolean(c.block));
  const size = box.hostFill || !box.width || !box.height ? "" : ` data-width="${box.width}" data-height="${box.height}"`;
  const tokens = cinemaMountVars();
  const adapt =
    box.adapt && box.width && box.height
      ? `${tokens};--native-w:${box.width}px;--native-h:${box.height}px;--adapt-scale:${box.scale ?? 1}`
      : tokens;
  const grade = c.graphicUploads?.length ? "" : ` data-color-grading='${filmGradeAttr()}'`;
  const skin = needsCinemaHostGrade(name) && !c.graphicUploads?.length ? " registry-grade" : "";
  return `<div class="${kind}${skin}" data-registry="${name}" data-composition-id="${compositionId}" data-composition-src="${src}" data-start="${c.start}" data-duration="${c.duration}" data-track-index="2"${size} style="${adapt}"${grade}${varsAttr(sanitizeGraphicVars(c.graphicVars))}></div>`;
}

function clipStillMarkup(c: EditClip, grade: string): string {
  if (!c.stillRel) return `<div class="still still-empty" aria-hidden="true"></div>`;
  const dim = c.layout === "under-text" && !c.letteringInStill ? " is-dim" : "";
  const primary = `<img id="${c.id}-still" class="still${dim}" src="${mediaHref(c.stillRel)}" data-color-grading='${grade}' alt="" />`;
  if (c.layout === "split" && c.extraStillRels[0]) {
    return `<div class="still-stack" data-layout="split">
      ${primary}
      <img id="${c.id}-still-b" class="still" src="${mediaHref(c.extraStillRels[0])}" data-color-grading='${grade}' alt="" />
    </div>`;
  }
  if (c.layout === "montage" && c.extraStillRels.length) {
    const layers = c.extraStillRels.map(
      (src, i) =>
        `<img id="${c.id}-still-${i + 1}" class="still is-layer" src="${mediaHref(src)}" data-color-grading='${grade}' alt="" />`,
    );
    return `${primary}\n      ${layers.join("\n      ")}`;
  }
  return primary;
}

export function resolveClipStills(
  shot: { layout?: ComposeLayout; stillRefs?: number[]; overlay?: string; block?: string; hostStill?: boolean },
  index: number,
  stillRels: string[],
): { stillRel: string; extraStillRels: string[]; layout: ComposeLayout } {
  if (!shotNeedsPersonStill(shot)) {
    return { stillRel: "", extraStillRels: [], layout: shot.layout || "hero" };
  }
  const own = stillRels[index] || stillRels.find(Boolean) || `stills/shot-${index + 1}.png`;
  const layout = shot.layout || "hero";
  const refs = (shot.stillRefs || [])
    .map((j) => stillRels[j])
    .filter((rel): rel is string => Boolean(rel) && rel !== own);
  if (layout === "reuse") {
    return { stillRel: refs[0] || stillRels[Math.max(0, index - 1)] || own, extraStillRels: [], layout };
  }
  if (layout === "split") {
    const other = refs[0] || stillRels[Math.max(0, index - 1)] || own;
    return { stillRel: own, extraStillRels: other === own ? [] : [other], layout };
  }
  if (layout === "montage") {
    return { stillRel: own, extraStillRels: refs.slice(0, 2), layout };
  }
  return { stillRel: own, extraStillRels: [], layout };
}

export function cinemaTypeScale(width: number): {
  poster: number;
  slam: number;
  editorial: number;
  editorialHero: number;
  wipe: number;
  weight: number;
  highlight: number;
} {
  const k = width / 1080;
  return {
    poster: Math.round(152 * k),
    slam: Math.round(240 * k),
    editorial: Math.round(136 * k),
    editorialHero: Math.round(168 * k),
    wipe: Math.round(144 * k),
    weight: Math.round(144 * k),
    highlight: Math.round(148 * k),
  };
}

function filledGraphicVars(
  name: string,
  shot: Pick<Script["shots"][number], "onScreenText" | "voiceover" | "graphicIntent" | "graphicAssets" | "graphicVars">,
): Record<string, string | number> {
  return (
    sanitizeGraphicVars({
      ...fillRegistryVars(readRegistryVariables(name), shot),
      ...(shot.graphicVars || {}),
    }) || {}
  );
}

function resolveShotGraphic(
  shot: Script["shots"][number],
  mode: VisualMode,
  aspect: Aspect,
): { overlay?: string; block?: string; graphicVars?: Record<string, string | number> } {
  const picked = pickGraphicForShot(shot, mode, [], aspect, true);
  if (picked) {
    return {
      overlay: picked.type === "component" ? picked.name : undefined,
      block: picked.type === "block" ? picked.name : undefined,
      graphicVars: { ...picked.vars, ...(shot.graphicVars || {}) },
    };
  }
  const name = shot.overlay || shot.block;
  if (name && isKnownGraphic(name)) {
    return { overlay: shot.overlay, block: shot.block, graphicVars: filledGraphicVars(name, shot) };
  }
  return {};
}

export function buildEditList(opts: {
  script: Script;
  stillRels: string[];
  aspect: Aspect;
  quality?: OutputQuality;
  speechRel?: string;
  bgmRel?: string;
  captionStyle?: string;
}): EditList {
  const { width, height } = aspectSize(opts.aspect, parseQuality(opts.quality));
  const mode = (opts.script.visualMode || "story") as VisualMode;
  let start = 0;
  const clips: EditClip[] = alignShotMotions(
    opts.script.shots.map((shot, i) => {
    const hold = i === opts.script.shots.length - 1 ? LAST_SHOT_HOLD_SEC : 0;
    const resolved = resolveClipStills(shot, i, opts.stillRels);
    const graphic = resolveShotGraphic(shot, mode, opts.aspect);
    const clip: EditClip = {
      id: `shot-${i + 1}`,
      stillRel: resolved.stillRel,
      extraStillRels: resolved.extraStillRels,
      start,
      duration: shot.durationSec + hold,
      speechDuration: shot.durationSec,
      motion: shot.motion,
      onScreenText: shot.onScreenText,
      voiceover: shot.voiceover,
      spokenText: spokenShotLine(opts.script, i),
      scene: shot.scene,
      imagePrompt: shot.imagePrompt,
      layout: resolved.layout,
      overlay: graphic.overlay,
      block: graphic.block,
      graphicVars: sanitizeGraphicVars(graphic.graphicVars || shot.graphicVars),
      graphicUploads: shot.graphicUploads,
      letteringInStill: shot.letteringInStill,
      lettering: shot.lettering,
      captionStyle: shot.captionStyle,
    };
    start += clip.duration;
    return clip;
  }),
  );
  const speechDurationSec = clips.reduce((n, c) => n + (c.speechDuration && c.speechDuration > 0 ? c.speechDuration : c.duration), 0);
  return {
    width,
    height,
    fps: 25,
    durationSec: start || speechDurationSec,
    speechDurationSec,
    hook: opts.script.hook,
    cta: opts.script.cta,
    visualMode: mode,
    clips,
    captionStyle: opts.captionStyle,
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
  const type = cinemaTypeScale(list.width);
  const slamPx = type.slam;
  const posterPx = type.poster;
  const stackRow = list.width > list.height;
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
    .still-empty { background: #07080c; }
    .still.is-dim { filter: brightness(0.52) saturate(0.86); }
    .still.is-layer { position: absolute; inset: 0; opacity: 0; }
    .still-stack {
      position: absolute; inset: 0;
      display: flex; flex-direction: ${stackRow ? "row" : "column"};
    }
    .still-stack .still { height: ${stackRow ? "100%" : "50%"}; width: ${stackRow ? "50%" : "100%"}; }
    .registry-card {
      position: absolute;
      left: 8%;
      right: 8%;
      bottom: 16%;
      height: 36%;
      z-index: 6;
      overflow: hidden;
      border-radius: 22px;
      box-shadow: 0 18px 48px rgba(0,0,0,0.38);
    }
    .registry-overlay,
    .registry-adapt,
    .registry-card {
      --bg: ${CINEMA_GRAPHIC_TOKENS.bg};
      --background: ${CINEMA_GRAPHIC_TOKENS.bg};
      --fg: ${CINEMA_GRAPHIC_TOKENS.fg};
      --brand: ${CINEMA_GRAPHIC_TOKENS.brand};
      --accent: ${CINEMA_GRAPHIC_TOKENS.accent};
      --accent-2: ${CINEMA_GRAPHIC_TOKENS.accent2};
      --surface: ${CINEMA_GRAPHIC_TOKENS.surface};
      --border: ${CINEMA_GRAPHIC_TOKENS.border};
      --muted: ${CINEMA_GRAPHIC_TOKENS.muted};
      --ns-accent: ${CINEMA_GRAPHIC_TOKENS.brand};
      --ufz-accent: ${CINEMA_GRAPHIC_TOKENS.brand};
      --opt-accent: ${CINEMA_GRAPHIC_TOKENS.brand};
      --nnp-accent: ${CINEMA_GRAPHIC_TOKENS.brand};
      --cu-accent: ${CINEMA_GRAPHIC_TOKENS.brand};
      --ctr-accent: ${CINEMA_GRAPHIC_TOKENS.accent};
      --hw-ink: ${CINEMA_GRAPHIC_TOKENS.fg};
      --hw-accent: ${CINEMA_GRAPHIC_TOKENS.brand};
      --hf-accent: ${CINEMA_GRAPHIC_TOKENS.brand};
      --hf-surface: ${CINEMA_GRAPHIC_TOKENS.surface};
    }
    .registry-overlay {
      position: absolute;
      inset: 0;
      z-index: 7;
      pointer-events: none;
    }
    .registry-adapt {
      position: absolute;
      left: 50%;
      top: 50%;
      width: var(--native-w, 1920px);
      height: var(--native-h, 1080px);
      transform: translate(-50%, -50%) scale(var(--adapt-scale, 1));
      transform-origin: center center;
      z-index: 7;
      pointer-events: none;
      overflow: hidden;
    }
    .registry-grade {
      filter: sepia(0.28) saturate(0.72) contrast(1.12) brightness(0.86);
    }
    #hl-container {
      position: absolute; inset: 0; z-index: 10; pointer-events: none;
    }
    .poster-title {
      position: absolute;
      max-width: 72%;
      font-family: ${POSTER_FONT};
      font-weight: 700;
      font-size: ${posterPx}px;
      line-height: 1.18;
      letter-spacing: 0.12em;
      color: #f4ead0;
      white-space: pre-line;
      text-shadow:
        0 1px 0 rgba(0,0,0,0.35),
        0 10px 28px rgba(0,0,0,0.45);
      opacity: 0;
      visibility: hidden;
      z-index: 8;
    }
    .poster-title::after {
      content: "";
      display: block;
      width: 42%;
      height: 2px;
      margin-top: 14px;
      background: linear-gradient(90deg, #e8c56a, rgba(232,197,106,0));
    }
    .poster-title[data-pose="top-left"] { top: 9%; left: 8%; text-align: left; }
    .poster-title[data-pose="top-right"] { top: 10%; right: 8%; left: auto; text-align: right; }
    .poster-title[data-pose="top-right"]::after { margin-left: auto; }
    .poster-title[data-pose="mid-left"] { top: 38%; left: 7%; max-width: 48%; }
    .poster-title[data-pose="low-left"] { bottom: 14%; left: 8%; top: auto; }
    .poster-title[data-pose="low-center"] {
      bottom: 16%; left: 10%; right: 10%; top: auto; max-width: none; text-align: center;
    }
    .poster-title[data-pose="low-center"]::after { margin: 14px auto 0; }
    .kt-word {
      font-family: ${SLAM_FONT};
      font-weight: 900;
      color: #fff;
      position: absolute;
      left: 0;
      width: 100%;
      text-align: center;
      top: 50%;
      letter-spacing: 0.04em;
      line-height: 1;
      font-size: ${slamPx}px;
      opacity: 0;
      visibility: hidden;
      z-index: 12;
      text-shadow:
        0 2px 0 rgba(0,0,0,0.35),
        0 18px 40px rgba(0,0,0,0.55);
    }
    .kt-word.is-accent { color: #ffd56a; }
    .ed-block {
      position: absolute;
      left: 8%;
      right: 10%;
      bottom: 15%;
      z-index: 12;
      opacity: 0;
      visibility: hidden;
    }
    .ed-line {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 0.06em;
      line-height: 1.05;
    }
    .ed-line + .ed-line { margin-top: 0.08em; }
    .ed-word {
      display: inline-block;
      font-family: ${POSTER_FONT};
      font-weight: 800;
      color: #f5f0d0;
      text-shadow: 0 2px 12px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35);
    }
    .ed-word.is-emphasis {
      font-family: ${POSTER_FONT};
      font-weight: 800;
      line-height: 0.92;
    }
    .wp-group {
      position: absolute;
      left: 6%;
      right: 6%;
      bottom: 14%;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: flex-end;
      gap: 0.1em;
      visibility: hidden;
      opacity: 1;
      z-index: 12;
    }
    .wp-word {
      font-family: ${SLAM_FONT};
      font-weight: 900;
      color: #fff;
      display: inline-block;
      letter-spacing: 0.04em;
      line-height: 1;
      clip-path: inset(0 100% 0 0);
      text-shadow: 0 2px 10px rgba(0,0,0,0.45);
    }
    .wt-group {
      position: absolute;
      left: 8%;
      right: 8%;
      bottom: 15%;
      display: flex;
      flex-direction: column;
      align-items: center;
      opacity: 0;
      visibility: hidden;
      z-index: 12;
    }
    .wt-line {
      display: flex;
      justify-content: center;
      gap: 0.08em;
      color: #fff;
      font-family: ${BODY_FONT};
      font-weight: 300;
      letter-spacing: 0.04em;
      line-height: 1.12;
      text-shadow: 0 2px 8px rgba(0,0,0,0.4);
    }
    .hl-lockup {
      position: absolute;
      left: 5.5%;
      right: auto;
      width: 42%;
      max-width: 42%;
      top: 11%;
      z-index: 12;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.12em;
      visibility: hidden;
      opacity: 0;
    }
    .hl-kicker {
      font-family: ${POSTER_FONT};
      font-weight: 700;
      color: #f4ead0;
      letter-spacing: 0.02em;
      line-height: 1.1;
      text-shadow: 0 8px 24px rgba(0,0,0,0.45);
      margin-bottom: 0.16em;
    }
    .hl-chip {
      position: relative;
      display: inline-block;
      font-family: ${SLAM_FONT};
      font-weight: 900;
      color: rgba(255,255,255,0.55);
      letter-spacing: 0.02em;
      line-height: 1.05;
      padding: 0.04em 0.14em 0.06em;
      text-shadow: 0 2px 10px rgba(0,0,0,0.4);
    }
    .hl-chip.is-on,
    .hl-chip.is-on .hl-chip-text {
      color: #0c0a08;
      text-shadow: none;
    }
    .hl-chip-bg {
      position: absolute;
      inset: 0;
      background: #e8c56a;
      transform: scaleX(0);
      transform-origin: 0% 50%;
      z-index: -1;
      border-radius: 0.06em;
    }
    .hl-chip-text { position: relative; z-index: 1; }
    .cap-kinetic-slam { letter-spacing: 0.04em; }
    .cap-editorial-emphasis { font-family: "Songti SC", "Noto Serif SC", serif; font-style: italic; }
    .cap-weight-shift { letter-spacing: -0.03em; }
    .cap-highlight { letter-spacing: 0.01em; }
    .cap-neon-glow { color: #7ff7ef !important; text-shadow: 0 0 16px #2ee6d8, 0 0 36px #148f88 !important; }
    .cap-neon-accent { text-shadow: 0 0 14px #e8c56a, 0 8px 22px rgba(0,0,0,.45); }
    .cap-glitch-rgb { text-shadow: 3px 0 #ff3b5c, -3px 0 #3ad7ff, 0 8px 18px rgba(0,0,0,.45) !important; }
    .cap-matrix-decode { color: #7dff9a !important; font-family: ui-monospace, "SF Mono", Menlo, monospace !important; letter-spacing: 0.12em; text-shadow: 0 0 12px #2f9; }
    .cap-particle-burst { text-shadow: 0 0 22px rgba(255,246,230,.8), 0 10px 28px rgba(0,0,0,.55); }
    .cap-emoji-pop { transform: rotate(-2deg); }
    .cap-blend-difference { mix-blend-mode: difference; }
    .cap-parallax-layers { text-shadow: 8px 10px 0 rgba(0,0,0,.35), 0 8px 24px rgba(0,0,0,.4); }
    .cap-texture { -webkit-text-stroke: 0.04em rgba(244,234,208,.35); }
    .cap-gradient-fill {
      background: linear-gradient(90deg, #f4ead0, #e8c56a, #f4ead0);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent !important;
      text-shadow: none !important;
    }
    .cap-pill-karaoke {
      display: inline-block;
      padding: 0.08em 0.28em;
      border-radius: 999px;
      background: rgba(232, 197, 106, 0.92);
      color: #1a100a !important;
      text-shadow: none !important;
    }
    .cap-camera-follow { letter-spacing: 0.08em; }
    .cap-clip-wipe { clip-path: inset(0 0 0 0); filter: contrast(1.08); }
    .cap-look-cream { color: #fff5df !important; text-shadow: 0 0 18px rgba(227,192,106,.45), 0 8px 18px rgba(0,0,0,.45) !important; }
    .cap-look-ink { color: #1b1714 !important; background: rgba(255,248,240,.72); padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-look-editorial { font-family: "Songti SC", "Noto Serif SC", serif !important; font-style: italic; }
    .cap-look-keynote { letter-spacing: 0.08em; font-weight: 800 !important; }
    .cap-look-documentary { color: #e8e0d4 !important; font-family: "Songti SC", "Noto Serif SC", serif !important; font-weight: 500 !important; }
    .cap-look-loud { letter-spacing: -0.05em; text-shadow: 0 8px 16px rgba(0,0,0,.6), 0 0 0 #ffd600 !important; }
    .cap-look-neon { color: #d9f7ff !important; text-shadow: 0 0 14px #22e6ff, 0 0 40px rgba(34,230,255,.4) !important; }
    .cap-look-glitch { text-shadow: 3px 0 #ff3b5c, -3px 0 #22e6ff, 0 8px 18px rgba(0,0,0,.45) !important; }
    .cap-look-chrome { background: linear-gradient(180deg,#fff,#9fb6cc 45%,#6d8296); -webkit-background-clip: text; background-clip: text; color: transparent !important; text-shadow: none !important; }
    .cap-look-velocity { font-style: italic; letter-spacing: 0.12em; }
    .cap-look-anchor { letter-spacing: 0.02em; color: #f2efe9 !important; }
    .cap-look-ordnance { font-family: ui-monospace, "SF Mono", Menlo, monospace !important; letter-spacing: 0.12em; }
    .cap-look-terminal { color: #bfeefe !important; font-family: ui-monospace, Menlo, monospace !important; }
    .cap-look-neonsign { color: #ffe9d6 !important; font-family: "Kaiti SC", "KaiTi", serif !important; text-shadow: 0 0 12px #ff3fae !important; }
    .cap-look-stardust { color: #f7f1ff !important; letter-spacing: 0.16em; text-shadow: 0 0 16px #c9b6ff !important; }
    .cap-look-stomp { color: #ff5c39 !important; letter-spacing: -0.04em; }
    .cap-look-lastpage { font-family: "Songti SC", serif !important; font-weight: 500 !important; }
    .cap-look-scoreboard { font-family: ui-monospace, Menlo, monospace !important; background: #2a2418; color: #f2e6c9 !important; padding: 0.04em 0.16em; }
    .cap-look-transit { color: #ffbf3c !important; font-family: ui-monospace, Menlo, monospace !important; letter-spacing: 0.12em; }
    .cap-look-vhs { color: #d8ffd8 !important; font-family: ui-monospace, Menlo, monospace !important; text-shadow: 2px 0 #ff5a5a, -2px 0 #5ad4ff !important; }
    .cap-look-arcade { color: #ffe566 !important; font-family: ui-monospace, Menlo, monospace !important; text-shadow: 2px 2px 0 #c4302b !important; }
    .cap-look-dossier { color: #2b2118 !important; background: #e8d7b8; padding: 0.04em 0.12em; font-family: ui-monospace, Menlo, monospace !important; text-shadow: none !important; }
    .cap-look-laser { color: #7dff9a !important; text-shadow: 0 0 12px #2f9, 0 0 8px #ff4de1 !important; }
    .cap-look-thunder { color: #f6fbff !important; text-shadow: 0 0 8px #fff, 0 0 22px #9ad4ff !important; }
    .cap-look-hologram { color: #c7f1ff !important; text-shadow: 1px 0 #ff5fd6, -1px 0 #7ae8ff !important; }
    .cap-look-biolume { color: #9ffff2 !important; text-shadow: 0 0 18px #2ee0c0 !important; }
    .cap-look-aurora { background: linear-gradient(90deg,#f4b6c8,#9fe8e0,#c9b6ff); -webkit-background-clip: text; background-clip: text; color: transparent !important; text-shadow: none !important; }
    .cap-look-spectrum { color: #7dff9a !important; font-family: ui-monospace, Menlo, monospace !important; }
    .cap-look-papercut { background: #f3ead2; color: #1a1208 !important; box-shadow: 4px 4px 0 rgba(0,0,0,.35); padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-look-popup { background: #f7efe0; color: #1a1208 !important; border-radius: 0.08em; padding: 0.04em 0.14em; text-shadow: none !important; }
    .cap-look-chalkboard { color: #fbf9ef !important; font-family: "Kaiti SC", "KaiTi", serif !important; }
    .cap-look-graffiti { color: #ffe566 !important; font-family: "Kaiti SC", "KaiTi", serif !important; transform: rotate(-2deg); text-shadow: 0 2px 0 #1a1008, 0 0 12px #ff3fae !important; }
    .cap-look-brush { font-family: "Kaiti SC", "KaiTi", serif !important; }
    .cap-look-inkwater { font-family: "Songti SC", serif !important; color: #f4ead0 !important; }
    .cap-look-ransom { background: #111; color: #f4ead0 !important; padding: 0.04em 0.12em; transform: rotate(-2deg); text-shadow: none !important; }
    .cap-fx-typewriter { font-family: ui-monospace, Menlo, monospace !important; letter-spacing: 0.06em; border-right: 0.08em solid currentColor; padding-right: 0.08em; }
    .cap-fx-hw-title { font-family: "Kaiti SC", "KaiTi", serif !important; transform: rotate(-2deg); }
    .cap-fx-hw-write { font-family: "Kaiti SC", "KaiTi", serif !important; text-decoration: underline wavy rgba(244,234,208,.55); }
    .cap-fx-path { font-family: "Kaiti SC", "KaiTi", serif !important; letter-spacing: 0.14em; transform: skewX(-8deg); }
    .cap-fx-cloud { background: rgba(255,255,255,.92); color: #1a1208 !important; border-radius: 999px; padding: 0.04em 0.18em; text-shadow: none !important; }
    .cap-fx-shimmer { background: linear-gradient(90deg,#f4ead0,#fff,#e8c56a,#f4ead0); -webkit-background-clip: text; background-clip: text; color: transparent !important; text-shadow: none !important; }
    .cap-fx-stream { color: #d7e7ff !important; font-family: ui-monospace, Menlo, monospace !important; }
    .cap-fx-drop { letter-spacing: -0.04em; text-shadow: 0 10px 18px rgba(0,0,0,.55) !important; }
    .cap-fx-whiteboard { color: #1a1208 !important; background: #f4efe4; padding: 0.04em 0.14em; font-family: "Kaiti SC", "KaiTi", serif !important; text-shadow: none !important; }
    .cap-fx-stitch { font-family: "Songti SC", serif !important; letter-spacing: 0.1em; text-shadow: 0 1px 0 #8b7355, 0 -1px 0 #8b7355 !important; }
    .cap-fx-ticker { letter-spacing: 0.16em; font-weight: 900 !important; }
    .cap-fx-notes { color: #1a1208 !important; background: #fff6c8; padding: 0.04em 0.12em; font-family: ui-monospace, Menlo, monospace !important; text-shadow: none !important; }
    .cap-fx-explode { letter-spacing: 0.06em; text-shadow: 4px -4px 0 rgba(255,92,57,.45), -4px 4px 0 rgba(34,230,255,.35) !important; }
    .cap-fx-slot { background: #111; color: #f2e6c9 !important; border: 1px solid #6a5a3a; padding: 0.04em 0.12em; font-family: ui-monospace, Menlo, monospace !important; text-shadow: none !important; }
    .cap-fx-morph { letter-spacing: -0.05em; text-shadow: 0 0 12px rgba(244,234,208,.45) !important; }
    .cap-fx-marker { background: #ffe566; color: #1a1208 !important; padding: 0.02em 0.1em; text-shadow: none !important; }
    .cap-fx-annotate { color: #ffe8b0 !important; font-family: "Kaiti SC", "KaiTi", serif !important; border-bottom: 0.08em dashed #ff7a3c; }
    .cap-fx-tiles { background: #1a1208; color: #f4ead0 !important; border: 0.08em solid #f4ead0; box-shadow: 0.12em 0.12em 0 #c45a2a; padding: 0.04em 0.1em; text-shadow: none !important; }
    .cap-fx-scan { color: #9dffc2 !important; font-family: ui-monospace, Menlo, monospace !important; text-shadow: 0 0 10px #2f9 !important; box-shadow: inset 0 -0.08em 0 #7dff9a; }
    .cap-fx-marquee { letter-spacing: 0.18em; transform: perspective(180px) rotateX(14deg); }
    .cap-fx-strike { text-decoration: line-through; opacity: 0.72; }
    .cap-fx-kinetic { letter-spacing: -0.04em; text-shadow: 0 0.2em 0 rgba(0,0,0,.35) !important; }
    .cap-fx-rise { text-shadow: 0 12px 18px rgba(0,0,0,.45) !important; }
    .cap-fx-wave { letter-spacing: 0.12em; font-weight: 300 !important; }
    .cap-frame-coral { background: #ff3a2d; color: #fff8f2 !important; padding: 0.06em 0.18em; text-shadow: none !important; }
    .cap-frame-capsule { background: rgba(20,16,12,.82); color: #f4ead0 !important; border-radius: 999px; padding: 0.06em 0.22em; text-shadow: none !important; }
    .cap-frame-forest { background: #1d3328; color: #f4ead0 !important; font-family: "Songti SC", serif !important; font-style: italic; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-frame-daisy { background: #fff6e8; color: #1a1208 !important; border: 0.08em solid #1a1208; border-radius: 0.35em 0.1em 0.4em 0.15em; padding: 0.04em 0.14em; transform: rotate(-2deg); text-shadow: none !important; }
    .cap-frame-broadside { background: #111; color: #f4ead0 !important; border-top: 0.1em solid #f4ead0; border-bottom: 0.1em solid #f4ead0; letter-spacing: 0.1em; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-frame-creative { background: #ffe566; color: #1a1208 !important; border: 0.12em solid #1a1208; padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-frame-cobalt { background: #1c3f8a; color: #f4ead0 !important; font-family: ui-monospace, Menlo, monospace !important; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-frame-code { background: #0d1117; color: #7ee787 !important; font-family: ui-monospace, Menlo, monospace !important; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-frame-cartesian { background: #efe6d4; color: #1a1208 !important; font-family: "Songti SC", serif !important; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-frame-block { background: #111; color: #f4ead0 !important; box-shadow: 0.12em 0.12em 0 #ff5c39; padding: 0.06em 0.14em; text-shadow: none !important; }
    .cap-frame-poster { background: linear-gradient(90deg,#c4302b,#1a1208 55%); color: #fff6e8 !important; letter-spacing: 0.06em; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-frame-blue { background: #2557a7; color: #fff !important; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-frame-biennale { background: #f0c400; color: #111 !important; letter-spacing: 0.08em; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-move-rgb { text-shadow: 3px 0 #ff3b5c, -3px 0 #22e6ff, 0 8px 16px rgba(0,0,0,.45) !important; }
    .cap-move-blur-up { filter: blur(0.5px); opacity: .9; }
    .cap-move-bottom { letter-spacing: 0.1em; text-shadow: 0 12px 18px rgba(0,0,0,.5) !important; }
    .cap-move-soft { filter: blur(0.3px); opacity: .92; }
    .cap-move-focus { text-shadow: 0 0 18px rgba(255,255,255,.35) !important; }
    .cap-move-headline { letter-spacing: -0.05em; text-shadow: 0 0.2em 0 rgba(0,0,0,.35) !important; }
    .cap-move-inline { background: #ffe566; color: #1a1208 !important; padding: 0.02em 0.1em; text-shadow: none !important; }
    .cap-move-lines { border-left: 0.1em solid #e8c56a; padding-left: 0.18em; }
    .cap-move-crossfade { opacity: .88; text-shadow: 0 0 12px rgba(244,234,208,.35) !important; }
    .cap-move-tracking { letter-spacing: 0.22em; }
    .cap-move-axis-y { writing-mode: vertical-rl; letter-spacing: 0.14em; }
    .cap-move-axis-z { transform: perspective(180px) rotateX(14deg); text-shadow: 0 12px 18px rgba(0,0,0,.45) !important; }
    .cap-move-particle { text-shadow: 0 0 8px #fff, 2px 2px 0 rgba(255,92,57,.45), -2px -2px 0 rgba(34,230,255,.35) !important; }
    .cap-move-sweep { background: linear-gradient(100deg,#f4ead0 20%,#fff 45%,#e8c56a 70%,#f4ead0); -webkit-background-clip: text; background-clip: text; color: transparent !important; text-shadow: none !important; }
    .cap-move-callout { background: #2557a7; color: #fff !important; padding: 0.04em 0.14em; text-shadow: none !important; }
    .cap-move-emphasis { font-family: ui-monospace, Menlo, monospace !important; border-bottom: 0.08em solid #e8c56a; }
    .cap-move-prism { background: linear-gradient(120deg,#ff5fd6,#7ae8ff,#ffe566); -webkit-background-clip: text; background-clip: text; color: transparent !important; text-shadow: none !important; }
    .cap-move-feather { background: rgba(255,255,255,.18); border-radius: 999px; padding: 0.04em 0.16em; box-shadow: 0 0 18px rgba(255,255,255,.35); text-shadow: none !important; }
    .cap-move-news { background: #111; color: #f4ead0 !important; border-top: 0.12em solid #c4302b; padding: 0.06em 0.16em; text-shadow: none !important; }
    .cap-move-third { background: linear-gradient(90deg,#1a1208,#2557a7); color: #fff !important; padding: 0.06em 0.18em; text-shadow: none !important; }
    .cap-move-flex { letter-spacing: 0.16em; font-weight: 200 !important; }
    .cap-move-ascii { color: #9dffc2 !important; font-family: ui-monospace, Menlo, monospace !important; text-shadow: 0 0 8px #2f9 !important; }
    .cap-move-swap { text-shadow: 4px 0 #ff3b5c, -4px 0 #22e6ff !important; }
    .cap-move-code { background: #0d1117; color: #7ee787 !important; font-family: ui-monospace, Menlo, monospace !important; padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-card-academic { background: #f3ead2; color: #1a1208 !important; font-family: "Songti SC", serif !important; border-bottom: 0.12em solid #2557a7; padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-card-editorial { background: #fff5ef; color: #ff3a2d !important; font-family: "Songti SC", serif !important; font-style: italic; padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-card-minimal { letter-spacing: -0.05em; font-weight: 900 !important; }
    .cap-card-spotlight { color: #f4e8ff !important; text-shadow: 0 0 22px #a78bfa, 0 8px 18px rgba(0,0,0,.55) !important; }
    .cap-card-geom { background: #d4ff00; color: #111 !important; padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-card-whiteboard { background: #f7f1e6; color: #1a1208 !important; font-family: "Kaiti SC", "KaiTi", serif !important; border: 0.08em dashed #ff6b35; padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-card-audit { background: #8b1d1d; color: #fff6e8 !important; transform: rotate(-4deg); padding: 0.04em 0.14em; letter-spacing: 0.06em; text-shadow: none !important; }
    .cap-card-terminal { background: #07140f; color: #4ade80 !important; font-family: ui-monospace, Menlo, monospace !important; border: 0.06em solid #4ade80; padding: 0.04em 0.12em; text-shadow: none !important; }
    .cap-card-swiss { background: #fff; color: #111 !important; border-top: 0.12em double #e8190f; border-bottom: 0.12em double #111; padding: 0.04em 0.14em; text-shadow: none !important; }
    .cap-card-social { background: #ff2e63; color: #fff !important; border-radius: 999px; padding: 0.04em 0.18em; text-shadow: none !important; }
    .cap-pop-scramble { font-family: ui-monospace, Menlo, monospace !important; letter-spacing: 0.12em; }
    .cap-pop-stagger { letter-spacing: 0.04em; }
    .cap-pop-texture { -webkit-text-stroke: 0.04em rgba(244,234,208,.55); color: transparent !important; text-shadow: none !important; }
    .cap-pop-count { letter-spacing: -0.04em; font-weight: 900 !important; }
    .cap-pop-line-swap { border-bottom: 0.08em solid #e8c56a; }
    .cap-pop-blur-in { filter: blur(0.4px); }
    .cap-pop-page { letter-spacing: 0.02em; }
    .cap-pop-match { text-shadow: 4px 0 rgba(255,59,92,.45), -4px 0 rgba(34,230,255,.35) !important; }
    .cap-pop-flap { background: #1a1208; color: #f2e6c9 !important; border: 1px solid #6a5a3a; padding: 0.04em 0.12em; font-family: ui-monospace, Menlo, monospace !important; text-shadow: none !important; }
    .cap-pop-cursor { font-family: ui-monospace, Menlo, monospace !important; border-right: 0.08em solid #e8c56a; padding-right: 0.08em; }
    .cap-pop-flash { font-family: "Songti SC", serif !important; font-style: italic; }
    .cap-pop-underline { font-family: "Kaiti SC", "KaiTi", serif !important; text-decoration: underline wavy #e8c56a; }
    .cap-pop-white { color: #fff !important; text-shadow: 0 0 18px #fff !important; }
    .cap-pop-state { letter-spacing: 0.14em; font-weight: 300 !important; }
    .cap-pop-dots { font-family: ui-monospace, Menlo, monospace !important; }
    .cap-pop-halftone { letter-spacing: 0.05em; text-shadow: 1px 1px 0 #111, 2px 2px 0 rgba(244,234,208,.35) !important; }
    .cap-neon-glow { animation: capSkinGlow 1.8s ease-in-out infinite; }
    .cap-fx-shimmer, .cap-move-sweep, .cap-look-neon, .cap-look-aurora {
      background-size: 200% 100%;
      animation: capSkinSweep 2s linear infinite;
    }
    @keyframes capSkinGlow {
      0%, 100% { filter: brightness(0.95); }
      50% { filter: brightness(1.15); }
    }
    @keyframes capSkinSweep {
      0% { background-position: 0% 50%; }
      100% { background-position: 200% 50%; }
    }`;
}

export function fallbackCinemaHtml(list: EditList): string {
  const duration = list.durationSec.toFixed(2);
  const speechDur = (list.speechDurationSec || list.durationSec).toFixed(2);
  const grade = filmGradeAttr();
  const captions = buildShotCaptions(list);
  const stills = list.clips
    .map((c, i) => {
      const style = captions[i]?.style || "editorial";
      const extra = clipRegistryMarkup(c, list);
      return `    <section class="clip" id="${c.id}" data-start="${c.start}" data-duration="${c.duration}" data-track-index="0" data-motion="${c.motion}" data-caption-style="${style}"${captions[i]?.skin ? ` data-caption-skin="${captions[i]?.skin}"` : ""} data-layout="${c.layout}">
      ${clipStillMarkup(c, grade)}${extra ? `\n      ${extra}` : ""}
    </section>`;
    })
    .join("\n");
  const speech = list.speechRel
    ? `    <audio id="vo" data-start="0" data-duration="${speechDur}" data-track-index="10" data-volume="${list.speechVolume}" src="${mediaHref(list.speechRel)}"></audio>`
    : "";
  const bgm = list.bgmRel
    ? `    <audio id="bgm" data-start="0" data-duration="${duration}" data-track-index="11" data-volume="${list.bgmVolume}" src="${mediaHref(list.bgmRel)}"></audio>`
    : "";
  const posters = buildPosterCards(list);
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
    <div id="hl-container" data-caption-overlay="film" data-layout-allow-caption-zone></div>
${speech}
${bgm}
  </div>
  <script>
(function () {
  var SHOTS = ${JSON.stringify(captions)};
  var POSTERS = ${JSON.stringify(posters)};
  var MOTION = ${JSON.stringify(motions)};
  var container = document.getElementById("hl-container");
  var tl = gsap.timeline({ paused: true });
  var _fitCanvas = document.createElement("canvas");
  var _fitCtx = _fitCanvas.getContext("2d");
  var slamFont = ${JSON.stringify(SLAM_FONT)};
  var posterFont = ${JSON.stringify(POSTER_FONT)};
  var bodyFont = ${JSON.stringify(BODY_FONT)};
  var slamBase = ${cinemaTypeScale(list.width).slam};
  var posterBase = ${cinemaTypeScale(list.width).poster};
  var edBase = ${cinemaTypeScale(list.width).editorial};
  var edHero = ${cinemaTypeScale(list.width).editorialHero};
  var wipeBase = ${cinemaTypeScale(list.width).wipe};
  var weightBase = ${cinemaTypeScale(list.width).weight};
  var highlightBase = ${cinemaTypeScale(list.width).highlight};
  var frameW = ${list.width};
  function fitFontSize(text, baseFontSize, fontWeight, fontFamily, maxWidth) {
    var size = baseFontSize;
    var minSize = Math.max(Math.floor(baseFontSize * 0.85), Math.round(110 * frameW / 1080));
    while (size > minSize) {
      _fitCtx.font = fontWeight + " " + size + "px " + fontFamily;
      if (_fitCtx.measureText(text).width <= maxWidth) return size;
      size -= 2;
    }
    return minSize;
  }
  function lineFitSize(base, weight, family) {
    return fitFontSize("国国国国国国国国", base, weight, family, Math.round(frameW * 0.86));
  }
  function railFitSize(text, base, weight, family) {
    return fitFontSize(text || "国国", base, weight, family, Math.round(frameW * 0.38));
  }
  MOTION.forEach(function (c) {
    var el = "#" + c.id + "-still";
    if (c.motion === "pull-out") tl.fromTo(el, { scale: 1.16 }, { scale: 1.02, duration: c.duration, ease: "none" }, c.start);
    else if (c.motion === "pan-left") tl.fromTo(el, { scale: 1.12, xPercent: 3.6 }, { scale: 1.12, xPercent: -3.6, duration: c.duration, ease: "none" }, c.start);
    else if (c.motion === "pan-right") tl.fromTo(el, { scale: 1.12, xPercent: -3.6 }, { scale: 1.12, xPercent: 3.6, duration: c.duration, ease: "none" }, c.start);
    else if (c.motion === "punch") tl.fromTo(el, { scale: 1 }, { scale: 1.22, duration: c.duration, ease: "none" }, c.start);
    else tl.fromTo(el, { scale: 1.02 }, { scale: 1.14, duration: c.duration, ease: "none" }, c.start);
  });
  var LAYERS = ${JSON.stringify(
    list.clips.map((c) => ({
      id: c.id,
      start: c.start,
      duration: c.duration,
      layout: c.layout,
      extras: c.extraStillRels.length,
    })),
  )};
  LAYERS.forEach(function (c) {
    if (c.layout !== "montage" || !c.extras) return;
    for (var i = 1; i <= c.extras; i++) {
      var layer = "#" + c.id + "-still-" + i;
      var t = c.start + (c.duration * i) / (c.extras + 1);
      tl.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: 0.28, ease: "power2.out" }, t);
    }
  });
  POSTERS.forEach(function (p, pi) {
    var el = document.createElement("div");
    el.className = "poster-title";
    el.id = "poster-" + pi;
    el.setAttribute("data-pose", p.pose);
    el.textContent = p.text;
    el.style.fontSize = lineFitSize(posterBase, "700", posterFont) + "px";
    container.appendChild(el);
    tl.set(el, { visibility: "visible" }, p.start);
    tl.fromTo(el, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, p.start);
    tl.to(el, { opacity: 0, duration: 0.28, ease: "power1.in" }, Math.max(p.start, p.start + p.duration - 0.32));
    tl.set(el, { visibility: "hidden" }, p.start + p.duration);
  });
  function skinClass(skin) {
    if (!skin) return "";
    return " cap-" + String(skin).replace(/^caption-/, "");
  }
  function wordsByPhrase(words) {
    var groups = [];
    words.forEach(function (w) {
      var id = w.phrase == null ? 0 : w.phrase;
      if (!groups[id]) groups[id] = [];
      groups[id].push(w);
    });
    return groups.filter(function (g) { return g && g.length; });
  }
  function playSlam(shot, prefix) {
    shot.words.forEach(function (w, wi) {
      var el = document.createElement("div");
      el.className = "kt-word" + (w.accent ? " is-accent" : "") + skinClass(shot.skin);
      el.id = "kt-" + prefix + "-" + wi;
      el.textContent = w.text;
      el.style.fontSize = fitFontSize(w.text, slamBase, "900", slamFont, Math.round(frameW * 0.9)) + "px";
      container.appendChild(el);
      gsap.set(el, { yPercent: -50 });
      var mode = wi % 4;
      var next = shot.words[wi + 1];
      var hideAt = next ? Math.min(w.end, next.start) : w.end;
      var fade = Math.min(0.08, Math.max(0.04, hideAt - w.start - 0.04));
      tl.set(el, { visibility: "visible" }, w.start);
      if (mode === 0) tl.fromTo(el, { y: -120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.16, ease: "back.out(1.7)" }, w.start);
      else if (mode === 1) tl.fromTo(el, { x: -300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.14, ease: "expo.out" }, w.start);
      else if (mode === 2) tl.fromTo(el, { x: 300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.14, ease: "expo.out" }, w.start);
      else tl.fromTo(el, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.16, ease: "back.out(2.2)" }, w.start);
      tl.to(el, { opacity: 0, duration: fade, ease: "power2.in" }, hideAt - fade);
      tl.set(el, { opacity: 0, visibility: "hidden" }, hideAt);
    });
  }
  function playEditorial(shot, prefix) {
    if (!shot.words.length) return;
    var phrases = wordsByPhrase(shot.words);
    phrases.forEach(function (phrase, pi) {
      var block = document.createElement("div");
      block.className = "ed-block" + skinClass(shot.skin);
      block.id = "ed-" + prefix + "-" + pi;
      block.setAttribute("data-phrase", String(pi));
      var cut = phrase.length <= 4 ? phrase.length : Math.ceil(phrase.length / 2);
      var lines = [phrase.slice(0, cut), phrase.slice(cut)];
      var phraseText = phrase.map(function (w) { return w.text; }).join("");
      var nSize = fitFontSize(phraseText, edHero, "800", posterFont, Math.round(frameW * 0.84));
      lines.forEach(function (line, li) {
        if (!line.length) return;
        var row = document.createElement("div");
        row.className = "ed-line";
        line.forEach(function (w, wi) {
          var span = document.createElement("span");
          var emphasis = li === 1 || (li === 0 && !lines[1].length && w.accent);
          span.className = "ed-word" + (emphasis ? " is-emphasis" : "") + skinClass(shot.skin);
          span.id = "ed-" + prefix + "-" + pi + "-" + li + "-" + wi;
          span.textContent = w.text;
          span.style.fontSize = nSize + "px";
          row.appendChild(span);
        });
        block.appendChild(row);
      });
      container.appendChild(block);
      var startAt = phrase[0].start;
      var hideAt = phrases[pi + 1] ? phrases[pi + 1][0].start : shot.start + shot.duration;
      tl.set(block, { visibility: "visible" }, startAt);
      tl.fromTo(block, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.22, ease: "power3.out" }, startAt);
      var spans = block.querySelectorAll(".ed-word");
      phrase.forEach(function (w, wi) {
        var wordEl = spans[wi];
        if (!wordEl) return;
        tl.set(wordEl, { opacity: 0, scale: 1.12, transformOrigin: "0% 100%" }, startAt);
        tl.to(wordEl, { opacity: 1, scale: 1, duration: 0.12, ease: "power2.out" }, w.start);
      });
      tl.to(block, { opacity: 0, duration: 0.16, ease: "power1.in" }, Math.max(startAt, hideAt - 0.18));
      tl.set(block, { visibility: "hidden" }, hideAt);
    });
  }
  function playWipe(shot, prefix) {
    if (!shot.words.length) return;
    var phrases = wordsByPhrase(shot.words);
    phrases.forEach(function (phrase, pi) {
      var grp = document.createElement("div");
      grp.className = "wp-group" + skinClass(shot.skin);
      grp.id = "wp-" + prefix + "-" + pi;
      grp.setAttribute("data-phrase", String(pi));
      var phraseText = phrase.map(function (w) { return w.text; }).join("");
      var size = fitFontSize(phraseText, wipeBase, "900", slamFont, Math.round(frameW * 0.86));
      phrase.forEach(function (w, wi) {
        var span = document.createElement("span");
        span.className = "wp-word" + skinClass(shot.skin);
        span.id = "wp-" + prefix + "-" + pi + "-" + wi;
        span.textContent = w.text;
        span.style.fontSize = size + "px";
        grp.appendChild(span);
      });
      container.appendChild(grp);
      var startAt = phrase[0].start;
      var hideAt = phrases[pi + 1] ? phrases[pi + 1][0].start : shot.start + shot.duration;
      tl.set(grp, { visibility: "visible", opacity: 1 }, startAt);
      phrase.forEach(function (w, wi) {
        var wordEl = document.getElementById("wp-" + prefix + "-" + pi + "-" + wi);
        tl.to(wordEl, { clipPath: "inset(0 0% 0 0)", duration: 0.28, ease: "power2.out" }, w.start);
        if (w.accent) tl.to(wordEl, { color: "#FFD700", duration: 0.05 }, w.start + 0.08);
      });
      tl.to(grp, { opacity: 0, duration: 0.16, ease: "power1.in" }, Math.max(startAt, hideAt - 0.18));
      tl.set(grp, { visibility: "hidden" }, hideAt);
    });
  }
  function playWeight(shot, prefix) {
    if (!shot.words.length) return;
    var phrases = wordsByPhrase(shot.words);
    phrases.forEach(function (phrase, pi) {
      var grp = document.createElement("div");
      grp.className = "wt-group" + skinClass(shot.skin);
      grp.id = "wt-" + prefix + "-" + pi;
      grp.setAttribute("data-phrase", String(pi));
      var split = phrase.length <= 4 ? phrase.length : Math.ceil(phrase.length / 2);
      var lines = [phrase.slice(0, split), phrase.slice(split)];
      var phraseText = phrase.map(function (w) { return w.text; }).join("");
      var size = fitFontSize(phraseText, weightBase, "800", bodyFont, Math.round(frameW * 0.86));
      lines.forEach(function (line, li) {
        if (!line.length) return;
        var row = document.createElement("div");
        row.className = "wt-line";
        row.id = "wt-" + prefix + "-" + pi + "-l" + li;
        row.style.fontSize = size + "px";
        row.style.fontWeight = li === 0 ? "700" : "300";
        line.forEach(function (w) {
          var span = document.createElement("span");
          span.textContent = w.text;
          row.appendChild(span);
        });
        grp.appendChild(row);
      });
      container.appendChild(grp);
      var startAt = phrase[0].start;
      var hideAt = phrases[pi + 1] ? phrases[pi + 1][0].start : shot.start + shot.duration;
      tl.set(grp, { visibility: "visible" }, startAt);
      tl.fromTo(grp, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.16, ease: "power3.out" }, startAt);
      var line2 = document.getElementById("wt-" + prefix + "-" + pi + "-l1");
      var line1 = document.getElementById("wt-" + prefix + "-" + pi + "-l0");
      if (line2 && lines[1].length) {
        tl.to(line1, { fontWeight: "300", duration: 0.12, ease: "power2.out" }, lines[1][0].start);
        tl.to(line2, { fontWeight: "700", duration: 0.12, ease: "power2.out" }, lines[1][0].start);
      }
      tl.to(grp, { opacity: 0, duration: 0.16, ease: "power1.in" }, Math.max(startAt, hideAt - 0.18));
      tl.set(grp, { visibility: "hidden" }, hideAt);
    });
  }
  function playHighlight(shot, prefix) {
    if (!shot.words.length) return;
    var wrap = document.createElement("div");
    wrap.className = "hl-lockup" + skinClass(shot.skin);
    wrap.id = "hl-" + prefix;
    if (shot.title) {
      var kicker = document.createElement("div");
      kicker.className = "hl-kicker";
      kicker.textContent = shot.title;
      kicker.style.fontSize = railFitSize(shot.title, Math.round(posterBase * 0.28), "700", posterFont) + "px";
      wrap.appendChild(kicker);
    }
    var longest = shot.words.reduce(function (acc, w) { return w.text.length > acc.length ? w.text : acc; }, "");
    var chipSize = railFitSize(longest, highlightBase, "900", slamFont);
    shot.words.forEach(function (w, wi) {
      var chip = document.createElement("div");
      chip.className = "hl-chip";
      chip.id = "hl-" + prefix + "-c" + wi;
      var bg = document.createElement("span");
      bg.className = "hl-chip-bg";
      bg.id = "hl-" + prefix + "-b" + wi;
      var tx = document.createElement("span");
      tx.className = "hl-chip-text";
      tx.textContent = w.text;
      chip.style.fontSize = chipSize + "px";
      chip.appendChild(bg);
      chip.appendChild(tx);
      wrap.appendChild(chip);
    });
    container.appendChild(wrap);
    tl.set(wrap, { visibility: "visible" }, shot.start);
    tl.fromTo(wrap, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.28, ease: "power3.out" }, shot.start);
    shot.words.forEach(function (w, wi) {
      var bgEl = document.getElementById("hl-" + prefix + "-b" + wi);
      var chipEl = document.getElementById("hl-" + prefix + "-c" + wi);
      tl.to(bgEl, { scaleX: 1, duration: 0.22, ease: "power2.out" }, w.start);
      tl.to(chipEl, { color: "#0c0a08", duration: 0.12, ease: "power2.out", onStart: function () { chipEl.classList.add("is-on"); } }, w.start);
    });
    tl.to(wrap, { opacity: 0, duration: 0.22, ease: "power1.in" }, Math.max(shot.start, shot.start + shot.duration - 0.28));
    tl.set(wrap, { visibility: "hidden" }, shot.start + shot.duration);
  }
  SHOTS.forEach(function (shot, si) {
    if (shot.style === "slam") playSlam(shot, si);
    else if (shot.style === "wipe") playWipe(shot, si);
    else if (shot.style === "weight") playWeight(shot, si);
    else if (shot.style === "highlight") playHighlight(shot, si);
    else playEditorial(shot, si);
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
  if (!/\.poster-title/.test(html)) return { ok: false, reason: "captions" };
  if (!/\.kt-word/.test(html) && !/\.ed-word/.test(html) && !/\.wp-word/.test(html) && !/\.wt-group/.test(html) && !/\.hl-lockup/.test(html)) {
    return { ok: false, reason: "captions" };
  }
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
- 每一镜 <section class="clip"> 按 data-layout 拼图库：hero/reuse 一张图，under-text 图加 is-dim，split 用 .still-stack 两张，montage 主图加 .still.is-layer。section 带稳定 id、data-start、data-duration、data-track-index、data-motion、data-layout；img 带胶片 data-color-grading（adjust 用 contrast/temperature/shadows/highlights/blacks/saturation，details 用 grain/vignette）
- 竖屏屏幕字必须够大：海报标题至少 110px，口播字至少 110px，砸字至少 200px。一行放不下就换行，不得把整句压成正文号。字压图时字是主体。静帧已画短标题的镜不要再叠海报标题，口播字幕仍要；也不要把图压暗
- 静帧运动用时间轴 fromTo 打在 img 上（scale / xPercent，ease none），不要 @keyframes ken-push，不要改 clip 的 visibility
- 屏幕字用海报标题：#hl-container 里 .poster-title，衬线设计体，贴边构图（左上/右上/左下），整镜停留
- 口播按图片分镜换风格，同一镜只保一种：特写/近景用杂志双字体 .ed-word；横移或夜景用擦除揭示 .wp-word；拉远用字重切换 .wt-group；砸切或远景用全屏砸字 .kt-word。词级出字，不要逗号句号；标点处拆开；长句拆成短屏，一屏不要铺满整句。字盖在画面上，不要把画面上推留底栏。容器带 data-caption-overlay="film" 与 data-layout-allow-caption-zone
- 口播 <audio id="vo"> volume 1，配乐 <audio id="bgm"> volume 0.16，都必须有 id
- 人物画面是静帧在动，闭口，不要写成对嘴型出镜，不要画面英文水印，不要厂商名
- 不要改口播和屏幕字原文`;
}

export async function generateCinemaHtml(list: EditList): Promise<string> {
  return fallbackCinemaHtml(list);
}
