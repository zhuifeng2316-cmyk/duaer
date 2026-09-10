import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { clipVoiceRefWav } from "./voice-audio";
import { synthesizeCachedCosyVoice } from "./cosyvoice";
import { DEFAULT_HOUSE_VOICE_ID, getHouseVoice, isHouseVoiceId } from "./house-voices";
import { talkSpeechStyle, type SpeechStyle } from "./speech-style";

export const CLONE_VOICE_MISS = "选中的克隆音色这次没接上，口播用了备用声音";
export const CLONE_VOICE_CLOSED = "克隆音色通道还没开通，口播用了备用声音";

const OPEN_SPEECH_BASE_URL = "https://openspeech.bytedance.com";

/** 产品名 doubao-seed-tts-2.0 对应 openspeech 资源 ID seed-tts-2.0 */
const SEED_TTS_2_0 = "seed-tts-2.0";
const SEED_ICL_2_0 = "seed-icl-2.0";

export function getSpeechResourceId(): string {
  const raw = (process.env.SPEECH_MODEL || SEED_TTS_2_0).trim();
  if (/doubao-seed-tts-2(\.0)?/i.test(raw) || raw === "ark-tts-default") return SEED_TTS_2_0;
  if (raw === "seed-tts-2.0" || raw === "seed-icl-2.0") return raw;
  return SEED_TTS_2_0;
}

type SpeechRef = { format: "wav" | "mp3" | "m4a" | "ogg" | "pcm"; base64: string };

export type SpokenAudio = {
  path: string;
  cloneUsed: boolean;
  warning: string | null;
  tempo: number;
};

function openSpeechApiKey(): string {
  return (process.env.OPEN_SPEECH_API_KEY || process.env.ARK_API_KEY || "").trim();
}

function getOpenSpeechSpeakerId(): string {
  // 非克隆的系统预设音色 ID（应为 seed-tts-2.0 支持的 speaker）。
  return (process.env.SPEECH_SPEAKER_ID || process.env.SPEECH_VOICE || "zh_female_gaolengyujie_uranus_bigtts").trim();
}

export function customSpeakerId(voiceId: string): string {
  const hex = voiceId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "voice";
  const id = `duaer${hex}`;
  return id.length >= 8 ? id : `${id}voice`;
}

export function voiceCloneUrls(): string[] {
  return [`${OPEN_SPEECH_BASE_URL}/api/v3/tts/voice_clone`];
}

export function voiceStatusUrls(): string[] {
  return [`${OPEN_SPEECH_BASE_URL}/api/v3/tts/get_voice`];
}

export function clonedSpeechResourceId(): string {
  return SEED_ICL_2_0;
}

let iclGranted: boolean | null = null;

export function resetCloneChannelCache(): void {
  iclGranted = null;
}

function cloneDenied(text: string): boolean {
  return /resource not granted|45000030|Invalid X-Api-Key/i.test(text);
}

