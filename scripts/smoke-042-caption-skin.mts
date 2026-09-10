import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { rewriteCinemaHtml, writeAndRenderCinema } from "../src/lib/cinema-render";
import { projectFile, readProject, tryUpdateProject } from "../src/lib/store";

const id = process.argv[2] || "d9a2dd4e-a382-424b-8185-10f8576f5aa6";
const style = process.argv[3] || "look-chalkboard";

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exit ${code}`))));
  });
}

async function main() {
  await tryUpdateProject(id, { captionStyle: style });
  await rewriteCinemaHtml(id);
  const mid = await readProject(id);
  const html = await readFile(projectFile(id, "compose/index.html"), "utf8");
  console.log(id, "captionStyle=", mid?.captionStyle);
  console.log("html skin attr", html.includes(style), "css", html.includes(`cap-${style.replace(/^caption-/, "")}`));

  await writeAndRenderCinema(id, { reuseHtml: true });
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
  const times: number[] = [];
  for (const shot of after!.script!.shots) {
    times.push(Number((t + shot.durationSec * 0.45).toFixed(2)));
    t += shot.durationSec;
  }
  const sample = times[1] ?? times[0]!;
  const outDir = path.join(process.cwd(), "specs/042-recipe-cinema-pipeline/frames", id.slice(0, 8));
  await mkdir(outDir, { recursive: true });
  const tag = style.replace(/^caption-/, "").replace(/^look-/, "");
  const dest = path.join(outDir, `${tag}_${String(sample).replace(".", "_")}.jpg`);
  await run("ffmpeg", ["-y", "-ss", String(sample), "-i", projectFile(id, "final.mp4"), "-frames:v", "1", "-update", "1", "-q:v", "2", dest]);
  await writeFile(path.join(outDir, `${tag}-meta.json`), JSON.stringify({ id, captionStyle: style, sample, dest }, null, 2));
  console.log("frame", dest);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
