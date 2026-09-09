import type { Aspect, Motion } from "./aspect";

export type ProjectStatus = "queued" | "running" | "review" | "ready" | "failed";

export type Shot = {
  scene: string;
  imagePrompt: string;
  onScreenText: string;
  voiceover: string;
  durationSec: number;
  motion: Motion;
};

export type Script = {
  hook: string;
  cta: string;
  musicPrompt: string;
  shots: Shot[];
};

export type Project = {
  id: string;
  createdAt: string;
  idea: string;
  look: string;
  targetDurationSec: number;
  aspect: Aspect;
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
  finalPath: string | null;
};

export function publicProject(p: Project) {
  return {
    id: p.id,
    createdAt: p.createdAt,
    idea: p.idea,
    look: p.look,
    targetDurationSec: p.targetDurationSec,
    aspect: p.aspect,
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
    finalUrl: p.finalPath ? `/api/projects/${p.id}/media?f=final.mp4` : null,
    photoUrls: p.photos.map((name) => `/api/projects/${p.id}/media?f=${encodeURIComponent(name)}`),
    stillUrls: p.stills.map(
      (name) => `/api/projects/${p.id}/media?f=${encodeURIComponent(name)}&v=${p.stillRev || 0}`,
    ),
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
    thumbUrl: pub.stillUrls[0] || null,
  };
}

export type PublicTalkCard = ReturnType<typeof publicTalkCard>;
