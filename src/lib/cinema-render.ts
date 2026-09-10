import { spawn } from "child_process";
import { accessSync, constants as fsConstants } from "fs";
import { copyFile, cp, lstat, mkdir, readdir, readFile, stat, symlink, writeFile } from "fs/promises";
import path from "path";
import { writeHouseGraphicPlaceholders } from "./duaer-registry";
import { parseQuality } from "./aspect";
import { talkPicturesReady } from "./graphic-board";
import { assembleFinal, ensureMp4Faststart, makePlaceholderStill, makeStillClip } from "./compose";
import { shotNeedsPersonStill } from "./graphic-board";
import { isFlowMock } from "./flow/config";
import { compileDirector } from "./director-compile";
import {
  buildEditList,
  generateCinemaHtml,
  htmlClipToStillRel,
  parseCompositionClips,
  type EditList,
} from "./html-compose";
import { HOUSE_REGISTRY_ROOT, isKnownGraphic, registryRel } from "./hf-registry";
import { coverTemplateMeta } from "./cover-templates";
import { needsRegistryCopySkin, skinnedRegistryHtml } from "./registry-skin";
import { projectDir, projectFile, readProject, tryUpdateProject, writeProjectFile } from "./store";

const RENDER_TIMEOUT_MS = 12 * 60 * 1000;
const COVER_SNAPSHOT_TIMEOUT_MS = 3 * 60 * 1000;

export const COMPOSE_FALLBACK_NOTICE = "电影合成没渲上，已用剪辑出片";

export function composeFallbackNotice(triedHtml: boolean, htmlFailed: boolean): string | null {
  if (triedHtml && htmlFailed) return COMPOSE_FALLBACK_NOTICE;
  return null;
}

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
  const graphicsDir = projectFile(projectId, "graphics");
  if (await pathExists(graphicsDir)) {
    await linkIntoCompose(composeDir, "graphics", graphicsDir, true);
  }
  const lab = HOUSE_REGISTRY_ROOT;
  const houseAssets = path.join(lab, "assets");
  if (await pathExists(houseAssets)) {
    await linkIntoCompose(composeDir, "assets", houseAssets, true);
  }
  const copied = new Set<string>();
  for (const clip of list.clips) {
    const name = clip.block || clip.overlay;
    if (!name || !isKnownGraphic(name)) continue;
    const rel = registryRel(name);
    if (!rel) continue;
    const src = path.join(lab, rel);
    if (!(await pathExists(src))) continue;
    try {
      if (needsRegistryCopySkin(name)) {
        const raw = await readFile(src, "utf8");
        const skinned = skinnedRegistryHtml(name, raw, clip.id, {
          title: clip.onScreenText,
          line: clip.voiceover || clip.spokenText || "",
        });
        const destRel = `compositions/${skinned.id}.html`;
        const dest = path.join(composeDir, destRel);
        await mkdir(path.dirname(dest), { recursive: true });
        await writeFile(dest, skinned.html, "utf8");
        continue;
      }
      if (copied.has(rel)) continue;
      copied.add(rel);
      const dest = path.join(composeDir, rel);
      await mkdir(path.dirname(dest), { recursive: true });
      await copyFile(src, dest);
    } catch {
      /* skip missing or unreadable registry files */
    }
  }
  await writeFile(
    path.join(composeDir, "hyperframes.json"),
    `${JSON.stringify({ paths: { assets: "." } }, null, 2)}\n`,
    "utf8",
  );
  return composeDir;
}

function runTimed(cmd: string, args: string[], opts: { cwd: string; timeoutMs: number; timeoutError?: string }): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(opts.timeoutError || "合成超时"));
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

function hyperframesBin(): { cmd: string; prefix: string[] } {
  const local = path.join(process.cwd(), "node_modules", ".bin", "hyperframes");
  try {
    accessSync(local, fsConstants.X_OK);
    return { cmd: local, prefix: [] };
  } catch {
    return { cmd: "npx", prefix: ["--yes", "hyperframes"] };
  }
}

export async function renderHtmlVideo(opts: { composeDir: string; outputPath: string; fps: number }): Promise<void> {
  await mkdir(path.dirname(opts.outputPath), { recursive: true });
  const bin = hyperframesBin();
  await runTimed(
    bin.cmd,
    [...bin.prefix, "render", "-o", opts.outputPath, "--fps", String(opts.fps)],
    { cwd: opts.composeDir, timeoutMs: RENDER_TIMEOUT_MS },
  );
  const st = await stat(opts.outputPath);
  if (!st.isFile() || st.size < 2000) throw new Error("成片文件太小");
  await ensureMp4Faststart(opts.outputPath);
}

function snapshotStamp(atSec: number): string {
  return `${Number(atSec.toFixed(3))}s`;
}

export async function stageCoverCompose(opts: {
  composeDir: string;
  html: string;
  stillAbs: string;
  template?: string;
}): Promise<void> {
  await mkdir(opts.composeDir, { recursive: true });
  await copyFile(opts.stillAbs, path.join(opts.composeDir, "still.png"));
  const meta = coverTemplateMeta(opts.template);
  if (meta.kind === "registry") {
    const rel = registryRel(meta.id) || `compositions/components/${meta.id}.html`;
    const src = path.join(HOUSE_REGISTRY_ROOT, rel);
    const dest = path.join(opts.composeDir, rel);
    await mkdir(path.dirname(dest), { recursive: true });
    await copyFile(src, dest);
  }
  await writeFile(path.join(opts.composeDir, "index.html"), opts.html, "utf8");
  await writeFile(path.join(opts.composeDir, "hyperframes.json"), `${JSON.stringify({ paths: { assets: "." } }, null, 2)}\n`, "utf8");
}

