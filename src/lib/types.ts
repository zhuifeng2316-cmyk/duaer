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
  voiceId: string | null;
  voicePath: string | null;
  stills: string[];
  htmlPath: string | null;
  script: Script | null;
  draftText: string;
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
    voiceId: p.voiceId ?? null,
    voicePath: p.voicePath,
    stills: p.stills,
    htmlPath: p.htmlPath ?? null,
    script: p.script,
    draftText: p.draftText || "",
    status: p.status,
    phase: p.phase,
    progress: p.progress,
    message: p.message,
    error: p.error,
    musicError: p.musicError,
    speechError: p.speechError,
    finalUrl: p.finalPath ? `/api/projects/${p.id}/media?f=final.mp4` : null,
    photoUrls: p.photos.map((name) => `/api/projects/${p.id}/media?f=${encodeURIComponent(name)}`),
    stillUrls: p.stills.map((name) => `/api/projects/${p.id}/media?f=${encodeURIComponent(name)}`),
  };
}
