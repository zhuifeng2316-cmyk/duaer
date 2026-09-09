import { spawn } from "child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { MAX_VOICE_BYTES } from "./voice";

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim().split("\n").slice(-3).join(" | ") || `ffmpeg ${code}`));
    });
  });
}

/** Browser MediaRecorder webm often has no duration cue, so the player looks empty. Wav always plays. */
export async function transcodeVoiceToWav(data: Buffer, ext: string): Promise<{ data: Buffer; ext: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "duaer-voice-"));
  const srcExt = (ext || "webm").replace(/[^a-z0-9]/gi, "") || "webm";
  const src = path.join(dir, `in.${srcExt}`);
  const dest = path.join(dir, "out.wav");
  try {
    await writeFile(src, data);
    await runFfmpeg(["-y", "-i", src, "-ar", "24000", "-ac", "1", dest]);
    const wav = await readFile(dest);
    if (!wav.length || wav.length > MAX_VOICE_BYTES) return { data, ext };
    return { data: wav, ext: "wav" };
  } catch {
    return { data, ext };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function clipVoiceRefWav(srcPath: string, destPath: string, sec = 12): Promise<boolean> {
  try {
    await mkdir(path.dirname(destPath), { recursive: true });
    await runFfmpeg(["-y", "-i", srcPath, "-t", String(sec), "-ar", "24000", "-ac", "1", destPath]);
    return true;
  } catch {
    return false;
  }
}
