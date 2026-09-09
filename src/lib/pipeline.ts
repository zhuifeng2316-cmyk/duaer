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
  void produce(projectId).finally(() => running.delete(projectId));
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

async function produce(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  try {
    await assertFfmpeg();
    await updateProject(projectId, { status: "running", phase: "copy", progress: 6, message: "在确定文案…", error: null });
    const copy = await generateCopy({
      idea: project.idea,
      durationSec: project.targetDurationSec || 15,
      aspect: project.aspect,
    });
    await updateProject(projectId, { script: copy, progress: 14, phase: "board", message: "在确定图片分镜…" });

    const script = await generateBoard({
      script: copy,
      look: project.look || "",
      aspect: project.aspect,
    });
    await updateProject(projectId, { script, progress: 22, phase: "images", message: "在生成分镜画面…" });

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
        progress: 22 + Math.round(((i + 1) / script.shots.length) * 28),
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
        progress: 22 + Math.round(((i + 1) / script.shots.length) * 28),
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
          const raw = await generateSpokenAudio(line, projectFile(projectId, "speech", `shot-${i + 1}.aiff`));
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
