export const MAX_VOICE_BYTES = 12 * 1024 * 1024;
export const MAX_VOICES = 12;
export const VOICE_NAME_MAX = 16;
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
  if (type && !ALLOWED_VOICE_MIME.has(type)) {
    throw new Error("说话录音只要 mp3 / wav / m4a / webm");
  }
  if (file.size > MAX_VOICE_BYTES) {
    throw new Error("说话录音不能超过 12MB");
  }
}

export function parseVoiceName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ").slice(0, VOICE_NAME_MAX);
  return name || "我的音色";
}
