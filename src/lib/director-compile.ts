import { aspectFamily, type Aspect, type AspectFamily } from "./aspect";
import { defaultStillRefs, type ComposeLayout } from "./compose-plan";
import { graphicIsHost, shotNeedsPersonStill } from "./graphic-board";
import { assignGraphics, sanitizeGraphicVars } from "./hf-pick";
import { houseItem } from "./duaer-registry";
import { graphicHoldsLettering, shotHighlightList } from "./html-compose";
import {
  alignShotMotions,
  parseLetteringMode,
  parseVoiceRole,
  skillRecipe,
  type LetteringMode,
} from "./skill-recipes";
import type { Script, Shot } from "./types";

const LANDSCAPE_CHART = /^(data-chart)$/;
const VOCAL_MUSIC = /vocal|vocals|sing|choir|rap\b|playful pop|upbeat pop|catchy pop/i;

const MUSIC_FALLBACK: Record<string, string> = {
  knowledge: "restrained lo-fi cinematic pulse instrumental, soft bass, no vocals, no playful pop",
  story: "warm cinematic pulse instrumental, no vocals",
  product: "clean cinematic product pulse instrumental, no vocals",
};

function shotName(shot: Shot): string {
  return shot.overlay || shot.block || "";
}

function graphicOwnsLettering(shot: Shot): boolean {
  const name = shotName(shot);
  if (!name) return false;
  if (graphicIsHost(name)) return true;
  return graphicHoldsLettering(name, shot.graphicVars);
}

function dropEmptyCaptionGraphic(shot: Shot): Shot {
  if (shot.graphicLock) return shot;
  const name = shotName(shot);
  if (!/^caption-|^hw-title$|^typewriter$|^titlecard-/.test(name)) return shot;
  if (graphicHoldsLettering(name, shot.graphicVars)) return shot;
  return {
    ...shot,
    overlay: undefined,
    block: undefined,
    graphicVars: undefined,
    graphicAssets: undefined,
  };
}

function remapPortraitChart(shot: Shot, family: AspectFamily, mode: string): Shot {
  if (family === "landscape" || mode !== "knowledge") return shot;
  const intent = String(shot.graphicIntent || "").trim();
  const name = shotName(shot);
  const chartIntent = /图表|柱状|折线|数据对比/.test(intent);
  const chartName = LANDSCAPE_CHART.test(name);
  if (!chartIntent && !chartName) return shot;
  const hadPerson = Boolean(String(shot.imagePrompt || "").trim()) && shot.kind !== "empty";
  return {
    ...shot,
    graphicIntent: "划重点",
    overlay: undefined,
    block: undefined,
    graphicVars: undefined,
    graphicAssets: undefined,
    hostStill: true,
    kind: shot.kind === "empty" ? "close" : shot.kind,
    imagePrompt: String(shot.imagePrompt || "").trim() || (hadPerson ? shot.imagePrompt : "人物半身，侧光，闭口，不要对镜头讲话"),
    scene: /图表|柱状|折线|数据/.test(shot.scene) ? "划重点叠人" : shot.scene,
  };
}

function graphicChanged(a: Shot, b: Shot): boolean {
  return a.graphicIntent !== b.graphicIntent || a.overlay !== b.overlay || a.block !== b.block;
}

function flatteningCaption(shot: Shot): boolean {
  const name = shotName(shot);
  const intent = String(shot.graphicIntent || "");
  if (/titlecard-|^caption-|^hw-title$|^typewriter$/.test(name)) return true;
  if (/标题卡|打字机|手写标题/.test(intent) && !/划重点/.test(intent)) return true;
  if (!name && /清单|标题卡|组件|打字机|titlecard/i.test(shot.scene)) return true;
  return false;
}

function preferListHighlight(shot: Shot): Shot {
  if (!shotHighlightList(shot.onScreenText, shot.voiceover)) return shot;
  if (!flatteningCaption(shot)) return shot;
  const prompt = String(shot.imagePrompt || "").trim();
  const sceneLooksLikeGraphic = /清单|标题卡|组件|打字机|titlecard/i.test(shot.scene);
  const cinematicScene = String(shot.scene || "").trim();
  const keepPrompt =
    prompt ||
    (sceneLooksLikeGraphic && cinematicScene.length > 12 ? cinematicScene : "");
  return {
    ...shot,
    graphicIntent: "划重点",
    overlay: undefined,
    block: undefined,
    graphicVars: undefined,
    graphicAssets: undefined,
    hostStill: true,
    kind: shot.kind === "empty" ? "close" : shot.kind,
    // Always keep a person prompt — close/wide with empty prompt used to leave imagePrompt blank.
    imagePrompt: keepPrompt || "人物半身，侧光，闭口，不要对镜头讲话",
    scene: sceneLooksLikeGraphic ? "划重点叠人" : shot.scene,
  };
}

function preferNativeHookSlam(shot: Shot, index: number, hookSlam: boolean): Shot {
  if (!hookSlam || index !== 0) return shot;
  const name = shotName(shot);
  if (!/kinetic-slam|caption-.*slam/.test(name)) return shot;
  return {
    ...shot,
    overlay: undefined,
    block: undefined,
    graphicVars: undefined,
    graphicAssets: undefined,
  };
}

