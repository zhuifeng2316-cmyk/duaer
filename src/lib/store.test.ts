import { readFile, rm } from "fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { projectDir, projectFile, writeProjectFile } from "./store";

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
