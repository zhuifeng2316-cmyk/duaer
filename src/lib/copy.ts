import { aspectFamily, parseAspect, parseMotion, type Aspect } from "./aspect";
import { CINEMA_STILL_LOCK, DEFAULT_CINEMA_LOOK } from "./cinema";
import { planBoard } from "./board";
import {
  COMPOSE_LAYOUT_LABEL,
  defaultStillRefs,
  inferComposeLayout,
  inferStillKind,
  layoutCaption,
  parseComposeLayout,
  parseStillKind,
  parseStillRefs,
  type ComposeLayout,
  type StillKind,
} from "./compose-plan";
import { flowChatStream } from "./flow/chat";
import { getScriptModel, isFlowMock } from "./flow/config";
import { extractJsonObject } from "./flow/json";
import {
  graphicLabel,
  inferVisualMode,
  parseBlock,
  parseOverlay,
  parseVisualMode,
  VISUAL_MODE_LABEL,
  type VisualMode,
} from "./hf-registry";
import { houseCatalog, housePromptLine } from "./duaer-registry";
import { compileDirector } from "./director-compile";
import { LETTERING_MODE_LABEL, parseLetteringMode, parseVoiceRole, skillRecipe } from "./skill-recipes";
import { durationForVoiceover } from "./speech-text";
import type { Script, Shot } from "./types";

function copyVoiceRule(visualMode: VisualMode): string {
  const recipe = skillRecipe(visualMode);
  const beats = recipe.copyBeats.map((line) => `- ${line}`).join("\n");
  const music = recipe.musicBeats.map((line) => `- ${line}`).join("\n");
  if (visualMode === "knowledge") {
    return `- 这是知识口播：先给一句人话判断，再讲为什么。像跟聪明人说话，不要像念课本，不要「首先其次最后」，不要堆术语\n${beats}\n${music}`;
  }
  if (visualMode === "product") {
    return `- 这是产品口播：讲人用起来会怎样，不要报功能清单\n${beats}\n${music}`;
  }
  return `- 这是情感口播：落到具体的人和晚上。一句扎人，下一句收住。不要空鸡汤，不要连续金句\n${beats}\n${music}`;
}

export function buildCopySystem(
  minCount: number,
  maxCount: number,
  durationSec: number,
  visualMode: VisualMode = "story",
): string {
  return `你为「人不出镜的口播短视频」只写文案，先不要写画面分镜。成片是画外音，不是对嘴型真人出镜。只输出 JSON：
{"hook":"前3秒钩子","cta":"结尾行动","musicPrompt":"英文器乐提示词","shots":[{"onScreenText":"屏幕大字，不超过16字","voiceover":"这一镜口播画外音，一句，能在时长内念完","durationSec":3}]}
硬性规则：
- 目标时长大约 ${durationSec} 秒，这是预算不是必须切成等长
- 镜数按口播内容分析，${minCount}–${maxCount} 镜，一句一口播一镜。不要凑成固定 5 镜
- 每镜 durationSec 按这句能念完来写，大约每秒 4 个字
- 只写口播和屏幕字，不要写场景、构图、镜头运动
- 口播是画外音，不要写成出镜讲话
${copyVoiceRule(visualMode)}
- 口播要像人说的：短句、有口气、能出口。逗号留气口，不要写成一条念稿。少用「进行」「人们应该」「在当今」
- 简体中文；不要写模型或通道名`;
}

