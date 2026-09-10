import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { rewriteCinemaHtml, writeAndRenderCinema } from "../src/lib/cinema-render";
import { projectFile, readProject, tryUpdateProject } from "../src/lib/store";

const id = process.argv[2] || "d8a936bd-f108-4a15-9bb2-86dccc59e550";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function main() {
  const before = await readProject(id);
  if (!before?.script?.shots.length) throw new Error(`${id}: no script`);

  const shots = before.script.shots.map((s, i) => {
    if (i !== 2) return s;
    const onScreen =
      s.onScreenText?.includes("：") || /[、＞]/.test(s.onScreenText || "")
        ? s.onScreenText
        : "三笔账：时间、钱、风险";
    return {
      ...s,
      graphicIntent: "打勾清单",
      overlay: undefined,
      block: undefined,
      graphicVars: undefined,
      graphicAssets: undefined,
      hostStill: false,
      kind: "empty" as const,
      imagePrompt: "",
      onScreenText: onScreen,
      lettering: "graphic" as const,
    };
  });
  await tryUpdateProject(id, {
    script: { ...before.script, shots },
    phase: "compose",
    status: "ready",
    message: "清单烟测",
  });

  await rewriteCinemaHtml(id);
  const mid = await readProject(id);
  const shot = mid!.script!.shots[2]!;
  console.log("shot3", shot.graphicIntent, shot.overlay || shot.block, shot.onScreenText, "hostStill=", shot.hostStill);
  if (shot.overlay !== "marker-checklist-card" && shot.block !== "marker-checklist-card") {
    throw new Error(`expected marker-checklist-card, got ${shot.overlay || shot.block}`);
  }
  const vars = shot.graphicVars || {};
  if (/THE POWER|WRITE|IN 4K/i.test(JSON.stringify(vars))) {
    throw new Error(`English vars: ${JSON.stringify(vars)}`);
  }
  if (!String(vars.mid || "").includes("要") || !String(vars.v1 || "").includes("算过")) {
    throw new Error(`Chinese checklist vars missing: ${JSON.stringify(vars)}`);
  }
  console.log("vars ok", vars);

  await writeAndRenderCinema(id, { reuseHtml: true });

  const compose = await readFile(projectFile(id, "compose/index.html"), "utf8");
  const skinMatch = compose.match(/marker-checklist-card--[^"']+\.html/);
  if (!skinMatch) throw new Error("checklist skin not mounted in compose");
  const skinHtml = await readFile(projectFile(id, `compose/compositions/${skinMatch[0]}`), "utf8");
  if (/THE POWER|IN 4K/.test(skinHtml)) {
    throw new Error("English demo shell still present in checklist skin");
  }
  console.log("skin ok", skinMatch[0]);

  await tryUpdateProject(id, {
    status: "ready",
    phase: "done",
    progress: 100,
    message: "成片好了",
    finalPath: "final.mp4",
    error: null,
  });

  const after = await readProject(id);
  let t = 0;
  let sample = 0;
  after!.script!.shots.forEach((s, i) => {
    if (i === 2) sample = Number((t + s.durationSec * 0.55).toFixed(2));
    t += s.durationSec;
  });
  const outDir = path.join(process.cwd(), "specs/042-recipe-cinema-pipeline/frames", id.slice(0, 8));
  await mkdir(outDir, { recursive: true });
  const dest = path.join(outDir, `checklist_${String(sample).replace(".", "_")}.jpg`);
  await run("ffmpeg", ["-y", "-ss", String(sample), "-i", projectFile(id, "final.mp4"), "-frames:v", "1", "-update", "1", "-q:v", "2", dest]);
  await writeFile(
    path.join(outDir, "checklist-meta.json"),
    JSON.stringify(
      {
        id,
        sample,
        dest,
        intent: after!.script!.shots[2]?.graphicIntent,
        graphic: after!.script!.shots[2]?.overlay || after!.script!.shots[2]?.block,
        vars: after!.script!.shots[2]?.graphicVars,
      },
      null,
      2,
    ),
  );
  console.log("frame", dest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