function forceHostEmpty(shot: Shot): Shot {
  const name = shotName(shot);
  const house = name ? houseItem(name) : undefined;
  const host = Boolean(house?.host) || graphicIsHost(name);
  if (!host) return shot;
  // Hosts always own the frame — board LLM must not leave a person montage under 轮播/产品展示.
  return {
    ...shot,
    kind: "empty",
    imagePrompt: "",
    hostStill: false,
    layout: "hero",
    stillRefs: [],
  };
}

function chooseLettering(shot: Shot, index: number, hookSlam: boolean): LetteringMode {
  if (graphicOwnsLettering(shot)) return "graphic";
  if (shotHighlightList(shot.onScreenText, shot.voiceover) && !shotName(shot)) return "overlay-highlight";
  const parsed = parseLetteringMode(shot.lettering);
  if (parsed === "still-title" && hookSlam && index === 0 && !shotName(shot)) return "overlay-slam";
  if (parsed && parsed !== "graphic") return parsed;
  const intent = String(shot.graphicIntent || "");
  const name = shotName(shot);
  if (/砸字|故障字|全屏大字/.test(intent) && !name) return "overlay-slam";
  if (/划重点/.test(intent) && !name) return "overlay-highlight";
  if (/杂志字|字重切换|手写标题|擦除|擦字|字幕/.test(intent) && !name) return "overlay-wipe";
  if (/漏光|闪白|胶片颗粒/.test(intent) || /^(light-leak|flash-through-white|grain-overlay)$/.test(name)) {
    return "overlay-wipe";
  }
  if (hookSlam && index === 0 && !graphicIsHost(name) && !name) return "overlay-slam";
  if (hookSlam && index === 0 && name && !graphicOwnsLettering(shot)) return "overlay-slam";
  if (shotNeedsPersonStill(shot) && !name) return "still-title";
  if (shotNeedsPersonStill(shot) && name) return "overlay-wipe";
  return "overlay-wipe";
}

function captionStyleForIntent(shot: Shot): string | undefined {
  if (shot.captionStyle) return shot.captionStyle;
  if (shotName(shot)) return undefined;
  const intent = String(shot.graphicIntent || "");
  if (/杂志字/.test(intent)) return "caption-editorial-emphasis";
  if (/字重切换/.test(intent)) return "caption-weight-shift";
  return undefined;
}

function applyLettering(shot: Shot, index: number, hookSlam: boolean): Shot {
  const lettering = chooseLettering(shot, index, hookSlam);
  const captionStyle = captionStyleForIntent(shot);
  return {
    ...shot,
    lettering,
    ...(captionStyle ? { captionStyle } : {}),
    letteringInStill: lettering === "still-title" ? undefined : false,
  };
}

function ensureLayoutVariety(shots: Shot[]): Shot[] {
  if (shots.length < 4) return shots;
  const used = new Set(shots.map((s) => s.layout));
  if (used.size >= 3) return shots;
  const personIdx = shots.map((s, i) => (shotNeedsPersonStill(s) ? i : -1)).filter((i) => i >= 0);
  const firstPerson = personIdx[0] ?? 0;
  return shots.map((shot, i) => {
    let layout: ComposeLayout = shot.layout;
    let stillRefs = shot.stillRefs;
    if (!shotNeedsPersonStill(shot)) {
      layout = "hero";
      stillRefs = [];
    } else if (i === 0) layout = "hero";
    else if (i === shots.length - 1 && personIdx.length) {
      layout = "reuse";
      stillRefs = [firstPerson === i ? Math.max(0, i - 1) : firstPerson];
    } else if (i === 1) layout = "under-text";
    else if (firstPerson !== i) {
      layout = "split";
      stillRefs = [firstPerson];
    } else layout = "montage";
    return {
      ...shot,
      layout,
      stillRefs: stillRefs.length ? stillRefs : defaultStillRefs(layout, i, shots.length),
    };
  });
}

export function compileMusicPrompt(mode: string, prompt: string): string {
  const fallback = MUSIC_FALLBACK[mode] || MUSIC_FALLBACK.story!;
  const raw = prompt.trim() || fallback;
  if (VOCAL_MUSIC.test(raw)) return fallback;
  return raw;
}

export function compileDirector(script: Script, aspect: Aspect = "9:16"): Script {
  const mode = script.visualMode || "story";
  const family = aspectFamily(aspect);
  const recipe = skillRecipe(mode);
  const withMusic: Script = {
    ...script,
    musicPrompt: compileMusicPrompt(mode, script.musicPrompt || ""),
  };
  const legalize = (next: Script): Script => ({
    ...next,
    shots: next.shots.map((shot) => remapPortraitChart(shot, family, mode)),
  });
  const first = assignGraphics(legalize(withMusic), aspect);
  const after = legalize(first);
  const picked = after.shots.some((shot, i) => first.shots[i] && graphicChanged(shot, first.shots[i]!))
    ? assignGraphics(after, aspect)
    : after;
  const total = picked.shots.length;
  const hookSlam = recipe.composeMoves.hookSlam;
  const next = picked.shots.map((shot, i) => {
    const hosted = forceHostEmpty(dropEmptyCaptionGraphic(preferListHighlight(preferNativeHookSlam(shot, i, hookSlam))));
    const voiced = { ...hosted, voiceRole: parseVoiceRole(hosted.voiceRole, i, total), graphicVars: sanitizeGraphicVars(hosted.graphicVars) };
    return applyLettering(voiced, i, hookSlam);
  });
  return {
    ...picked,
    musicPrompt: withMusic.musicPrompt,
    shots: alignShotMotions(ensureLayoutVariety(next)),
  };
}
