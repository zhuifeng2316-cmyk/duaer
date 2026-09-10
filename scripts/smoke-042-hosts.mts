import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { rewriteCinemaHtml, writeAndRenderCinema } from "../src/lib/cinema-render";
import { projectFile, readProject, tryUpdateProject } from "../src/lib/store";

const CASES = [
  {
    id: "2dec4575-e23f-4fb5-a396-7875980496f8",
    shot: 2,
    intent: "通知堆",
    onScreen: "三条提醒",
    tag: "notify-stack",
  },
  {
    id: "2dec4575-e23f-4fb5-a396-7875980496f8",
    shot: 1,
    intent: "分享面板",
    onScreen: "分享出去",
    tag: "share-sheet",
  },
];

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function smokeOne(row: (typeof CASES)[number]) {
  const before = await readProject(row.id);
  if (!before?.script?.shots.length) throw new Error(`${row.id}: no script`);
  const shots = before.script.shots.map((s, i) => {
    if (i !== row.shot) return s;
    return {
      ...s,
      graphicIntent: row.intent,
      overlay: undefined,
      block: undefined,
      graphicVars: undefined,
      graphicAssets: undefined,
      hostStill: false,
      kind: "empty" as const,
      imagePrompt: "",
      onScreenText: row.onScreen,
      lettering: "graphic" as const,
    };
  });
  await tryUpdateProject(row.id, {
    script: { ...before.script, shots },
    phase: "compose",
    status: "ready",
    message: `${row.intent}烟测`,
  });
  await rewriteCinemaHtml(row.id);
  const mid = await readProject(row.id);
  const shot = mid!.script!.shots[row.shot]!;
  const graphic = shot.overlay || shot.block || "";
  console.log(row.tag, "→", graphic, shot.graphicIntent);
  if (!graphic) throw new Error(`${row.intent} did not mount`);
  await writeAndRenderCinema(row.id, { reuseHtml: true });
  await tryUpdateProject(row.id, {
    status: "ready",
    phase: "done",
    progress: 100,
    message: "成片好了",
    finalPath: "final.mp4",
    error: null,
  });
  const after = await readProject(row.id);
  let t = 0;
  let sample = 0;
  after!.script!.shots.forEach((s, i) => {
    if (i === row.shot) sample = Number((t + s.durationSec * 0.55).toFixed(2));
    t += s.durationSec;
  });
  const outDir = path.join(process.cwd(), "specs/042-recipe-cinema-pipeline/frames", row.id.slice(0, 8));
  await mkdir(outDir, { recursive: true });
  const dest = path.join(outDir, `${row.tag}_${String(sample).replace(".", "_")}.jpg`);
  await run("ffmpeg", ["-y", "-ss", String(sample), "-i", projectFile(row.id, "final.mp4"), "-frames:v", "1", "-update", "1", "-q:v", "2", dest]);
  await writeFile(
    path.join(outDir, `${row.tag}-meta.json`),
    JSON.stringify({ ...row, graphic, sample, dest, vars: after!.script!.shots[row.shot]?.graphicVars }, null, 2),
  );
  console.log("frame", dest);
}

async function main() {
  const only = process.argv[2];
  const rows = only ? CASES.filter((c) => c.tag === only || c.intent === only) : CASES.slice(0, 1);
  for (const row of rows) await smokeOne(row);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
