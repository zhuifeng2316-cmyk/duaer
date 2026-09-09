import { copyFile, mkdir, rm, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { MAX_VOICES } from "./voice";
import { deleteVoiceRow, kvGet, kvSet, selectVoice, selectVoices, upsertVoice } from "./sqlite";

export type VoiceClone = {
  id: string;
  name: string;
  createdAt: string;
  sample: string;
};

type VoiceMeta = { lastVoiceId: string | null };

const ROOT = path.join(process.cwd(), "storage", "voices");

export function voicesRoot(): string {
  return ROOT;
}

export function voiceDir(id: string): string {
  return path.join(ROOT, id);
}

export function voiceFile(id: string, ...parts: string[]): string {
  return path.join(voiceDir(id), ...parts);
}

export function publicVoice(v: VoiceClone) {
  return {
    id: v.id,
    name: v.name,
    createdAt: v.createdAt,
    sampleUrl: `/api/voices/${v.id}/media`,
  };
}

export async function readVoiceMeta(): Promise<VoiceMeta> {
  const last = kvGet("lastVoiceId");
  return { lastVoiceId: last || null };
}

export async function writeVoiceMeta(meta: VoiceMeta): Promise<void> {
  kvSet("lastVoiceId", meta.lastVoiceId || "");
}

export async function readVoice(id: string): Promise<VoiceClone | null> {
  return selectVoice(id);
}

export async function listVoices(): Promise<VoiceClone[]> {
  return selectVoices();
}

export async function createVoice(input: {
  name: string;
  data: Buffer;
  ext: string;
}): Promise<VoiceClone> {
  const existing = await listVoices();
  if (existing.length >= MAX_VOICES) {
    throw new Error(`克隆音色最多 ${MAX_VOICES} 条`);
  }
  const id = uuid();
  const sample = `sample.${input.ext}`;
  const voice: VoiceClone = {
    id,
    name: input.name,
    createdAt: new Date().toISOString(),
    sample,
  };
  await mkdir(voiceDir(id), { recursive: true });
  await writeFile(voiceFile(id, sample), input.data);
  upsertVoice(voice);
  await writeVoiceMeta({ lastVoiceId: id });
  return voice;
}

export async function bindVoiceSample(voiceId: string, destAbs: string): Promise<string> {
  const voice = await readVoice(voiceId);
  if (!voice) throw new Error("音色不存在");
  await mkdir(path.dirname(destAbs), { recursive: true });
  await copyFile(voiceFile(voice.id, voice.sample), destAbs);
  return destAbs;
}

export async function setLastVoiceId(id: string | null): Promise<void> {
  await writeVoiceMeta({ lastVoiceId: id });
}

export async function deleteVoice(id: string): Promise<boolean> {
  const voice = await readVoice(id);
  if (!voice) return false;
  deleteVoiceRow(id);
  await rm(voiceDir(id), { recursive: true, force: true });
  const meta = await readVoiceMeta();
  if (meta.lastVoiceId === id) await writeVoiceMeta({ lastVoiceId: null });
  return true;
}

export function safeVoiceMediaPath(id: string, rel: string): string | null {
  const cleaned = rel.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!cleaned || cleaned.includes("..")) return null;
  const root = path.resolve(voiceDir(id));
  const abs = path.resolve(root, cleaned);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}