export function buildBoardSystem(count: number, peopleCount = 1, visualMode: VisualMode = "story", script?: Script, aspect: Aspect = "9:16"): string {
  const people = Math.max(1, peopleCount);
  const cast =
    people > 1
      ? `- 已选定 ${people} 个人物。可以同框或分开出现，每人外貌以对应参考照为准；不要再写没选中的路人，除非口播明确需要别人同框`
      : `- 默认每镜只有这一个人。不要写路人、同事、另一张脸、人群；除非口播内容明确需要别人同框，才在 imagePrompt 里写清楚（例如同事、路人）`;
  return `文案已经定稿。你是这条口播的故事墙总导演。先定全片，再逐镜填。不得改 hook、cta、口播、屏幕字。只输出 JSON：
{"visualMode":"${visualMode}","shots":[{"imagePrompt":"有人物底才写场景光；只出组件则空着","scene":"这一镜短场景名或组件名","kind":"wide|close|detail|empty","layout":"hero|under-text|split|reuse|montage","stillRefs":[],"motion":"push-in|pull-out|pan-left|pan-right|punch","graphicIntent":"这一镜屏幕上在动什么，中文短句，可空","lettering":"成片砸字|成片擦字|成片划重点|画进图|组件自带","voiceRole":"开口砸|往前推|收住"}]}
硬性规则：
- ${count} 镜，顺序与已定文案一一对应，不要增删镜
- ${skillRecipe(visualMode).boardDirector.map((line) => line).join("；")}
- 先分析这一镜该出人物底、只出组件，还是人物底上叠透叠动作
- 宿主动作（轮播、产品展示、图表、流程图）默认只出组件：kind 写 empty，imagePrompt 空着
- 透叠动作（下拉刷新、通知、划重点）默认要人物底，imagePrompt 写电影大片场景
- 不是每镜都要背景图。只出组件的镜不要编造人物场景
- 图是图库，不是一镜只能用一张新图。kind：远景 wide、近景 close、细节 detail、空镜/组件 empty
- layout：英雄镜 hero、字压图 under-text、对切 split、复用 reuse、快切 montage
- 复用/对切/快切必须用 stillRefs 指向其它有底图的镜（从 1 起）。对切指 1 张，快切指 1–2 张
- 有人物底的镜必须换构图；全片组法不要只用一种
- 题材 visualMode 已定为 ${visualMode}，不要改
- ${housePromptLine(visualMode, script, aspectFamily(aspect))}
- 组件配色只能是电影大片，不要写扁平互联网风
- 有人物底时 imagePrompt 只写电影大片海报的场景和光，人物让出标题位，不要写成手机自拍或证件照。人物必须是选中的这个人，不要另造一张脸。不要抄口播，不要把整句屏幕字写进画面描述。lettering 是成片砸字、成片划重点、成片擦字时不要把标题画进图
- 人物外貌以参考照片为准：不要写新的脸，不要给人物换一套戏服
${cast}
- 不要写镜头运动长镜头
- 不要改写任何口播或屏幕字
- 简体中文；不要写模型或通道名`;
}

function isHostIntent(intent: string, mode: VisualMode): boolean {
  const t = intent.trim();
  if (!t) return false;
  return houseCatalog().some((h) => h.host && h.modes.includes(mode) && (h.label === t || t.includes(h.label) || h.aliases.some((a) => t.includes(a))));
}

function composeShotFields(
  row: Record<string, unknown>,
  scene: string,
  imagePrompt: string,
  motion: ReturnType<typeof parseMotion>,
  index: number,
  total: number,
  fallback?: Pick<Shot, "kind" | "layout" | "stillRefs" | "overlay" | "block" | "graphicIntent" | "lettering" | "voiceRole">,
  visualMode: VisualMode = "story",
): { kind: StillKind; layout: ComposeLayout; stillRefs: number[]; overlay?: string; block?: string; graphicIntent?: string; lettering?: Shot["lettering"]; voiceRole?: Shot["voiceRole"] } {
  const kind = parseStillKind(String(row.kind || ""), fallback?.kind || inferStillKind(scene, imagePrompt));
  const layout = parseComposeLayout(String(row.layout || ""), fallback?.layout || inferComposeLayout(kind, motion, index, total));
  const refs = parseStillRefs(row.stillRefs ?? fallback?.stillRefs, index, total);
  const overlay = parseOverlay(row.overlay ?? fallback?.overlay, visualMode);
  const block = overlay ? undefined : parseBlock(row.block ?? fallback?.block, visualMode);
  const graphicIntent = String(row.graphicIntent ?? fallback?.graphicIntent ?? "").trim() || undefined;
  return {
    kind,
    layout,
    stillRefs: refs.length ? refs : defaultStillRefs(layout, index, total),
    overlay,
    block,
    graphicIntent,
    lettering: parseLetteringMode(row.lettering ?? fallback?.lettering),
    voiceRole: parseVoiceRole(row.voiceRole ?? fallback?.voiceRole, index, total),
  };
}

