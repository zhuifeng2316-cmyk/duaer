import { mkdir, stat } from "fs/promises";
import path from "path";
import { getHouseVoice, HOUSE_PREVIEW_LINE } from "./house-voices";
import { generateSpokenAudio } from "./openspeech";

const SAMPLE_NAMES = ["sample.wav", "sample.mp3", "sample.m4a", "sample.aiff"];

export function housePreviewDir(id: string): string {
  return path.join(process.cwd(), "storage", "voices", id);
}

export async function findHousePreview(id: string): Promise<string | null> {
  const dir = housePreviewDir(id);
  for (const name of SAMPLE_NAMES) {
    const abs = path.join(dir, name);
    try {
      if ((await stat(abs)).size > 400) return abs;
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function ensureHousePreview(id: string): Promise<string> {
  if (!getHouseVoice(id)) throw new Error("音色不存在");
  const existing = await findHousePreview(id);
  if (existing) return existing;
  const dest = path.join(housePreviewDir(id), "sample.wav");
  await mkdir(path.dirname(dest), { recursive: true });
  const spoken = await generateSpokenAudio(HOUSE_PREVIEW_LINE, dest, null, id);
  return spoken.path;
}
