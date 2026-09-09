import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { ANGLE_VIEWS } from "./angles";

export type TurnStatus = "queued" | "cutting" | "review" | "enhancing" | "running" | "rerunning" | "ready" | "failed";

export type TurnView = {
  id: string;
  label: string;
  file: string | null;
  version?: number;
};

export type TurnFace = {
  id: string;
  label: string;
  crop: string;
  file: string;
  enhanced: boolean;
  selected: boolean;
};

export type Turn = {
  id: string;
  createdAt: string;
  status: TurnStatus;
  progress: number;
  message: string;
  error: string | null;
  source: string;
  crop: string;
  head: string;
  enhanced: boolean;
  subject: string;
  faces: TurnFace[];
  views: TurnView[];
  regenViewId: string | null;
};

export function normalizeFaces(t: Turn): TurnFace[] {
  if (t.faces?.length) return t.faces;
  if (t.head) {
    return [
      {
        id: "1",
        label: "头像 1",
        crop: t.crop || t.head,
        file: t.head,
        enhanced: Boolean(t.enhanced),
        selected: true,
      },
    ];
  }
  return [];
}

export function selectedFaces(t: Turn): TurnFace[] {
  return normalizeFaces(t).filter((f) => f.selected);
}

export function applyFaceSelection(t: Turn, ids: string[]): TurnFace[] {
  const allow = new Set(ids);
  const faces = normalizeFaces(t).map((f) => ({ ...f, selected: allow.has(f.id) }));
  return faces;
}

export function headFromFaces(faces: TurnFace[]): { head: string; crop: string; enhanced: boolean } {
  const pick = faces.find((f) => f.selected) || faces[0];
  return {
    head: pick?.file || "",
    crop: pick?.crop || "",
    enhanced: Boolean(pick?.enhanced),
  };
}

const ROOT = path.join(process.cwd(), "storage", "turns");

export function turnDir(id: string): string {
  return path.join(ROOT, id);
}

export function turnFile(id: string, ...parts: string[]): string {
  return path.join(turnDir(id), ...parts);
}

export function publicTurn(t: Turn) {
  return {
    id: t.id,
    createdAt: t.createdAt,
    status: t.status,
    progress: t.progress,
    message: t.message,
    error: t.error,
    sourceUrl: t.source ? `/api/turns/${t.id}/media?f=${encodeURIComponent(t.source)}` : null,
    cropUrl: t.crop ? `/api/turns/${t.id}/media?f=${encodeURIComponent(t.crop)}` : null,
    headUrl: t.head ? `/api/turns/${t.id}/media?f=${encodeURIComponent(t.head)}` : null,
    enhanced: Boolean(t.enhanced),
    faces: normalizeFaces(t).map((f) => ({
      id: f.id,
      label: f.label,
      enhanced: f.enhanced,
      selected: f.selected,
      url: f.file ? `/api/turns/${t.id}/media?f=${encodeURIComponent(f.file)}` : null,
      cropUrl: f.crop ? `/api/turns/${t.id}/media?f=${encodeURIComponent(f.crop)}` : null,
    })),
    views: t.views.map((v) => ({
      id: v.id,
      label: v.label,
      url: v.file
        ? `/api/turns/${t.id}/media?f=${encodeURIComponent(v.file)}&v=${v.version || 1}`
        : null,
    })),
    regenViewId: t.regenViewId || null,
  };
}

export async function createTurn(): Promise<Turn> {
  const id = uuid();
  const turn: Turn = {
    id,
    createdAt: new Date().toISOString(),
    status: "queued",
    progress: 0,
    message: "准备抠头像",
    error: null,
    source: "",
    crop: "",
    head: "",
    enhanced: false,
    subject: "",
    faces: [],
    views: ANGLE_VIEWS.map((v) => ({ id: v.id, label: v.label, file: null, version: 0 })),
    regenViewId: null,
  };
  await mkdir(turnDir(id), { recursive: true });
  await writeFile(turnFile(id, "turn.json"), JSON.stringify(turn, null, 2), "utf8");
  return turn;
}

export async function readTurn(id: string): Promise<Turn | null> {
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) return null;
  try {
    const raw = JSON.parse(await readFile(turnFile(id, "turn.json"), "utf8")) as Turn;
    return {
      ...raw,
      crop: raw.crop || "",
      head: raw.head || "",
      enhanced: Boolean(raw.enhanced),
      subject: raw.subject || "",
      faces: Array.isArray(raw.faces) ? raw.faces : [],
      regenViewId: raw.regenViewId || null,
    };
  } catch {
    return null;
  }
}

export async function updateTurn(id: string, patch: Partial<Turn>): Promise<Turn> {
  const cur = await readTurn(id);
  if (!cur) throw new Error("任务不存在");
  const next = { ...cur, ...patch };
  await writeFile(turnFile(id, "turn.json"), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export async function writeTurnFile(id: string, rel: string, data: Buffer | string): Promise<string> {
  const abs = turnFile(id, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
  return abs;
}

export function safeTurnMediaPath(id: string, rel: string): string | null {
  const cleaned = rel.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!cleaned || cleaned.includes("..")) return null;
  const root = path.resolve(turnDir(id));
  const abs = path.resolve(root, cleaned);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}
