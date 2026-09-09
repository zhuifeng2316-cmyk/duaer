import { copyFile, mkdir, rm } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { ANGLE_VIEWS } from "./angles";
import { MAX_CHARACTERS, isDefaultFaceLabel, parseCharacterName } from "./character";
import {
  deleteCharacterRow,
  kvGet,
  kvSet,
  selectCharacter,
  selectCharacters,
  upsertCharacter,
} from "./sqlite";
import { selectedFaces, normalizeFaces, turnFile, type Turn, type TurnFace, type TurnView } from "./turn-store";

export type CharacterStatus = "ready" | "expanding" | "rerunning";

export type CharacterView = { id: string; label: string; file: string; version?: number };

export type Character = {
  id: string;
  name: string;
  createdAt: string;
  crop: string;
  head: string;
  source: string | null;
  enhanced: boolean;
  views: CharacterView[];
  status: CharacterStatus;
  progress: number;
  message: string;
  error: string | null;
  regenViewId: string | null;
  subject: string;
};

function readyFields(): Pick<Character, "status" | "progress" | "message" | "error" | "regenViewId" | "subject"> {
  return {
    status: "ready",
    progress: 100,
    message: "",
    error: null,
    regenViewId: null,
    subject: "",
  };
}

export function filledCharacterViews(views: CharacterView[]): CharacterView[] {
  return ANGLE_VIEWS.map((angle) => {
    const hit = views.find((v) => v.id === angle.id && v.file);
    return hit
      ? { id: angle.id, label: angle.label, file: hit.file, version: hit.version || 1 }
      : { id: angle.id, label: angle.label, file: "", version: 0 };
  });
}

type CharacterMeta = { lastCharacterIds: string[] };

const ROOT = path.join(process.cwd(), "storage", "characters");

export function charactersRoot(): string {
  return ROOT;
}

export function characterDir(id: string): string {
  return path.join(ROOT, id);
}

export function characterFile(id: string, ...parts: string[]): string {
  return path.join(characterDir(id), ...parts);
}

function extOf(rel: string): string {
  const m = rel.match(/\.[a-z0-9]+$/i);
  return m ? m[0].toLowerCase() : ".png";
}

export function publicCharacter(c: Character) {
  return {
    id: c.id,
    name: c.name,
    createdAt: c.createdAt,
    enhanced: Boolean(c.enhanced),
    viewCount: c.views.filter((v) => v.file).length,
    status: c.status || "ready",
    thumbUrl: c.head
      ? `/api/characters/${c.id}/media?f=${encodeURIComponent(c.head)}`
      : null,
  };
}

export function publicCharacterDetail(c: Character) {
  return {
    ...publicCharacter(c),
    progress: c.progress ?? 100,
    message: c.message || "",
    error: c.error || null,
    regenViewId: c.regenViewId || null,
    views: filledCharacterViews(c.views).map((v) => ({
      id: v.id,
      label: v.label,
      url: v.file ? `/api/characters/${c.id}/media?f=${encodeURIComponent(v.file)}` : null,
    })),
  };
}

export async function saveCharacter(c: Character): Promise<Character> {
  upsertCharacter(c);
  return c;
}

/** Original pixels only. Never the generated eight cinema stills. */
export function characterIdentityRels(c: Character): string[] {
  const out: string[] = [];
  const head = c.head || c.crop;
  if (head) out.push(head);
  if (c.crop && c.crop !== head) out.push(c.crop);
  if (c.source && c.source !== head && c.source !== c.crop) out.push(c.source);
  return out;
}

export async function readCharacterMeta(): Promise<CharacterMeta> {
  try {
    const raw = kvGet("lastCharacterIds");
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return { lastCharacterIds: Array.isArray(ids) ? ids.map(String) : [] };
  } catch {
    return { lastCharacterIds: [] };
  }
}

export async function writeCharacterMeta(meta: CharacterMeta): Promise<void> {
  kvSet("lastCharacterIds", JSON.stringify(meta.lastCharacterIds));
}

export async function readCharacter(id: string): Promise<Character | null> {
  return selectCharacter(id);
}

export async function listCharacters(): Promise<Character[]> {
  return selectCharacters();
}

async function copyInto(id: string, srcAbs: string, destRel: string): Promise<string> {
  const dest = characterFile(id, destRel);
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(srcAbs, dest);
  return destRel;
}