export async function snapshotHtmlFrame(opts: { composeDir: string; atSec: number; outputDir: string }): Promise<string> {
  await mkdir(opts.outputDir, { recursive: true });
  const bin = hyperframesBin();
  await runTimed(
    bin.cmd,
    [
      ...bin.prefix,
      "snapshot",
      "--at",
      String(opts.atSec),
      "--no-end",
      "--describe",
      "false",
      "--timeout",
      "60000",
      "-o",
      opts.outputDir,
    ],
    { cwd: opts.composeDir, timeoutMs: COVER_SNAPSHOT_TIMEOUT_MS, timeoutError: "封面抓帧超时" },
  );
  const files = (await readdir(opts.outputDir)).filter((name) => name.startsWith("frame-") && name.endsWith(".png"));
  const stamp = snapshotStamp(opts.atSec);
  const picked = files.find((name) => name.includes(`at-${stamp}`)) || files.sort()[0];
  if (!picked) throw new Error("封面帧没抓到");
  const abs = path.join(opts.outputDir, picked);
  const st = await stat(abs);
  if (!st.isFile() || st.size < 2000) throw new Error("封面帧太小");
  return abs;
}

export async function snapshotCoverPoster(opts: {
  composeDir: string;
  html: string;
  stillAbs: string;
  destAbs: string;
  atSec: number;
  template?: string;
}): Promise<void> {
  await stageCoverCompose({
    composeDir: opts.composeDir,
    html: opts.html,
    stillAbs: opts.stillAbs,
    template: opts.template,
  });
  const frame = await snapshotHtmlFrame({
    composeDir: opts.composeDir,
    atSec: opts.atSec,
    outputDir: path.join(opts.composeDir, "snapshots"),
  });
  await copyFile(frame, opts.destAbs);
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
    const stillRel = parsedClip ? htmlClipToStillRel(parsedClip.src) : opts.stillNames[i] || "";
    const graphicRel = Object.values(shot.graphicAssets || {})[0] || "";
    let stillAbs = "";
    if (shotNeedsPersonStill(shot) && stillRel) {
      stillAbs = projectFile(opts.projectId, stillRel);
    } else if (graphicRel) {
      stillAbs = projectFile(opts.projectId, graphicRel);
    } else {
      stillAbs = projectFile(opts.projectId, "clips", `empty-${i + 1}.png`);
      await makePlaceholderStill(stillAbs, project.aspect, "0x07080c", parseQuality(project.quality));
    }
    const clipAbs = projectFile(opts.projectId, "clips", `shot-${i + 1}.mp4`);
    await makeStillClip({
      imagePath: stillAbs,
      dest: clipAbs,
      durationSec: parsedClip?.duration || shot.durationSec,
      motion: parsedClip?.motion || shot.motion,
      aspect: project.aspect,
      quality: parseQuality(project.quality),
    });
    clipPaths.push(clipAbs);
  }
  await assembleFinal({
    clipPaths,
    bgmPath: opts.bgmRel ? path.join(projectDir(opts.projectId), opts.bgmRel) : undefined,
    speechPath: opts.speechRel ? path.join(projectDir(opts.projectId), opts.speechRel) : undefined,
    script: project.script,
    aspect: project.aspect,
    quality: parseQuality(project.quality),
    outputPath: opts.outputPath,
    durationSec: opts.durationSec,
  });
}

async function relIfPresent(projectId: string, rel: string): Promise<string | undefined> {
  return (await pathExists(projectFile(projectId, rel))) ? rel : undefined;
}

export async function rewriteCinemaHtml(projectId: string): Promise<void> {
  const project = await readProject(projectId);
  if (!project?.script?.shots.length || !project.htmlPath) return;
  const script = compileDirector(project.script, project.aspect);
  await tryUpdateProject(projectId, { script });
  const speechRel = await relIfPresent(projectId, "speech.wav");
  const bgmRel = await relIfPresent(projectId, "bgm.mp3");
  const editList = buildEditList({
    script,
    stillRels: project.stills,
    aspect: project.aspect,
    quality: parseQuality(project.quality),
    speechRel,
    bgmRel,
    captionStyle: project.captionStyle,
  });
  await writeProjectFile(projectId, "compose/index.html", await generateCinemaHtml(editList));
}

export async function writeAndRenderCinema(projectId: string, opts?: { reuseHtml?: boolean }): Promise<void> {
  const project = await readProject(projectId);
  if (!project?.script?.shots.length || !talkPicturesReady(project)) throw new Error("先把分镜画面出齐");
  const script = opts?.reuseHtml ? project.script : compileDirector(project.script, project.aspect);
  if (!opts?.reuseHtml) await tryUpdateProject(projectId, { script });
  const speechRel = await relIfPresent(projectId, "speech.wav");
  const bgmRel = await relIfPresent(projectId, "bgm.mp3");
  const editList = buildEditList({
    script,
    stillRels: project.stills,
    aspect: project.aspect,
    quality: parseQuality(project.quality),
    speechRel,
    bgmRel,
    captionStyle: project.captionStyle,
  });
  await writeHouseGraphicPlaceholders(projectId, script, project.aspect, {
    idea: project.idea,
    quality: parseQuality(project.quality),
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
  const triedHtml = shouldTryHtmlVideoRender();
  if (triedHtml) {
    try {
      await renderHtmlVideo({ composeDir: projectFile(projectId, "compose"), outputPath, fps: editList.fps });
      await tryUpdateProject(projectId, { composeError: null });
      return;
    } catch {
      await tryUpdateProject(projectId, { composeError: composeFallbackNotice(true, true) });
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
