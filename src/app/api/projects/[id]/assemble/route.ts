import { NextResponse } from "next/server";
import { isProduceBusy, startAssembleExisting } from "@/lib/pipeline";
import { readProject, updateProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (isProduceBusy(id)) {
    return NextResponse.json({ error: "正在合成，稍后再试" }, { status: 400 });
  }
  if (!project.htmlPath) {
    return NextResponse.json({ error: "还没有合成稿，成片后才能再出片" }, { status: 400 });
  }
  const saved = await updateProject(id, {
    status: "running",
    phase: "assemble",
    progress: 84,
    message: "在合成视频…",
    error: null,
  });
  startAssembleExisting(id);
  return NextResponse.json({ project: publicProject(saved) });
}
