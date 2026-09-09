import { writeFile } from "fs/promises";
import path from "path";
import { generateBoard, generateCopy } from "./copy";
import {
  makePlaceholderStill,
  makeStillClip,
  assembleFinal,
  assertFfmpeg,
  audioToWav,
  concatWavs,
  probeDuration,
} from "./compose";
import { generateCloneStill } from "./flow/image";
import { generateInstrumentalBgm } from "./flow/music";
import { generateSpokenAudio } from "./flow/speech";
import { isFlowMock } from "./flow/config";
import {
  buildEditList,
  generateCinemaHtml,
  htmlClipToStillRel,
  parseCompositionClips,
} from "./html-compose";
import { spokenLine } from "./speech-text";
import { projectDir, projectFile, readProject, updateProject, writeProjectFile } from "./store";

const running = new Set<string>();

export const PRODUCE_PHASES = ["copy", "board", "images", "speech", "music", "html", "assemble"] as const;

export function startProduce(projectId: string): void {
  if (running.has(projectId)) return;
  running.add(projectId);
  void writeCopy(projectId).finally(() => running.delete(projectId));
}

export function startAfterCopy(projectId: string): void {
  if (running.has(projectId)) return;
  running.add(projectId);
  void writeBoard(projectId).finally(() => running.delete(projectId));
}

export function startAfterBoard(projectId: string): void {
  if (running.has(projectId)) return;
  running.add(projectId);
  void produceFromImages(projectId).finally(() => running.delete(projectId));
}

export function startRewriteCopy(projectId: string): void {
  if (running.has(projectId)) return;
  running.add(projectId);
  void writeCopy(projectId).finally(() => running.delete(projectId));
}

export function startRewriteBoard(projectId: string): void {
  if (running.has(projectId)) return;
  running.add(projectId);
  void writeBoard(projectId).finally(() => running.delete(projectId));
}

export function isProduceBusy(projectId: string): boolean {
  return running.has(projectId);
}

