import { NextResponse } from "next/server";
import { parseCoverTemplate } from "@/lib/cover-templates";
import { isProduceBusy, startRegenCover } from "@/lib/pipeline";
import { readProject, updateProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (isProduceBusy(id)) {
    return NextResponse.json({ error: "正在做，稍后再试" }, { status: 400 });
  }
  if (!project.finalPath) {
    return NextResponse.json({ error: "还没有成片，做好了才能换封面" }, { status: 400 });
  }
  if (!project.stills.some(Boolean)) {
    return NextResponse.json({ error: "还没有静帧，没法做封面" }, { status: 400 });
  }
  let template = parseCoverTemplate(project.coverTemplate);
  try {
    const body = await req.json();
    if (body && typeof body === "object" && "template" in body) {
      template = parseCoverTemplate((body as { template?: unknown }).template);
    }
  } catch {
    /* 没有请求体就用上次模版 */
  }
  const saved = await updateProject(id, {
    status: "running",
    phase: "cover",
    progress: 96,
    message: "在做封面…",
    error: null,
    coverTemplate: template,
  });
  startRegenCover(id, template);
  return NextResponse.json({ project: publicProject(saved) });
}
