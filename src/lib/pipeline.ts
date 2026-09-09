import { access, writeFile } from "fs/promises";
import { generateBoard, generateCopy, shotStillRel } from "./copy";
import { projectPeopleCount } from "./cast";
import { writeAndRenderCinema } from "./cinema-render";
import {
  makePlaceholderStill,
  assertFfmpeg,
  audioToWav,
  concatWavs,
  probeDuration,
} from "./compose";
import { generateCloneStill } from "./flow/image";
import { generateInstrumentalBgm } from "./flow/music";
import { generateSpokenAudio } from "./openspeech";
import { isFlowMock } from "./flow/config";
import { spokenLine } from "./speech-text";
import { projectFile, readProject, tryUpdateProject } from "./store";

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

export function startAfterStills(projectId: string): void {
  if (running.has(projectId)) return;
  running.add(projectId);
  void produceFromSpeech(projectId).finally(() => running.delete(projectId));
}

export function startRegenStill(projectId: string, shotIndex: number): void {
  if (running.has(projectId)) return;
  running.add(projectId);
  void regenStill(projectId, shotIndex).finally(() => running.delete(projectId));
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

export function startAssembleExisting(projectId: string): void {
  if (running.has(projectId)) return;
  running.add(projectId);
  void assembleExisting(projectId).finally(() => running.delete(projectId));
}

export function isProduceBusy(projectId: string): boolean {
  return running.has(projectId);
}

async function writeCopy(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  try {
    await assertFfmpeg();
    await tryUpdateProject(projectId, { status: "running", phase: "copy", progress: 6, message: "在写口播文案…", error: null, draftText: "" });
    let lastDraft = 0;
    const copy = await generateCopy({
      idea: project.idea,
      durationSec: project.targetDurationSec || 15,
      aspect: project.aspect,
      onDelta: async (draft) => {
        const now = Date.now();
        if (now - lastDraft < 120) return;
        lastDraft = now;
        await tryUpdateProject(projectId, { draftText: draft, message: "正在写口播文案…" });
      },
    });
    await tryUpdateProject(projectId, {
      script: copy,
      draftText: "",
      status: "review",
      phase: "copy",
      progress: 18,
      message: "文案写好了，确认后再写图片分镜",
      error: null,
    });
  } catch (e) {
    await tryUpdateProject(projectId, {
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

async function writeBoard(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  try {
    if (!project.script?.shots.length) throw new Error("先确认口播文案");
    await assertFfmpeg();
    await tryUpdateProject(projectId, { status: "running", phase: "board", progress: 20, message: "在写图片分镜…", error: null, draftText: "" });
    let lastDraft = 0;
    const script = await generateBoard({
      script: project.script,
      look: project.look || "",
      aspect: project.aspect,
      peopleCount: projectPeopleCount(project.characterIds),
      onDelta: async (draft) => {
        const now = Date.now();
        if (now - lastDraft < 120) return;
        lastDraft = now;
        await tryUpdateProject(projectId, { draftText: draft, message: "正在写图片分镜…" });
      },
    });
    await tryUpdateProject(projectId, {
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
    await tryUpdateProject(projectId, {
      status: "failed",
      phase: "error",
      progress: 100,
      message: "生成失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function requirePhotos(projectId: string, photos: string[]): Promise<string[]> {
  const photoAbs = photos.map((name) => projectFile(projectId, name));
  if (!photoAbs.length) throw new Error("人物参考图不见了，请重新上传");
  try {
    await access(photoAbs[0]!);
  } catch {
    throw new Error("人物参考图不见了，请重新上传");
  }
  return photoAbs;
}

async function renderShotStill(
  projectId: string,
  shotIndex: number,
  stillAbs: string,
): Promise<void> {
  const project = await readProject(projectId);
  if (!project?.script?.shots[shotIndex]) throw new Error("这一镜不在");
  const shot = project.script.shots[shotIndex]!;
  const photoAbs = await requirePhotos(projectId, project.photos);
  if (isFlowMock()) {
    const flip = (shotIndex + (project.stillRev || 0)) % 2;
    await makePlaceholderStill(stillAbs, project.aspect, flip ? "0x243044" : "0x1a2330");
    return;
  }
  await generateCloneStill({
    scene: shot.scene,
    imagePrompt: shot.imagePrompt,
    look: project.look,
    aspect: project.aspect,
    photoPaths: photoAbs,
    destPath: stillAbs,
    peopleCount: projectPeopleCount(project.characterIds),
  });
}

async function assembleFromCurrentStills(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project?.script?.shots.length || !project.stills.length) throw new Error("先把分镜画面出齐");
  await tryUpdateProject(projectId, { phase: "html", progress: 80, message: "在写合成稿…" });
  await writeAndRenderCinema(projectId);
  const parts = ["成片好了"];
  if (project.speechError) parts.push("口播没加上");
  if (project.musicError) parts.push("配乐没加上");
  await tryUpdateProject(projectId, {
    status: "ready",
    phase: "done",
    progress: 100,
    message: parts.join("，"),
    finalPath: "final.mp4",
    regenShotIndex: null,
  });
}

async function assembleExisting(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  try {
    if (!project.htmlPath) throw new Error("还没有合成稿，成片后才能微调");
    await tryUpdateProject(projectId, {
      status: "running",
      phase: "assemble",
      progress: 84,
      message: "在合成视频…",
      error: null,
    });
    await writeAndRenderCinema(projectId, { reuseHtml: true });
    const parts = ["成片好了"];
    if (project.speechError) parts.push("口播没加上");
    if (project.musicError) parts.push("配乐没加上");
    await tryUpdateProject(projectId, {
      status: "ready",
      phase: "done",
      progress: 100,
      message: parts.join("，"),
      finalPath: "final.mp4",
      regenShotIndex: null,
    });
  } catch (e) {
    await tryUpdateProject(projectId, {
      status: "failed",
      phase: "error",
      progress: 100,
      message: "生成失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function regenStill(projectId: string, shotIndex: number): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  const resumeReady = project.status === "ready" || Boolean(project.finalPath);
  try {
    const shot = project.script?.shots[shotIndex];
    if (!shot) throw new Error("这一镜不在");
    const stillRel = project.stills[shotIndex] || shotStillRel(shotIndex);
    await tryUpdateProject(projectId, {
      status: "running",
      phase: "images",
      regenShotIndex: shotIndex,
      message: `正在重做镜 ${shotIndex + 1}…`,
      error: null,
    });
    await renderShotStill(projectId, shotIndex, projectFile(projectId, stillRel));
    const stills = project.stills.slice();
    if (!stills[shotIndex]) stills[shotIndex] = stillRel;
    const stillRev = (project.stillRev || 0) + 1;
    if (resumeReady) {
      await tryUpdateProject(projectId, {
        stills,
        stillRev,
        regenShotIndex: shotIndex,
        message: `镜 ${shotIndex + 1}已重做，正在重新合成…`,
      });
      await assembleFromCurrentStills(projectId);
      return;
    }
    await tryUpdateProject(projectId, {
      stills,
      stillRev,
      status: "review",
      phase: "images",
      progress: 52,
      regenShotIndex: null,
      message: `镜 ${shotIndex + 1}已重做，对照文字确认`,
    });
  } catch (e) {
    await tryUpdateProject(projectId, {
      status: resumeReady ? "ready" : "review",
      phase: resumeReady ? "done" : "images",
      regenShotIndex: null,
      message: resumeReady ? project.message : "画面好了，对照文字确认，可重做某一镜",
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
    await tryUpdateProject(projectId, {
      status: "running",
      phase: "images",
      progress: 32,
      message: "在生成分镜画面…",
      error: null,
      draftText: "",
      regenShotIndex: null,
    });
    await requirePhotos(projectId, project.photos);
    const stillNames: string[] = [];

    for (let i = 0; i < script.shots.length; i++) {
      const stillRel = shotStillRel(i);
      await tryUpdateProject(projectId, {
        progress: 32 + Math.round(((i + 1) / script.shots.length) * 20),
        message: `生成分镜画面 ${i + 1}/${script.shots.length}…`,
      });
      await renderShotStill(projectId, i, projectFile(projectId, stillRel));
      stillNames.push(stillRel);
      await tryUpdateProject(projectId, {
        script,
        stills: [...stillNames],
        progress: 32 + Math.round(((i + 1) / script.shots.length) * 20),
        message: `生成分镜画面 ${i + 1}/${script.shots.length}…`,
      });
    }

    await tryUpdateProject(projectId, {
      stills: stillNames,
      script,
      status: "review",
      phase: "images",
      progress: 52,
      stillRev: (project.stillRev || 0) + 1,
      regenShotIndex: null,
      message: "画面好了，对照文字确认，可重做某一镜",
    });
  } catch (e) {
    await tryUpdateProject(projectId, {
      status: "failed",
      phase: "error",
      progress: 100,
      message: "生成失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function produceFromSpeech(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project) return;
  try {
    if (!project.script?.shots.length) throw new Error("先确认口播文案");
    if (project.stills.length < project.script.shots.length) throw new Error("先确认分镜画面");
    await assertFfmpeg();
    const script = project.script;
    await tryUpdateProject(projectId, { status: "running", phase: "speech", progress: 54, message: "在生成口播…", error: null });

    const wavs: string[] = [];
    let speechPath: string | undefined;
    let speechError: string | null = null;
    if (!isFlowMock()) {
      try {
        for (let i = 0; i < script.shots.length; i++) {
          const shot = script.shots[i]!;
          const line = spokenLine(shot);
          await tryUpdateProject(projectId, { message: `生成口播 ${i + 1}/${script.shots.length}…` });
          const sampleAbs = project.voicePath ? projectFile(projectId, project.voicePath) : undefined;
          const spoken = await generateSpokenAudio(
            line,
            projectFile(projectId, "speech", `shot-${i + 1}.aiff`),
            sampleAbs,
            project.voiceId,
          );
          if (sampleAbs && !spoken.cloneUsed) {
            speechError = spoken.warning || "选中的克隆音色这次没接上，口播用了备用声音";
          }
          const wav = projectFile(projectId, "speech", `shot-${i + 1}.wav`);
          await audioToWav(spoken.path, wav);
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
    await tryUpdateProject(projectId, { script, speechError, phase: "music", progress: 72, message: "在生成配乐…" });

    const durationSec = script.shots.reduce((n, s) => n + s.durationSec, 0);
    let musicError: string | null = null;
    if (!isFlowMock()) {
      try {
        const audioUrl = await generateInstrumentalBgm(script.musicPrompt, Math.max(20, Math.ceil(durationSec)));
        await download(audioUrl, projectFile(projectId, "bgm.mp3"));
      } catch (e) {
        musicError = e instanceof Error ? e.message : String(e);
      }
    }

    await tryUpdateProject(projectId, { phase: "html", progress: 80, message: "在写合成稿…", musicError, speechError });
    await writeAndRenderCinema(projectId);
    const parts = ["成片好了"];
    if (speechError) parts.push("口播没加上");
    if (musicError) parts.push("配乐没加上");
    await tryUpdateProject(projectId, {
      status: "ready",
      phase: "done",
      progress: 100,
      message: parts.join("，"),
      finalPath: "final.mp4",
      musicError,
      speechError,
      regenShotIndex: null,
    });
  } catch (e) {
    await tryUpdateProject(projectId, {
      status: "failed",
      phase: "error",
      progress: 100,
      message: "生成失败",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