async function isCloneChannelOpen(): Promise<boolean> {
  if (iclGranted != null) return iclGranted;
  const headers = openSpeechHeaders(SEED_ICL_2_0);
  if (!headers) {
    iclGranted = false;
    return false;
  }
  try {
    const res = await fetch(`${OPEN_SPEECH_BASE_URL}/api/v3/plan/tts/unidirectional`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        user: { uid: "duaer" },
        req_params: {
          text: "测",
          speaker: "S_probe",
          audio_params: { format: "mp3", sample_rate: 24000 },
          additions: JSON.stringify({ model_type: 4 }),
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    iclGranted = !cloneDenied(text);
    return iclGranted;
  } catch {
    iclGranted = false;
    return false;
  }
}

function cloneAuthHeaders(resourceId?: string): Record<string, string> | null {
  const apiKey = openSpeechApiKey();
  if (!apiKey) return null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Api-Key": apiKey,
    "X-Api-Request-Id": randomUUID(),
  };
  if (resourceId) headers["X-Api-Resource-Id"] = resourceId;
  return headers;
}

function openSpeechHeaders(resourceId: string): Record<string, string> | null {
  const apiKey = openSpeechApiKey();
  if (apiKey) {
    return {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": randomUUID(),
    };
  }

  // 兼容旧版鉴权方式：X-Api-App-Id + X-Api-Access-Key
  const appId = (process.env.DOUBAO_TTS_APP_ID || "").trim();
  const accessKey = (process.env.DOUBAO_TTS_ACCESS_KEY || "").trim();
  if (appId && accessKey) {
    return {
      "Content-Type": "application/json",
      "X-Api-App-Id": appId,
      "X-Api-Access-Key": accessKey,
      "X-Api-Resource-Id": resourceId,
      "X-Api-Request-Id": randomUUID(),
    };
  }

  return null;
}

function mp3OutPathFromAiff(destAiff: string): string {
  return destAiff.replace(/\.aiff$/i, ".mp3");
}

function openSpeechCacheSpeakerPath(voiceId: string): string {
  return path.join(process.cwd(), "storage", "voices", voiceId, "speaker.json");
}

async function readCachedSpeakerId(voiceId: string): Promise<string | null> {
  try {
    const file = openSpeechCacheSpeakerPath(voiceId);
    await stat(file);
    const json = JSON.parse(await readFile(file, "utf8")) as { speakerId?: string };
    const speakerId = typeof json.speakerId === "string" ? json.speakerId.trim() : "";
    return speakerId ? speakerId : null;
  } catch {
    return null;
  }
}

async function writeCachedSpeakerId(voiceId: string, speakerId: string): Promise<void> {
  const file = openSpeechCacheSpeakerPath(voiceId);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ speakerId, createdAt: new Date().toISOString() }, null, 2));
}

function formatFromMimeByExt(filePath: string): SpeechRef["format"] {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".wav")) return "wav";
  if (lower.endsWith(".mp3")) return "mp3";
  if (lower.endsWith(".m4a") || lower.endsWith(".mp4")) return "m4a";
  if (lower.endsWith(".ogg")) return "ogg";
  if (lower.endsWith(".pcm")) return "pcm";
  return "wav";
}

async function readSpeechRef(samplePath: string, workDir: string): Promise<SpeechRef | null> {
  const clip = path.join(workDir, "voice-ref.wav");
  const ok = await clipVoiceRefWav(samplePath, clip, 12);
  const filePath = ok ? clip : samplePath;

  try {
    const buf = await readFile(filePath);
    if (!buf.length || buf.length > 8 * 1024 * 1024) return null;
    const format = ok ? "wav" : formatFromMimeByExt(filePath);
    return { format, base64: buf.toString("base64") };
  } catch {
    return null;
  }
}

async function parseOpenSpeechNdjsonAudio(text: string): Promise<Buffer> {
  // plan/unidirectional 可能是 NDJSON，也可能是粘连的多个 JSON 对象。
  // code=0: data 为 base64 音频块；code=20000000：结束。
  const chunks: Buffer[] = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf("{", i);
    if (start < 0) break;
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let j = start; j < text.length; j++) {
      const ch = text[j]!;
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{") depth += 1;
      else if (ch === "}") {
        depth -= 1;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end < 0) break;
    try {
      const obj = JSON.parse(text.slice(start, end + 1)) as { code?: number; data?: string };
      if (obj.code === 0 && typeof obj.data === "string" && obj.data.trim()) {
        chunks.push(Buffer.from(obj.data, "base64"));
      } else if (obj.code === 20000000) {
        break;
      } else if (typeof obj.code === "number" && obj.code !== 0) {
        throw new Error(`openspeech error code=${obj.code}`);
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("openspeech error")) throw e;
    }
    i = end + 1;
  }

  if (!chunks.length) throw new Error("openspeech: empty audio chunks");
  return Buffer.concat(chunks);
}

