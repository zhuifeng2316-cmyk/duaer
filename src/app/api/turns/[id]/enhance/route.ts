import { NextResponse } from "next/server";
import { startEnhance } from "@/lib/turn-pipeline";
import { publicTurn, readTurn, updateTurn } from "@/lib/turn-store";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turn = await readTurn(id);
  if (!turn) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  if (turn.status === "enhancing") {
    return NextResponse.json({ turn: publicTurn(turn) });
  }
  if (turn.status !== "review" || !turn.head) {
    return NextResponse.json({ error: "先抠出头像再做高清" }, { status: 400 });
  }
  const saved = await updateTurn(id, { status: "enhancing", message: "开始把头像变高清", error: null });
  startEnhance(id);
  return NextResponse.json({ turn: publicTurn(saved) });
}
