import { afterEach, describe, expect, it } from "vitest";
import { rm } from "fs/promises";
import path from "path";
import { characterFile, createCharacterFromTurn, deleteCharacter } from "./character-store";
import { createProject, projectDir, writeProjectFile } from "./store";
import { talkStillRefPaths } from "./still-refs";
import { createTurn, updateTurn, writeTurnFile } from "./turn-store";

const trashChars: string[] = [];
const trashProjects: string[] = [];

afterEach(async () => {
  for (const id of trashChars.splice(0)) await deleteCharacter(id);
  for (const id of trashProjects.splice(0)) await rm(projectDir(id), { recursive: true, force: true });
});

describe("talk still refs", () => {
  it("locks person stills to the selected character crop, not generated views", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop-pixels"));
    await writeTurnFile(turn.id, "source.jpg", Buffer.from("src-pixels"));
    await writeTurnFile(turn.id, "views/01-front.png", Buffer.from("view-pixels"));
    const savedTurn = await updateTurn(turn.id, {
      source: "source.jpg",
      crop: "heads/01.png",
      head: "heads/01.png",
      faces: [{ id: "1", label: "阿宁", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true }],
      views: [{ id: "front", label: "正面", file: "views/01-front.png" }],
    });
    const character = await createCharacterFromTurn({ turn: savedTurn, face: savedTurn.faces[0]! });
    trashChars.push(character.id);
    const project = await createProject({ idea: "口播要讲什么呢", look: "", aspect: "9:16", targetDurationSec: 15 });
    trashProjects.push(project.id);
    await writeProjectFile(project.id, "photos/photo-01.png", Buffer.from("stale-copy"));
    const refs = await talkStillRefPaths({ id: project.id, photos: ["photos/photo-01.png"], characterIds: [character.id] });
    expect(refs[0]).toBe(characterFile(character.id, character.crop));
    expect(refs.some((p) => p.includes(`${path.sep}views${path.sep}`) || p.includes("/views/"))).toBe(false);
    expect(refs.some((p) => p.includes("photo-01"))).toBe(false);
  });

  it("falls back to uploaded photos when no character is selected", async () => {
    const project = await createProject({ idea: "口播要讲什么呢", look: "", aspect: "9:16", targetDurationSec: 15 });
    trashProjects.push(project.id);
    await writeProjectFile(project.id, "photos/photo-01.jpg", Buffer.from("upload"));
    const refs = await talkStillRefPaths({ id: project.id, photos: ["photos/photo-01.jpg"], characterIds: [] });
    expect(refs.some((p) => p.endsWith("photo-01.jpg"))).toBe(true);
  });
});
