import { NextResponse } from "next/server";
import { isProduceBusy, startRegenStill } from "@/lib/pipeline";
import { readProject, updateProject } from "@/lib/store";
import { shotNeedsPersonStill } from "@/lib/graphic-board";
import { publicProject } from "@/lib/types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (isProduceBusy(id)) {
    return NextResponse.json({ error: "正在出图，稍后再重做" }, { status: 400 });
  }
  const reviewingStills = project.status === "review" && project.phase === "images";
  const ready = project.status === "ready" || Boolean(project.finalPath);
  if (!reviewingStills && !ready) {
    return NextResponse.json({ error: "画面出齐后才能重做" }, { status: 400 });
  }
  let body: { shotIndex?: unknown };
  try {
    body = (await req.json()) as { shotIndex?: unknown };
  } catch {
    return NextResponse.json({ error: "先点要重做的那一镜" }, { status: 400 });
  }
  const shotIndex = Number(body.shotIndex);
  if (!Number.isInteger(shotIndex) || shotIndex < 0 || shotIndex >= (project.script?.shots.length || 0)) {
    return NextResponse.json({ error: "这一镜不在" }, { status: 400 });
  }
  const shot = project.script?.shots[shotIndex];
  if (!shot || !shotNeedsPersonStill(shot) || !project.stills[shotIndex]) {
    return NextResponse.json({ error: "这一镜没有人物底，不能重做" }, { status: 400 });
  }
  const saved = await updateProject(id, {
    status: "running",
    phase: "images",
    regenShotIndex: shotIndex,
    message: `正在重做镜 ${shotIndex + 1}…`,
    error: null,
  });
  startRegenStill(id, shotIndex);
  return NextResponse.json({ project: publicProject(saved) });
}
