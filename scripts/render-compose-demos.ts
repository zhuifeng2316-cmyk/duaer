import { mkdir, symlink, writeFile } from "fs/promises";
import path from "path";
import { renderHtmlVideo } from "../src/lib/cinema-render";
import type { ComposeLayout, StillKind } from "../src/lib/compose-plan";
import { buildEditList, fallbackCinemaHtml } from "../src/lib/html-compose";
import { projectFile, readProject } from "../src/lib/store";
import type { Motion } from "../src/lib/aspect";
import type { Shot } from "../src/lib/types";

const PROJECT_ID = process.argv[2] || "0b4995aa-cd0a-4495-a124-c62c9d6dc8ef";
const PUBLIC_DIR = path.join(process.cwd(), "public/demos");

function shot(partial: {
  scene: string;
  onScreenText: string;
  voiceover: string;
  durationSec: number;
  motion: Motion;
  kind: StillKind;
  layout: ComposeLayout;
  stillRefs?: number[];
}): Shot {
  return {
    imagePrompt: partial.scene,
    stillRefs: [],
    ...partial,
  };
}

async function ensureLink(dest: string, src: string, directory: boolean) {
  try {
    await symlink(src, dest, directory ? "dir" : "file");
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code !== "EEXIST") throw err;
  }
}

async function renderStandalone(
  name: string,
  list: ReturnType<typeof buildEditList>,
  stillsAbs: string,
  bgmAbs?: string,
  speechAbs?: string,
) {
  const composeDir = path.join(process.cwd(), "storage/demos", name, "compose");
  await mkdir(composeDir, { recursive: true });
  await ensureLink(path.join(composeDir, "stills"), stillsAbs, true);
  if (bgmAbs) await ensureLink(path.join(composeDir, "bgm.mp3"), bgmAbs, false);
  if (speechAbs) await ensureLink(path.join(composeDir, "speech.wav"), speechAbs, false);
  await writeFile(path.join(composeDir, "hyperframes.json"), `${JSON.stringify({ paths: { assets: "." } }, null, 2)}\n`);
  await writeFile(path.join(composeDir, "index.html"), fallbackCinemaHtml(list), "utf8");
  const dest = path.join(PUBLIC_DIR, `${name}.mp4`);
  await mkdir(PUBLIC_DIR, { recursive: true });
  console.log("rendering", name);
  await renderHtmlVideo({ composeDir, outputPath: dest, fps: 25 });
  console.log("wrote", dest);
}