async function postOpenSpeechUnidirectional(params: {
  text: string;
  speakerId: string;
  resourceId: string;
  additions?: string;
  destAiff: string;
  speechRate?: number;
}): Promise<boolean> {
  const headers = openSpeechHeaders(params.resourceId);
  if (!headers) return false;

  const audioParams: Record<string, unknown> = { format: "mp3", sample_rate: 24000 };
  if (typeof params.speechRate === "number" && Number.isFinite(params.speechRate)) {
    audioParams.speech_rate = Math.max(-50, Math.min(100, Math.round(params.speechRate)));
  }

  const body: Record<string, unknown> = {
    user: { uid: "duaer" },
    req_params: {
      text: params.text,
      speaker: params.speakerId,
      audio_params: audioParams,
    },
  };
  if (params.additions) (body.req_params as Record<string, unknown>).additions = params.additions;

  // 方舟/豆包语音新控制台 API Key 走 plan 接口；旧 uni 接口常报 Invalid X-Api-Key。
  const urls = [
    `${OPEN_SPEECH_BASE_URL}/api/v3/plan/tts/unidirectional`,
    `${OPEN_SPEECH_BASE_URL}/api/v3/tts/unidirectional`,
  ];
  for (const url of urls) {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) continue;
    const text = await res.text();
    try {
      const audio = await parseOpenSpeechNdjsonAudio(text);
      if (audio.length < 200) continue;
      await writeFile(mp3OutPathFromAiff(params.destAiff), audio);
      return true;
    } catch {
      // try next endpoint
    }
  }
  return false;
}

function parseCloneSpeaker(json: { speaker_id?: string; status?: number }): string | null {
  const speakerId = typeof json.speaker_id === "string" ? json.speaker_id.trim() : "";
  if (!speakerId) return null;
  const status = typeof json.status === "number" ? json.status : 0;
  if (status === 2 || status === 4 || status === 0) return speakerId;
  return speakerId;
}

