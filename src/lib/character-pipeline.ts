import { ANGLE_VIEWS, characterViewRel, turnaroundLead, turnaroundPrompt, type AngleView } from "./angles";
import {
  characterFile,
  filledCharacterViews,
  readCharacter,
  saveCharacter,
  type Character,
  type CharacterView,
} from "./character-store";
import { makePlaceholderStill } from "./compose";
import { isFlowMock } from "./flow/config";
import { generateStillFromRef } from "./flow/image";
import { describeSubjectFromPhoto } from "./subject";
import { cinemaRefPaths } from "./turn-refs";

const running = new Set<string>();

export function isCharacterBusy(id: string): boolean {
  return running.has(id);
}

export function startExpandCharacter(id: string): void {
  if (running.has(id)) return;
  running.add(id);
  void expandCharacter(id).finally(() => running.delete(id));
}

export function startRegenCharacterView(id: string, viewId: string): void {
  if (running.has(id)) return;
  running.add(id);
  void regenCharacterView(id, viewId).finally(() => running.delete(id));
}

function cinemaRefsFor(character: Character): string[] {
  const cropAbs = characterFile(character.id, character.crop);
  const sourceAbs = character.source ? characterFile(character.id, character.source) : null;
  return cinemaRefPaths(cropAbs, sourceAbs);
}

async function renderCharacterAngle(opts: {
  character: Character;
  angle: AngleView;
  index: number;
  destRel: string;
}): Promise<void> {
  const dest = characterFile(opts.character.id, opts.destRel);
  if (isFlowMock()) {
    await makePlaceholderStill(dest, "9:16", opts.index % 2 ? "0x243044" : "0x1a2330");
    return;
  }
  await generateStillFromRef({
    prompt: turnaroundPrompt(opts.angle, opts.character.subject),
    photoPaths: cinemaRefsFor(opts.character),
    destPath: dest,
    aspect: "9:16",
    lead: turnaroundLead(),
    extraBody: { size: "2K" },
  });
}

async function withSubject(character: Character): Promise<Character> {
  if (character.subject || isFlowMock()) return character;
  try {
    const subject = await describeSubjectFromPhoto(characterFile(character.id, character.crop));
    const next = { ...character, subject };
    await saveCharacter(next);
    return next;
  } catch {
    return character;
  }
}

export function characterHasAllViews(character: Character): boolean {
  return filledCharacterViews(character.views).every((v) => v.file);
}

export function characterMissingViewCount(character: Character): number {
  return filledCharacterViews(character.views).filter((v) => !v.file).length;
}

async function expandCharacter(id: string): Promise<void> {
  const loaded = await readCharacter(id);
  if (!loaded) return;
  try {
    let character = await withSubject({
      ...loaded,
      status: "expanding",
      progress: 8,
      message: "在出八个方位…",
      error: null,
      regenViewId: null,
    });
    await saveCharacter(character);
    const views: CharacterView[] = filledCharacterViews(character.views);
    for (let i = 0; i < ANGLE_VIEWS.length; i++) {
      const angle = ANGLE_VIEWS[i]!;
      if (views[i]?.file) continue;
      const rel = characterViewRel(angle.id, 1);
      character = {
        ...character,
        progress: 8 + Math.round(((i + 1) / ANGLE_VIEWS.length) * 90),
        message: `八个方位 ${i + 1}/8 · ${angle.label}`,
      };
      await saveCharacter(character);
      await renderCharacterAngle({ character, angle, index: i, destRel: rel });
      views[i] = { id: angle.id, label: angle.label, file: rel, version: 1 };
      character = { ...character, views: views.map((v) => ({ ...v })) };
      await saveCharacter(character);
    }
    await saveCharacter({
      ...character,
      views,
      status: "ready",
      progress: 100,
      message: "八个方位好了",
      error: null,
      regenViewId: null,
    });
  } catch (e) {
    const cur = (await readCharacter(id)) || loaded;
    await saveCharacter({
      ...cur,
      status: "ready",
      progress: 100,
      message: "方位没出齐，已有的还在",
      error: e instanceof Error ? e.message : String(e),
      regenViewId: null,
    });
  }
}

async function regenCharacterView(id: string, viewId: string): Promise<void> {
  const loaded = await readCharacter(id);
  if (!loaded) return;
  const index = ANGLE_VIEWS.findIndex((v) => v.id === viewId);
  const angle = index >= 0 ? ANGLE_VIEWS[index] : undefined;
  const views = filledCharacterViews(loaded.views);
  const prev = views[index];
  if (!angle || !prev?.file) {
    await saveCharacter({
      ...loaded,
      status: "ready",
      regenViewId: null,
      message: "八个方位好了",
      error: "要重做的这张还不在",
    });
    return;
  }
  const version = (prev.version || 1) + 1;
  const rel = characterViewRel(angle.id, version);
  try {
    const character = await withSubject(loaded);
    await renderCharacterAngle({ character, angle, index, destRel: rel });
    views[index] = { id: angle.id, label: angle.label, file: rel, version };
    await saveCharacter({
      ...character,
      views,
      status: "ready",
      progress: 100,
      message: `${angle.label}已重做`,
      error: null,
      regenViewId: null,
    });
  } catch (e) {
    const cur = (await readCharacter(id)) || loaded;
    await saveCharacter({
      ...cur,
      status: "ready",
      progress: 100,
      regenViewId: null,
      message: `${angle.label}没重做成，还是上一张`,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
