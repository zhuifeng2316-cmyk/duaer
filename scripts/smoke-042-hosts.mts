import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { rewriteCinemaHtml, writeAndRenderCinema } from "../src/lib/cinema-render";
import { projectFile, readProject, tryUpdateProject } from "../src/lib/store";

const PRODUCT = "2dec4575-e23f-4fb5-a396-7875980496f8";
const KNOWLEDGE = "d8a936bd-f108-4a15-9bb2-86dccc59e550";

const CASES = [
  { id: PRODUCT, shot: 2, intent: "通知堆", onScreen: "三条提醒", tag: "notify-stack" },
  { id: PRODUCT, shot: 1, intent: "分享面板", onScreen: "分享出去", tag: "share-sheet" },
  { id: PRODUCT, shot: 2, intent: "聊天对话", onScreen: "先问一句", tag: "chat-thread" },
  { id: PRODUCT, shot: 1, intent: "路径游走", onScreen: "顺着走", tag: "path-travel" },
  { id: PRODUCT, shot: 2, intent: "大光标", onScreen: "点这里", tag: "big-cursor" },
  { id: PRODUCT, shot: 1, intent: "界面放大", onScreen: "看细节", tag: "ui-zoom" },
  { id: KNOWLEDGE, shot: 2, intent: "流程图", onScreen: "要不要学", tag: "flowchart" },
  { id: KNOWLEDGE, shot: 1, intent: "数字跳动", onScreen: "三笔账", tag: "count-up" },
  { id: KNOWLEDGE, shot: 2, intent: "代码演示", onScreen: "出片", tag: "code-run" },
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
  console.log(row.tag, "→", graphic, shot.graphicIntent, JSON.stringify(shot.graphicVars || {}).slice(0, 120));
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
  await run("ffmpeg", [
    "-y",
    "-ss",
    String(sample),
    "-i",
    projectFile(row.id, "final.mp4"),
    "-frames:v",
    "1",
    "-update",
    "1",
    "-q:v",
    "2",
    dest,
  ]);
  await writeFile(
    path.join(outDir, `${row.tag}-meta.json`),
    JSON.stringify({ ...row, graphic, sample, dest, vars: after!.script!.shots[row.shot]?.graphicVars }, null, 2),
  );
  console.log("frame", dest);
}

async function main() {
  const only = process.argv[2];
  const rows = only
    ? CASES.filter((c) => c.tag === only || c.intent === only || only === "remaining")
    : CASES;
  const pick =
    only === "remaining"
      ? CASES.filter((c) =>
          ["chat-thread", "path-travel", "big-cursor", "ui-zoom", "flowchart", "count-up", "code-run"].includes(c.tag),
        )
      : rows;
  for (const row of pick) {
    console.log("\n===", row.tag, row.intent, "===");
    await smokeOne(row);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
