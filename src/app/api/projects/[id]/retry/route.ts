import { NextResponse } from "next/server";
import { isProduceBusy, startRetry } from "@/lib/pipeline";
import { retryProduceKind } from "@/lib/retry-produce";
import { talkStillRefPaths } from "@/lib/still-refs";
import { readProject, updateProject } from "@/lib/store";
import { publicProject } from "@/lib/types";

const RETRY_MESSAGE: Record<ReturnType<typeof retryProduceKind>, string> = {
  copy: "再写一次文案…",
  board: "再写一次故事分镜…",
  images: "再出一次画面…",
  speech: "再生成口播…",
  assemble: "再合成一次…",
};

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const project = await readProject(id);
  if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
  if (project.status !== "failed") {
    return NextResponse.json({ error: "现在不用重试" }, { status: 400 });
  }
  if (isProduceBusy(id)) {
    return NextResponse.json({ error: "正在做，稍后再试" }, { status: 400 });
  }
  const kind = retryProduceKind(project);
  if (kind === "images") {
    try {
      await talkStillRefPaths(project);
    } catch {
      return NextResponse.json({ error: "人物参考图不见了，请重新上传" }, { status: 400 });
    }
  }
  const saved = await updateProject(id, {
    status: "queued",
    phase: kind,
    message: RETRY_MESSAGE[kind],
    error: null,
  });
  startRetry(id);
  return NextResponse.json({ project: publicProject(saved) });
}
