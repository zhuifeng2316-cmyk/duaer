import { spawn } from "child_process";
import { existsSync } from "fs";
import { access, mkdir, rename, unlink, writeFile } from "fs/promises";
import path from "path";
import { aspectFamily, aspectSize, motionFilter, parseQuality, type Aspect, type Motion, type OutputQuality } from "./aspect";
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
  quality?: OutputQuality;
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
    motionFilter(opts.motion, opts.aspect, dur, parseQuality(opts.quality)),
    "-t",
    String(dur),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    opts.dest,
  ]);
}

export async function makePlaceholderStill(dest: string, aspect: Aspect, color: string, quality: OutputQuality = "2K"): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  const { width, height } = aspectSize(aspect, quality);
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

export async function downscaleStill(src: string, dest: string, maxEdge = 768): Promise<void> {
  await mkdir(path.dirname(dest), { recursive: true });
  await run("ffmpeg", [
    "-y",
    "-i",
    src,
    "-vf",
    `scale=${maxEdge}:${maxEdge}:force_original_aspect_ratio=decrease`,
    "-frames:v",
    "1",
    dest,
  ]);
}

export async function fitImageToAspect(file: string, aspect: Aspect, quality: OutputQuality = "2K"): Promise<void> {
  const { width, height } = aspectSize(aspect, quality);
  const tmp = `${file}.fit.png`;
  await run("ffmpeg", [
    "-y",
    "-i",
    file,
    "-vf",
    `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
    "-frames:v",
    "1",
    tmp,
  ]);
  await unlink(file);
  await rename(tmp, file);
}

function coverFontFile(): { path: string; index: number } | null {
  const songti = "/System/Library/Fonts/Supplemental/Songti.ttc";
  if (existsSync(songti)) return { path: songti, index: 0 };
  const candidates = [
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/System/Library/Fonts/STHeiti Medium.ttc",
    "/System/Library/Fonts/STSong.ttc",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
  ];
  const path = candidates.find((f) => existsSync(f));
  return path ? { path, index: 0 } : null;
}

/** 在已裁好的静帧上叠标题，不重绘脸。竖图压底下，横图靠左下，不要同一套顶栏金角。 */
export async function stampCoverPoster(file: string, titleLines: string[], aspect: Aspect, quality: OutputQuality = "2K"): Promise<void> {
  const lines = titleLines.map((t) => t.trim()).filter(Boolean).slice(0, 3);
  if (!lines.length) return;
  const { width, height } = aspectSize(aspect, quality);
  const font = coverFontFile();
  const place = aspectFamily(aspect) === "landscape" ? "left" : "bottom";
  if (await ffmpegHasFilter("drawtext") && font) {
    const longest = lines.reduce((a, b) => (a.length >= b.length ? a : b));
    const fillRatio = place === "left" ? 0.52 : 0.78;
    const size = Math.min(Math.round((width * fillRatio) / Math.max(1, longest.length)), Math.round(height * 0.07));
    const fontOpt = `fontfile=${font.path.replace(/:/g, "\\:")}:`;
    const bandH = Math.round(height * 0.28);
    const pad = Math.round(height * 0.045);
    const startY = height - pad - Math.round(lines.length * size * 1.08);
    const xExpr = place === "left" ? String(Math.round(width * 0.055)) : "(w-text_w)/2";
    const filters = [`drawbox=x=0:y=${height - bandH}:w=${width}:h=${bandH}:color=black@0.42:t=fill`];
    lines.forEach((line, i) => {
      const y = startY + Math.round(i * size * 1.08);
      filters.push(
        `drawtext=${fontOpt}text='${escapeDrawtext(line)}':fontsize=${size}:fontcolor=0xfff6e6:borderw=4:bordercolor=black@0.7:x=${xExpr}:y=${y}`,
      );
    });
    const tmp = `${file}.poster.png`;
    await run("ffmpeg", ["-y", "-i", file, "-vf", filters.join(","), "-frames:v", "1", tmp]);
    await unlink(file);
    await rename(tmp, file);
    return;
  }
  await stampCoverWithPillow(file, lines, font, place);
}

function stampCoverWithPillow(
  file: string,
  lines: string[],
  font: { path: string; index: number } | null,
  place: "bottom" | "left",
): Promise<void> {
  const payload = JSON.stringify({ file, lines, font: font?.path || "", index: font?.index || 0, place });
  const py = `
import json, sys
from PIL import Image, ImageDraw, ImageFont
d = json.load(sys.stdin)
im = Image.open(d["file"]).convert("RGBA")
w, h = im.size
ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
dr = ImageDraw.Draw(ov)
band = int(h * 0.30)
for i in range(band):
    y = h - band + i
    t = i / max(1, band - 1)
    a = int(205 * (t ** 1.15))
    dr.line([(0, y), (w, y)], fill=(8, 6, 4, a))
def load_font(sz):
    p = d.get("font") or ""
    if p:
        try:
            return ImageFont.truetype(p, sz, index=int(d.get("index") or 0))
        except Exception:
            try:
                return ImageFont.truetype(p, sz)
            except Exception:
                pass
    return ImageFont.load_default()
place = d.get("place") or "bottom"
longest = max(d["lines"], key=len)
target = int(w * (0.52 if place == "left" else 0.78))
lo, hi, best = 28, int(h * 0.075), 28
while lo <= hi:
    mid = (lo + hi) // 2
    bb = load_font(mid).getbbox(longest)
    tw = bb[2] - bb[0]
    if tw <= target:
        best = mid
        lo = mid + 1
    else:
        hi = mid - 1
font = load_font(best)
gap = int(best * 1.08)
pad = int(h * 0.045)
y = h - pad - gap * len(d["lines"])
padx = int(w * 0.055)
fill = (255, 246, 230, 255)
for line in d["lines"]:
    bb = font.getbbox(line)
    tw = bb[2] - bb[0]
    x = (padx - bb[0]) if place == "left" else ((w - tw) // 2 - bb[0])
    dr.text((x, y), line, font=font, fill=fill, stroke_width=max(3, best // 30), stroke_fill=(0, 0, 0, 220))
    y += gap
Image.alpha_composite(im, ov).convert("RGB").save(d["file"])
`.trim();
  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", py], { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (chunk) => {
      err += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim().split("\n").slice(-4).join(" | ") || "封面标题叠不上"));
    });
    child.stdin.write(payload);
    child.stdin.end();
  });
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

export function captionFilter(script: Script, aspect: Aspect, quality: OutputQuality = "2K"): string {
  const { width, height } = aspectSize(aspect, quality);
  const font = findFontFile();
  const fontOpt = font ? `fontfile=${font.replace(/:/g, "\\:")}:` : "";
  const y = Math.round(height * 0.82);
  const fontSize = Math.round(44 * (width / 1080));
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
    return `drawtext=${fontOpt}text='${txt}':fontsize=${fontSize}:fontcolor=white:borderw=3:bordercolor=black@0.75:x=(w-text_w)/2:y=${y}:enable='between(t\\,${c.start.toFixed(2)}\\,${c.end.toFixed(2)})'`;
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

/** CosyVoice 的 speed 经常不生效；用 ffmpeg 把口播加快。 */
export async function applyWavTempo(file: string, tempo: number, fadeOutSec = 0): Promise<void> {
  const rate = Math.min(2, Math.max(0.5, tempo));
  const needTempo = Math.abs(rate - 1) >= 0.01;
  if (!needTempo && fadeOutSec <= 0) return;
  const tmp = `${file}.tempo.wav`;
  const filters: string[] = [];
  if (needTempo) filters.push(`atempo=${rate.toFixed(3)}`);
  if (fadeOutSec > 0) {
    const srcDur = await probeDuration(file);
    const after = needTempo ? srcDur / rate : srcDur;
    const fade = Math.min(fadeOutSec, Math.max(0.12, after * 0.22));
    const start = Math.max(0, after - fade);
    filters.push(`afade=t=out:st=${start.toFixed(3)}:d=${fade.toFixed(3)}`);
  }
  await run("ffmpeg", ["-y", "-i", file, "-af", filters.join(","), "-ar", "44100", "-ac", "1", tmp]);
  await unlink(file);
  await rename(tmp, file);
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
  quality?: OutputQuality;
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
  const vf = canDraw ? captionFilter(opts.script, opts.aspect, parseQuality(opts.quality)) : null;
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

