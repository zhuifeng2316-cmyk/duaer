import { parseMotion } from "./aspect";
import { CINEMA_STILL_LOCK, DEFAULT_CINEMA_LOOK } from "./cinema";
import { planBoard } from "./board";
import { flowChat } from "./flow/chat";
import { getScriptModel, isFlowMock } from "./flow/config";
import { extractJsonObject } from "./flow/json";
import { durationForVoiceover } from "./speech-text";
import type { Script, Shot } from "./types";

export function buildCopySystem(count: number, durationSec: number, each: number): string {
  return `你为「人不出镜的口播短视频」只写文案，先不要写画面分镜。成片是画外音，不是对嘴型真人出镜。只输出 JSON：
{"hook":"前3秒钩子","cta":"结尾行动","musicPrompt":"英文器乐提示词","shots":[{"onScreenText":"屏幕大字，不超过16字","voiceover":"这一镜口播画外音，一句，能在时长内念完","durationSec":${each}}]}
硬性规则：
- 恰好 ${count} 镜，时长合计 ${durationSec} 秒，每镜约 ${each} 秒
- 只写口播和屏幕字，不要写场景、构图、镜头运动
- 口播是画外音，不要写成出镜讲话
- 口播字数按每镜时长：大约每秒 4 个字
- 简体中文；不要写模型或通道名`;
}

export function buildBoardSystem(count: number): string {
  return `文案已经定稿。你只补「图片分镜」，不得改 hook、cta、口播、屏幕字。只输出 JSON：
{"shots":[{"imagePrompt":"只写这一镜的场景、光线、构图、气氛；不要描写另一张脸，不要重新设计发型五官年龄服装","scene":"这一镜短场景名","motion":"push-in|pull-out|pan-left|pan-right|punch"}]}
硬性规则：
- 恰好 ${count} 镜，顺序与已定文案一一对应
- 每镜 imagePrompt 必须是电影大片的场景和光，不要写成手机自拍或证件照
- 人物外貌以参考照片为准：不要写新的脸，不要给人物换一套戏服
- 不要写镜头运动长镜头
- 不要改写任何口播或屏幕字
- 简体中文；不要写模型或通道名`;
}

export function parseScript(
  raw: unknown,
  opts?: { targetDurationSec?: number },
): Script {
  const plan = planBoard(opts?.targetDurationSec ?? 15);
  const obj = (typeof raw === "string" ? extractJsonObject(raw) : raw) as Record<string, unknown>;
  const shotsIn = Array.isArray(obj.shots) ? obj.shots : [];
  const mapped: Shot[] = shotsIn.slice(0, 12).map((s) => {
    const row = (s || {}) as Record<string, unknown>;
    const voiceover = String(row.voiceover || "").trim() || String(row.onScreenText || "").trim();
    const scene = String(row.scene || "").trim() || "人物在场景里，闭口自然表情";
    const imagePrompt = String(row.imagePrompt || row.scene || "").trim() || scene;
    const duration = Number(row.durationSec);
    return {
      scene,
      imagePrompt,
      onScreenText: String(row.onScreenText || "").trim().slice(0, 16),
      voiceover: voiceover.slice(0, 40),
      durationSec: Math.min(8, Math.max(2, Number.isFinite(duration) ? duration : durationForVoiceover(voiceover))),
      motion: parseMotion(String(row.motion || "")),
    };
  });

  const shots: Shot[] = mapped.slice(0, plan.count);
  while (shots.length < plan.count) {
    const seed = shots[0] || {
      scene: "人物半身，干净背景，闭口",
      imagePrompt: "人物半身，干净背景，自然光，闭口，不要对镜头讲话",
      onScreenText: "看这里",
      voiceover: "看这里",
      durationSec: plan.each,
      motion: "push-in" as const,
    };
    shots.push({ ...seed, durationSec: plan.each });
  }
  for (const shot of shots) shot.durationSec = plan.each;

  return {
    hook: String(obj.hook || "").trim() || "你肯定没注意这一点",
    cta: String(obj.cta || "").trim() || "关注我，下一条更狠",
    musicPrompt: String(obj.musicPrompt || "").trim() || "tense cinematic pulse instrumental",
    shots,
  };
}

