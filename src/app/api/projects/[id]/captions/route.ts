import { NextResponse } from "next/server";
import { rewriteCinemaHtml } from "@/lib/cinema-render";
import { parseCaptionStyle } from "@/lib/caption-styles";
import { isProduceBusy } from "@/lib/pipeline";
import { readProject, updateProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

function canEditCaption(status: string, phase: string): boolean {
  if (status === "ready") return true;
  if (status === "review" && phase === "images") return true;
  return false;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (!project.script?.shots.length) return NextResponse.json({ error: "先把故事分镜写好" }, { status: 400 });
  if (isProduceBusy(id)) return NextResponse.json({ error: "正在出片，稍后再改" }, { status: 400 });
  if (!canEditCaption(project.status, project.phase)) {
    return NextResponse.json({ error: "画面出来后才能改字幕" }, { status: 400 });
  }
  let body: { style?: unknown; shotIndex?: unknown };
  try {
    body = (await req.json()) as { style?: unknown; shotIndex?: unknown };
  } catch {
    return NextResponse.json({ error: "先选字幕样式" }, { status: 400 });
  }
  const style = String(body.style || "").trim();
  if (style && !parseCaptionStyle(style)) {
    return NextResponse.json({ error: "没有这种字幕" }, { status: 400 });
  }
  const shotIndex = body.shotIndex == null || body.shotIndex === "" ? undefined : Number(body.shotIndex);
  if (shotIndex != null && (!Number.isInteger(shotIndex) || !project.script.shots[shotIndex])) {
    return NextResponse.json({ error: "这一镜不在" }, { status: 400 });
  }
  const next =
    shotIndex == null
      ? {
          captionStyle: style,
          script: {
            ...project.script,
            // 用到全片时清掉单镜覆盖，否则画面上仍显示旧的分镜字幕
            shots: project.script.shots.map((shot) => ({ ...shot, captionStyle: "" })),
          },
        }
      : {
          script: {
            ...project.script,
            shots: project.script.shots.map((shot, i) => (i === shotIndex ? { ...shot, captionStyle: style } : shot)),
          },
        };
  const saved = await updateProject(id, next);
  if (saved.htmlPath) {
    try {
      await rewriteCinemaHtml(id);
    } catch {
      /* 下次再出片会按分镜重写 */
    }
  }
  const fresh = (await readProject(id)) || saved;
  return NextResponse.json({
    project: publicProject(fresh),
    note: "已写进分镜，成片需再出一次片",
  });
}
