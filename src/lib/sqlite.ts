import { existsSync, mkdirSync, readdirSync, readFileSync } from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

type CharacterRecord = {
  id: string;
  name: string;
  createdAt: string;
  crop: string;
  head: string;
  source: string | null;
  enhanced: boolean;
  views: { id: string; label: string; file: string; version?: number }[];
  status: "ready" | "expanding" | "rerunning";
  progress: number;
  message: string;
  error: string | null;
  regenViewId: string | null;
  subject: string;
};

type VoiceRecord = {
  id: string;
  name: string;
  createdAt: string;
  sample: string;
};

type CharacterRow = {
  id: string;
  name: string;
  created_at: string;
  crop: string;
  head: string;
  source: string | null;
  enhanced: number;
  views_json: string;
  status?: string | null;
  progress?: number | null;
  message?: string | null;
  error?: string | null;
  regen_view_id?: string | null;
  subject?: string | null;
};

type VoiceRow = {
  id: string;
  name: string;
  created_at: string;
  sample: string;
};

let db: DatabaseSync | null = null;
let openedPath = "";

export function sqlitePath(): string {
  return (process.env.DUAER_SQLITE || path.join(process.cwd(), "storage", "duaer.sqlite")).trim();
}

export function closeDb(): void {
  db?.close();
  db = null;
  openedPath = "";
}

export function getDb(): DatabaseSync {
  const file = sqlitePath();
  if (db && openedPath === file) return db;
  closeDb();
  mkdirSync(path.dirname(file), { recursive: true });
  db = new DatabaseSync(file);
  openedPath = file;
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      crop TEXT NOT NULL,
      head TEXT NOT NULL,
      source TEXT,
      enhanced INTEGER NOT NULL DEFAULT 0,
      views_json TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS voices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sample TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  ensureCharacterJobColumns(db);
  migrateJsonLibraries(db);
  return db;
}

function ensureCharacterJobColumns(database: DatabaseSync): void {
  const cols = database.prepare("PRAGMA table_info(characters)").all() as { name: string }[];
  const have = new Set(cols.map((c) => c.name));
  const add: [string, string][] = [
    ["status", "TEXT NOT NULL DEFAULT 'ready'"],
    ["progress", "INTEGER NOT NULL DEFAULT 100"],
    ["message", "TEXT NOT NULL DEFAULT ''"],
    ["error", "TEXT"],
    ["regen_view_id", "TEXT"],
    ["subject", "TEXT NOT NULL DEFAULT ''"],
  ];
  for (const [name, ddl] of add) {
    if (!have.has(name)) database.exec(`ALTER TABLE characters ADD COLUMN ${name} ${ddl}`);
  }
}

function kvRead(database: DatabaseSync, key: string): string | null {
  const row = database.prepare("SELECT value FROM kv WHERE key = ?").get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

function kvWrite(database: DatabaseSync, key: string, value: string): void {
  database
    .prepare("INSERT INTO kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

export function kvGet(key: string): string | null {
  return kvRead(getDb(), key);
}

export function kvSet(key: string, value: string): void {
  kvWrite(getDb(), key, value);
}

function parseViews(raw: string): CharacterRecord["views"] {
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.map((row) => {
      const item = (row || {}) as { id?: unknown; label?: unknown; file?: unknown; version?: unknown };
      return {
        id: String(item.id || ""),
        label: String(item.label || ""),
        file: String(item.file || ""),
        version: Number(item.version) || 1,
      };
    }).filter((row) => row.id);
  } catch {
    return [];
  }
}

function asStatus(raw: string | null | undefined): CharacterRecord["status"] {
  if (raw === "expanding" || raw === "rerunning") return raw;
  return "ready";
}

export function characterFromRow(row: CharacterRow): CharacterRecord {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    crop: row.crop,
    head: row.head,
    source: row.source || null,
    enhanced: Boolean(row.enhanced),
    views: parseViews(row.views_json),
    status: asStatus(row.status),
    progress: Number(row.progress) || 0,
    message: String(row.message || ""),
    error: row.error || null,
    regenViewId: row.regen_view_id || null,
    subject: String(row.subject || ""),
  };
}

export function upsertCharacter(c: CharacterRecord): void {
  getDb()
    .prepare(
      `INSERT INTO characters(id, name, created_at, crop, head, source, enhanced, views_json, status, progress, message, error, regen_view_id, subject)
       VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         crop = excluded.crop,
         head = excluded.head,
         source = excluded.source,
         enhanced = excluded.enhanced,
         views_json = excluded.views_json,
         status = excluded.status,
         progress = excluded.progress,
         message = excluded.message,
         error = excluded.error,
         regen_view_id = excluded.regen_view_id,
         subject = excluded.subject`,
    )
    .run(
      c.id,
      c.name,
      c.createdAt,
      c.crop,
      c.head,
      c.source,
      c.enhanced ? 1 : 0,
      JSON.stringify(c.views),
      c.status || "ready",
      c.progress ?? 100,
      c.message || "",
      c.error,
      c.regenViewId,
      c.subject || "",
    );
}

export function selectCharacter(id: string): CharacterRecord | null {
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) return null;
  const row = getDb().prepare("SELECT * FROM characters WHERE id = ?").get(id) as CharacterRow | undefined;
  return row ? characterFromRow(row) : null;
}

