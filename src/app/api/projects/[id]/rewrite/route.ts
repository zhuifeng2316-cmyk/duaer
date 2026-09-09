import { NextResponse } from "next/server";
import { isProduceBusy, startRewriteBoard, startRewriteCopy } from "@/lib/pipeline";
import { readProject, updateProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (project.status !== "review") {
    return NextResponse.json({ error: "现在不能重写" }, { status: 400 });
  }
  if (isProduceBusy(id)) {
    return NextResponse.json({ error: "正在写，稍后再试" }, { status: 400 });
  }
  if (project.phase === "images") {
    return NextResponse.json({ error: "画面阶段请重做某一镜" }, { status: 400 });
  }
  if (project.phase === "board") {
    const saved = await updateProject(id, {
      status: "queued",
      phase: "board",
      message: "在重写图片分镜…",
      error: null,
      draftText: "",
    });
    startRewriteBoard(id);
    return NextResponse.json({ project: publicProject(saved) });
  }
  const saved = await updateProject(id, {
    status: "queued",
    phase: "copy",
    message: "在重写口播文案…",
    error: null,
    draftText: "",
  });
  startRewriteCopy(id);
  return NextResponse.json({ project: publicProject(saved) });
}
