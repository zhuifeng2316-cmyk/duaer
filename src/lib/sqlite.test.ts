import { mkdir, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { closeDb, getDb, kvGet, selectCharacter, sqlitePath } from "./sqlite";

const prev = process.env.DUAER_SQLITE;
const extraDirs: string[] = [];

afterEach(async () => {
  closeDb();
  if (prev === undefined) delete process.env.DUAER_SQLITE;
  else process.env.DUAER_SQLITE = prev;
  for (const dir of extraDirs.splice(0)) await rm(dir, { recursive: true, force: true });
});

describe("sqlite library", () => {
  it("writes a character and still has it after reopening the file", () => {
    const file = path.join(os.tmpdir(), `duaer-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    process.env.DUAER_SQLITE = file;
    closeDb();
    getDb()
      .prepare(
        `INSERT INTO characters(id, name, created_at, crop, head, source, enhanced, views_json)
         VALUES(?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("c1", "阿宁", "2026-09-09T00:00:00.000Z", "crop.png", "crop.png", null, 0, "[]");
    closeDb();
    expect(sqlitePath()).toBe(file);
    const row = selectCharacter("c1");
    expect(row?.name).toBe("阿宁");
    expect(row?.crop).toBe("crop.png");
  });

  it("imports an old character.json folder once", async () => {
    const file = path.join(os.tmpdir(), `duaer-${Date.now()}-${Math.random().toString(16).slice(2)}.sqlite`);
    process.env.DUAER_SQLITE = file;
    closeDb();
    const id = "json-ning";
    const dir = path.join(process.cwd(), "storage", "characters", id);
    await mkdir(dir, { recursive: true });
    await writeFile(
      path.join(dir, "character.json"),
      JSON.stringify({
        id,
        name: "从文件夹来的",
        createdAt: "2026-09-09T00:00:00.000Z",
        crop: "crop.png",
        head: "crop.png",
        source: null,
        enhanced: false,
        views: [],
      }),
    );
    extraDirs.push(dir);
    getDb();
    expect(selectCharacter(id)?.name).toBe("从文件夹来的");
    expect(kvGet("json_migrated")).toBe("1");
  });
});
