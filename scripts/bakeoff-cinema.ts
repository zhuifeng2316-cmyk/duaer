import { copyFile, mkdir, writeFile } from "fs/promises";
import path from "path";
import { ANGLE_VIEWS, turnaroundPrompt } from "../src/lib/angles";
import { CINEMA_BAKEOFF_SCENE, CINEMA_IDENTITY_LEAD, cinemaMovieStillPrompt } from "../src/lib/cinema";
import { cloneImagePrompt } from "../src/lib/flow/image";
import { generateStillFromRef } from "../src/lib/flow/image";
import { describeSubjectFromPhoto } from "../src/lib/subject";

function loadLocalEnv(): void {
  const fs = require("fs") as typeof import("fs");
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq);
    const val = trimmed.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main(): Promise<void> {
  loadLocalEnv();
  if (!process.env.FLOW_API_KEY) throw new Error("missing FLOW_API_KEY");

  const root = path.join(process.cwd(), "storage", "prompt-bakeoff");
  const source = path.join(root, "source.jpg");
  const head = path.join(root, "head.png");
  await mkdir(root, { recursive: true });

  let identity = "";
  try {
    identity = await describeSubjectFromPhoto(head);
  } catch (e) {
    identity = "";
    console.log("describe failed", e instanceof Error ? e.message : e);
  }
  console.log("identity:", identity || "(empty)");

  const jobs = [
    {
      id: "A-turnaround-now",
      lead: undefined as string | undefined,
      photos: [head],
      prompt: turnaroundPrompt(ANGLE_VIEWS[0], identity),
    },
    {
      id: "B-clone-now",
      lead: undefined,
      photos: [head],
      prompt: cloneImagePrompt({
        scene: CINEMA_BAKEOFF_SCENE,
        aspect: "9:16",
        imagePrompt: CINEMA_BAKEOFF_SCENE,
      }),
    },
    {
      id: "C-movie-head",
      lead: CINEMA_IDENTITY_LEAD,
      photos: [head, head],
      prompt: cinemaMovieStillPrompt({ scene: CINEMA_BAKEOFF_SCENE, identity, angle: "正面半身" }),
    },
    {
      id: "D-movie-source-and-head",
      lead: CINEMA_IDENTITY_LEAD,
      photos: [head, source],
      prompt: cinemaMovieStillPrompt({ scene: CINEMA_BAKEOFF_SCENE, identity, angle: "正面半身" }),
    },
    {
      id: "E-movie-no-beauty",
      lead: CINEMA_IDENTITY_LEAD,
      photos: [head, head, source],
      prompt: cinemaMovieStillPrompt({ scene: CINEMA_BAKEOFF_SCENE, identity, angle: "正面半身" }),
    },
  ];

  await writeFile(
    path.join(root, "prompts.json"),
    JSON.stringify(
      { identity, jobs: jobs.map((j) => ({ id: j.id, lead: j.lead, prompt: j.prompt })) },
      null,
      2,
    ),
  );

  for (const job of jobs) {
    const dest = path.join(root, `${job.id}.png`);
    console.log("generating", job.id);
    const started = Date.now();
    try {
      await generateStillFromRef({
        prompt: job.prompt,
        photoPaths: job.photos,
        destPath: dest,
        extraBody: { size: "2K" },
        lead: job.lead,
      });
      console.log("ok", job.id, `${Math.round((Date.now() - started) / 1000)}s`);
    } catch (e) {
      console.log("fail", job.id, e instanceof Error ? e.message : e);
    }
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
