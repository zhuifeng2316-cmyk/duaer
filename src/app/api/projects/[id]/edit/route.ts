import { NextResponse } from "next/server";
import { rewriteEditorHost, startCinemaEditor } from "@/lib/cinema-studio";
import { readProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (!project.htmlPath) {
    return NextResponse.json({ error: "还没有合成稿，成片后才能微调" }, { status: 400 });
  }
  try {
    const started = await startCinemaEditor(id);
    const host = req.headers.get("host");
    return NextResponse.json({
      project: publicProject(project),
      editUrl: rewriteEditorHost(started.url, host),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "时间轴打不开";
    const status = /合成稿|测试环境/.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
