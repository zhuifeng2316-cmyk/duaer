import { spawn } from "child_process";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
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

async function tryFlowSpeech(text: string, destAiff: string): Promise<boolean> {
  const apiKey = getFlowApiKey();
  if (!apiKey) return false;
  try {
    const res = await fetch(`${getFlowBaseUrl()}/api/v1/audio/speech`, {
      method: "POST",
      headers: { ...authHeaders(apiKey), Accept: "audio/mpeg, application/json, */*" },
      body: JSON.stringify({
        model: getSpeechModel(),
        input: text,
        voice: "zh_female",
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(20_000),
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
  } catch {
    return false;
  }
}

async function macSay(text: string, destAiff: string): Promise<void> {
  await run("say", ["-v", getSpeechVoice(), "-r", "185", "-o", destAiff, text]);
}

export async function generateSpokenAudio(text: string, destAiff: string): Promise<string> {
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken) throw new Error("没有可念的口播");
  await mkdir(path.dirname(destAiff), { recursive: true });
  const mp3 = destAiff.replace(/\.aiff$/i, ".mp3");
  if (await tryFlowSpeech(spoken, destAiff)) return mp3;
  await macSay(spoken, destAiff);
  return destAiff;
}
