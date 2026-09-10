import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import { authHeaders, getFlowApiKey, getFlowBaseUrl, mapFlowHttpError } from "./flow/config";
import { clipVoiceRefWav } from "./voice-audio";

export const COSY_MODEL = "cosyvoice-v3.5-plus";

export type CosySpoken = {
  path: string;
  voiceId: string;
  cloneUsed: true;
};

function cosyCachePath(localVoiceId: string): string {
  return path.join(process.cwd(), "storage", "voices", localVoiceId, "cosyvoice.json");
}

export async function readCachedCosyVoice(localVoiceId: string): Promise<string | null> {
  try {
    const file = cosyCachePath(localVoiceId);
    await stat(file);
    const json = JSON.parse(await readFile(file, "utf8")) as { remoteVoiceId?: string; model?: string };
    if (json.model !== COSY_MODEL) return null;
    const id = typeof json.remoteVoiceId === "string" ? json.remoteVoiceId.trim() : "";
    return id || null;
  } catch {
    return null;
  }
}

async function writeCachedCosyVoice(localVoiceId: string, remoteVoiceId: string): Promise<void> {
  const file = cosyCachePath(localVoiceId);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(
    file,
    JSON.stringify(
      {
        remoteVoiceId,
        model: COSY_MODEL,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    ),
  );
}

/**
 * CosyVoice（通义）经点物 Flow：先用公网可下载的参考音 URL 克隆音色，再用 voice id 合成。
 * C 端不写厂商名。
 */
export async function enrollCosyVoice(opts: {
  localVoiceId: string;
  /** 通义服务器必须能下载的 http(s) 音频地址 */
  publicAudioUrl: string;
  prefix?: string;
  promptText?: string;
}): Promise<string> {
  const apiKey = getFlowApiKey();
  if (!apiKey) throw new Error("还没接上语音通道");
  const cached = await readCachedCosyVoice(opts.localVoiceId);
  if (cached) return cached;

  const prefix = (opts.prefix || "sima").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10) || "voice";
  const body: Record<string, unknown> = {
    model: COSY_MODEL,
    prefix,
    url: opts.publicAudioUrl,
  };
  if (opts.promptText?.trim()) body.prompt_text = opts.promptText.trim();

  const res = await fetch(`${getFlowBaseUrl()}/api/v1/audio/voices`, {
    method: "POST",
    headers: { ...authHeaders(apiKey), Accept: "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
    id?: string;
    voice?: string;
    voice_id?: string;
    data?: { id?: string; voice_id?: string };
  };
  if (!res.ok) throw new Error(mapFlowHttpError(res.status, data, "音色克隆"));
  const remote =
    data.voice_id || data.voice || data.id || data.data?.voice_id || data.data?.id || "";
  if (!remote) throw new Error("克隆音色没返回编号");
  await writeCachedCosyVoice(opts.localVoiceId, remote);
  return remote;
}

/** CosyVoice 的 speed 经常不生效，口播加快走 ffmpeg atempo。 */
export const COSY_SPEECH_RATE = 1.18;

export { cinemaSpeechInstruction } from "./speech-style";

export function buildCosySpeechBody(opts: {
  text: string;
  remoteVoiceId: string;
  instruction?: string;
}): Record<string, unknown> {
  const instruction = (opts.instruction || "").trim().slice(0, 50);
  const body: Record<string, unknown> = {
    model: COSY_MODEL,
    input: opts.text,
    voice: opts.remoteVoiceId,
    response_format: "mp3",
  };
  if (instruction) {
    body.instruction = instruction;
    body.extra_body = { instruction };
  }
  return body;
}

export async function synthesizeCosyVoice(opts: {
  text: string;
  remoteVoiceId: string;
  destPath: string;
  instruction?: string;
}): Promise<string> {
  const apiKey = getFlowApiKey();
  if (!apiKey) throw new Error("还没接上语音通道");
  const spoken = opts.text.replace(/\s+/g, " ").trim();
  if (!spoken) throw new Error("没有可念的口播");

  const res = await fetch(`${getFlowBaseUrl()}/api/v1/audio/speech`, {
    method: "POST",
    headers: {
      ...authHeaders(apiKey),
      Accept: "audio/mpeg, application/json, */*",
    },
    body: JSON.stringify(
      buildCosySpeechBody({
        text: spoken,
        remoteVoiceId: opts.remoteVoiceId,
        instruction: opts.instruction,
      }),
    ),
    signal: AbortSignal.timeout(120_000),
  });
  const ct = res.headers.get("content-type") || "";
  const raw = Buffer.from(await res.arrayBuffer());
  if (!res.ok) {
    if (ct.includes("json")) {
      const data = JSON.parse(raw.toString("utf8")) as { error?: string; message?: string };
      throw new Error(mapFlowHttpError(res.status, data, "口播"));
    }
    throw new Error("口播合成失败");
  }

  let audio = raw;
  if (ct.includes("json") || raw[0] === 0x7b /* { */) {
    const data = JSON.parse(raw.toString("utf8")) as {
      error?: string;
      message?: string;
      audio?: { b64_json?: string; data?: string };
      b64_json?: string;
      data?: string;
    };
    if (data.error || data.message) throw new Error(mapFlowHttpError(res.status, data, "口播"));
    const b64 = data.audio?.b64_json || data.audio?.data || data.b64_json || data.data || "";
    if (!b64) throw new Error("口播没返回音频");
    audio = Buffer.from(b64, "base64");
  }
  if (audio.length < 200) throw new Error("口播文件太小");
  await mkdir(path.dirname(opts.destPath), { recursive: true });
  const out = opts.destPath.replace(/\.(aiff|wav)$/i, ".mp3");
  await writeFile(out, audio);
  return out;
}

export async function prepareCosyRefWav(samplePath: string, workDir: string): Promise<string> {
  await mkdir(workDir, { recursive: true });
  const dest = path.join(workDir, `cosy-ref-${createHash("sha1").update(samplePath).digest("hex").slice(0, 8)}.wav`);
  const ok = await clipVoiceRefWav(samplePath, dest, 12);
  if (!ok) throw new Error("参考录音切不开");
  return dest;
}

export async function resolveCosyVoiceId(localVoiceId: string): Promise<string | null> {
  const cached = await readCachedCosyVoice(localVoiceId);
  if (cached) return cached;
  const publicAudioUrl = (process.env.COSYVOICE_REF_URL || "").trim();
  if (!publicAudioUrl || !/^https?:\/\//i.test(publicAudioUrl)) return null;
  return enrollCosyVoice({
    localVoiceId,
    publicAudioUrl,
    promptText: (process.env.COSYVOICE_PROMPT_TEXT || "").trim() || undefined,
  });
}

export async function synthesizeCachedCosyVoice(opts: {
  localVoiceId: string;
  text: string;
  destPath: string;
  instruction?: string;
}): Promise<string> {
  const remoteVoiceId = await resolveCosyVoiceId(opts.localVoiceId);
  if (!remoteVoiceId) throw new Error("选中的克隆音色还没有编号，先完成一次克隆");
  return synthesizeCosyVoice({
    text: opts.text,
    remoteVoiceId,
    destPath: opts.destPath,
    instruction: opts.instruction,
  });
}

export function cosyRequestId(): string {
  return randomUUID();
}
