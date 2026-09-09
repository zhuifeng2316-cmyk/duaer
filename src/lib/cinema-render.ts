import { spawn } from "child_process";
import { copyFile, cp, lstat, mkdir, readFile, stat, symlink, writeFile } from "fs/promises";
import path from "path";
import { assembleFinal, makeStillClip } from "./compose";
import { isFlowMock } from "./flow/config";
import {
  buildEditList,
  generateCinemaHtml,
  htmlClipToStillRel,
  parseCompositionClips,
  type EditList,
} from "./html-compose";
import { projectDir, projectFile, readProject, tryUpdateProject, writeProjectFile } from "./store";

const RENDER_TIMEOUT_MS = 12 * 60 * 1000;

export function shouldTryHtmlVideoRender(): boolean {
  if (isFlowMock()) return false;
  if ((process.env.CINEMA_HTML_RENDER || "").trim() === "0") return false;
  return true;
}

async function pathExists(abs: string): Promise<boolean> {
  try {
    await lstat(abs);
    return true;
  } catch {
    return false;
  }
}

async function linkIntoCompose(composeDir: string, name: string, srcAbs: string, directory: boolean): Promise<void> {
  const dest = path.join(composeDir, name);
  if (await pathExists(dest)) return;
  const rel = path.relative(composeDir, srcAbs) || ".";
  try {
    await symlink(rel, dest, directory ? "dir" : "file");
  } catch {
    if (directory) await cp(srcAbs, dest, { recursive: true });
    else await copyFile(srcAbs, dest);
  }
}

export async function stageComposeMedia(projectId: string, list: EditList): Promise<string> {
  const composeDir = projectFile(projectId, "compose");
  await mkdir(composeDir, { recursive: true });
  const stillDir = projectFile(projectId, "stills");
  if (await pathExists(stillDir)) {
    await linkIntoCompose(composeDir, "stills", stillDir, true);
  }
  if (list.speechRel) {
    const speechAbs = projectFile(projectId, list.speechRel);
    if (await pathExists(speechAbs)) {
      await linkIntoCompose(composeDir, path.basename(list.speechRel), speechAbs, false);
    }
  }
  if (list.bgmRel) {
    const bgmAbs = projectFile(projectId, list.bgmRel);
    if (await pathExists(bgmAbs)) {
      await linkIntoCompose(composeDir, path.basename(list.bgmRel), bgmAbs, false);
    }
  }
  await writeFile(
    path.join(composeDir, "hyperframes.json"),
    `${JSON.stringify({ paths: { assets: "." } }, null, 2)}\n`,
    "utf8",
  );
  return composeDir;
}

function runTimed(cmd: string, args: string[], opts: { cwd: string; timeoutMs: number }): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("合成超时"));
    }, opts.timeoutMs);
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(err.trim().split("\n").slice(-8).join(" | ") || `合成失败 ${code}`));
    });
  });
}

export async function renderHtmlVideo(opts: { composeDir: string; outputPath: string; fps: number }): Promise<void> {
  await mkdir(path.dirname(opts.outputPath), { recursive: true });
  await runTimed(
    "npx",
    ["--yes", "hyperframes", "render", "-o", opts.outputPath, "--fps", String(opts.fps)],
    { cwd: opts.composeDir, timeoutMs: RENDER_TIMEOUT_MS },
  );
  const st = await stat(opts.outputPath);
  if (!st.isFile() || st.size < 2000) throw new Error("成片文件太小");
}

async function assembleCinemaFfmpeg(opts: {
  projectId: string;
  html: string;
  stillNames: string[];
  speechRel?: string;
  bgmRel?: string;
  durationSec: number;
  outputPath: string;
}): Promise<void> {
  const project = await readProject(opts.projectId);
  if (!project?.script) throw new Error("先把分镜画面出齐");
  const parsed = parseCompositionClips(opts.html);
  const clipPaths: string[] = [];
  for (let i = 0; i < project.script.shots.length; i++) {
    const shot = project.script.shots[i]!;
    const parsedClip = parsed[i];
    const stillRel = parsedClip ? htmlClipToStillRel(parsedClip.src) : opts.stillNames[i]!;
    const stillAbs = projectFile(opts.projectId, opts.stillNames.includes(stillRel) ? stillRel : opts.stillNames[i]!);
    const clipAbs = projectFile(opts.projectId, "clips", `shot-${i + 1}.mp4`);
    await makeStillClip({
      imagePath: stillAbs,
      dest: clipAbs,
      durationSec: parsedClip?.duration || shot.durationSec,
      motion: parsedClip?.motion || shot.motion,
      aspect: project.aspect,
    });
    clipPaths.push(clipAbs);
  }
  await assembleFinal({
    clipPaths,
    bgmPath: opts.bgmRel ? path.join(projectDir(opts.projectId), opts.bgmRel) : undefined,
    speechPath: opts.speechRel ? path.join(projectDir(opts.projectId), opts.speechRel) : undefined,
    script: project.script,
    aspect: project.aspect,
    outputPath: opts.outputPath,
    durationSec: opts.durationSec,
  });
}

async function relIfPresent(projectId: string, rel: string): Promise<string | undefined> {
  return (await pathExists(projectFile(projectId, rel))) ? rel : undefined;
}

export async function writeAndRenderCinema(projectId: string, opts?: { reuseHtml?: boolean }): Promise<void> {
  const project = await readProject(projectId);
  if (!project?.script?.shots.length || !project.stills.length) throw new Error("先把分镜画面出齐");
  const speechRel = await relIfPresent(projectId, "speech.wav");
  const bgmRel = await relIfPresent(projectId, "bgm.mp3");
  const editList = buildEditList({
    script: project.script,
    stillRels: project.stills,
    aspect: project.aspect,
    speechRel,
    bgmRel,
  });
  const composeHtml = projectFile(projectId, "compose/index.html");
  let html: string;
  if (opts?.reuseHtml && (await pathExists(composeHtml))) {
    html = await readFile(composeHtml, "utf8");
  } else {
    html = await generateCinemaHtml(editList);
    await writeProjectFile(projectId, "compose/index.html", html);
  }
  await stageComposeMedia(projectId, editList);
  await tryUpdateProject(projectId, { htmlPath: "compose/index.html", phase: "assemble", progress: 84, message: "在合成视频…" });
  const outputPath = projectFile(projectId, "final.mp4");
  if (shouldTryHtmlVideoRender()) {
    try {
      await renderHtmlVideo({ composeDir: projectFile(projectId, "compose"), outputPath, fps: editList.fps });
      return;
    } catch {
      /* movie edit fallback */
    }
  }
  await assembleCinemaFfmpeg({
    projectId,
    html,
    stillNames: project.stills,
    speechRel,
    bgmRel,
    durationSec: editList.durationSec,
    outputPath,
  });
}
