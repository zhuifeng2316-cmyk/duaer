export const MAX_VOICE_BYTES = 12 * 1024 * 1024;
export const MAX_VOICES = 12;
export const VOICE_NAME_MAX = 16;
export const MIN_VOICE_SEC = 10;
export const ALLOWED_VOICE_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/aac",
  "audio/ogg",
]);

const RECORDER_MIMES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

export function pickRecorderMime(isTypeSupported: (type: string) => boolean): string {
  return RECORDER_MIMES.find((type) => isTypeSupported(type)) || "";
}

export function finishVoiceRecord(
  chunks: Blob[],
  mime: string,
  sec: number,
): { blob: Blob | null; error: string | null; tooShort: boolean } {
  const type = mime || "audio/webm";
  const blob = new Blob(chunks.filter((part) => part.size > 0), { type });
  if (!blob.size) {
    return { blob: null, error: "没录上声音，请再录一次", tooShort: false };
  }
  if (!Number.isFinite(sec) || sec < MIN_VOICE_SEC) {
    return { blob, error: `至少说 ${MIN_VOICE_SEC} 秒，刚才只录了 ${Math.max(0, Math.floor(sec))} 秒`, tooShort: true };
  }
  return { blob, error: null, tooShort: false };
}

export function assertVoiceDurationSec(sec: number): void {
  if (!Number.isFinite(sec) || sec < MIN_VOICE_SEC) {
    throw new Error(`至少说 ${MIN_VOICE_SEC} 秒`);
  }
}

/** Wait for MediaRecorder.stop() to flush; Safari often delivers the blob after onstop, and a 400ms cutoff throws the take away. */
export function recorderStillFlushing(
  recorderState: string | undefined,
  waitedMs: number,
  hasChunks: boolean,
): boolean {
  if (waitedMs >= 2500) return false;
  if (recorderState && recorderState !== "inactive") return true;
  if (!hasChunks && waitedMs < 900) return true;
  return false;
}

export function extForVoiceMime(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("wav")) return "wav";
  if (m.includes("webm")) return "webm";
  if (m.includes("aac")) return "aac";
  if (m.includes("ogg")) return "ogg";
  if (m.includes("mp4") || m.includes("m4a")) return "m4a";
  return "mp3";
}

export function assertVoice(file: File): void {
  const type = file.type.toLowerCase();
  if (type && !ALLOWED_VOICE_MIME.has(type) && !type.startsWith("audio/webm") && !type.startsWith("audio/ogg")) {
    throw new Error("请用在线录音克隆音色");
  }
  if (file.size > MAX_VOICE_BYTES) {
    throw new Error("说话录音不能超过 12MB");
  }
}

export function parseVoiceName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, VOICE_NAME_MAX);
  return name || "我的音色";
}
