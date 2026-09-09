import { NextResponse } from "next/server";
import { startProduce } from "@/lib/pipeline";
import { readProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (!project.photos.length) {
    return NextResponse.json({ error: "先上传人物照片" }, { status: 400 });
  }
  startProduce(id);
  return NextResponse.json({ project: publicProject(project) });
}