async function writeGallery() {
  const cards = [
    { file: "kinetic-slam.mp4", title: "砸字英雄镜", note: "近景铺满，一词砸上全屏" },
    { file: "under-text.mp4", title: "字压图", note: "远景压暗，大字当主体" },
    { file: "split-montage.mp4", title: "对切 · 快切", note: "两张叠切，再一句里切三张" },
    { file: "talk-mix.mp4", title: "混组法成片", note: "同一条口播，五镜五种组法" },
  ];
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>组法样片</title>
  <style>
    body { margin: 0; background: #07080c; color: #f4efe6; font-family: "PingFang SC", "Noto Sans SC", sans-serif; }
    main { max-width: 1080px; margin: 0 auto; padding: 36px 20px 80px; }
    h1 { font-size: 28px; font-weight: 600; letter-spacing: 0.08em; }
    p.lead { color: #9a8d80; margin: 8px 0 32px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 22px; }
    figure { margin: 0; }
    video { width: 100%; border-radius: 14px; background: #111; }
    figcaption { padding: 10px 4px 0; }
    strong { display: block; font-size: 15px; }
    small { color: #9a8d80; }
  </style>
</head>
<body>
  <main>
    <h1>组法样片</h1>
    <p class="lead">同一组静帧，四种拼法。竖屏，直接点开看。</p>
    <div class="grid">
      ${cards
        .map(
          (c) => `<figure>
        <video src="/demos/${c.file}" controls playsinline loop></video>
        <figcaption><strong>${c.title}</strong><small>${c.note}</small></figcaption>
      </figure>`,
        )
        .join("\n      ")}
    </div>
  </main>
</body>
</html>
`;
  await writeFile(path.join(PUBLIC_DIR, "index.html"), html, "utf8");
}

async function main() {
  const project = await readProject(PROJECT_ID);
  if (!project?.script?.shots.length) throw new Error("项目没有分镜");
  const stillsAbs = projectFile(PROJECT_ID, "stills");
  const bgmAbs = projectFile(PROJECT_ID, "bgm.mp3");
  const stills = project.stills;

  await mkdir(PUBLIC_DIR, { recursive: true });
  await writeGallery();

  const slam = buildEditList({
    script: {
      hook: "",
      cta: "",
      musicPrompt: "",
      shots: [
        shot({
          scene: "海滩近景",
          onScreenText: "我也要这样活",
          voiceover: "别再把想要的生活留给以后",
          durationSec: 5,
          motion: "punch",
          kind: "close",
          layout: "hero",
        }),
      ],
    },
    stillRels: [stills[4] || stills[0]!],
    aspect: "9:16",
    bgmRel: "bgm.mp3",
  });
  await renderStandalone("kinetic-slam", slam, stillsAbs, bgmAbs);

  const under = buildEditList({
    script: {
      hook: "",
      cta: "",
      musicPrompt: "",
      shots: [
        shot({
          scene: "海滩远景",
          onScreenText: "不必每刻都用力",
          voiceover: "让海风吹走那些没必要的累",
          durationSec: 5.2,
          motion: "pull-out",
          kind: "wide",
          layout: "under-text",
        }),
      ],
    },
    stillRels: [stills[3] || stills[0]!],
    aspect: "9:16",
    bgmRel: "bgm.mp3",
  });
  await renderStandalone("under-text", under, stillsAbs, bgmAbs);

  const combo = buildEditList({
    script: {
      hook: "",
      cta: "",
      musicPrompt: "",
      shots: [
        shot({
          scene: "窗边对列车",
          onScreenText: "想去的地方就出发",
          voiceover: "想看海就买一张靠窗的车票",
          durationSec: 4,
          motion: "pan-right",
          kind: "close",
          layout: "split",
          stillRefs: [2],
        }),
        shot({
          scene: "海与日常",
          onScreenText: "今天为自己做一件小事",
          voiceover: "从今天起为自己做一件小事",
          durationSec: 4.2,
          motion: "punch",
          kind: "wide",
          layout: "montage",
          stillRefs: [0, 2],
        }),
      ],
    },
    stillRels: [stills[0]!, stills[3]!, stills[2]!],
    aspect: "9:16",
    bgmRel: "bgm.mp3",
  });
  await renderStandalone("split-montage", combo, stillsAbs, bgmAbs);

  const mixedShots = project.script.shots.map((s, i) => {
    const plans: Array<Pick<Shot, "kind" | "layout" | "stillRefs" | "motion">> = [
      { kind: "close", layout: "hero", stillRefs: [], motion: "push-in" },
      { kind: "close", layout: "under-text", stillRefs: [], motion: "pull-out" },
      { kind: "close", layout: "split", stillRefs: [0], motion: "pan-right" },
      { kind: "wide", layout: "montage", stillRefs: [1, 2], motion: "punch" },
      { kind: "close", layout: "under-text", stillRefs: [], motion: "push-in" },
    ];
    return { ...s, ...(plans[i] || plans[0]!) };
  });
  const mix = buildEditList({
    script: { ...project.script, shots: mixedShots },
    stillRels: stills,
    aspect: project.aspect,
    speechRel: "speech.wav",
    bgmRel: "bgm.mp3",
  });
  await renderStandalone("talk-mix", mix, stillsAbs, bgmAbs, projectFile(PROJECT_ID, "speech.wav"));
  console.log("done", PUBLIC_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
