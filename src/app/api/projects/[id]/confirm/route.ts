import { NextResponse } from "next/server";
import { isProduceBusy, startAfterBoard, startAfterCopy } from "@/lib/pipeline";
import { readProject, updateProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (project.status !== "review" || !project.script?.shots.length) {
    return NextResponse.json({ error: "先把口播文案写好再确认" }, { status: 400 });
  }
  if (isProduceBusy(id)) {
    return NextResponse.json({ error: "正在写，稍后再确认" }, { status: 400 });
  }
  if (project.phase === "board") {
    if (!project.script.shots.some((shot) => shot.imagePrompt || shot.scene)) {
      return NextResponse.json({ error: "先把图片分镜写好再出图" }, { status: 400 });
    }
    const saved = await updateProject(id, {
      status: "queued",
      phase: "images",
      message: "分镜已确认，开始出图",
      error: null,
      draftText: "",
    });
    startAfterBoard(id);
    return NextResponse.json({ project: publicProject(saved) });
  }
  const saved = await updateProject(id, {
    status: "queued",
    phase: "board",
    message: "文案已确认，开始写图片分镜",
    error: null,
    draftText: "",
  });
  startAfterCopy(id);
  return NextResponse.json({ project: publicProject(saved) });
}
