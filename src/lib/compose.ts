import { spawn } from "child_process";
import { existsSync } from "fs";
import { access, mkdir, writeFile } from "fs/promises";
import path from "path";
import type { Aspect, Motion } from "./aspect";
import { ASPECT_SIZE, motionFilter } from "./aspect";
import type { Script } from "./types";

function run(cmd: string, args: string[], cwd?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], cwd });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim().split("\n").slice(-6).join(" | ") || `${cmd} ${code}`));
    });
  });
}

export async function assertFfmpeg(): Promise<void> {
  await run("ffmpeg", ["-version"]);
}

async function ffmpegHasFilter(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn("ffmpeg", ["-hide_banner", "-filters"], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.stderr.on("data", (d) => {
      out += d.toString();
    });
    child.on("close", () => resolve(new RegExp(`\\b${name}\\b`).test(out)));
    child.on("error", () => resolve(false));
  });
}

export async function makeStillClip(opts: {
  imagePath: string;
  dest: string;
  durationSec: number;
  motion: Motion;
  aspect: Aspect;
}): Promise<void> {
  await mkdir(path.dirname(opts.dest), { recursive: true });
  const dur = Math.max(2, opts.durationSec);
  await run("ffmpeg", [
    "-y",
    "-loop",
    "1",
    "-i",
    opts.imagePath,
    "-vf",
    motionFilter(opts.motion, opts.aspect, dur),
    "-t",
    String(dur),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    opts.dest,
  ]);
}

export async function makePlaceholderStill(dest: string, aspect: Aspect, color: string): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  const { width, height } = ASPECT_SIZE[aspect];
  await run("ffmpeg", [
    "-y",
    "-f",
    "lavfi",
    "-i",
    `color=c=${color}:s=${width}x${height}:d=0.2`,
    "-frames:v",
    "1",
    dest,
  ]);
}

function escapeDrawtext(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'").replace(/%/g, "%%").replace(/\n/g, " ");
}

function findFontFile(): string {
  const candidates = [
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/System/Library/Fonts/PingFang.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
  ];
  return candidates.find((f) => existsSync(f)) || "";
}

export function captionFilter(script: Script, aspect: Aspect): string {
  const { width, height } = ASPECT_SIZE[aspect];
  const font = findFontFile();
  const fontOpt = font ? `fontfile=${font.replace(/:/g, "\\:")}:` : "";
  const y = Math.round(height * 0.82);
  const cues: { start: number; end: number; text: string }[] = [];
  cues.push({ start: 0, end: 2.2, text: script.hook });
  let t = 0;
  for (const shot of script.shots) {
    if (shot.onScreenText) {
      cues.push({ start: t + 0.1, end: t + shot.durationSec - 0.08, text: shot.onScreenText });
    }
    t += shot.durationSec;
  }
  cues.push({ start: Math.max(0, t - 2.4), end: t, text: script.cta });
  const draws = cues.map((c) => {
    const txt = escapeDrawtext(c.text.slice(0, 18));
    return `drawtext=${fontOpt}text='${txt}':fontsize=44:fontcolor=white:borderw=3:bordercolor=black@0.75:x=(w-text_w)/2:y=${y}:enable='between(t\\,${c.start.toFixed(2)}\\,${c.end.toFixed(2)})'`;
  });
  return [...draws, `scale=${width}:${height}:force_original_aspect_ratio=decrease`, `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`].join(",");
}

export async function probeDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    child.stdout.on("data", (d) => {
      out += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      const n = parseFloat(out.trim());
      if (code === 0 && Number.isFinite(n) && n > 0.2) resolve(n);
      else reject(new Error("读音频时长失败"));
    });
  });
}

export async function audioToWav(src: string, dest: string): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  await run("ffmpeg", ["-y", "-i", src, "-ar", "44100", "-ac", "2", dest]);
}

export async function concatWavs(paths: string[], dest: string, workDir: string): Promise<void> {
  const listBody = paths
    .map((p) => `file '${path.relative(workDir, p).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");
  await writeFile(path.join(workDir, "speech.txt"), listBody, "utf8");
  await run(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", "speech.txt", "-c", "copy", path.basename(dest)],
    workDir,
  );
}

export async function assembleFinal(opts: {
  clipPaths: string[];
  bgmPath?: string;
  speechPath?: string;
  script: Script;
  aspect: Aspect;
  outputPath: string;
  durationSec: number;
}): Promise<void> {
  await assertFfmpeg();
  await mkdir(path.dirname(opts.outputPath), { recursive: true });
  const workDir = path.dirname(opts.outputPath);
  const listPath = path.join(workDir, "final.txt");
  const listBody = opts.clipPaths
    .map((p) => `file '${path.relative(workDir, p).replace(/\\/g, "/").replace(/'/g, "'\\''")}'`)
    .join("\n");
  await writeFile(listPath, listBody, "utf8");
  await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", "final.txt", "-c", "copy", "final.concat.mp4"], workDir);

  const outName = path.basename(opts.outputPath);
  const canDraw = await ffmpegHasFilter("drawtext");
  const vf = canDraw ? captionFilter(opts.script, opts.aspect) : null;
  const video = vf ? ["-vf", vf, "-c:v", "libx264", "-pix_fmt", "yuv420p"] : ["-c:v", "libx264", "-pix_fmt", "yuv420p"];

  const args = ["-y", "-i", "final.concat.mp4"];
  let speechRel: string | undefined;
  let bgmRel: string | undefined;
  if (opts.speechPath) {
    try {
      await access(opts.speechPath);
      speechRel = path.relative(workDir, opts.speechPath);
      args.push("-i", speechRel);
    } catch {
      speechRel = undefined;
    }
  }
  if (opts.bgmPath) {
    try {
      await access(opts.bgmPath);
      bgmRel = path.relative(workDir, opts.bgmPath);
      args.push("-i", bgmRel);
    } catch {
      bgmRel = undefined;
    }
  }

  const tail = [...video, "-t", String(opts.durationSec), "-c:a", "aac", "-shortest", outName];

  if (speechRel && bgmRel) {
    await run(
      "ffmpeg",
      [
        ...args,
        "-filter_complex",
        "[1:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=1.0[a0];[2:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo,volume=0.16[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]",
        "-map",
        "0:v:0",
        "-map",
        "[aout]",
        ...tail,
      ],
      workDir,
    );
    return;
  }
  if (speechRel) {
    await run("ffmpeg", [...args, "-map", "0:v:0", "-map", "1:a:0", ...tail], workDir);
    return;
  }
  if (bgmRel) {
    await run("ffmpeg", [...args, "-map", "0:v:0", "-map", "1:a:0?", ...tail], workDir);
    return;
  }

  await run(
    "ffmpeg",
    ["-y", "-i", "final.concat.mp4", ...video, "-t", String(opts.durationSec), "-an", outName],
    workDir,
  );
}