export function selectCharacters(): CharacterRecord[] {
  const rows = getDb().prepare("SELECT * FROM characters ORDER BY created_at DESC").all() as CharacterRow[];
  return rows.map(characterFromRow);
}

export function deleteCharacterRow(id: string): boolean {
  const res = getDb().prepare("DELETE FROM characters WHERE id = ?").run(id);
  return res.changes > 0;
}

export function upsertVoice(v: VoiceRecord): void {
  getDb()
    .prepare(
      `INSERT INTO voices(id, name, created_at, sample)
       VALUES(?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET name = excluded.name, sample = excluded.sample`,
    )
    .run(v.id, v.name, v.createdAt, v.sample);
}

export function selectVoice(id: string): VoiceRecord | null {
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) return null;
  const row = getDb().prepare("SELECT * FROM voices WHERE id = ?").get(id) as VoiceRow | undefined;
  if (!row) return null;
  return { id: row.id, name: row.name, createdAt: row.created_at, sample: row.sample };
}

export function selectVoices(): VoiceRecord[] {
  const rows = getDb().prepare("SELECT * FROM voices ORDER BY created_at DESC").all() as VoiceRow[];
  return rows.map((row) => ({ id: row.id, name: row.name, createdAt: row.created_at, sample: row.sample }));
}

export function deleteVoiceRow(id: string): boolean {
  const res = getDb().prepare("DELETE FROM voices WHERE id = ?").run(id);
  return res.changes > 0;
}

function readJsonFile(file: string): unknown | null {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}

export function migrateJsonLibraries(database: DatabaseSync): void {
  if (kvRead(database, "json_migrated") === "1") return;
  const root = process.cwd();
  const charRoot = path.join(root, "storage", "characters");
  if (existsSync(charRoot)) {
    for (const name of readdirSync(charRoot, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const raw = readJsonFile(path.join(charRoot, name.name, "character.json")) as CharacterRecord | null;
      if (!raw?.id) continue;
      database
        .prepare(
          `INSERT OR IGNORE INTO characters(id, name, created_at, crop, head, source, enhanced, views_json, status, progress, message, error, regen_view_id, subject)
           VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          raw.id,
          raw.name,
          raw.createdAt,
          raw.crop,
          raw.head || raw.crop,
          raw.source || null,
          raw.enhanced ? 1 : 0,
          JSON.stringify(Array.isArray(raw.views) ? raw.views : []),
          "ready",
          100,
          "",
          null,
          null,
          "",
        );
    }
    const charMeta = readJsonFile(path.join(charRoot, "meta.json")) as { lastCharacterIds?: string[] } | null;
    if (charMeta?.lastCharacterIds?.length) {
      kvWrite(database, "lastCharacterIds", JSON.stringify(charMeta.lastCharacterIds));
    }
  }
  const voiceRoot = path.join(root, "storage", "voices");
  if (existsSync(voiceRoot)) {
    for (const name of readdirSync(voiceRoot, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const raw = readJsonFile(path.join(voiceRoot, name.name, "voice.json")) as VoiceRecord | null;
      if (!raw?.id) continue;
      database
        .prepare("INSERT OR IGNORE INTO voices(id, name, created_at, sample) VALUES(?, ?, ?, ?)")
        .run(raw.id, raw.name, raw.createdAt, raw.sample);
    }
    const voiceMeta = readJsonFile(path.join(voiceRoot, "meta.json")) as { lastVoiceId?: string | null } | null;
    if (voiceMeta?.lastVoiceId) kvWrite(database, "lastVoiceId", voiceMeta.lastVoiceId);
  }
  kvWrite(database, "json_migrated", "1");
}