export function parseScript(
  raw: unknown,
  opts?: { targetDurationSec?: number; idea?: string },
): Script {
  const plan = planBoard(opts?.targetDurationSec ?? 15);
  const obj = (typeof raw === "string" ? extractJsonObject(raw) : raw) as Record<string, unknown>;
  const visualMode = parseVisualMode(String(obj.visualMode || ""), inferVisualMode(opts?.idea || String(obj.hook || "")));
  const shotsIn = Array.isArray(obj.shots) ? obj.shots : [];
  const mapped: Shot[] = shotsIn.slice(0, plan.maxCount).map((s, i) => {
    const row = (s || {}) as Record<string, unknown>;
    const voiceover = String(row.voiceover || "").trim() || String(row.onScreenText || "").trim();
    const graphicIntent = String(row.graphicIntent || "").trim();
    const hostOnly = isHostIntent(graphicIntent, visualMode) || String(row.kind || "") === "empty";
    const scene = String(row.scene || "").trim() || (hostOnly ? graphicIntent || "组件" : "人物在场景里，闭口自然表情");
    const imagePrompt = hostOnly ? String(row.imagePrompt || "").trim() : String(row.imagePrompt || row.scene || "").trim() || scene;
    const duration = Number(row.durationSec);
    const compose = composeShotFields(row, scene, imagePrompt, parseMotion(String(row.motion || "")), i, Math.max(shotsIn.length, 1), undefined, visualMode);
    return {
      scene,
      imagePrompt,
      onScreenText: String(row.onScreenText || "").trim().slice(0, 16),
      voiceover: voiceover.slice(0, 40),
      durationSec: Math.min(8, Math.max(2, Number.isFinite(duration) ? duration : durationForVoiceover(voiceover))),
      motion: parseMotion(String(row.motion || "")),
      ...compose,
      graphicIntent: compose.graphicIntent || graphicIntent || undefined,
    };
  });

  const shots: Shot[] = mapped.length
    ? mapped
    : [
        {
          scene: "人物半身，干净背景，闭口",
          imagePrompt: "人物半身，干净背景，自然光，闭口，不要对镜头讲话",
          onScreenText: "看这里",
          voiceover: "看这里",
          durationSec: durationForVoiceover("看这里"),
          motion: "push-in",
          kind: "close",
          layout: "hero",
          stillRefs: [],
        },
      ];
  shots.forEach((shot, i) => {
    if (!shot.stillRefs.length) shot.stillRefs = defaultStillRefs(shot.layout, i, shots.length);
  });

  return {
    hook: String(obj.hook || "").trim() || "你肯定没注意这一点",
    cta: String(obj.cta || "").trim() || "关注我，下一条更狠",
    musicPrompt: String(obj.musicPrompt || "").trim() || "tense cinematic pulse instrumental",
    visualMode,
    shots,
  };
}

export function applyBoard(script: Script, raw: unknown, aspect: Aspect = "9:16"): Script {
  const obj = (typeof raw === "string" ? extractJsonObject(raw) : raw) as Record<string, unknown>;
  const visualMode = parseVisualMode(String(obj.visualMode || ""), script.visualMode);
  const shotsIn = Array.isArray(obj.shots) ? obj.shots : [];
  const next: Script = {
    ...script,
    visualMode,
    shots: script.shots.map((shot, i) => {
      const row = (shotsIn[i] || {}) as Record<string, unknown>;
      const graphicIntent = String(row.graphicIntent ?? shot.graphicIntent ?? "").trim();
      const hostOnly = isHostIntent(graphicIntent, visualMode) || String(row.kind || shot.kind || "") === "empty";
      const scene = String(row.scene || "").trim() || (hostOnly ? graphicIntent || shot.scene : shot.scene);
      const imagePrompt = hostOnly ? String(row.imagePrompt ?? "").trim() : String(row.imagePrompt || row.scene || "").trim() || shot.imagePrompt;
      const motion = parseMotion(String(row.motion || shot.motion));
      const compose = composeShotFields(row, scene, imagePrompt, motion, i, script.shots.length, shot, visualMode);
      return {
        ...shot,
        scene,
        imagePrompt,
        motion,
        ...compose,
        kind: hostOnly && !imagePrompt ? "empty" : compose.kind,
      };
    }),
  };
  return compileDirector(next, aspect);
}