async function writeCopy(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  try {
    await assertFfmpeg();
    await updateProject(projectId, { status: "running", phase: "copy", progress: 6, message: "在写口播文案…", error: null, draftText: "" });
    let lastDraft = 0;
    const copy = await generateCopy({
      idea: project.idea,
      durationSec: project.targetDurationSec || 15,
      aspect: project.aspect,
      onDelta: async (draft) => {
        const now = Date.now();
        if (now - lastDraft < 120) return;
        lastDraft = now;
        await updateProject(projectId, { draftText: draft, message: "正在写口播文案…" });
      },
    });
    await updateProject(projectId, {
      script: copy,
      draftText: "",
      status: "review",
      phase: "copy",
      progress: 18,
      message: "文案写好了，确认后再写图片分镜",
      error: null,
    });
  } catch (e) {
    await updateProject(projectId, {
      status: "failed",
      phase: "error",
      progress: 100,
      message: "生成失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error("下载配乐失败");
  await writeFile(dest, Buffer.from(await res.arrayBuffer()));
}

function relIfExists(projectId: string, abs?: string): string | undefined {
  if (!abs) return undefined;
  return path.relative(projectDir(projectId), abs).replace(/\\/g, "/");
}

async function writeBoard(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  try {
    if (!project.script?.shots.length) throw new Error("先确认口播文案");
    await assertFfmpeg();
    await updateProject(projectId, { status: "running", phase: "board", progress: 20, message: "在写图片分镜…", error: null, draftText: "" });
    let lastDraft = 0;
    const script = await generateBoard({
      script: project.script,
      look: project.look || "",
      aspect: project.aspect,
      onDelta: async (draft) => {
        const now = Date.now();
        if (now - lastDraft < 120) return;
        lastDraft = now;
        await updateProject(projectId, { draftText: draft, message: "正在写图片分镜…" });
      },
    });
    await updateProject(projectId, {
      script,
      draftText: "",
      status: "review",
      phase: "board",
      progress: 28,
      stills: [],
      message: "分镜写好了，确认后再出图",
      error: null,
    });
  } catch (e) {
    await updateProject(projectId, {
      status: "failed",
      phase: "error",
      progress: 100,
      message: "生成失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function produceFromImages(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  try {
    if (!project.script?.shots.length) throw new Error("先确认口播文案");
    if (!project.script.shots.some((shot) => shot.imagePrompt || shot.scene)) {
      throw new Error("先确认图片分镜");
    }
    await assertFfmpeg();
    const script = project.script;
    await updateProject(projectId, { status: "running", phase: "images", progress: 32, message: "在生成分镜画面…", error: null, draftText: "" });

    const photoAbs = project.photos.map((name) => projectFile(projectId, name));
    if (!photoAbs.length) throw new Error("人物参考图不见了，请重新上传");
    const { access } = await import("fs/promises");
    try {
      await access(photoAbs[0]!);
    } catch {
      throw new Error("人物参考图不见了，请重新上传");
    }
    const stillNames: string[] = [];

    for (let i = 0; i < script.shots.length; i++) {
      const shot = script.shots[i]!;
      const stillRel = `stills/shot-${i + 1}.png`;
      const stillAbs = projectFile(projectId, stillRel);
      await updateProject(projectId, {
        progress: 32 + Math.round(((i + 1) / script.shots.length) * 20),
        message: `生成分镜画面 ${i + 1}/${script.shots.length}…`,
      });
      if (isFlowMock()) {
        await makePlaceholderStill(stillAbs, project.aspect, i % 2 ? "0x243044" : "0x1a2330");
      } else {
        await generateCloneStill({
          scene: shot.scene,
          imagePrompt: shot.imagePrompt,
          look: project.look,
          aspect: project.aspect,
          photoPaths: photoAbs,
          destPath: stillAbs,
        });
      }
      stillNames.push(stillRel);
      await updateProject(projectId, {
        script,
        stills: [...stillNames],
        progress: 32 + Math.round(((i + 1) / script.shots.length) * 20),
        message: `生成分镜画面 ${i + 1}/${script.shots.length}…`,
      });
    }

    await updateProject(projectId, { stills: stillNames, script, phase: "speech", progress: 54, message: "在生成口播…" });

    const wavs: string[] = [];
    let speechPath: string | undefined;
    let speechError: string | null = null;
    if (!isFlowMock()) {
      try {
        for (let i = 0; i < script.shots.length; i++) {
          const shot = script.shots[i]!;
          const line = spokenLine(shot);
          await updateProject(projectId, { message: `生成口播 ${i + 1}/${script.shots.length}…` });
          const sampleAbs = project.voicePath ? projectFile(projectId, project.voicePath) : undefined;
          const raw = await generateSpokenAudio(
            line,
            projectFile(projectId, "speech", `shot-${i + 1}.aiff`),
            sampleAbs,
          );
          const wav = projectFile(projectId, "speech", `shot-${i + 1}.wav`);
          await audioToWav(raw, wav);
          shot.durationSec = Math.min(8, Math.max(2, await probeDuration(wav)));
          wavs.push(wav);
        }
        speechPath = projectFile(projectId, "speech.wav");
        await concatWavs(wavs, speechPath, projectFile(projectId));
      } catch (e) {
        speechError = e instanceof Error ? e.message : String(e);
        speechPath = undefined;
      }
    }
    await updateProject(projectId, { script, speechError, phase: "music", progress: 72, message: "在生成配乐…" });

    const durationSec = script.shots.reduce((n, s) => n + s.durationSec, 0);
    let bgmPath: string | undefined;
    let musicError: string | null = null;
    if (!isFlowMock()) {
      try {
        const audioUrl = await generateInstrumentalBgm(script.musicPrompt, Math.max(20, Math.ceil(durationSec)));
        bgmPath = projectFile(projectId, "bgm.mp3");
        await download(audioUrl, bgmPath);
      } catch (e) {
        musicError = e instanceof Error ? e.message : String(e);
      }
    }

    await updateProject(projectId, { phase: "html", progress: 80, message: "在写合成稿…", musicError, speechError });
    const editList = buildEditList({
      script,
      stillRels: stillNames,
      aspect: project.aspect,
      speechRel: relIfExists(projectId, speechPath),
      bgmRel: relIfExists(projectId, bgmPath),
    });
    const html = await generateCinemaHtml(editList);
    await writeProjectFile(projectId, "compose/index.html", html);
    await updateProject(projectId, { htmlPath: "compose/index.html", phase: "assemble", progress: 84, message: "在合成视频…" });

    const parsed = parseCompositionClips(html);
    const clipPaths: string[] = [];
    for (let i = 0; i < script.shots.length; i++) {
      const shot = script.shots[i]!;
      const parsedClip = parsed[i];
      const stillRel = parsedClip ? htmlClipToStillRel(parsedClip.src) : stillNames[i]!;
      const stillAbs = projectFile(projectId, stillNames.includes(stillRel) ? stillRel : stillNames[i]!);
      const clipAbs = projectFile(projectId, "clips", `shot-${i + 1}.mp4`);
      await makeStillClip({
        imagePath: stillAbs,
        dest: clipAbs,
        durationSec: parsedClip?.duration || shot.durationSec,
        motion: parsedClip?.motion || shot.motion,
        aspect: project.aspect,
      });
      clipPaths.push(clipAbs);
    }
    const finalPath = projectFile(projectId, "final.mp4");
    await assembleFinal({
      clipPaths,
      bgmPath,
      speechPath,
      script,
      aspect: project.aspect,
      outputPath: finalPath,
      durationSec,
    });
    const parts = ["成片好了"];
    if (speechError) parts.push("口播没加上");
    if (musicError) parts.push("配乐没加上");
    await updateProject(projectId, {
      status: "ready",
      phase: "done",
      progress: 100,
      message: parts.join("，"),
      finalPath: "final.mp4",
      musicError,
      speechError,
    });
  } catch (e) {
    await updateProject(projectId, {
      status: "failed",
      phase: "error",
      progress: 100,
      message: "生成失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