export function applyBoard(script: Script, raw: unknown): Script {
  const obj = (typeof raw === "string" ? extractJsonObject(raw) : raw) as Record<string, unknown>;
  const shotsIn = Array.isArray(obj.shots) ? obj.shots : [];
  return {
    ...script,
    shots: script.shots.map((shot, i) => {
      const row = (shotsIn[i] || {}) as Record<string, unknown>;
      const scene = String(row.scene || "").trim() || shot.scene;
      const imagePrompt = String(row.imagePrompt || row.scene || "").trim() || shot.imagePrompt;
      return {
        ...shot,
        scene,
        imagePrompt,
        motion: parseMotion(String(row.motion || shot.motion)),
      };
    }),
  };
}

export const MOCK_SCRIPT: Script = parseScript(
  {
    hook: "你不用出镜，也能天天发口播",
    cta: "照片和声音都交给克隆",
    musicPrompt: "warm cinematic pulse instrumental, no vocals",
    shots: [
      { imagePrompt: "窗边侧光特写，闭口", scene: "窗边特写", onScreenText: "还在自己拍口播？", voiceover: "还在找人拍口播出镜吗", motion: "push-in" },
      { imagePrompt: "城市夜景天台，人物在画面里不说话", scene: "夜景天台", onScreenText: "人不出镜也行", voiceover: "人不用出镜，声音画面都能克隆", motion: "pan-right" },
      { imagePrompt: "咖啡馆闭口侧脸", scene: "咖啡馆", onScreenText: "全是 AI 来的", voiceover: "文案口播画面配乐一次合成", motion: "pull-out" },
      { imagePrompt: "棚拍半身闭口", scene: "棚拍", onScreenText: "克隆就能发", voiceover: "今晚就能发出去", motion: "punch" },
      { imagePrompt: "地铁车厢里的同一个人，闭口", scene: "地铁", onScreenText: "按秒切图", voiceover: "按时长把分镜写满", motion: "push-in" },
    ],
  },
  { targetDurationSec: 15 },
);

export async function generateCopy(input: {
  idea: string;
  durationSec: number;
  aspect: string;
}): Promise<Script> {
  const plan = planBoard(input.durationSec);
  if (isFlowMock()) return parseScript(MOCK_SCRIPT, { targetDurationSec: plan.durationSec });
  const content = await flowChat({
    model: getScriptModel(),
    kind: "文案",
    maxTokens: 2500,
    system: buildCopySystem(plan.count, plan.durationSec, plan.each),
    user: [
      `成片时长：${plan.durationSec} 秒，画幅：${input.aspect}，必须恰好 ${plan.count} 镜。`,
      `口播要讲：${input.idea}`,
      "现在只写文案，不要写图片分镜。",
    ].join("\n"),
  });
  return parseScript(content, { targetDurationSec: plan.durationSec });
}

export async function generateBoard(input: {
  script: Script;
  look: string;
  aspect: string;
}): Promise<Script> {
  if (isFlowMock()) return input.script;
  const look = input.look.trim() || DEFAULT_CINEMA_LOOK;
  const locked = input.script.shots
    .map((s, i) => `${i + 1}. 屏幕字：${s.onScreenText}；口播：${s.voiceover}`)
    .join("\n");
  const content = await flowChat({
    model: getScriptModel(),
    kind: "分镜",
    maxTokens: 3500,
    system: buildBoardSystem(input.script.shots.length),
    user: [
      `画幅：${input.aspect}。强制电影大片。气质补充：${look}`,
      CINEMA_STILL_LOCK,
      "已定文案，按顺序补画面，不要改口播和屏幕字：",
      locked,
      "图片分镜必须服从电影大片要求，并且每镜都是同一人物。",
      "这是口播短视频：口播是画外音，画面里的人不要对镜头张嘴主持。",
    ].join("\n"),
  });
  return applyBoard(input.script, content);
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