function jsonStringField(raw: string, key: string): string {
  const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return m ? m[1]!.replace(/\\n/g, "\n").replace(/\\"/g, '"') : "";
}

export function formatScriptCopy(script: Script): string {
  const lines = [`钩子：${script.hook}`];
  script.shots.forEach((shot, i) => {
    lines.push(`镜${i + 1}「${shot.onScreenText || `镜 ${i + 1}`}」${shot.voiceover}`);
  });
  if (script.cta) lines.push(`结尾：${script.cta}`);
  return lines.join("\n");
}

export function shotBoardText(shot: { imagePrompt?: string; scene?: string; graphicIntent?: string }): string {
  return (shot.imagePrompt || shot.scene || shot.graphicIntent || "组件").trim();
}

export function shotStillRel(index: number): string {
  return `stills/shot-${index + 1}.png`;
}

export function formatScriptBoard(script: Script): string {
  const mode = script.visualMode || "story";
  const head = `题材：${VISUAL_MODE_LABEL[mode]}`;
  const shots = script.shots
    .map((shot, i) => {
      const title = shot.onScreenText || `镜 ${i + 1}`;
      const scene = shot.imagePrompt || shot.scene || (shot.graphicIntent ? "只出组件" : "");
      const graphic = shot.graphicIntent || graphicLabel(shot.overlay || shot.block);
      const lettering = shot.lettering ? LETTERING_MODE_LABEL[shot.lettering] : "";
      const extra = [lettering, graphic].filter(Boolean).join(" · ");
      return `镜${i + 1}「${title}」${layoutCaption(shot.kind, shot.layout)}${extra ? ` · ${extra}` : ""}\n${scene}`;
    })
    .join("\n\n");
  return `${head}\n\n${shots}`;
}

export function formatCopyDraft(raw: string): string {
  const hook = jsonStringField(raw, "hook");
  const cta = jsonStringField(raw, "cta");
  const shotBlocks = [...raw.matchAll(/\{[^{}]*\}/g)];
  const shots = shotBlocks
    .map((block) => {
      const onScreenText = jsonStringField(block[0], "onScreenText");
      const voiceover = jsonStringField(block[0], "voiceover");
      if (!onScreenText && !voiceover) return "";
      return `「${onScreenText || "这一镜"}」${voiceover}`;
    })
    .filter(Boolean);
  const lines: string[] = [];
  if (hook) lines.push(`钩子：${hook}`);
  shots.forEach((line, i) => lines.push(`镜${i + 1}${line}`));
  if (cta) lines.push(`结尾：${cta}`);
  return lines.join("\n") || raw.replace(/[{}"\[\],]/g, " ").replace(/\s+/g, " ").trim();
}

export function formatBoardDraft(raw: string): string {
  const shotBlocks = [...raw.matchAll(/\{[^{}]*\}/g)];
  const shots = shotBlocks
    .map((block, i) => {
      const scene = jsonStringField(block[0], "scene");
      const imagePrompt = jsonStringField(block[0], "imagePrompt");
      if (!scene && !imagePrompt) return "";
      const layout = jsonStringField(block[0], "layout");
      const tag = layout ? COMPOSE_LAYOUT_LABEL[parseComposeLayout(layout)] || layout : "";
      return `镜${i + 1}「${scene || `镜 ${i + 1}`}」${tag}\n${imagePrompt || scene}`;
    })
    .filter(Boolean);
  return shots.join("\n\n") || raw.replace(/[{}"\[\],]/g, " ").replace(/\s+/g, " ").trim();
}

async function emitDraft(text: string, onDelta?: (draft: string) => void | Promise<void>, format?: (raw: string) => string) {
  if (!onDelta) return;
  const formatted = format ? format(text) : text;
  const step = Math.max(10, Math.ceil(formatted.length / 16));
  for (let i = step; i < formatted.length; i += step) {
    await onDelta(formatted.slice(0, i));
    await new Promise((r) => setTimeout(r, 16));
  }
  await onDelta(formatted);
}

export const MOCK_SCRIPT: Script = parseScript(
  {
    hook: "你不用出镜，也能天天发口播",
    cta: "照片和声音都交给克隆",
    musicPrompt: "warm cinematic pulse instrumental, no vocals",
    visualMode: "story",
    shots: [
      { imagePrompt: "窗边侧光特写，闭口", scene: "窗边特写", onScreenText: "还在自己拍口播？", voiceover: "还在找人拍口播出镜吗", motion: "push-in", kind: "close", layout: "hero", stillRefs: [] },
      { imagePrompt: "城市夜景天台，人物在画面里不说话", scene: "夜景天台", onScreenText: "人不出镜也行", voiceover: "人不用出镜，声音画面都能克隆", motion: "pan-right", kind: "wide", layout: "under-text", stillRefs: [] },
      { imagePrompt: "咖啡馆闭口侧脸", scene: "咖啡馆", onScreenText: "全是 AI 来的", voiceover: "文案口播画面配乐一次合成", motion: "pull-out", kind: "close", layout: "split", stillRefs: [1] },
      { imagePrompt: "棚拍半身闭口", scene: "棚拍", onScreenText: "克隆就能发", voiceover: "今晚就能发出去", motion: "punch", kind: "detail", layout: "reuse", stillRefs: [1] },
      { imagePrompt: "地铁车厢里的同一个人，闭口", scene: "地铁", onScreenText: "按秒切图", voiceover: "按时长把分镜写满", motion: "push-in", kind: "empty", layout: "montage", stillRefs: [1, 3] },
    ],
  },
  { targetDurationSec: 15 },
);

function seedMockCopy(script: Script): Script {
  if (script.visualMode === "product") {
    return {
      ...script,
      shots: script.shots.map((shot, i) => {
        if (i === 0) return { ...shot, onScreenText: "刷新一下", voiceover: "列表往下拉就能刷新" };
        if (i === 1) return { ...shot, onScreenText: "界面轮播", voiceover: "三张产品界面轮播给你看" };
        return shot;
      }),
    };
  }
  if (script.visualMode === "knowledge") {
    return {
      ...script,
      shots: script.shots.map((shot, i) => {
        if (i === 0) return { ...shot, onScreenText: "先别买", voiceover: "晚上想买多半不是缺那件东西" };
        if (i === 2) return { ...shot, onScreenText: "先放购物车", voiceover: "累了就会把冲动当成奖励" };
        return shot;
      }),
    };
  }
  return script;
}

export async function generateCopy(input: {
  idea: string;
  durationSec: number;
  aspect: string;
  topic?: string;
  onDelta?: (draft: string) => void | Promise<void>;
}): Promise<Script> {
  const plan = planBoard(input.durationSec);
  const visualMode = parseVisualMode(input.topic || "", inferVisualMode(input.idea));
  if (isFlowMock()) {
    const script = seedMockCopy(
      parseScript({ ...MOCK_SCRIPT, visualMode }, { targetDurationSec: plan.durationSec, idea: input.idea }),
    );
    await emitDraft(formatScriptCopy(script), input.onDelta);
    return script;
  }
  const content = await flowChatStream({
    model: getScriptModel(),
    kind: "文案",
    maxTokens: 2500,
    system: buildCopySystem(plan.minCount, plan.maxCount, plan.durationSec, visualMode),
    user: [
      `目标时长大约 ${plan.durationSec} 秒，画幅：${input.aspect}。镜数按内容来，不要凑成固定 5 镜。`,
      `题材：${visualMode === "knowledge" ? "知识" : visualMode === "product" ? "产品" : "情感"}。`,
      `口播要讲：${input.idea}`,
      "现在只写文案，不要写故事分镜。",
    ].join("\n"),
    onDelta: async (raw) => {
      await input.onDelta?.(formatCopyDraft(raw));
    },
  });
  const script = parseScript(content, { targetDurationSec: plan.durationSec, idea: input.idea });
  await input.onDelta?.(formatScriptCopy(script));
  return { ...script, visualMode: script.visualMode || visualMode };
}

export async function generateBoard(input: {
  script: Script;
  look: string;
  aspect: string;
  peopleCount?: number;
  onDelta?: (draft: string) => void | Promise<void>;
}): Promise<Script> {
  const peopleCount = Math.max(1, input.peopleCount || 1);
  const visualMode = input.script.visualMode || "story";
  if (isFlowMock()) {
    const aspect = parseAspect(input.aspect);
    const script = applyBoard(input.script, {
      visualMode,
      shots: input.script.shots.map((shot, i) => ({
        scene: MOCK_SCRIPT.shots[i]?.scene || shot.scene || `场景 ${i + 1}`,
        imagePrompt: MOCK_SCRIPT.shots[i]?.imagePrompt || shot.imagePrompt || `电影大片场景 ${i + 1}`,
        motion: MOCK_SCRIPT.shots[i]?.motion || shot.motion,
        kind: MOCK_SCRIPT.shots[i]?.kind || shot.kind,
        layout: MOCK_SCRIPT.shots[i]?.layout || shot.layout,
        stillRefs: MOCK_SCRIPT.shots[i]?.stillRefs || shot.stillRefs,
        overlay: shot.overlay,
        block: shot.block,
        graphicIntent: shot.graphicIntent || (visualMode === "knowledge" && i === 2 ? "图表" : visualMode === "knowledge" && i === 0 ? "砸字" : undefined),
        lettering: visualMode === "knowledge" && i === 0 ? "成片砸字" : undefined,
        voiceRole: i === 0 ? "开口砸" : i === input.script.shots.length - 1 ? "收住" : "往前推",
      })),
    }, aspect);
    await emitDraft(formatScriptBoard(script), input.onDelta);
    return script;
  }
  const look = input.look.trim() || DEFAULT_CINEMA_LOOK;
  const locked = input.script.shots
    .map((s, i) => `${i + 1}. 屏幕字：${s.onScreenText}；口播：${s.voiceover}`)
    .join("\n");
  const castLine =
    peopleCount > 1
      ? `已选定 ${peopleCount} 个人物，可以同框或分开出现，不要再加没选中的人。`
      : "故事分镜必须是文字风景/场景/构图描述，服从电影大片要求，并且每镜默认只有这一个人，不要写路人。";
  const content = await flowChatStream({
    model: getScriptModel(),
    kind: "分镜",
    maxTokens: 3500,
    system: buildBoardSystem(input.script.shots.length, peopleCount, visualMode, input.script, parseAspect(input.aspect)),
    user: [
      `画幅：${input.aspect}。强制电影大片。气质补充：${look}`,
      CINEMA_STILL_LOCK,
      "已定文案，按顺序补画面描述，不要出图，不要改口播和屏幕字：",
      locked,
      castLine,
      "这是口播短视频：口播是画外音，画面里的人不要对镜头张嘴主持。",
    ].join("\n"),
    onDelta: async (raw) => {
      await input.onDelta?.(formatBoardDraft(raw));
    },
  });
  const script = applyBoard(input.script, content, parseAspect(input.aspect));
  await input.onDelta?.(formatScriptBoard(script));
  return script;
}

export async function generateScript(input: {
  idea: string;
  look: string;
  durationSec: number;
  aspect: string;
}): Promise<Script> {
  const copy = await generateCopy({
    idea: input.idea,
    durationSec: input.durationSec,
    aspect: input.aspect,
  });
  return generateBoard({ script: copy, look: input.look, aspect: input.aspect });
}
