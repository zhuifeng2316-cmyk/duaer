import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { rewriteCinemaHtml, writeAndRenderCinema } from "../src/lib/cinema-render";
import { projectFile, readProject, tryUpdateProject } from "../src/lib/store";
import { spawn } from "child_process";

const IDS = (process.argv.slice(2).length ? process.argv.slice(2) : [
  "2dec4575-e23f-4fb5-a396-7875980496f8",
  "d8a936bd-f108-4a15-9bb2-86dccc59e550",
  "d9a2dd4e-a382-424b-8185-10f8576f5aa6",
]);

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function extractFrames(projectId: string, times: number[]) {
  const mp4 = projectFile(projectId, "final.mp4");
  const outDir = path.join(process.cwd(), "specs/042-recipe-cinema-pipeline/frames", projectId.slice(0, 8));
  await mkdir(outDir, { recursive: true });
  for (let i = 0; i < times.length; i++) {
    const t = times[i]!;
    const dest = path.join(outDir, `t${String(t).replace(".", "_")}.jpg`);
    await run("ffmpeg", ["-y", "-ss", String(t), "-i", mp4, "-frames:v", "1", "-update", "1", "-q:v", "2", dest]);
  }
  return outDir;
}

async function smokeOne(projectId: string) {
  const before = await readProject(projectId);
  if (!before?.script?.shots.length) throw new Error(`${projectId}: no script`);

  if (projectId.startsWith("d9a2dd4e")) {
    await tryUpdateProject(projectId, { captionStyle: "caption-editorial-emphasis" });
    console.log(projectId, "set captionStyle=杂志字");
  }

  console.log(projectId, "rewrite html…");
  await rewriteCinemaHtml(projectId);
  const mid = await readProject(projectId);
  console.log(
    projectId,
    "shots:",
    mid?.script?.shots.map((s, i) => `${i + 1}:${s.graphicIntent || "-"}/${s.lettering || "-"}/${s.overlay || s.block || "-"}`).join(" | "),
  );

  console.log(projectId, "render mp4…");
  await writeAndRenderCinema(projectId, { reuseHtml: true });

  await tryUpdateProject(projectId, {
    status: "ready",
    phase: "done",
    progress: 100,
    message: "成片好了",
    finalPath: "final.mp4",
    error: null,
  });

  const after = await readProject(projectId);
  const starts: number[] = [];
  let t = 0;
  for (const shot of after!.script!.shots) {
    starts.push(Number((t + shot.durationSec * 0.45).toFixed(2)));
    t += shot.durationSec + (starts.length === after!.script!.shots.length ? 0 : 0);
  }
  // last shot hold ~0.8 in compose; midpoint samples are enough
  const outDir = await extractFrames(projectId, starts.slice(0, 5));
  const note = {
    id: projectId,
    idea: after!.idea,
    mode: after!.script!.visualMode,
    captionStyle: after!.captionStyle || "",
    shots: after!.script!.shots.map((s) => ({
      intent: s.graphicIntent,
      lettering: s.lettering,
      graphic: s.overlay || s.block || "",
      onScreen: s.onScreenText,
    })),
    frames: outDir,
    sampleTimes: starts.slice(0, 5),
  };
  await writeFile(path.join(outDir, "meta.json"), JSON.stringify(note, null, 2));
  console.log(projectId, "ready", outDir);
}

async function main() {
  for (const id of IDS) {
    await smokeOne(id);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
