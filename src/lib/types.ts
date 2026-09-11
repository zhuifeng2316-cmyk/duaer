import type { Aspect, Motion, OutputQuality } from "./aspect";
import { parseQuality } from "./aspect";
import type { ComposeLayout, StillKind } from "./compose-plan";
import type { VisualMode } from "./hf-labels";
import type { LetteringMode, VoiceRole } from "./skill-recipes";

export type ProjectStatus = "queued" | "running" | "review" | "ready" | "failed";

export type Shot = {
  scene: string;
  imagePrompt: string;
  onScreenText: string;
  voiceover: string;
  durationSec: number;
  motion: Motion;
  kind: StillKind;
  layout: ComposeLayout;
  stillRefs: number[];
  overlay?: string;
  block?: string;
  graphicIntent?: string;
  graphicVars?: Record<string, string | number>;
  graphicAssets?: Record<string, string>;
  graphicUploads?: string[];
  hostStill?: boolean;
  /** 作者在助手里点选的全库组件：配方编译不得卸掉。 */
  graphicLock?: boolean;
  /** 这张人物静帧已经把本镜屏幕字画进画面，合成不再叠同一层字。 */
  letteringInStill?: boolean;
  /** 这一镜字怎么出：成片砸/擦/划重点、画进图、组件自带。 */
  lettering?: LetteringMode;
  /** 这一镜怎么说：开口砸 / 往前推 / 收住。 */
  voiceRole?: VoiceRole;
  /** 这一镜口播字样式；空则跟全片或自动。 */
  captionStyle?: string;
};

export type Script = {
  hook: string;
  cta: string;
  musicPrompt: string;
  visualMode?: VisualMode;
  shots: Shot[];
};

export type Project = {
  id: string;
  createdAt: string;
  idea: string;
  topic?: string | null;
  look: string;
  targetDurationSec: number;
  aspect: Aspect;
  quality?: OutputQuality;
  photos: string[];
  characterIds?: string[];
  voiceId: string | null;
  voicePath: string | null;
  stills: string[];
  htmlPath: string | null;
  script: Script | null;
  draftText: string;
  stillRev: number;
  regenShotIndex: number | null;
  status: ProjectStatus;
  phase: string;
  progress: number;
  message: string;
  error: string | null;
  musicError: string | null;
  speechError: string | null;
  composeError: string | null;
  finalPath: string | null;
  coverPath: string | null;
  coverRev: number;
  coverTemplate?: string;
  captionStyle?: string;
};

export function publicProject(p: Project) {
  return {
    id: p.id,
    createdAt: p.createdAt,
    idea: p.idea,
    topic: p.topic || null,
    look: p.look,
    targetDurationSec: p.targetDurationSec,
    aspect: p.aspect,
    quality: parseQuality(p.quality),
    photos: p.photos,
    characterIds: p.characterIds || [],
    voiceId: p.voiceId ?? null,
    voicePath: p.voicePath,
    stills: p.stills,
    htmlPath: p.htmlPath ?? null,
    script: p.script,
    draftText: p.draftText || "",
    stillRev: p.stillRev || 0,
    regenShotIndex: p.regenShotIndex ?? null,
    status: p.status,
    phase: p.phase,
    progress: p.progress,
    message: p.message,
    error: p.error,
    musicError: p.musicError,
    speechError: p.speechError,
    composeError: p.composeError ?? null,
    finalUrl: p.finalPath ? `/api/projects/${p.id}/media?f=final.mp4` : null,
    coverUrl: p.coverPath
      ? `/api/projects/${p.id}/media?f=${encodeURIComponent(p.coverPath)}&v=${p.coverRev || 0}`
      : null,
    coverTemplate: p.coverTemplate || "titlecard-lockup",
    captionStyle: p.captionStyle || "",
    photoUrls: p.photos.map((name) => `/api/projects/${p.id}/media?f=${encodeURIComponent(name)}`),
    stillUrls: p.stills.map((name) =>
      name ? `/api/projects/${p.id}/media?f=${encodeURIComponent(name)}&v=${p.stillRev || 0}` : "",
    ),
    graphicUrls: (p.script?.shots || []).map((shot) => {
      const assets = shot.graphicAssets || {};
      const out: Record<string, string> = {};
      for (const [key, rel] of Object.entries(assets)) {
        if (rel) out[key] = `/api/projects/${p.id}/media?f=${encodeURIComponent(rel)}&v=${p.stillRev || 0}`;
      }
      return out;
    }),
  };
}

export type PublicProject = ReturnType<typeof publicProject>;

export function publicTalkCard(p: Project) {
  const pub = publicProject(p);
  return {
    id: pub.id,
    createdAt: pub.createdAt,
    idea: pub.idea,
    aspect: pub.aspect,
    status: pub.status,
    phase: pub.phase,
    progress: pub.progress,
    message: pub.message,
    error: pub.error,
    finalUrl: pub.finalUrl,
    coverUrl: pub.coverUrl,
    thumbUrl: pub.coverUrl || pub.stillUrls[0] || null,
  };
}

export type PublicTalkCard = ReturnType<typeof publicTalkCard>;

export function isWallTalk(p: Pick<Project, "status" | "finalPath" | "coverPath" | "stills">): boolean {
  return p.status === "ready" && Boolean(p.finalPath || p.coverPath || p.stills[0]);
}

export function talkWallCards(rows: Project[]): PublicTalkCard[] {
  return rows.filter(isWallTalk).map(publicTalkCard);
}