async function pollCloneSpeaker(speakerId: string, headers: Record<string, string>): Promise<string | null> {
  const started = Date.now();
  while (Date.now() - started < 180_000) {
    await new Promise((r) => setTimeout(r, 3000));
    for (const url of voiceStatusUrls()) {
      const pollRes = await fetch(url, {
        method: "POST",
        headers: { ...headers, "X-Api-Request-Id": randomUUID() },
        body: JSON.stringify({ speaker_id: speakerId }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!pollRes.ok) continue;
      const pollJson = (await pollRes.json().catch(() => ({}))) as { speaker_id?: string; status?: number };
      if ((pollJson.status === 2 || pollJson.status === 4) && typeof pollJson.speaker_id === "string") {
        return pollJson.speaker_id;
      }
    }
  }
  return null;
}

async function postOpenSpeechVoiceClone(params: {
  customSpeakerId: string;
  ref: SpeechRef;
}): Promise<string | null> {
  const headerSets = [cloneAuthHeaders(), cloneAuthHeaders(SEED_ICL_2_0)].filter(
    (h): h is Record<string, string> => Boolean(h),
  );
  if (!headerSets.length) return null;

  const body = {
    speaker_id: "custom_speaker_id",
    custom_speaker_id: params.customSpeakerId,
    audio: {
      data: params.ref.base64,
      format: params.ref.format,
    },
    language: 0,
    extra_params: JSON.stringify({ enable_audio_denoise: false }),
  };

  for (const headers of headerSets) {
    for (const url of voiceCloneUrls()) {
      const res = await fetch(url, {
        method: "POST",
        headers: { ...headers, "X-Api-Request-Id": randomUUID() },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) continue;
      try {
        const json = (await res.json()) as { speaker_id?: string; status?: number };
        const speakerId = parseCloneSpeaker(json);
        if (!speakerId) continue;
        if (json.status === 2 || json.status === 4) return speakerId;
        return (await pollCloneSpeaker(speakerId, headers)) || speakerId;
      } catch {
        // try next auth / URL
      }
    }
  }
  return null;
}

async function tryClonedSpeech(
  text: string,
  destAiff: string,
  samplePath: string,
  voiceId: string | null,
  instruction?: string,
): Promise<boolean> {
  if (!voiceId) return false;
  if (!(await isCloneChannelOpen())) return false;

  const ref = await readSpeechRef(samplePath, path.dirname(destAiff));
  if (!ref) return false;

  const cachedSpeakerId = await readCachedSpeakerId(voiceId);
  const additions = JSON.stringify({
    model_type: 4,
    ...(instruction?.trim() ? { context_texts: [instruction.trim()] } : {}),
  });

  const speakerId =
    cachedSpeakerId ||
    (await postOpenSpeechVoiceClone({
      customSpeakerId: customSpeakerId(voiceId),
      ref,
    }));

  if (!speakerId) return false;
  if (!cachedSpeakerId) await writeCachedSpeakerId(voiceId, speakerId);

  // 克隆音色必须走 ICL 资源；成片 seed-tts-2.0 对不上克隆 speaker。
  return postOpenSpeechUnidirectional({
    text,
    speakerId,
    resourceId: clonedSpeechResourceId(),
    additions,
    destAiff,
  });
}

async function tryHouseSpeech(
  text: string,
  destAiff: string,
  voiceId: string | null,
  style: SpeechStyle,
): Promise<boolean> {
  const house = getHouseVoice(voiceId) || getHouseVoice(DEFAULT_HOUSE_VOICE_ID);
  if (!house) return false;
  const instruction = style.instruction.trim() || house.vibe;
  return postOpenSpeechUnidirectional({
    text,
    speakerId: house.speaker,
    resourceId: getSpeechResourceId(),
    destAiff,
    speechRate: style.speechRate,
    additions: JSON.stringify({ context_texts: [instruction] }),
  });
}

async function tryPlainSpeech(text: string, destAiff: string, style?: SpeechStyle): Promise<boolean> {
  const speakerId = getOpenSpeechSpeakerId();
  if (!speakerId) return false;
  const instruction = (style?.instruction || "").trim();
  return postOpenSpeechUnidirectional({
    text,
    speakerId,
    resourceId: getSpeechResourceId(),
    destAiff,
    speechRate: style?.speechRate,
    additions: instruction ? JSON.stringify({ context_texts: [instruction] }) : undefined,
  });
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

async function macSay(text: string, destAiff: string): Promise<void> {
  const voice = (process.env.SPEECH_VOICE || "Tingting").trim();
  await run("say", ["-v", voice, "-r", "185", "-o", destAiff, text]);
}

export async function generateSpokenAudio(
  text: string,
  destAiff: string,
  samplePath?: string | null,
  voiceId?: string | null,
  instruction?: string | null,
  style?: Partial<SpeechStyle>,
): Promise<SpokenAudio> {
  const spoken = text.replace(/\s+/g, " ").trim();
  if (!spoken) throw new Error("没有可念的口播");

  await mkdir(path.dirname(destAiff), { recursive: true });

  const resolved = talkSpeechStyle({
    index: 0,
    total: 1,
    line: spoken,
    voiceId: voiceId || DEFAULT_HOUSE_VOICE_ID,
  });
  const merged: SpeechStyle = {
    instruction: (instruction || "").trim() || resolved.instruction,
    speechRate: typeof style?.speechRate === "number" ? style.speechRate : resolved.speechRate,
    ffmpegTempo: typeof style?.ffmpegTempo === "number" ? style.ffmpegTempo : resolved.ffmpegTempo,
  };

  if (isHouseVoiceId(voiceId) || !voiceId) {
    const houseId = isHouseVoiceId(voiceId) ? voiceId : DEFAULT_HOUSE_VOICE_ID;
    if (await tryHouseSpeech(spoken, destAiff, houseId, merged)) {
      return { path: mp3OutPathFromAiff(destAiff), cloneUsed: false, warning: null, tempo: 1 };
    }
    if (await tryPlainSpeech(spoken, destAiff, merged)) {
      return { path: mp3OutPathFromAiff(destAiff), cloneUsed: false, warning: null, tempo: 1 };
    }
    await macSay(spoken, destAiff);
    return { path: destAiff, cloneUsed: false, warning: null, tempo: 1 };
  }

  const spokenPath = await synthesizeCachedCosyVoice({
    localVoiceId: voiceId,
    text: spoken,
    destPath: destAiff,
    instruction: merged.instruction.slice(0, 50),
  });
  return { path: spokenPath, cloneUsed: true, warning: null, tempo: merged.ffmpegTempo };
}

