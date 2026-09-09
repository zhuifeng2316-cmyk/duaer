import { NextResponse } from "next/server";
import { startExpand } from "@/lib/turn-pipeline";
import { publicTurn, readTurn, selectedFaces, updateTurn } from "@/lib/turn-store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turn = await readTurn(id);
  if (!turn) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (turn.status === "running" || turn.status === "rerunning" || turn.status === "ready") {
    return NextResponse.json({ turn: publicTurn(turn) });
  }
  if (turn.status !== "review" || !turn.head) {
    return NextResponse.json({ error: "先确认抠出的头像" }, { status: 400 });
  }
  const chosen = selectedFaces(turn);
  if (chosen.length !== 1) {
    return NextResponse.json({ error: "拆八个角度请只选一个人。多个人请先用选中的人出片" }, { status: 400 });
  }
  const saved = await updateTurn(id, {
    status: "queued",
    message: "开始出八张电影画面",
    error: null,
    head: chosen[0]!.file,
    crop: chosen[0]!.crop,
    enhanced: chosen[0]!.enhanced,
  });
  startExpand(id);
  return NextResponse.json({ turn: publicTurn(saved) });
}