export async function createCharacterFromTurn(opts: {
  turn: Turn;
  face: TurnFace;
  name?: string;
}): Promise<Character> {
  const existing = await listCharacters();
  if (existing.length >= MAX_CHARACTERS) {
    throw new Error(`人物最多 ${MAX_CHARACTERS} 个`);
  }
  const fallback = isDefaultFaceLabel(opts.face.label) ? "人物" : opts.face.label;
  const raw = (opts.name || "").trim() || (isDefaultFaceLabel(opts.face.label) ? "" : opts.face.label);
  const name = parseCharacterName(raw, fallback);
  const id = uuid();
  await mkdir(characterDir(id), { recursive: true });

  const cropRel = `crop${extOf(opts.face.crop)}`;
  await copyInto(id, turnFile(opts.turn.id, opts.face.crop), cropRel);

  let headRel = cropRel;
  if (opts.face.file && opts.face.file !== opts.face.crop) {
    headRel = `head${extOf(opts.face.file)}`;
    await copyInto(id, turnFile(opts.turn.id, opts.face.file), headRel);
  }

  let sourceRel: string | null = null;
  if (opts.turn.source && opts.turn.source !== opts.face.crop && opts.turn.source !== opts.face.file) {
    sourceRel = `source${extOf(opts.turn.source)}`;
    try {
      await copyInto(id, turnFile(opts.turn.id, opts.turn.source), sourceRel);
    } catch {
      sourceRel = null;
    }
  }

  const views: CharacterView[] = [];
  for (const v of opts.turn.views as TurnView[]) {
    if (!v.file) continue;
    const rel = `views/${v.id}${extOf(v.file)}`;
    try {
      await copyInto(id, turnFile(opts.turn.id, v.file), rel);
      views.push({ id: v.id, label: v.label, file: rel, version: v.version || 1 });
    } catch {
      /* skip missing angle */
    }
  }

  const character: Character = {
    id,
    name,
    createdAt: new Date().toISOString(),
    crop: cropRel,
    head: headRel,
    source: sourceRel,
    enhanced: Boolean(opts.face.enhanced),
    views,
    ...readyFields(),
    message: views.filter((v) => v.file).length >= 8 ? "八个方位已收下" : "",
  };
  upsertCharacter(character);
  const meta = await readCharacterMeta();
  const last = [id, ...meta.lastCharacterIds.filter((x) => x !== id)].slice(0, MAX_CHARACTERS);
  await writeCharacterMeta({ lastCharacterIds: last });
  return character;
}

export async function createCharactersFromTurn(turn: Turn, name?: string): Promise<Character[]> {
  const chosen = selectedFaces(turn).length ? selectedFaces(turn) : normalizeFaces(turn);
  if (!chosen.length) throw new Error("先点选要保存的人");
  const rows: Character[] = [];
  for (const face of chosen) {
    rows.push(await createCharacterFromTurn({ turn, face, name: chosen.length === 1 ? name : undefined }));
  }
  return rows;
}

export async function bindCharacterIdentity(
  characterId: string,
  destDir: string,
  startIndex: number,
): Promise<string[]> {
  const character = await readCharacter(characterId);
  if (!character) throw new Error("人物不存在");
  const rels = characterIdentityRels(character);
  if (!rels.length) throw new Error("这个人还没有头像");
  const photos: string[] = [];
  await mkdir(destDir, { recursive: true });
  for (let i = 0; i < rels.length; i++) {
    const srcRel = rels[i]!;
    const destRel = `photos/photo-${String(startIndex + i + 1).padStart(2, "0")}${extOf(srcRel)}`;
    const destAbs = path.join(destDir, destRel);
    await mkdir(path.dirname(destAbs), { recursive: true });
    await copyFile(characterFile(character.id, srcRel), destAbs);
    photos.push(destRel);
  }
  return photos;
}

export async function setLastCharacterIds(ids: string[]): Promise<void> {
  await writeCharacterMeta({ lastCharacterIds: ids.slice(0, MAX_CHARACTERS) });
}

export async function deleteCharacter(id: string): Promise<boolean> {
  const character = await readCharacter(id);
  if (!character) return false;
  deleteCharacterRow(id);
  await rm(characterDir(id), { recursive: true, force: true });
  const meta = await readCharacterMeta();
  await writeCharacterMeta({ lastCharacterIds: meta.lastCharacterIds.filter((x) => x !== id) });
  return true;
}

export function safeCharacterMediaPath(id: string, rel: string): string | null {
  const cleaned = rel.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!cleaned || cleaned.includes("..")) return null;
  const root = path.resolve(characterDir(id));
  const abs = path.resolve(root, cleaned);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}
