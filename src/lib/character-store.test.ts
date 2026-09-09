import { access, readFile } from "fs/promises";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { characterDir, characterIdentityRels, createCharacterFromTurn, deleteCharacter, listCharacters } from "./character-store";
import { createTurn, updateTurn, writeTurnFile } from "./turn-store";

const trash: string[] = [];

afterEach(async () => {
  for (const id of trash.splice(0)) await deleteCharacter(id);
});

describe("character library", () => {
  it("saves a named face with crop and eight views, but identity refs skip generated stills", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop"));
    await writeTurnFile(turn.id, "source.jpg", Buffer.from("src"));
    await writeTurnFile(turn.id, "views/01-front.png", Buffer.from("view"));
    const savedTurn = await updateTurn(turn.id, {
      source: "source.jpg",
      crop: "heads/01.png",
      head: "heads/01.png",
      faces: [
        {
          id: "1",
          label: "阿宁",
          crop: "heads/01.png",
          file: "heads/01.png",
          enhanced: false,
          selected: true,
        },
      ],
      views: [{ id: "front", label: "正面", file: "views/01-front.png" }],
    });
    const character = await createCharacterFromTurn({ turn: savedTurn, face: savedTurn.faces[0]! });
    trash.push(character.id);
    expect(character.name).toBe("阿宁");
    expect(character.views).toHaveLength(1);
    expect(characterIdentityRels(character)).toEqual(["crop.png", "source.jpg"]);
    expect(characterIdentityRels(character).some((r) => r.startsWith("views/"))).toBe(false);
    const listed = await listCharacters();
    expect(listed.some((c) => c.id === character.id && c.name === "阿宁")).toBe(true);
    const { selectCharacter } = await import("./sqlite");
    expect(selectCharacter(character.id)?.name).toBe("阿宁");
    await access(path.join(characterDir(character.id), "crop.png"));
    expect(await readFile(path.join(characterDir(character.id), "views/front.png"))).toEqual(Buffer.from("view"));
    expect(character.status).toBe("ready");
  });

  it("uses 人物 when the face still has a default label", async () => {
    const turn = await createTurn();
    await writeTurnFile(turn.id, "heads/01.png", Buffer.from("crop"));
    const savedTurn = await updateTurn(turn.id, {
      faces: [
        { id: "1", label: "头像 1", crop: "heads/01.png", file: "heads/01.png", enhanced: false, selected: true },
      ],
    });
    const character = await createCharacterFromTurn({ turn: savedTurn, face: savedTurn.faces[0]! });
    trash.push(character.id);
    expect(character.name).toBe("人物");
  });
});
