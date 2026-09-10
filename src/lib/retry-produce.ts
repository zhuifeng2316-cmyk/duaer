import { talkPicturesReady } from "./graphic-board";
import type { Project, Script } from "./types";

export type RetryProduceKind = "copy" | "board" | "images" | "speech" | "assemble";

function scriptHasBoard(script: Script | null): boolean {
  return Boolean(
    script?.shots.some((shot) => Boolean(shot.imagePrompt || shot.scene || shot.overlay || shot.block || shot.graphicIntent)),
  );
}

export function retryProduceKind(project: Pick<Project, "script" | "stills" | "htmlPath">): RetryProduceKind {
  if (project.htmlPath) return "assemble";
  if (talkPicturesReady(project)) return "speech";
  if (scriptHasBoard(project.script)) return "images";
  if (project.script?.shots.length) return "board";
  return "copy";
}
