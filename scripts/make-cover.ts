/**
 * 给已成片的口播出封面。
 *   npx tsx scripts/make-cover.ts [projectId]
 *   npx tsx scripts/make-cover.ts --all
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import { writeTalkCover } from "../src/lib/cover";
import { listProjects, projectFile, readProject } from "../src/lib/store";

const ARG = process.argv[2] || "";

function loadLocalEnv(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

async function stampOne(id: string): Promise<string> {
  const project = await readProject(id);
  if (!project) throw new Error("口播不在了");
  const coverPath = await writeTalkCover(id);
  if (!coverPath) throw new Error("封面没加上");
  return projectFile(id, coverPath);
}

async function main() {
  loadLocalEnv();
  if (ARG === "--all") {
    const rows = await listProjects();
    for (const p of rows) {
      if (!p.stills?.length && !p.photos?.length && !p.coverPath) continue;
      try {
        const dest = await stampOne(p.id);
        console.log("ok", p.aspect, dest);
      } catch (err) {
        console.log("fail", p.id, err instanceof Error ? err.message : err);
      }
    }
    return;
  }
  const id = ARG || "0b4995aa-cd0a-4495-a124-c62c9d6dc8ef";
  const project = await readProject(id);
  if (!project) throw new Error("口播不在了");
  console.log("cover for", project.idea);
  console.log("cover", await stampOne(id));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
