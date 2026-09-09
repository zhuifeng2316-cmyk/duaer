import { spawn } from "child_process";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { clipVoiceRefWav } from "../voice-audio";
import {
  authHeaders,
  getFlowApiKey,
  getFlowBaseUrl,
  mapFlowHttpError,
} from "./config";

export function getSpeechModel(): string {
  return (process.env.SPEECH_MODEL || "ark-tts-default").trim();
}

export function getSpeechVoice(): string {
  return (process.env.SPEECH_VOICE || "Tingting").trim();
}

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let err = "";
    child.stderr.on("data", (d) => {
      err += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(err.trim().split("\n").slice(-4).join(" | ") || `${cmd} ${code}`));
    });
  });
}

export function buildFlowSpeechBody(
  text: string,
  ref?: { mime: string; base64: string },
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model: getSpeechModel(),
    input: text,
    voice: "zh_female",
    response_format: "mp3",
  };
  if (ref) {
    const audio = `data:${ref.mime};base64,${ref.base64}`;
    body.reference_audio = audio;
    body.extra_body = { references: [{ audio }] };
  }
  return body;
}

function mimeForVoicePath(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return "audio/webm";
}

async function readSpeechRef(samplePath: string, workDir: string): Promise<{ mime: string; base64: string } | null> {
  const clip = path.join(workDir, "voice-ref.wav");
  const ok = await clipVoiceRefWav(samplePath, clip, 12);
  const filePath = ok ? clip : samplePath;
  try {
    const buf = await readFile(filePath);
    if (!buf.length || buf.length > 8 * 1024 * 1024) return null;
    return { mime: ok ? "audio/wav" : mimeForVoicePath(filePath), base64: buf.toString("base64") };
  } catch {
    return null;
  }
}

async function postFlowSpeech(body: Record<string, unknown>, destAiff: string): Promise<boolean> {
  const apiKey = getFlowApiKey();
  if (!apiKey) return false;
  const res = await fetch(`${getFlowBaseUrl()}/api/v1/audio/speech`, {
    method: "POST",
    headers: { ...authHeaders(apiKey), Accept: "audio/mpeg, application/json, */*" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok || ct.includes("text/html")) {
    if (ct.includes("json")) {
      const data = (await res.json()) as { error?: string; message?: string };
      throw new Error(mapFlowHttpError(res.status, data, "语音"));
    }
    return false;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 200) return false;
  await writeFile(destAiff.replace(/\.aiff$/i, ".mp3"), buf);
  return true;
}

async function tryFlowSpeech(text: string, destAiff: string, samplePath?: string): Promise<boolean> {
  const apiKey = getFlowApiKey();
  if (!apiKey) return false;
  try {
    const ref = samplePath ? await readSpeechRef(samplePath, path.dirname(destAiff)) : null;
    if (ref && (await postFlowSpeech(buildFlowSpeechBody(text, ref), destAiff))) return true;
    return await postFlowSpeech(buildFlowSpeechBody(text), destAiff);
  } catch {
    return false;
  }
}

async function macSay(text: string, destAiff: string): Promise<void> {
  await run("say", ["-v", getSpeechVoice(), "-r", "185", "-o", destAiff, text]);
}

export async function generateSpokenAudio(
  text: string,
  destAiff: string,
  samplePath?: string | null,
): Promise<string> {
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken) throw new Error("没有可念的口播");
  await mkdir(path.dirname(destAiff), { recursive: true });
  const mp3 = destAiff.replace(/\.aiff$/i, ".mp3");
  if (await tryFlowSpeech(spoken, destAiff, samplePath || undefined)) return mp3;
  await macSay(spoken, destAiff);
  return destAiff;
}
