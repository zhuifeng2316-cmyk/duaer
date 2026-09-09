import { NextResponse } from "next/server";
import { ANGLE_VIEWS } from "@/lib/angles";
import { isTurnBusy, startRegenView } from "@/lib/turn-pipeline";
import { publicTurn, readTurn, updateTurn } from "@/lib/turn-store";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turn = await readTurn(id);
  if (!turn) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (turn.status !== "ready") {
    return NextResponse.json({ error: "八张齐了才能重做其中一张" }, { status: 400 });
  }
  if (isTurnBusy(id)) {
    return NextResponse.json({ error: "正在出图，稍后再重做" }, { status: 400 });
  }
  let body: { viewId?: unknown };
  try {
    body = (await req.json()) as { viewId?: unknown };
  } catch {
    return NextResponse.json({ error: "先点要重做的那一张" }, { status: 400 });
  }
  const viewId = String(body.viewId || "").trim();
  const index = ANGLE_VIEWS.findIndex((v) => v.id === viewId);
  if (index < 0) return NextResponse.json({ error: "没有这个朝向" }, { status: 400 });
  const view = turn.views[index];
  if (!view?.file) return NextResponse.json({ error: "这张还没有画面，不能重做" }, { status: 400 });
  const angle = ANGLE_VIEWS[index]!;
  const saved = await updateTurn(id, {
    status: "rerunning",
    regenViewId: viewId,
    message: `正在重做${angle.label}…`,
    error: null,
    progress: 70,
  });
  startRegenView(id, viewId);
  return NextResponse.json({ turn: publicTurn(saved) });
}
