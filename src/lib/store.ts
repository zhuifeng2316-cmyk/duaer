import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import type { Aspect } from "./aspect";
import type { Project } from "./types";

const ROOT = path.join(process.cwd(), "storage", "projects");

export function projectDir(id: string): string {
  return path.join(ROOT, id);
}

export function projectFile(id: string, ...parts: string[]): string {
  return path.join(projectDir(id), ...parts);
}

export async function writeProjectFile(id: string, rel: string, data: Buffer | string): Promise<string> {
  const abs = projectFile(id, rel);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, data);
  return abs;
}

export async function createProject(input: {
  idea: string;
  look: string;
  aspect: Aspect;
  targetDurationSec: number;
}): Promise<Project> {
  const id = uuid();
  const project: Project = {
    id,
    createdAt: new Date().toISOString(),
    idea: input.idea,
    look: input.look,
    targetDurationSec: input.targetDurationSec,
    aspect: input.aspect,
    photos: [],
    voiceId: null,
    voicePath: null,
    stills: [],
    htmlPath: null,
    script: null,
    status: "queued",
    phase: "idle",
    progress: 0,
    message: "等待出片",
    error: null,
    musicError: null,
    speechError: null,
    finalPath: null,
  };
  await mkdir(projectDir(id), { recursive: true });
  await writeFile(projectFile(id, "project.json"), JSON.stringify(project, null, 2), "utf8");
  return project;
}

export async function readProject(id: string): Promise<Project | null> {
  try {
    return JSON.parse(await readFile(projectFile(id, "project.json"), "utf8")) as Project;
  } catch {
    return null;
  }
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const cur = await readProject(id);
  if (!cur) throw new Error("项目不存在");
  const next = { ...cur, ...patch };
  await writeFile(projectFile(id, "project.json"), JSON.stringify(next, null, 2), "utf8");
  return next;
}
