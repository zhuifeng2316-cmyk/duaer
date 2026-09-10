import { writeAndRenderCinema } from "../src/lib/cinema-render";
import { probeDuration } from "../src/lib/compose";
import { writeTalkCover } from "../src/lib/cover";
import { buildEditList, fallbackCinemaHtml } from "../src/lib/html-compose";
import { projectFile, readProject, updateProject, writeProjectFile } from "../src/lib/store";

const projectId = process.argv[2] || "0b4995aa-cd0a-4495-a124-c62c9d6dc8ef";

async function main() {
  const project = await readProject(projectId);
  if (!project?.script?.shots.length) throw new Error("项目没有分镜");

  // Sync shot durations to current speech wavs so caption timing matches VO.
  for (let i = 0; i < project.script.shots.length; i++) {
    const wav = projectFile(projectId, "speech", `shot-${i + 1}.wav`);
    try {
      const d = await probeDuration(wav);
      project.script.shots[i]!.durationSec = Math.min(8, Math.max(1.5, d));
    } catch {
      /* keep existing */
    }
  }

  await updateProject(projectId, {
    script: project.script,
    htmlPath: null,
    phase: "html",
    progress: 80,
    message: "正在最终合成…",
    speechError: project.speechError,
  });

  const list = buildEditList({
    script: project.script,
    stillRels: project.stills || [],
    aspect: project.aspect,
    speechRel: "speech.wav",
    bgmRel: "bgm.mp3",
    captionStyle: project.captionStyle,
  });
  await writeProjectFile(projectId, "compose/index.html", fallbackCinemaHtml(list));
  await writeAndRenderCinema(projectId, { reuseHtml: true });
  let coverPath: string | null = null;
  try {
    coverPath = await writeTalkCover(projectId);
  } catch {
    coverPath = null;
  }
  const latest = await readProject(projectId);
  await updateProject(projectId, {
    status: "ready",
    phase: "done",
    progress: 100,
    message: coverPath ? "成片好了" : "成片好了，封面没加上",
    finalPath: "final.mp4",
    coverPath: coverPath || latest?.coverPath || null,
    coverRev: latest?.coverRev || 0,
  });
  console.log("rendered", projectFile(projectId, "final.mp4"));
  if (coverPath) console.log("cover", projectFile(projectId, coverPath));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
