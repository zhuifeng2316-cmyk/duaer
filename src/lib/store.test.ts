import { readFile, rm } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { createProject, listProjects, projectDir, projectFile, writeProjectFile } from "./store";

describe("writeProjectFile", () => {
  const id = "test-nested-photos";

  afterEach(async () => {
    await rm(projectDir(id), { recursive: true, force: true });
  });

  it("creates nested photo folders", async () => {
    await writeProjectFile(id, "photos/photo-01.jpg", Buffer.from("hi"));
    const saved = await readFile(projectFile(id, "photos", "photo-01.jpg"), "utf8");
    expect(saved).toBe("hi");
  });
});

describe("listProjects", () => {
  const ids: string[] = [];

  afterEach(async () => {
    for (const id of ids.splice(0)) {
      await rm(projectDir(id), { recursive: true, force: true });
    }
  });

  it("returns talks newest first", async () => {
    const older = await createProject({ idea: "先做的口播", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(older.id);
    await new Promise((r) => setTimeout(r, 20));
    const newer = await createProject({ idea: "后做的口播", look: "", aspect: "9:16", targetDurationSec: 15 });
    ids.push(newer.id);
    const rows = await listProjects();
    const ours = rows.filter((row) => ids.includes(row.id));
    expect(ours.map((row) => row.id)).toEqual([newer.id, older.id]);
  });
});
