import { access } from "fs/promises";
import { uniqueRefPaths } from "./ark/image";
import { characterFile, readCharacter } from "./character-store";
import { projectFile } from "./store";
import { cinemaRefPaths } from "./turn-refs";
import type { Project } from "./types";

async function firstExisting(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const abs of paths) {
    try {
      await access(abs);
      out.push(abs);
    } catch {
      /* skip missing */
    }
  }
  return out;
}

/** Person stills lock to selected character crops, never generated eight-angle views. */
export async function talkStillRefPaths(project: Pick<Project, "id" | "photos" | "characterIds">): Promise<string[]> {
  const ids = [...new Set((project.characterIds || []).map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 1) {
    const character = await readCharacter(ids[0]!);
    if (character?.crop) {
      const cropAbs = characterFile(character.id, character.crop);
      const sourceAbs = character.source ? characterFile(character.id, character.source) : null;
      const refs = await firstExisting(cinemaRefPaths(cropAbs, sourceAbs));
      if (refs.length) return uniqueRefPaths(refs);
    }
  }
  if (ids.length > 1) {
    const refs: string[] = [];
    for (const id of ids) {
      const character = await readCharacter(id);
      if (!character?.crop) throw new Error("选中的人物还没有头像");
      const cropAbs = characterFile(character.id, character.crop);
      try {
        await access(cropAbs);
      } catch {
        throw new Error("选中的人物参考图不见了");
      }
      refs.push(cropAbs);
    }
    if (refs.length) return refs;
  }
  const photos = await firstExisting(project.photos.map((name) => projectFile(project.id, name)));
  if (!photos.length) throw new Error("人物参考图不见了，请重新上传");
  return photos;
}
