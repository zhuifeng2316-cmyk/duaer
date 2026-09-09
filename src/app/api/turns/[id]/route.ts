import { NextResponse } from "next/server";
import { publicTurn, readTurn } from "@/lib/turn-store";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const turn = await readTurn(id);
  if (!turn) return NextResponse.json({ error: "任务不存在" }, { status: 404 });
  return NextResponse.json({ turn: publicTurn(turn) });
}
